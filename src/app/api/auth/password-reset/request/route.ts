import { NextResponse } from "next/server";
import { z } from "zod";
import { sendPasswordResetVerificationCode, normalizeEmail } from "@/lib/email-verification";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp, rejectLargeRequest } from "@/lib/request-security";
import { prisma } from "@/lib/prisma";

const passwordResetRequestSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
});

export async function POST(request: Request) {
  try {
    const tooLarge = rejectLargeRequest(request, 16 * 1024);
    if (tooLarge) return tooLarge;

    const ip = getClientIp(request);
    if (!rateLimit(`password-reset-request:ip:${ip}`, 8, 15 * 60 * 1000).success) {
      return NextResponse.json({ error: "请求过于频繁，请稍后再试" }, { status: 429 });
    }

    const parsed = passwordResetRequestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "请输入有效的邮箱地址" },
        { status: 400 }
      );
    }

    const email = normalizeEmail(parsed.data.email);
    if (!rateLimit(`password-reset-request:email:${email}`, 5, 15 * 60 * 1000).success) {
      return NextResponse.json({ error: "请求过于频繁，请稍后再试" }, { status: 429 });
    }

    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!existing) {
      return NextResponse.json({ error: "该邮箱尚未注册" }, { status: 404 });
    }

    const result = await sendPasswordResetVerificationCode(email);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 429 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "验证码发送失败，请稍后再试" }, { status: 500 });
  }
}
