import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";
import { announcementSchema } from "@/lib/validations";
import { NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const announcements = await prisma.announcement.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      createdBy: { select: { email: true, name: true } },
    },
  });

  return NextResponse.json({
    announcement: announcements[0] || null,
    announcements,
  });
}

export async function POST(request: Request) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const body = await request.json();
  const parsed = announcementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const announcement = await prisma.$transaction(async (tx) => {
    await tx.announcement.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    return tx.announcement.create({
      data: {
        content: parsed.data.content,
        imageUrl: parsed.data.imageUrl || null,
        createdById: session!.user.id,
      },
      include: {
        createdBy: { select: { email: true, name: true } },
      },
    });
  });

  return NextResponse.json({ success: true, announcement });
}
