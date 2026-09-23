import crypto from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { requireAdmin } from "@/lib/admin-guard";
import { rateLimit } from "@/lib/rate-limit";
import { rejectLargeRequest } from "@/lib/request-security";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ANNOUNCEMENT_IMAGE_MAX_EDGE = 1600;
const ANNOUNCEMENT_IMAGE_WEBP_QUALITY = 90;

export async function POST(request: Request) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const tooLarge = rejectLargeRequest(request, MAX_UPLOAD_BYTES + 1024 * 1024);
  if (tooLarge) return tooLarge;

  if (!rateLimit(`admin-announcement-upload:${session!.user.id}`, 30, 60 * 60 * 1000).success) {
    return NextResponse.json({ error: "上传过于频繁，请稍后再试" }, { status: 429 });
  }

  const formData = await request.formData();
  const file = formData.get("image");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "请上传图片" }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "请选择图片文件" }, { status: 400 });
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "图片大小不能超过 5MB" }, { status: 400 });
  }

  try {
    const sourceBuffer = Buffer.from(await file.arrayBuffer());
    const metadata = await sharp(sourceBuffer, { failOn: "none" }).metadata();
    if (!metadata.format || !metadata.width || !metadata.height) {
      return NextResponse.json({ error: "图片格式无效" }, { status: 400 });
    }

    const output = await sharp(sourceBuffer, { failOn: "none" })
      .rotate()
      .resize({
        width: ANNOUNCEMENT_IMAGE_MAX_EDGE,
        height: ANNOUNCEMENT_IMAGE_MAX_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: ANNOUNCEMENT_IMAGE_WEBP_QUALITY })
      .toBuffer({ resolveWithObject: true });

    const uploadDir = path.join(process.cwd(), "public", "uploads", "announcements");
    await mkdir(uploadDir, { recursive: true });

    const filename = `${crypto.randomUUID()}.webp`;
    await writeFile(path.join(uploadDir, filename), output.data);

    return NextResponse.json({
      success: true,
      imageUrl: `/uploads/announcements/${filename}`,
      width: output.info.width,
      height: output.info.height,
      bytes: output.info.size,
    });
  } catch {
    return NextResponse.json({ error: "图片处理失败" }, { status: 400 });
  }
}
