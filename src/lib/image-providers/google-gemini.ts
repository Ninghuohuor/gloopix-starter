import { readFile, writeFile } from "fs/promises";
import { dataUrlToBuffer, getErrorMessage } from "@/lib/image-providers/shared";
import { getLocalUploadPath } from "@/lib/uploads";

async function referencePart(value: string) {
  if (value.startsWith("data:image/")) {
    const [header] = value.split(",", 1);
    return { inlineData: { mimeType: header.slice(5).split(";")[0] || "image/png", data: dataUrlToBuffer(value).toString("base64") } };
  }
  if (value.startsWith("/uploads/")) {
    const path = getLocalUploadPath(value); if (!path) throw new Error("参考图路径无效");
    return { inlineData: { mimeType: "image/png", data: (await readFile(path)).toString("base64") } };
  }
  const response = await fetch(value); if (!response.ok) throw new Error(`参考图下载失败: ${response.status}`);
  return { inlineData: { mimeType: response.headers.get("content-type") || "image/png", data: Buffer.from(await response.arrayBuffer()).toString("base64") } };
}

export async function generateWithGoogleGemini({ apiKey, baseURL, model, prompt, referenceImages, aspectRatioOption, resolution, filepath }: { apiKey: string; baseURL: string; model: string; prompt: string; referenceImages?: string[]; aspectRatioOption: string; resolution: "1k" | "2k" | "4k"; filepath: string }) {
  if (!apiKey) throw new Error("站点尚未配置图片 API Key");
  const parts: unknown[] = [{ text: prompt }];
  for (const image of referenceImages || []) parts.push(await referencePart(image));
  const response = await fetch(`${baseURL.replace(/\/$/, "")}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: { responseModalities: ["TEXT", "IMAGE"], imageConfig: { ...(aspectRatioOption !== "auto" ? { aspectRatio: aspectRatioOption } : {}), imageSize: resolution.toUpperCase() } } }),
  });
  const payload = await response.json().catch(() => null) as { candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string } }> } }>; error?: unknown } | null;
  if (!response.ok) throw new Error(`Gemini 图片生成失败: ${response.status} ${getErrorMessage(payload?.error || payload)}`);
  const data = payload?.candidates?.flatMap((candidate) => candidate.content?.parts || []).find((part) => part.inlineData?.data)?.inlineData?.data;
  if (!data) throw new Error("Gemini 没有返回图片数据");
  await writeFile(filepath, Buffer.from(data, "base64"));
}
