import { getLocalUploadPath } from "@/lib/uploads";
import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const REMOTE_IMAGE_HOSTS = new Set(["upload.apimart.ai"]);

function getExtensionFromContentType(contentType: string | null) {
  if (!contentType) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  if (contentType.includes("png")) return "png";
  return "png";
}

function getContentTypeForPath(filepath: string) {
  const ext = path.extname(filepath).toLowerCase();
  if (ext === ".webp") return "image/webp";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".gif") return "image/gif";
  return "image/png";
}

function attachmentHeaders(contentType: string, extension: string) {
  return {
    "Content-Type": contentType,
    "Content-Disposition": `attachment; filename="gloopix-image.${extension}"`,
    "Cache-Control": "private, no-store",
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get("url");

  if (!imageUrl) {
    return NextResponse.json({ error: "缺少图片地址" }, { status: 400 });
  }

  const localPath = getLocalUploadPath(imageUrl);
  if (localPath) {
    const contentType = getContentTypeForPath(localPath);
    const extension = path.extname(localPath).replace(".", "") || getExtensionFromContentType(contentType);
    const bytes = await readFile(localPath);
    return new Response(bytes, {
      headers: attachmentHeaders(contentType, extension),
    });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(imageUrl);
  } catch {
    return NextResponse.json({ error: "不支持下载这个图片地址" }, { status: 400 });
  }

  if (parsedUrl.protocol !== "https:" || !REMOTE_IMAGE_HOSTS.has(parsedUrl.hostname)) {
    return NextResponse.json({ error: "不支持下载这个图片地址" }, { status: 400 });
  }

  const imageResponse = await fetch(parsedUrl, { cache: "no-store" });
  if (!imageResponse.ok) {
    if (imageResponse.status === 404 || imageResponse.status === 410) {
      return NextResponse.json({ error: "图片源已过期，请重新生成" }, { status: 410 });
    }

    return NextResponse.json({ error: "图片下载失败" }, { status: 502 });
  }

  const contentType = imageResponse.headers.get("content-type") || "image/png";
  const extension = getExtensionFromContentType(contentType);
  const bytes = await imageResponse.arrayBuffer();

  return new Response(bytes, {
    headers: attachmentHeaders(contentType, extension),
  });
}
