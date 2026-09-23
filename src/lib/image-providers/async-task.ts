import { readFile } from "fs/promises";
import path from "path";
import { buildImagePrompt, buildReferenceImagePrompt, resolveAspectRatio } from "@/lib/aspect-ratio";
import { type AsyncTaskProtocol, protocolUrl, readJsonPath, statusValues } from "@/lib/async-task-protocol";
import { downloadRemoteImage } from "@/lib/image-providers/shared";
import { type ImageModelConfig } from "@/lib/image-models";
import { getLocalUploadPath } from "@/lib/uploads";

type Options = {
  apiKey: string;
  baseURL: string;
  protocol: AsyncTaskProtocol;
  prompt: string;
  model: string;
  referenceImages?: string[];
  aspectRatioOption: string;
  quality?: "low" | "medium" | "high";
  resolution?: "1k" | "2k" | "4k";
  filepath: string;
  configuredModel: ImageModelConfig;
};

const TIMEOUT_MS = 300_000;
const POLL_INTERVAL_MS = 1_000;
const tinyImage = /^data:image\/(png|jpeg|webp|gif);base64,/i;

function firstString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value;
  if (Array.isArray(value)) return value.map(firstString).find(Boolean);
  if (value && typeof value === "object") {
    const item = value as Record<string, unknown>;
    return firstString(item.url) || firstString(item.image_url) ||
      (typeof item.b64_json === "string" ? `data:image/png;base64,${item.b64_json}` : undefined) ||
      firstString(item.images) || firstString(item.output) || firstString(item.data) || firstString(item.result);
  }
  return undefined;
}

function mappedString(payload: unknown, jsonPath: string, fallbacks: string[]) {
  if (jsonPath) return firstString(readJsonPath(payload, jsonPath));
  return fallbacks.map((candidate) => firstString(readJsonPath(payload, candidate))).find(Boolean);
}

async function fetchJson(url: string, init: RequestInit): Promise<unknown> {
  const response = await fetch(url, init);
  const body = await response.text();
  let payload: unknown;
  try { payload = body ? JSON.parse(body) : null; } catch { payload = body; }
  if (!response.ok) throw new Error(`异步接口返回 ${response.status}: ${body.slice(0, 300)}`);
  return payload;
}

function mimeFromPath(value: string) {
  const ext = path.extname(value).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "image/png";
}

async function referenceData(reference: string) {
  if (tinyImage.test(reference)) {
    const mime = reference.slice(5, reference.indexOf(";"));
    return { bytes: Buffer.from(reference.split(",", 2)[1], "base64"), mime };
  }
  const local = getLocalUploadPath(reference);
  if (local) return { bytes: await readFile(local), mime: mimeFromPath(local) };
  if (reference.startsWith("https://")) {
    const response = await fetch(reference);
    const mime = response.headers.get("content-type")?.split(";")[0] || "";
    if (!response.ok || !mime.startsWith("image/")) throw new Error("参考图地址未返回图片");
    return { bytes: Buffer.from(await response.arrayBuffer()), mime };
  }
  throw new Error("参考图必须是本站上传图片、图片 data URL 或 HTTPS 地址");
}

async function prepareReferences(references: string[], options: Options, headers: HeadersInit) {
  const values: string[] = [];
  for (const [index, reference] of references.entries()) {
    if (!options.protocol.uploadPath && reference.startsWith("https://")) {
      values.push(reference);
      continue;
    }
    const { bytes, mime } = await referenceData(reference);
    if (!options.protocol.uploadPath) {
      values.push(`data:${mime};base64,${bytes.toString("base64")}`);
      continue;
    }
    const form = new FormData();
    form.append(options.protocol.uploadField, new Blob([new Uint8Array(bytes)], { type: mime }), `reference-${index + 1}.${mime.split("/")[1] || "png"}`);
    const payload = await fetchJson(protocolUrl(options.baseURL, options.protocol.uploadPath), { method: "POST", headers, body: form });
    const url = mappedString(payload, options.protocol.uploadUrlPath, ["url", "image_url", "data.url", "data.image_url", "data.0.url"]);
    if (!url) throw new Error("参考图上传成功，但未找到图片地址；请检查上传响应字段路径");
    values.push(url);
  }
  return values;
}

export async function generateWithAsyncTask(options: Options) {
  const { protocol } = options;
  const authHeaders = { Authorization: `Bearer ${options.apiKey}` };
  const references = await prepareReferences(options.referenceImages || [], options, authHeaders);
  const ratio = resolveAspectRatio(options.prompt, options.aspectRatioOption);
  const body: Record<string, unknown> = {
    model: options.model,
    prompt: buildReferenceImagePrompt(buildImagePrompt(options.prompt, ratio), references.length > 0),
    n: 1,
    size: options.aspectRatioOption === "auto" ? ratio?.text || "auto" : options.aspectRatioOption,
  };
  if (options.configuredModel.supportsResolution) body.resolution = options.resolution || options.configuredModel.defaultResolution;
  if (options.configuredModel.supportsQuality && options.quality) body.quality = options.quality;
  if (references.length) body[protocol.referenceField] = references;

  const submitted = await fetchJson(protocolUrl(options.baseURL, protocol.submitPath), {
    method: "POST", headers: { ...authHeaders, "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  let image = mappedString(submitted, protocol.resultPath, ["data.0.url", "data.url", "data.images", "data.result.images", "images", "output", "result.images"]);
  if (!image) {
    const taskId = mappedString(submitted, protocol.taskIdPath, ["task_id", "id", "data.task_id", "data.id", "data.0.task_id", "data.0.id"]);
    if (!taskId) throw new Error("提交成功，但未找到任务 ID；请检查任务 ID 字段路径");
    const success = statusValues(protocol.successStatuses);
    const failure = statusValues(protocol.failureStatuses);
    const deadline = Date.now() + TIMEOUT_MS;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      const pollPath = protocol.taskPath.replace("{taskId}", encodeURIComponent(taskId));
      const polled = await fetchJson(protocolUrl(options.baseURL, pollPath), { headers: authHeaders });
      const status = mappedString(polled, protocol.statusPath, ["status", "data.status", "data.0.status", "state", "data.state"])?.toLowerCase();
      if (status && failure.includes(status)) throw new Error("上游异步任务失败");
      image = mappedString(polled, protocol.resultPath, ["data.images", "data.result.images", "data.output", "data.url", "images", "output", "result.images", "url"]);
      if (!status && image) break;
      if (status && success.includes(status)) {
        if (!image) throw new Error("任务已完成，但未找到图片；请检查结果字段路径");
        break;
      }
    }
    if (!image) throw new Error("异步任务等待超时");
  }
  if (!tinyImage.test(image) && !image.startsWith("https://")) throw new Error("异步接口返回的图片地址必须是 HTTPS 或图片 data URL");
  await downloadRemoteImage(image, options.filepath);
}
