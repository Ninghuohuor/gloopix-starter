import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  calculateImageCreditCost,
  type ImageQuality,
  type ImageResolution,
} from "@/lib/image-models";
import { ensureGenerationWorkerStarted } from "@/lib/generation-queue";
import { touchUserActivity } from "@/lib/user-activity";
import { NextResponse } from "next/server";

const RECENT_TASK_WINDOW_MS = 2 * 60 * 60 * 1000;
const STALE_PENDING_TASK_MS = 2 * 60 * 60 * 1000;

function formatGenerationFailureReason(error?: string | null) {
  if (!error) return "未返回明确失败原因，积分已返还";

  const normalized = error.toLowerCase();
  if (normalized.includes("tool choice") || normalized.includes("tools parameter")) {
    return "上游模型通道配置异常，积分已返还";
  }

  if (
    normalized.includes("please wait") ||
    normalized.includes("try again later") ||
    normalized.includes("排队超时")
  ) {
    return "上游服务繁忙或排队超时，积分已返还";
  }

  if (normalized.includes("unsupported image aspect ratio")) {
    return "当前模型不支持所选图片比例，积分已返还";
  }

  if (
    normalized.includes("payload too large") ||
    normalized.includes("reference image upload exceeds apimart 20mb limit") ||
    normalized.includes("file size") && normalized.includes("exceeds maximum") ||
    normalized.includes("maximum 20971520") ||
    normalized.includes("413")
  ) {
    return "参考图文件过大，积分已返还。请压缩到 20MB 以内后重试";
  }

  if (
    normalized.includes("upload response missing url") ||
    normalized.includes("/uploads/images") ||
    normalized.includes("reference image") ||
    normalized.includes("reference-")
  ) {
    return "参考图上传失败，积分已返还";
  }

  // Upstream providers often wrap policy/IP/safety rejections as generic task or storage errors.
  // Keep this user-facing copy broad so we do not over-claim a specific violation reason.
  if (
    normalized.includes("copyright") ||
    normalized.includes("intellectual property") ||
    normalized.includes("ip restriction") ||
    normalized.includes("trademark") ||
    normalized.includes("policy") ||
    normalized.includes("safety") ||
    normalized.includes("moderation") ||
    normalized.includes("forbidden") ||
    normalized.includes("违规") ||
    normalized.includes("mime type must be image") ||
    normalized.includes("failed to mirror image") ||
    normalized.includes("r2 upload failed")
  ) {
    return "内容或请求未通过上游处理，积分已返还。请换一种原创、合规描述后重试";
  }

  if (normalized.includes("timeout") || normalized.includes("超时")) {
    return "服务响应超时，积分已返还";
  }

  if (normalized.includes("download")) {
    return "结果图片下载失败，积分已返还";
  }

  if (normalized.includes("no image data returned")) {
    return "上游服务没有返回图片，积分已返还";
  }

  if (normalized.includes("apimart")) {
    return "上游服务返回失败，积分已返还";
  }

  return "生成服务异常，积分已返还";
}

async function markStalePendingTasksAsFailed(userId: string) {
  const staleCutoff = new Date(Date.now() - STALE_PENDING_TASK_MS);
  const activeTaskIds = await prisma.generationTask.findMany({
    where: { userId, status: { in: ["QUEUED", "RUNNING"] } },
    select: { id: true },
  });
  const activeGenerationIds = activeTaskIds.map((task) => task.id);
  const staleImages = await prisma.image.findMany({
    where: {
      userId,
      status: "PENDING",
      generationId: { not: null, notIn: activeGenerationIds },
      createdAt: { lt: staleCutoff },
    },
    orderBy: { createdAt: "asc" },
  });

  const groups = new Map<string, typeof staleImages>();
  for (const image of staleImages) {
    if (!image.generationId) continue;
    groups.set(image.generationId, [...(groups.get(image.generationId) || []), image]);
  }

  for (const [generationId, groupImages] of groups) {
    const first = groupImages[0];
    const creditCost = calculateImageCreditCost({
      model: first.model,
      quality: first.quality as ImageQuality,
      resolution: first.resolution as ImageResolution,
      quantity: first.quantity,
    });
    const creditCostPerImage = creditCost / first.quantity;

    const failed = await prisma.image.updateMany({
      where: {
        userId,
        generationId,
        status: "PENDING",
        createdAt: { lt: staleCutoff },
      },
      data: { status: "FAILED", completedAt: new Date() },
    });

    if (failed.count === 0) continue;

    const refundAmount = failed.count * creditCostPerImage;
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { credits: { increment: refundAmount } },
      }),
      prisma.creditTransaction.create({
        data: {
          userId,
          amount: refundAmount,
          type: "GENERATION_STALE_REFUND",
          relatedId: generationId,
        },
      }),
    ]);
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  await touchUserActivity(session.user.id);

  ensureGenerationWorkerStarted();

  await markStalePendingTasksAsFailed(session.user.id);

  const recentCutoff = new Date(Date.now() - RECENT_TASK_WINDOW_MS);
  const images = await prisma.image.findMany({
    where: {
      userId: session.user.id,
      generationId: { not: null },
      OR: [
        { status: "PENDING" },
        { createdAt: { gte: recentCutoff } },
      ],
    },
    orderBy: { createdAt: "asc" },
  });

  const groups = new Map<string, typeof images>();
  for (const image of images) {
    if (!image.generationId) continue;
    groups.set(image.generationId, [...(groups.get(image.generationId) || []), image]);
  }

  const generationIds = Array.from(groups.keys());
  const generationTasks = generationIds.length
    ? await prisma.generationTask.findMany({
        where: { userId: session.user.id, id: { in: generationIds } },
        select: { id: true, lastError: true },
      })
    : [];
  const lastErrorByGenerationId = new Map(
    generationTasks.map((task) => [task.id, task.lastError])
  );

  const tasks = Array.from(groups.entries())
    .map(([generationId, groupImages]) => {
      const first = groupImages[0];
      const completedImages = groupImages.filter(
        (image) => image.status === "COMPLETED" && image.imageUrl
      );
      const pendingCount = groupImages.filter((image) => image.status === "PENDING").length;
      const failedCount = groupImages.filter((image) => image.status === "FAILED").length;
      const completedAt = groupImages
        .map((image) => image.completedAt)
        .filter((date): date is Date => Boolean(date))
        .sort((a, b) => b.getTime() - a.getTime())[0];

      const status =
        pendingCount > 0
          ? "generating"
          : completedImages.length > 0
            ? "completed"
            : failedCount > 0
              ? "failed"
              : "generating";

      return {
        id: generationId,
        prompt: first.prompt,
        status,
        model: first.model,
        aspectRatio: first.aspectRatio,
        quality: first.quality,
        resolution: first.resolution,
        quantity: first.quantity,
        imageUrls: completedImages.map((image) => image.imageUrl),
        thumbnailUrls: completedImages.map((image) => image.thumbnailUrl || image.imageUrl),
        error:
          status === "failed"
            ? formatGenerationFailureReason(lastErrorByGenerationId.get(generationId))
            : undefined,
        startedAt: first.createdAt.getTime(),
        durationSeconds: completedAt
          ? Math.max(1, Math.round((completedAt.getTime() - first.createdAt.getTime()) / 1000))
          : undefined,
      };
    })
    .sort((a, b) => a.startedAt - b.startedAt)
    .slice(0, 20);

  return NextResponse.json({ tasks });
}
