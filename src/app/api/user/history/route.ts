import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { touchUserActivity } from "@/lib/user-activity";
import { getLocalUploadPath } from "@/lib/uploads";
import type { Prisma } from "@prisma/client";
import { unlink } from "fs/promises";
import { NextResponse } from "next/server";

const HISTORY_RETENTION_DAYS = 30;

function getHistoryRetentionCutoff() {
  return new Date(Date.now() - HISTORY_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

async function pruneExpiredHistoryImages(userId: string, cutoff: Date) {
  const expiredImages = await prisma.image.findMany({
    where: {
      userId,
      status: "COMPLETED",
      createdAt: { lt: cutoff },
    },
    select: { id: true, imageUrl: true, thumbnailUrl: true },
    take: 200,
  });

  if (expiredImages.length === 0) return;

  await prisma.image.deleteMany({
    where: { id: { in: expiredImages.map((image) => image.id) } },
  });

  await Promise.all(
    expiredImages.map(async (image) => {
      const filepath = getLocalUploadPath(image.imageUrl);
      if (filepath) await unlink(filepath).catch(() => undefined);
      const thumbnailPath = getLocalUploadPath(image.thumbnailUrl || "");
      if (thumbnailPath) await unlink(thumbnailPath).catch(() => undefined);
    })
  );
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  await touchUserActivity(session.user.id);

  const retentionCutoff = getHistoryRetentionCutoff();
  await pruneExpiredHistoryImages(session.user.id, retentionCutoff);

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
  const query = (searchParams.get("query") || "").trim();
  const fetchAll = searchParams.get("all") === "1";
  const skip = fetchAll ? undefined : (page - 1) * limit;
  const historyWhere: Prisma.ImageWhereInput = {
    userId: session.user.id,
    status: "COMPLETED",
    imageUrl: { not: "" },
    createdAt: { gte: getHistoryRetentionCutoff() },
    ...(query ? { prompt: { contains: query } } : {}),
  };

  const [images, total] = await Promise.all([
    prisma.image.findMany({
      where: historyWhere,
      orderBy: { createdAt: "desc" },
      skip,
      take: fetchAll ? undefined : limit,
    }),
    prisma.image.count({
      where: historyWhere,
    }),
  ]);

  return NextResponse.json({
    images,
    total,
    page: fetchAll ? 1 : page,
    totalPages: fetchAll ? 1 : Math.ceil(total / limit),
  });
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  await touchUserActivity(session.user.id);

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "缺少图片 ID" }, { status: 400 });
  }

  const image = await prisma.image.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!image) {
    return NextResponse.json({ error: "图片不存在" }, { status: 404 });
  }

  await prisma.image.delete({ where: { id: image.id } });

  const filepath = getLocalUploadPath(image.imageUrl);
  if (filepath) {
    await unlink(filepath).catch(() => undefined);
  }
  const thumbnailPath = getLocalUploadPath(image.thumbnailUrl || "");
  if (thumbnailPath) await unlink(thumbnailPath).catch(() => undefined);

  return NextResponse.json({ success: true });
}
