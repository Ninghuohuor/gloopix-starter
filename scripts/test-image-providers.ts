import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";

type Provider = "apimart" | "fal";

type TestOptions = {
  provider: Provider | "both";
  prompt: string;
  aspectRatio: string;
  quantity: number;
  reference?: string;
  timeoutMs: number;
};

type ProviderResult = {
  provider: Provider;
  ok: boolean;
  elapsedMs: number;
  images: string[];
  error?: string;
  raw?: unknown;
};

function parseArgs(): TestOptions {
  const args = process.argv.slice(2);
  const options: TestOptions = {
    provider: "both",
    prompt: "马斯克正在抖音直播截图",
    aspectRatio: "9:16",
    quantity: 1,
    timeoutMs: 180_000,
  };

  for (let index = 0; index < args.length; index++) {
    const key = args[index];
    const value = args[index + 1];

    if (key === "--provider" && value) {
      if (!["apimart", "fal", "both"].includes(value)) {
        throw new Error("--provider must be apimart, fal, or both");
      }
      options.provider = value as TestOptions["provider"];
      index++;
    } else if (key === "--prompt" && value) {
      options.prompt = value;
      index++;
    } else if (key === "--aspect-ratio" && value) {
      options.aspectRatio = value;
      index++;
    } else if (key === "--quantity" && value) {
      options.quantity = Number(value);
      index++;
    } else if (key === "--reference" && value) {
      options.reference = value;
      index++;
    } else if (key === "--timeout-ms" && value) {
      options.timeoutMs = Number(value);
      index++;
    }
  }

  if (!Number.isInteger(options.quantity) || options.quantity < 1 || options.quantity > 4) {
    throw new Error("--quantity must be an integer between 1 and 4");
  }

  return options;
}

function mimeSubtypeFor(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "jpeg";
  if (ext === ".webp") return "webp";
  return "png";
}

async function readReferenceImage(reference?: string) {
  if (!reference) return undefined;
  if (/^https?:\/\//.test(reference) || reference.startsWith("data:image/")) {
    return reference;
  }

  const bytes = await readFile(reference);
  const mimeSubtype = mimeSubtypeFor(reference);
  return `data:image/${mimeSubtype};base64,${bytes.toString("base64")}`;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
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

function imageSizeForFal(aspectRatio: string) {
  const normalized = aspectRatio.trim();
  if (normalized === "auto") return "auto";
  if (normalized === "1:1") return "square";
  if (normalized === "9:16") return "portrait_16_9";
  if (normalized === "16:9") return "landscape_16_9";
  if (normalized === "3:4") return "portrait_4_3";
  if (normalized === "4:3") return "landscape_4_3";

  const match = normalized.match(/^(\d{1,2})\s*:\s*(\d{1,2})$/);
  if (!match) return "auto";

  const widthRatio = Number(match[1]);
  const heightRatio = Number(match[2]);
  const maxSide = 1536;
  const scale = maxSide / Math.max(widthRatio, heightRatio);
  const width = Math.max(16, Math.round((widthRatio * scale) / 16) * 16);
  const height = Math.max(16, Math.round((heightRatio * scale) / 16) * 16);

  return { width, height };
}

function extractImageUrls(payload: unknown): string[] {
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
  const value = payload as {
    data?: Array<DataValue> | DataValue;
    images?: Array<ImageValue | string>;
    output?: Array<string>;
    result?: { images?: Array<ImageValue | string> };
  };
  const dataItems = Array.isArray(value.data) ? value.data : value.data ? [value.data] : [];
  const normalizeImage = (item: ImageValue | string) => {
    if (typeof item === "string") return [item];
    const url = item.url || item.image_url || item.b64_json;
    return Array.isArray(url) ? url : [url];
  };

  const candidates = [
    ...dataItems.flatMap(normalizeImage),
    ...dataItems.flatMap((item) =>
      (item.images ?? []).flatMap(normalizeImage)
    ),
    ...dataItems.flatMap((item) =>
      (item.result?.images ?? []).flatMap(normalizeImage)
    ),
    ...dataItems.flatMap((item) => item.output ?? []),
    ...(value.images ?? []).flatMap(normalizeImage),
    ...(value.output ?? []),
    ...(value.result?.images ?? []).flatMap(normalizeImage),
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

async function pollApimartTask(taskId: string, timeoutMs: number) {
  const baseURL = process.env.APIMART_BASE_URL || "https://api.apimart.ai/v1";
  const apiKey = process.env.APIMART_API_KEY;
  if (!apiKey) throw new Error("APIMART_API_KEY is not set");

  const deadline = Date.now() + timeoutMs;
  let lastPayload: unknown;

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

    if (["completed", "succeeded", "success"].includes(status)) return payload;
    if (["failed", "error", "cancelled", "canceled"].includes(status)) {
      throw new Error(`APIMart task failed: ${JSON.stringify(payload)}`);
    }

    await sleep(2500);
  }

  throw new Error(`APIMart task timed out: ${JSON.stringify(lastPayload)}`);
}

async function runApimart(options: TestOptions): Promise<ProviderResult> {
  const startedAt = Date.now();

  try {
    const apiKey = process.env.APIMART_API_KEY;
    if (!apiKey) throw new Error("APIMART_API_KEY is not set");

    const baseURL = process.env.APIMART_BASE_URL || "https://api.apimart.ai/v1";
    const model = process.env.APIMART_MODEL || "gpt-image-2";
    const referenceImage = await readReferenceImage(options.reference);
    const images: string[] = [];
    const raw: unknown[] = [];

    for (let index = 0; index < options.quantity; index++) {
      const payload = await fetchJson(`${baseURL}/images/generations`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          prompt: options.prompt,
          n: 1,
          size: options.aspectRatio,
          ...(referenceImage ? { image_urls: [referenceImage] } : {}),
        }),
      });

      raw.push(payload);
      const directImages = extractImageUrls(payload);
      if (directImages.length > 0) {
        images.push(...directImages);
        continue;
      }

      const taskId = extractApimartTaskId(payload);
      if (!taskId) throw new Error(`APIMart response missing task id: ${JSON.stringify(payload)}`);

      const completed = await pollApimartTask(taskId, options.timeoutMs);
      raw.push(completed);
      images.push(...extractImageUrls(completed));
    }

    return {
      provider: "apimart",
      ok: images.length > 0,
      elapsedMs: Date.now() - startedAt,
      images,
      raw,
    };
  } catch (error) {
    return {
      provider: "apimart",
      ok: false,
      elapsedMs: Date.now() - startedAt,
      images: [],
      error: getErrorMessage(error),
    };
  }
}

async function runFal(options: TestOptions): Promise<ProviderResult> {
  const startedAt = Date.now();

  try {
    const apiKey = process.env.FAL_KEY;
    if (!apiKey) throw new Error("FAL_KEY is not set");

    const referenceImage = await readReferenceImage(options.reference);
    const endpoint = referenceImage ? "openai/gpt-image-2/edit" : "openai/gpt-image-2";
    const submitted = (await fetchJson(`https://queue.fal.run/${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Key ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: options.prompt,
        image_size: imageSizeForFal(options.aspectRatio),
        num_images: options.quantity,
        quality: "high",
        output_format: "png",
        ...(referenceImage ? { image_urls: [referenceImage] } : {}),
      }),
    })) as { status_url?: string; response_url?: string };

    if (!submitted.status_url || !submitted.response_url) {
      throw new Error(`fal response missing queue URLs: ${JSON.stringify(submitted)}`);
    }

    const deadline = Date.now() + options.timeoutMs;
    let statusPayload: unknown;
    while (Date.now() < deadline) {
      statusPayload = await fetchJson(submitted.status_url, {
        headers: { Authorization: `Key ${apiKey}` },
      });
      const status = String((statusPayload as { status?: string }).status || "").toUpperCase();
      if (status === "COMPLETED") break;
      if (["FAILED", "ERROR", "CANCELED", "CANCELLED"].includes(status)) {
        throw new Error(`fal task failed: ${JSON.stringify(statusPayload)}`);
      }
      await sleep(2500);
    }

    const result = await fetchJson(submitted.response_url, {
      headers: { Authorization: `Key ${apiKey}` },
    });
    const images = extractImageUrls(result);

    return {
      provider: "fal",
      ok: images.length > 0,
      elapsedMs: Date.now() - startedAt,
      images,
      raw: { submitted, statusPayload, result },
    };
  } catch (error) {
    return {
      provider: "fal",
      ok: false,
      elapsedMs: Date.now() - startedAt,
      images: [],
      error: getErrorMessage(error),
    };
  }
}

async function main() {
  const options = parseArgs();
  const providers: Provider[] =
    options.provider === "both" ? ["apimart", "fal"] : [options.provider];

  const results = [];
  for (const provider of providers) {
    results.push(provider === "apimart" ? await runApimart(options) : await runFal(options));
  }

  console.log(JSON.stringify({ options, results }, null, 2));

  if (results.every((result) => !result.ok)) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
