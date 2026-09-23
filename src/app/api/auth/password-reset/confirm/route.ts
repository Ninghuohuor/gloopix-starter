import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizeEmail, verifyPasswordResetCode } from "@/lib/email-verification";
import { resetLoginFailures } from "@/lib/login-security";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp, rejectLargeRequest } from "@/lib/request-security";
import { passwordStrengthSchema } from "@/lib/validations";

const passwordResetConfirmSchema = z
  .object({
    email: z.string().email("请输入有效的邮箱地址"),
    verificationCode: z.string().regex(/^\d{6}$/, "请输入6位邮箱验证码"),
    newPassword: passwordStrengthSchema,
    confirmPassword: z.string().min(1, "请再次输入新密码"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "两次输入的新密码不一致",
    path: ["confirmPassword"],
  });

export async function POST(request: Request) {
  try {
    const tooLarge = rejectLargeRequest(request, 32 * 1024);
    if (tooLarge) return tooLarge;

    const ip = getClientIp(request);
    if (!rateLimit(`password-reset-confirm:ip:${ip}`, 10, 15 * 60 * 1000).success) {
      return NextResponse.json({ error: "请求过于频繁，请稍后再试" }, { status: 429 });
    }

    const parsed = passwordResetConfirmSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "参数错误" },
        { status: 400 }
      );
    }

    const { verificationCode, newPassword } = parsed.data;
    const email = normalizeEmail(parsed.data.email);
    const isCodeValid = await verifyPasswordResetCode(email, verificationCode);
    if (!isCodeValid) {
      return NextResponse.json({ error: "验证码错误或已过期" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) {
      return NextResponse.json({ error: "该邮箱尚未注册" }, { status: 404 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });
    await resetLoginFailures(email);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "重置密码失败，请稍后再试" }, { status: 500 });
  }
}
