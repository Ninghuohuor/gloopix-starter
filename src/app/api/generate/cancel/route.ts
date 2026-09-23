import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  calculateImageCreditCost,
  type ImageQuality,
  type ImageResolution,
} from "@/lib/image-models";
import { touchUserActivity } from "@/lib/user-activity";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  await touchUserActivity(session.user.id);

  const body = await request.json().catch(() => null);
  const requestId = body?.requestId;
  if (typeof requestId !== "string") {
    return NextResponse.json({ error: "缺少请求 ID" }, { status: 400 });
  }

  const image = await prisma.image.findFirst({
    where: {
      userId: session.user.id,
      OR: [{ id: requestId }, { generationId: requestId }],
    },
  });

  if (!image) {
    return NextResponse.json({ success: true, refunded: false });
  }

  const result = await prisma.$transaction(async (tx) => {
    const creditCost = calculateImageCreditCost({
      model: image.model,
      quality: image.quality as ImageQuality,
      resolution: image.resolution as ImageResolution,
      quantity: image.quantity,
    });
    const creditCostPerImage = creditCost / image.quantity;

    const canceled = await tx.image.updateMany({
      where: { generationId: image.generationId || image.id, userId: session.user.id, status: "PENDING" },
      data: { status: "CANCELED" },
    });

    await tx.generationTask.updateMany({
      where: {
        id: image.generationId || image.id,
        userId: session.user.id,
        status: { notIn: ["COMPLETED", "FAILED"] },
      },
      data: {
        status: "CANCELED",
        lockedAt: null,
        lockedBy: null,
        completedAt: new Date(),
      },
    });

    if (canceled.count === 0) {
      return { refunded: false };
    }

    const refundAmount = canceled.count * creditCostPerImage;

    await tx.user.update({
      where: { id: session.user.id },
      data: { credits: { increment: refundAmount } },
    });

    await tx.creditTransaction.create({
      data: {
        userId: session.user.id,
        amount: refundAmount,
        type: "GENERATION_CANCEL_REFUND",
        relatedId: image.generationId || image.id,
      },
    });

    return { refunded: true };
  });

  return NextResponse.json({ success: true, ...result });
}
