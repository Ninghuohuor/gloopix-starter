import crypto from "crypto";
import { readdir, stat, unlink, writeFile, mkdir } from "fs/promises";
import path from "path";
import { dataUrlToBuffer } from "@/lib/image-providers/shared";

export const REFERENCE_IMAGE_RETENTION_MS = 24 * 60 * 60 * 1000;

function getDataUrlMimeType(dataUrl: string) {
  return dataUrl.match(/^data:([^;,]+)[;,]/)?.[1] || "image/png";
}

function getImageExtension(mimeType: string) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/gif") return "gif";
  return "png";
}

export async function ensureReferenceUploadDir() {
  const dir = path.join(process.cwd(), "public", "uploads", "references");
  await mkdir(dir, { recursive: true });
  return dir;
}

export async function persistReferenceImages(referenceImages?: string[]) {
  if (!referenceImages?.length) return undefined;

  const dir = await ensureReferenceUploadDir();
  return Promise.all(
    referenceImages.map(async (referenceImage) => {
      if (!referenceImage.startsWith("data:image/")) return referenceImage;

      const mimeType = getDataUrlMimeType(referenceImage);
      const extension = getImageExtension(mimeType);
      const filename = `${crypto.randomUUID()}.${extension}`;
      const filepath = path.join(dir, filename);
      await writeFile(filepath, dataUrlToBuffer(referenceImage));
      return `/uploads/references/${filename}`;
    })
  );
}

export async function pruneExpiredReferenceUploads(now = Date.now()) {
  const dir = await ensureReferenceUploadDir();
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  await Promise.all(
    entries
      .filter((entry) => entry.isFile())
      .map(async (entry) => {
        const filepath = path.join(dir, entry.name);
        const fileStat = await stat(filepath).catch(() => null);
        if (!fileStat || now - fileStat.mtimeMs <= REFERENCE_IMAGE_RETENTION_MS) return;
        await unlink(filepath).catch(() => undefined);
      })
  );
}
