import { copyFile, mkdir, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";

export async function ensureUploadDir() {
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  return dir;
}

export async function ensureGeneratedUploadDir() {
  const dir = path.join(process.cwd(), "public", "uploads", "generated");
  await mkdir(dir, { recursive: true });
  return dir;
}

export function dataUrlToBuffer(dataUrl: string): Buffer {
  const base64 = dataUrl.split(",")[1];
  return Buffer.from(base64, "base64");
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

export async function writePlaceholder(filepath: string) {
  const placeholderPath = path.join(process.cwd(), "public", "placeholder.png");

  try {
    await copyFile(placeholderPath, filepath);
  } catch {
    const minimalPng = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg==",
      "base64"
    );
    await writeFile(filepath, minimalPng);
  }
}

async function normalizeImageBufferForPath(buffer: Buffer, filepath: string) {
  const ext = path.extname(filepath).toLowerCase();
  if (ext === ".png") return sharp(buffer).png().toBuffer();
  if (ext === ".webp") return sharp(buffer).webp({ quality: 92 }).toBuffer();
  if (ext === ".jpg" || ext === ".jpeg") return sharp(buffer).jpeg({ quality: 92 }).toBuffer();
  return buffer;
}

export async function downloadRemoteImage(url: string, filepath: string) {
  if (url.startsWith("data:")) {
    const buffer = await normalizeImageBufferForPath(dataUrlToBuffer(url), filepath);
    await writeFile(filepath, buffer);
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  const res = await fetch(url, { signal: controller.signal }).finally(() =>
    clearTimeout(timeout)
  );

  if (!res.ok) {
    throw new Error(`Failed to download image: ${res.status} ${res.statusText}`);
  }

  const buffer = await normalizeImageBufferForPath(Buffer.from(await res.arrayBuffer()), filepath);
  await writeFile(filepath, buffer);
}
