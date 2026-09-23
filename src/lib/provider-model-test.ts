import { mkdtemp, rm, stat } from "fs/promises";
import os from "os";
import path from "path";
import sharp from "sharp";
import type { ConfigurableImageModel, ProviderInput } from "@/lib/api-settings";
import { generateWithApimart } from "@/lib/image-providers/apimart";
import { generateWithAsyncTask } from "@/lib/image-providers/async-task";
import { generateWithGoogleGemini } from "@/lib/image-providers/google-gemini";
import { generateWithOpenAICompatible } from "@/lib/image-providers/openai-compatible";

const TEST_PROMPT = "A simple red circle on a plain white background.";

export function providerTestErrorMessage(error: unknown, apiKey: string) {
  const raw = error instanceof Error ? error.message : String(error);
  const redacted = raw.replaceAll(apiKey, "[API Key 已隐藏]").replaceAll(encodeURIComponent(apiKey), "[API Key 已隐藏]");
  return redacted.slice(0, 400) || "测试失败，请检查 API 配置";
}

export function testResolution(model: ConfigurableImageModel) {
  return model.supportedResolutions.includes("1k") ? "1k" : model.supportedResolutions[0];
}

export async function runProviderModelTest(provider: ProviderInput, model: ConfigurableImageModel, apiKey: string) {
  const resolution = testResolution(model);
  const dir = await mkdtemp(path.join(os.tmpdir(), "gloopix-provider-test-"));
  const filepath = path.join(dir, "result.png");

  try {
    const common = {
      apiKey,
      baseURL: provider.baseUrl,
      model: model.id,
      prompt: TEST_PROMPT,
      aspectRatioOption: "auto",
      resolution,
      filepath,
    };
    if (provider.type === "GOOGLE_GEMINI") {
      await generateWithGoogleGemini(common);
    } else if (provider.type === "ASYNC_TASK_COMPATIBLE" && provider.asyncTask) {
      await generateWithAsyncTask({ ...common, protocol: provider.asyncTask, configuredModel: model, quality: model.defaultQuality });
    } else if (provider.type === "ASYNC_TASK_COMPATIBLE") {
      await generateWithApimart({ ...common, configuredModel: model, quality: model.defaultQuality, persistRemoteImage: true });
    } else {
      await generateWithOpenAICompatible(common);
    }
    if ((await stat(filepath)).size === 0) throw new Error("上游返回了空图片");
    const metadata = await sharp(filepath).metadata();
    if (!metadata.width || !metadata.height) throw new Error("上游未返回有效图片");
    return { resolution, width: metadata.width, height: metadata.height };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
