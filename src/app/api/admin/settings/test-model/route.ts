import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-guard";
import { getRuntimeApiSettings, providerInputSchema } from "@/lib/api-settings";
import { rateLimit } from "@/lib/rate-limit";
import { rejectCrossSiteRequest, rejectLargeRequest } from "@/lib/request-security";
import { providerTestErrorMessage, runProviderModelTest } from "@/lib/provider-model-test";

export const runtime = "nodejs";
export const maxDuration = 300;

const inputSchema = z.object({ provider: providerInputSchema });

export async function POST(request: Request) {
  const { error, session } = await requireAdmin();
  if (error) return error;
  const crossSite = rejectCrossSiteRequest(request);
  if (crossSite) return crossSite;
  const tooLarge = rejectLargeRequest(request, 64 * 1024);
  if (tooLarge) return tooLarge;

  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "模型配置无效" }, { status: 400 });
  const provider = parsed.data.provider;
  if (provider.models.length !== 1) return NextResponse.json({ error: "每次只能测试一个模型" }, { status: 400 });
  if (!/^https?:$/.test(new URL(provider.baseUrl).protocol)) {
    return NextResponse.json({ error: "API Base URL 必须使用 HTTP 或 HTTPS" }, { status: 400 });
  }
  const apiKey = provider.clearApiKey ? "" : provider.apiKey?.trim() ||
    (await getRuntimeApiSettings()).providers.find((item) => item.id === provider.id)?.apiKey || "";
  if (!apiKey) return NextResponse.json({ error: "请先输入 API Key，或保存已有密钥" }, { status: 400 });
  if (!rateLimit(`admin-model-test:${session!.user.id}`, 3, 10 * 60 * 1000).success) {
    return NextResponse.json({ error: "测试过于频繁，请 10 分钟后再试" }, { status: 429 });
  }

  try {
    const result = await runProviderModelTest(provider, provider.models[0], apiKey);
    return NextResponse.json({ success: true, message: `${provider.models[0].name} 测试生成成功（${result.width}×${result.height}，${result.resolution.toUpperCase()}）` });
  } catch (testError) {
    return NextResponse.json({ error: providerTestErrorMessage(testError, apiKey) }, { status: 502 });
  }
}
