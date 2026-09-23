import crypto from "crypto";
import path from "path";
import { persistGeneratedImage, type StoredGeneratedImage } from "@/lib/image-storage";
import { ensureGeneratedUploadDir } from "@/lib/image-providers/shared";
import { generateWithApimart } from "@/lib/image-providers/apimart";
import { generateWithAsyncTask } from "@/lib/image-providers/async-task";
import { generateWithOpenAICompatible } from "@/lib/image-providers/openai-compatible";
import { getRuntimeApiSettings } from "@/lib/api-settings";
import { generateWithGoogleGemini } from "@/lib/image-providers/google-gemini";

export async function generateImage(
  prompt: string,
  model: string = "gpt-image-2",
  referenceImages?: string[],
  aspectRatioOption: string = "auto",
  quality?: "low" | "medium" | "high",
  resolution?: "1k" | "2k" | "4k",
  options: { traceId?: string } = {}
): Promise<StoredGeneratedImage> {
  const dir = await ensureGeneratedUploadDir();
  const filename = `${crypto.randomUUID()}.png`;
  const filepath = path.join(dir, filename);
  const localImageUrl = `/uploads/generated/${filename}`;
  const settings = await getRuntimeApiSettings();
  const configuredModel = settings.models.find((item) => item.id === model);
  if (!configuredModel) throw new Error("所选模型已被管理员停用");
  const provider = settings.providers.find((item) => item.id === configuredModel.providerId);
  if (!provider?.apiKey) throw new Error("所选 API 尚未配置密钥，请联系管理员");

  if (provider.type === "ASYNC_TASK_COMPATIBLE") {
    if (provider.asyncTask) {
      await generateWithAsyncTask({
        apiKey: provider.apiKey,
        baseURL: provider.baseUrl,
        protocol: provider.asyncTask,
        prompt,
        model: configuredModel.upstreamModelId,
        referenceImages,
        aspectRatioOption,
        quality,
        resolution,
        filepath,
        configuredModel,
      });
      return persistGeneratedImage({ localFilePath: filepath, localImageUrl, filename });
    }
    const remoteImageUrl = await generateWithApimart({
      apiKey: provider.apiKey,
      baseURL: provider.baseUrl,
      prompt,
      model: configuredModel.upstreamModelId,
      referenceImages,
      aspectRatioOption,
      quality,
      resolution,
      filepath,
      persistRemoteImage: true,
      traceId: options.traceId,
      configuredModel,
    });
    if (remoteImageUrl) {
      return persistGeneratedImage({ localFilePath: filepath, localImageUrl, filename });
    }
  } else if (provider.type === "GOOGLE_GEMINI") {
    await generateWithGoogleGemini({ apiKey: provider.apiKey, baseURL: provider.baseUrl, model: configuredModel.upstreamModelId, prompt, referenceImages, aspectRatioOption, resolution: resolution || configuredModel.defaultResolution, filepath });
  } else {
    await generateWithOpenAICompatible({
      apiKey: provider.apiKey,
      baseURL: provider.baseUrl,
      prompt,
      model: configuredModel.upstreamModelId,
      referenceImages,
      aspectRatioOption,
      resolution,
      filepath,
    });
  }

  return persistGeneratedImage({ localFilePath: filepath, localImageUrl, filename });
}
