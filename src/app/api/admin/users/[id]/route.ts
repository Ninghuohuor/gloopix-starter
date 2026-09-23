import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const disabledSchema = z.object({
  isDisabled: z.boolean(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  if (id === session!.user.id) {
    return NextResponse.json(
      { error: "不能禁用当前登录的管理员账号" },
      { status: 400 }
    );
  }

  const body = await request.json();
  const parsed = disabledSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const user = await prisma.user.update({
    where: { id },
    data: { isDisabled: parsed.data.isDisabled },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isDisabled: true,
      credits: true,
      lastLoginAt: true,
      lastActiveAt: true,
      createdAt: true,
      _count: { select: { images: true } },
    },
  });

  return NextResponse.json({ success: true, user });
}
