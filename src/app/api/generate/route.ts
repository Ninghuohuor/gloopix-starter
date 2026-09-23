import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateSchema } from "@/lib/validations";
import { getModelCreditCost, getRuntimeApiSettings } from "@/lib/api-settings";
import { containsForbiddenPromptTerm, FORBIDDEN_PROMPT_MESSAGE } from "@/lib/forbidden-prompts";
import { rateLimit } from "@/lib/rate-limit";
import { rejectLargeRequest } from "@/lib/request-security";
import { ensureGenerationWorkerStarted } from "@/lib/generation-queue";
import { touchUserActivity } from "@/lib/user-activity";
import { getErrorMessage } from "@/lib/image-providers/shared";
import {
  persistReferenceImages,
  pruneExpiredReferenceUploads,
} from "@/lib/reference-images";
import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    await touchUserActivity(session.user.id);

    const tooLarge = rejectLargeRequest(request, 145 * 1024 * 1024);
    if (tooLarge) return tooLarge;

    const rl = rateLimit(`generate:${session.user.id}`, 5, 60000);
    if (!rl.success) {
      return NextResponse.json({ error: "请求过于频繁，请稍后再试" }, { status: 429 });
    }

    const body = await request.json();
    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    if (containsForbiddenPromptTerm(parsed.data.prompt)) {
      return NextResponse.json({ error: FORBIDDEN_PROMPT_MESSAGE }, { status: 400 });
    }

    const apiSettings = await getRuntimeApiSettings();
    const modelConfig = apiSettings.models.find((model) => model.id === parsed.data.model);
    if (!modelConfig) {
      return NextResponse.json({ error: "所选模型未启用，请刷新页面后重新选择" }, { status: 400 });
    }
    if (modelConfig.supportedResolutions && !modelConfig.supportedResolutions.includes(parsed.data.resolution)) {
      return NextResponse.json({ error: "当前模型不支持所选分辨率" }, { status: 400 });
    }
    const selectedProvider = apiSettings.providers.find((provider) => provider.id === modelConfig.providerId);
    if (!selectedProvider?.apiKey) {
      return NextResponse.json({ error: "所选模型对应的 API 尚未配置密钥，请联系管理员" }, { status: 503 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    const creditCost = apiSettings.features.creditsEnabled ? getModelCreditCost(
      modelConfig,
      parsed.data.resolution,
      parsed.data.quality,
      parsed.data.quantity
    ) : 0;
    const creditCostPerImage = creditCost / parsed.data.quantity;

    if (!user || user.credits < creditCost) {
      return NextResponse.json({ error: "积分不足" }, { status: 400 });
    }

    const imageIds = Array.from({ length: parsed.data.quantity }, (_, index) =>
      index === 0 ? parsed.data.requestId : crypto.randomUUID()
    );
    const referenceImages = parsed.data.referenceImages || (
      parsed.data.referenceImage ? [parsed.data.referenceImage] : undefined
    );
    void pruneExpiredReferenceUploads().catch((error) => {
      console.error("Reference image cleanup failed", getErrorMessage(error));
    });
    const persistedReferenceImages = await persistReferenceImages(referenceImages);

    await prisma.$transaction([
      ...imageIds.map((id) =>
        prisma.image.create({
          data: {
            id,
            userId: session.user.id,
            prompt: parsed.data.prompt,
            imageUrl: "",
            status: "PENDING",
            generationId: parsed.data.requestId,
            model: parsed.data.model,
            aspectRatio: parsed.data.aspectRatio,
            quality: parsed.data.quality,
            resolution: parsed.data.resolution,
            quantity: parsed.data.quantity,
          },
        })
      ),
      ...(creditCost > 0 ? [prisma.user.update({
        where: { id: session.user.id },
        data: { credits: { decrement: creditCost } },
      }), prisma.creditTransaction.create({
        data: {
          userId: session.user.id,
          amount: -creditCost,
          type: "GENERATION",
          relatedId: parsed.data.requestId,
        },
      })] : []),
      prisma.generationTask.create({
        data: {
          id: parsed.data.requestId,
          userId: session.user.id,
          prompt: parsed.data.prompt,
          imageIds: JSON.stringify(imageIds),
          referenceImages: persistedReferenceImages ? JSON.stringify(persistedReferenceImages) : null,
          model: parsed.data.model,
          aspectRatio: parsed.data.aspectRatio,
          quality: parsed.data.quality,
          resolution: parsed.data.resolution,
          quantity: parsed.data.quantity,
          creditCostPerImage,
        },
      }),
    ]);

    ensureGenerationWorkerStarted();

    return NextResponse.json(
      {
        success: true,
        status: "queued",
        generationId: parsed.data.requestId,
      },
      { status: 202 }
    );
  } catch (error) {
    console.error("Image generation request failed", getErrorMessage(error));
    return NextResponse.json({ error: "服务异常" }, { status: 500 });
  }
}
