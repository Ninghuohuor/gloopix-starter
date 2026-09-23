import {
  buildImagePrompt,
  buildReferenceImagePrompt,
  resolveAspectRatio,
} from "@/lib/aspect-ratio";
import crypto from "crypto";
import { readFile } from "fs/promises";
import sharp from "sharp";
import {
  dataUrlToBuffer,
  downloadRemoteImage,
  getErrorMessage,
} from "@/lib/image-providers/shared";
import { getImageModelConfig, type ImageModelConfig } from "@/lib/image-models";
import { getLocalUploadPath } from "@/lib/uploads";

type ImageValue = {
  url?: string | string[];
  image_url?: string | string[];
  b64_json?: string;
};

type DataValue = ImageValue & {
  images?: Array<ImageValue | string>;
  output?: Array<string>;
  result?: { images?: Array<ImageValue | string> };
};

const DEFAULT_TIMEOUT_MS = 300_000;
const POLL_INTERVAL_MS = 1000;
const APIMART_GENERATION_MAX_ATTEMPTS = 2;
const APIMART_DIAGNOSTIC_POLL_LOG_INTERVAL_MS = 30_000;
const APIMART_UPLOAD_MAX_BYTES = 20 * 1024 * 1024;
const APIMART_REFERENCE_JPEG_QUALITIES = [92, 86, 80, 74];
const APIMART_REFERENCE_RESIZE_LONG_EDGES = [4096, 3072, 2048, 1536, 1024];

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function logApimartDiagnostic(
  event: string,
  details: Record<string, unknown>
) {
  console.info(
    `[apimart:image-generation] ${JSON.stringify({
      event,
      ...details,
    })}`
  );
}

function hashPrompt(prompt: string) {
  return crypto.createHash("sha256").update(prompt).digest("hex").slice(0, 16);
}

function getReferenceImageBytes(referenceImage: string) {
  if (!referenceImage.startsWith("data:image/")) return 0;

  const base64 = referenceImage.split(",", 2)[1] || "";
  const padding = base64.match(/=+$/)?.[0].length || 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

async function fetchJson(url: string, init: RequestInit) {
  const res = await fetch(url, init);
  const text = await res.text();
  let data: unknown;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}: ${JSON.stringify(data)}`);
  }

  return data;
}

function normalizeImage(item: ImageValue | string) {
  if (typeof item === "string") return [item];
  const url = item.url || item.image_url || item.b64_json;
  return Array.isArray(url) ? url : [url];
}

function isLikelyApimartBackupImage(imageUrl: string) {
  return /backup_task|[_/-]backup[_/-]/i.test(imageUrl);
}

function getGeneratedImageUrls(imageUrls: string[]) {
  return imageUrls.filter((imageUrl) => !isLikelyApimartBackupImage(imageUrl));
}

function extractApimartImageUrls(payload: unknown): string[] {
  const value = payload as {
    data?: Array<DataValue> | DataValue;
    images?: Array<ImageValue | string>;
    output?: Array<string>;
    result?: { images?: Array<ImageValue | string> };
  };
  const dataItems = Array.isArray(value.data) ? value.data : value.data ? [value.data] : [];

  const candidates = [
    ...dataItems.flatMap((item) => (item.images ?? []).flatMap(normalizeImage)),
    ...dataItems.flatMap((item) => (item.result?.images ?? []).flatMap(normalizeImage)),
    ...dataItems.flatMap((item) => item.output ?? []),
    ...(value.images ?? []).flatMap(normalizeImage),
    ...(value.output ?? []),
    ...(value.result?.images ?? []).flatMap(normalizeImage),
    ...dataItems.flatMap(normalizeImage),
  ];

  return candidates.filter((item): item is string => Boolean(item));
}

function extractApimartTaskId(payload: unknown) {
  const value = payload as {
    task_id?: string;
    id?: string;
    data?: { task_id?: string; id?: string } | Array<{ task_id?: string; id?: string }>;
  };

  if (Array.isArray(value.data)) {
    return value.task_id || value.id || value.data[0]?.task_id || value.data[0]?.id;
  }

  return value.task_id || value.id || value.data?.task_id || value.data?.id;
}

function extractApimartUploadUrl(payload: unknown) {
  const value = payload as {
    url?: string;
    image_url?: string;
    data?: { url?: string; image_url?: string } | Array<{ url?: string; image_url?: string }>;
  };

  if (Array.isArray(value.data)) {
    return value.url || value.image_url || value.data[0]?.url || value.data[0]?.image_url;
  }

  return value.url || value.image_url || value.data?.url || value.data?.image_url;
}

function formatApimartResolution(model: string, resolution: "1k" | "2k" | "4k") {
  if (model.startsWith("gemini-3.1-flash-image-preview")) {
    return resolution.toUpperCase();
  }

  return resolution;
}

function formatApimartSize(model: string, aspectRatioOption: string, inferredAspectRatio?: string) {
  if (model.startsWith("gemini-3.1-flash-image-preview") && aspectRatioOption === "auto") {
    return inferredAspectRatio || "1:1";
  }

  return aspectRatioOption;
}

function resolveApimartModel(model?: string) {
  return model || "gpt-image-2";
}

function isRetryableApimartError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();

  if (
    message.includes("unsupported image aspect ratio") ||
    message.includes("tool choice") ||
    message.includes("image_generation") ||
    message.includes("policy") ||
    message.includes("safety") ||
    message.includes("moderation") ||
    message.includes("forbidden") ||
    message.includes("http 400") ||
    message.includes("400 bad request")
  ) {
    return false;
  }

  return (
    message.includes("please wait") ||
    message.includes("try again later") ||
    message.includes("排队超时") ||
    message.includes("timeout") ||
    message.includes("fetch failed") ||
    message.includes("econnreset") ||
    message.includes("http 500") ||
    message.includes("http 502") ||
    message.includes("http 503") ||
    message.includes("http 504") ||
    message.includes("500 internal server error") ||
    message.includes("502 bad gateway") ||
    message.includes("503 service unavailable") ||
    message.includes("504 gateway timeout")
  );
}

type NormalizedReferenceImage = {
  buffer: Buffer;
  filename: string;
  contentType: "image/png" | "image/jpeg";
  originalBytes: number;
  uploadBytes: number;
};

function buildNormalizedReferenceImage(
  buffer: Buffer,
  index: number,
  extension: "png" | "jpg",
  contentType: "image/png" | "image/jpeg",
  originalBytes: number
): NormalizedReferenceImage {
  return {
    buffer,
    filename: `reference-${index + 1}.${extension}`,
    contentType,
    originalBytes,
    uploadBytes: buffer.byteLength,
  };
}

async function normalizeReferenceImageForUpload(referenceImage: string, index: number) {
  let imageBuffer: Buffer;

  if (referenceImage.startsWith("/uploads/")) {
    const filepath = getLocalUploadPath(referenceImage);
    if (!filepath) throw new Error(`Invalid local reference image path: ${referenceImage}`);

    imageBuffer = await readFile(filepath);
  } else if (referenceImage.startsWith("data:image/")) {
    imageBuffer = dataUrlToBuffer(referenceImage);
  } else {
    const response = await fetch(referenceImage);
    if (!response.ok) {
      throw new Error(`Failed to download reference image: ${response.status} ${response.statusText}`);
    }
    const contentType = response.headers.get("content-type") || "image/png";
    if (!contentType.startsWith("image/")) {
      throw new Error(`Reference image URL did not return an image: ${contentType}`);
    }
    imageBuffer = Buffer.from(await response.arrayBuffer());
  }

  const sourceImage = sharp(imageBuffer, { pages: 1 }).rotate();
  const pngBuffer = await sourceImage.clone().png().toBuffer();

  if (pngBuffer.byteLength <= APIMART_UPLOAD_MAX_BYTES) {
    return buildNormalizedReferenceImage(
      pngBuffer,
      index,
      "png",
      "image/png",
      imageBuffer.byteLength
    );
  }

  for (const quality of APIMART_REFERENCE_JPEG_QUALITIES) {
    const jpegBuffer = await sourceImage.clone().jpeg({ quality, mozjpeg: true }).toBuffer();
    if (jpegBuffer.byteLength <= APIMART_UPLOAD_MAX_BYTES) {
      return buildNormalizedReferenceImage(
        jpegBuffer,
        index,
        "jpg",
        "image/jpeg",
        imageBuffer.byteLength
      );
    }
  }

  for (const longEdge of APIMART_REFERENCE_RESIZE_LONG_EDGES) {
    const resizedBuffer = await sourceImage
      .clone()
      .resize({ width: longEdge, height: longEdge, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();

    if (resizedBuffer.byteLength <= APIMART_UPLOAD_MAX_BYTES) {
      return buildNormalizedReferenceImage(
        resizedBuffer,
        index,
        "jpg",
        "image/jpeg",
        imageBuffer.byteLength
      );
    }
  }

  throw new Error(
    `Reference image upload exceeds APIMart 20MB limit after normalization: reference=${
      index + 1
    }, originalBytes=${imageBuffer.byteLength}, normalizedBytes=${pngBuffer.byteLength}, maxBytes=${APIMART_UPLOAD_MAX_BYTES}`
  );
}

async function uploadApimartReferenceImage({
  referenceImage,
  index,
  baseURL,
  apiKey,
  traceId,
}: {
  referenceImage: string;
  index: number;
  baseURL: string;
  apiKey: string;
  traceId?: string;
}) {
  const normalizedImage = await normalizeReferenceImageForUpload(referenceImage, index);
  const formData = new FormData();

  logApimartDiagnostic("reference-upload", {
    traceId,
    referenceIndex: index + 1,
    filename: normalizedImage.filename,
    contentType: normalizedImage.contentType,
    originalBytes: normalizedImage.originalBytes,
    uploadBytes: normalizedImage.uploadBytes,
    maxBytes: APIMART_UPLOAD_MAX_BYTES,
  });

  formData.append(
    "file",
    new Blob([normalizedImage.buffer as BlobPart], { type: normalizedImage.contentType }),
    normalizedImage.filename
  );

  const uploaded = await fetchJson(`${baseURL}/uploads/images`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });
  const uploadedUrl = extractApimartUploadUrl(uploaded);

  if (!uploadedUrl) {
    throw new Error(`APIMart upload response missing url: ${JSON.stringify(uploaded)}`);
  }

  return uploadedUrl;
}

async function pollApimartTask({
  taskId,
  baseURL,
  apiKey,
  traceId,
  attempt,
}: {
  taskId: string;
  baseURL: string;
  apiKey: string;
  traceId?: string;
  attempt: number;
}) {
  const startedAt = Date.now();
  const deadline = Date.now() + DEFAULT_TIMEOUT_MS;
  let lastPayload: unknown;
  let lastLoggedStatus = "";
  let lastPollLogAt = 0;

  while (Date.now() < deadline) {
    const payload = await fetchJson(`${baseURL}/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    lastPayload = payload;

    const status = String(
      (payload as { status?: string; data?: { status?: string } }).status ||
        (payload as { data?: { status?: string } }).data?.status ||
        ""
    ).toLowerCase();
    const pollElapsedMs = Date.now() - startedAt;

    if (
      status !== lastLoggedStatus ||
      Date.now() - lastPollLogAt >= APIMART_DIAGNOSTIC_POLL_LOG_INTERVAL_MS
    ) {
      lastLoggedStatus = status;
      lastPollLogAt = Date.now();
      logApimartDiagnostic("poll", {
        traceId,
        providerTaskId: taskId,
        attempt,
        status,
        pollElapsedMs,
      });
    }

    if (["completed", "succeeded", "success"].includes(status)) {
      logApimartDiagnostic("poll-completed", {
        traceId,
        providerTaskId: taskId,
        attempt,
        status,
        pollElapsedMs,
      });
      return payload;
    }
    if (["failed", "error", "cancelled", "canceled"].includes(status)) {
      logApimartDiagnostic("poll-failed", {
        traceId,
        providerTaskId: taskId,
        attempt,
        status,
        pollElapsedMs,
      });
      throw new Error(`APIMart task failed: ${JSON.stringify(payload)}`);
    }

    await sleep(POLL_INTERVAL_MS);
  }

  logApimartDiagnostic("poll-timeout", {
    traceId,
    providerTaskId: taskId,
    attempt,
    pollElapsedMs: Date.now() - startedAt,
  });
  throw new Error(`APIMart 任务排队超时，请稍后重试或降低分辨率后再试: ${JSON.stringify(lastPayload)}`);
}

async function submitAndResolveApimartImage({
  baseURL,
  apiKey,
  selectedModel,
  modelConfig,
  finalPrompt,
  requestSize,
  requestResolution,
  quality,
  uploadedReferenceImageUrls,
  traceId,
  attempt,
  promptHash,
  promptLength,
  referenceCount,
  referenceBytes,
}: {
  baseURL: string;
  apiKey: string;
  selectedModel: string;
  modelConfig: ReturnType<typeof getImageModelConfig>;
  finalPrompt: string;
  requestSize: string;
  requestResolution: string;
  quality: "low" | "medium" | "high";
  uploadedReferenceImageUrls?: string[];
  traceId?: string;
  attempt: number;
  promptHash: string;
  promptLength: number;
  referenceCount: number;
  referenceBytes: number;
}) {
  const startedAt = Date.now();
  const endpoint = "/images/generations";
  logApimartDiagnostic("submit", {
    traceId,
    attempt,
    endpoint,
    selectedModel,
    requestSize,
    requestResolution,
    quality: modelConfig.supportsQuality ? quality : undefined,
    supportsQuality: modelConfig.supportsQuality,
    promptHash,
    promptLength,
    referenceCount,
    referenceBytes,
  });

  const submitted = await fetchJson(`${baseURL}${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: selectedModel,
      prompt: finalPrompt,
      n: 1,
      size: requestSize,
      ...(modelConfig.supportsResolution ? { resolution: requestResolution } : {}),
      ...(modelConfig.supportsQuality ? { quality } : {}),
      ...(uploadedReferenceImageUrls ? { image_urls: uploadedReferenceImageUrls } : {}),
    }),
  });

  const directImages = extractApimartImageUrls(submitted);
  const directGeneratedImages = getGeneratedImageUrls(directImages);
  const taskId = extractApimartTaskId(submitted);
  logApimartDiagnostic("submitted", {
    traceId,
    attempt,
    providerTaskId: taskId,
    directImageCount: directImages.length,
    directGeneratedImageCount: directGeneratedImages.length,
    submitElapsedMs: Date.now() - startedAt,
  });

  let finalImages =
    directGeneratedImages.length > 0 || (directImages.length > 0 && !taskId)
      ? directGeneratedImages.length > 0
        ? directGeneratedImages
        : directImages
      : [];

  if (finalImages.length === 0) {
    const polledImages = extractApimartImageUrls(
      await pollApimartTask({
        taskId:
          taskId ||
          (() => {
            throw new Error(`APIMart response missing task id: ${JSON.stringify(submitted)}`);
          })(),
        baseURL,
        apiKey,
        traceId,
        attempt,
      })
    );
    const generatedPolledImages = getGeneratedImageUrls(polledImages);
    finalImages = generatedPolledImages.length > 0 ? generatedPolledImages : polledImages;
  }

  const imageUrl = finalImages[0];
  if (!imageUrl) {
    throw new Error("No image data returned from APIMart");
  }

  logApimartDiagnostic("resolved", {
    traceId,
    attempt,
    providerTaskId: taskId,
    finalImageCount: finalImages.length,
    elapsedMs: Date.now() - startedAt,
  });

  return imageUrl;
}

export async function generateWithApimart({
  apiKey,
  baseURL,
  prompt,
  model,
  referenceImages,
  aspectRatioOption = "auto",
  quality = "low",
  resolution = "1k",
  filepath,
  persistRemoteImage = false,
  traceId,
  configuredModel,
}: {
  apiKey: string;
  baseURL: string;
  prompt: string;
  model?: string;
  referenceImages?: string[];
  aspectRatioOption?: string;
  quality?: "low" | "medium" | "high";
  resolution?: "1k" | "2k" | "4k";
  filepath: string;
  persistRemoteImage?: boolean;
  traceId?: string;
  configuredModel?: ImageModelConfig;
}): Promise<string | void> {
  if (!apiKey) throw new Error("站点尚未配置图片 API Key");
  const selectedModel = resolveApimartModel(model);
  const modelConfig = configuredModel || getImageModelConfig(selectedModel);
  const requestResolution = formatApimartResolution(selectedModel, resolution);
  const aspectRatio = resolveAspectRatio(prompt, aspectRatioOption);
  const requestSize = formatApimartSize(selectedModel, aspectRatioOption, aspectRatio?.text);
  const referenceAwarePrompt = buildReferenceImagePrompt(
    prompt,
    Boolean(referenceImages?.length)
  );
  const finalPrompt = buildImagePrompt(referenceAwarePrompt, aspectRatio);
  const promptHash = hashPrompt(finalPrompt);
  const promptLength = finalPrompt.length;
  const referenceCount = referenceImages?.length || 0;
  const referenceBytes =
    referenceImages?.reduce(
      (total, referenceImage) => total + getReferenceImageBytes(referenceImage),
      0
    ) || 0;
  const uploadedReferenceImageUrls = referenceImages?.length
    ? await Promise.all(
        referenceImages.map((referenceImage, index) =>
          uploadApimartReferenceImage({
            referenceImage,
            index,
            baseURL,
            apiKey,
            traceId,
          })
        )
      )
    : undefined;

  let imageUrl: string | undefined;
  for (let attempt = 1; attempt <= APIMART_GENERATION_MAX_ATTEMPTS; attempt += 1) {
    try {
      imageUrl = await submitAndResolveApimartImage({
        baseURL,
        apiKey,
        selectedModel,
        modelConfig,
        finalPrompt,
        requestSize,
        requestResolution,
        quality,
        uploadedReferenceImageUrls,
        traceId,
        attempt,
        promptHash,
        promptLength,
        referenceCount,
        referenceBytes,
      });
      break;
    } catch (error) {
      logApimartDiagnostic("attempt-failed", {
        traceId,
        attempt,
        selectedModel,
        requestSize,
        requestResolution,
        promptHash,
        promptLength,
        referenceCount,
        referenceBytes,
        error: getErrorMessage(error),
      });
      if (attempt >= APIMART_GENERATION_MAX_ATTEMPTS || !isRetryableApimartError(error)) {
        throw error;
      }

      await sleep(1500 * attempt);
    }
  }

  if (!imageUrl) throw new Error("No image data returned from APIMart");

  if (persistRemoteImage || imageUrl.startsWith("data:")) {
    try {
      await downloadRemoteImage(imageUrl, filepath);
      return;
    } catch (error) {
      throw new Error(`APIMart image download failed: ${getErrorMessage(error)}`);
    }
  }

  return imageUrl;
}
