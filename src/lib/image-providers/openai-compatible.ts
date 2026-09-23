import OpenAI, { toFile } from "openai";
import { readFile, writeFile } from "fs/promises";
import {
  buildImagePrompt,
  buildReferenceImagePrompt,
  chooseGenerationSize,
  type ImageSize,
  resolveAspectRatio,
} from "@/lib/aspect-ratio";
import {
  dataUrlToBuffer,
  downloadRemoteImage,
  getErrorMessage,
} from "@/lib/image-providers/shared";
import { getLocalUploadPath } from "@/lib/uploads";

type ImageSize2K = "2048x2048" | "2048x1152" | "1152x2048";
type ImageSize4K = "3840x2160" | "2160x3840";
type RequestSize = ImageSize | ImageSize2K | ImageSize4K | "auto";

type ImageResult = {
  b64_json?: string;
  url?: string;
};

function getErrorStatus(error: unknown) {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as { status?: unknown }).status;
    return typeof status === "number" ? status : null;
  }

  return null;
}

function chooseOpenAICompatibleSize(
  aspectRatio: ReturnType<typeof resolveAspectRatio>,
  resolution: "1k" | "2k" | "4k" = "1k"
): RequestSize {
  if (resolution === "2k") {
    if (!aspectRatio) return "2048x2048";

    const ratio = aspectRatio.width / aspectRatio.height;
    if (ratio > 1.08) return "2048x1152";
    if (ratio < 0.92) return "1152x2048";
    return "2048x2048";
  }

  if (resolution === "4k") {
    if (!aspectRatio) return "3840x2160";

    const ratio = aspectRatio.width / aspectRatio.height;
    return ratio < 0.92 ? "2160x3840" : "3840x2160";
  }

  return chooseGenerationSize(aspectRatio);
}

function getMimeTypeFromExtension(filepath: string) {
  const ext = filepath.split(".").pop()?.toLowerCase();
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return "image/png";
}

async function buildReferenceImageFile(referenceImage: string, index: number) {
  if (referenceImage.startsWith("/uploads/")) {
    const filepath = getLocalUploadPath(referenceImage);
    if (!filepath) throw new Error(`Invalid local reference image path: ${referenceImage}`);

    return toFile(await readFile(filepath), `reference-${index + 1}.${filepath.split(".").pop() || "png"}`, {
      type: getMimeTypeFromExtension(filepath),
    });
  }

  if (referenceImage.startsWith("data:image/")) {
    return toFile(dataUrlToBuffer(referenceImage), `reference-${index + 1}.png`, {
      type: "image/png",
    });
  }

  const response = await fetch(referenceImage);
  if (!response.ok) {
    throw new Error(`Failed to download reference image: ${response.status} ${response.statusText}`);
  }
  const contentType = response.headers.get("content-type") || "image/png";
  if (!contentType.startsWith("image/")) {
    throw new Error(`Reference image URL did not return an image: ${contentType}`);
  }

  return toFile(Buffer.from(await response.arrayBuffer()), `reference-${index + 1}.png`, {
    type: contentType,
  });
}

function getImageResult(response: { data?: ImageResult[] | ImageResult }) {
  if (Array.isArray(response.data)) return response.data[0];
  return response.data;
}

function isRetryableImageSizeError(error: unknown) {
  const status = getErrorStatus(error);
  const message = getErrorMessage(error).toLowerCase();

  return (
    status === 400 &&
    (message.includes("size") ||
      message.includes("1024x1536") ||
      message.includes("1536x1024") ||
      message.includes("unsupported") ||
      message.includes("invalid"))
  );
}

async function runImageGeneration({
  client,
  model,
  prompt,
  referenceImages,
  size,
}: {
  client: OpenAI;
  model: string;
  prompt: string;
  referenceImages?: string[];
  size: RequestSize;
}) {
  if (referenceImages && referenceImages.length > 0) {
    const imageFiles = await Promise.all(
      referenceImages.map((referenceImage, index) =>
        buildReferenceImageFile(referenceImage, index)
      )
    );

    return client.images.edit({
      model,
      image: imageFiles.length === 1 ? imageFiles[0] : imageFiles,
      prompt,
      n: 1,
      size: size as ImageSize | "auto",
    });
  }

  return client.images.generate({
    model,
    prompt,
    n: 1,
    size: size as ImageSize | "auto",
  });
}

export async function generateWithOpenAICompatible({
  apiKey,
  baseURL,
  prompt,
  model = "gpt-image-2",
  referenceImages,
  aspectRatioOption = "auto",
  resolution = "1k",
  filepath,
}: {
  apiKey: string;
  baseURL: string;
  prompt: string;
  model?: string;
  referenceImages?: string[];
  aspectRatioOption?: string;
  resolution?: "1k" | "2k" | "4k";
  filepath: string;
}) {
  const aspectRatio = resolveAspectRatio(prompt, aspectRatioOption);
  const size: RequestSize = chooseOpenAICompatibleSize(aspectRatio, resolution);
  const referenceAwarePrompt = buildReferenceImagePrompt(
    prompt,
    Boolean(referenceImages?.length)
  );
  const finalPrompt = buildImagePrompt(referenceAwarePrompt, aspectRatio);

  if (!apiKey) throw new Error("站点尚未配置图片 API Key");
  const client = new OpenAI({ apiKey, baseURL });

  let response;
  try {
    response = await runImageGeneration({
      client,
      model,
      prompt: finalPrompt,
      referenceImages,
      size,
    });
  } catch (error) {
    const fallbackSize: RequestSize = "auto";
    if (!isRetryableImageSizeError(error)) {
      throw error;
    }

    console.warn(
      `Image size ${size} failed for ${model}; retrying with ${fallbackSize}.`,
      error
    );

    response = await runImageGeneration({
      client,
      model,
      prompt: finalPrompt,
      referenceImages,
      size: fallbackSize,
    });
  }

  const result = getImageResult(response);
  if (result?.b64_json) {
    const imageBuffer = Buffer.from(result.b64_json, "base64");
    await writeFile(filepath, imageBuffer);
  } else if (result?.url) {
    await downloadRemoteImage(result.url, filepath);
  } else {
    throw new Error("No image data returned from API");
  }
}
