import crypto from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { requireAdmin } from "@/lib/admin-guard";
import { rateLimit } from "@/lib/rate-limit";
import { rejectLargeRequest } from "@/lib/request-security";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
const MAX_BYTES = 2 * 1024 * 1024;

export async function POST(request: Request) {
  const { error, session } = await requireAdmin();
  if (error) return error;
  const tooLarge = rejectLargeRequest(request, MAX_BYTES + 512 * 1024);
  if (tooLarge) return tooLarge;
  if (!rateLimit(`admin-settings-assets:${session!.user.id}`, 30, 60 * 60 * 1000).success) {
    return NextResponse.json({ error: "上传过于频繁，请稍后再试" }, { status: 429 });
  }
  const form = await request.formData();
  const file = form.get("image");
  const kind = form.get("kind") === "favicon" ? "favicon" : "logo";
  if (!(file instanceof File)) return NextResponse.json({ error: "请选择图片" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "图片不能超过 2MB" }, { status: 400 });
  if (![/^image\/png$/, /^image\/jpe?g$/, /^image\/webp$/, /^image\/x-icon$/, /^image\/vnd\.microsoft\.icon$/].some((rule) => rule.test(file.type))) {
    return NextResponse.json({ error: kind === "favicon" ? "图标仅支持 PNG、JPG、WebP 或 ICO" : "Logo 仅支持 PNG、JPG 或 WebP" }, { status: 400 });
  }
  try {
    const source = Buffer.from(await file.arrayBuffer());
    const metadata = await sharp(source, { failOn: "none" }).metadata();
    if (!metadata.width || !metadata.height) return NextResponse.json({ error: "图片格式无效" }, { status: 400 });
    if (kind === "favicon" && Math.abs(metadata.width - metadata.height) / Math.max(metadata.width, metadata.height) > 0.05) {
      return NextResponse.json({ error: "标签页图标必须是正方形图片" }, { status: 400 });
    }
    const size = kind === "favicon" ? 128 : 1024;
    const output = await sharp(source, { failOn: "none" }).rotate().resize({ width: size, height: size, fit: "inside", withoutEnlargement: true }).png().toBuffer({ resolveWithObject: true });
    const dir = path.join(process.cwd(), "public", "uploads", "settings");
    await mkdir(dir, { recursive: true });
    const filename = `${kind}-${crypto.randomUUID()}.png`;
    await writeFile(path.join(dir, filename), output.data);
    return NextResponse.json({ success: true, imageUrl: `/uploads/settings/${filename}`, width: output.info.width, height: output.info.height, bytes: output.info.size });
  } catch {
    return NextResponse.json({ error: "图片处理失败" }, { status: 400 });
  }
}
