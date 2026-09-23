import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { touchUserActivity } from "@/lib/user-activity";
import { passwordStrengthSchema } from "@/lib/validations";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "请输入当前密码"),
    newPassword: passwordStrengthSchema,
    confirmPassword: z.string().min(1, "请再次输入新密码"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "两次输入的新密码不一致",
    path: ["confirmPassword"],
  });

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  await touchUserActivity(session.user.id);

  const parsed = changePasswordSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "参数错误" },
      { status: 400 }
    );
  }

  const { currentPassword, newPassword } = parsed.data;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });

  if (!user) {
    return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  }

  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isCurrentPasswordValid) {
    return NextResponse.json({ error: "当前密码不正确" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash },
  });

  return NextResponse.json({ ok: true });
}
