import { prisma } from "@/lib/prisma";
import { normalizeEmail, verifyRegistrationCode } from "@/lib/email-verification";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp, rejectLargeRequest } from "@/lib/request-security";
import { passwordStrengthSchema } from "@/lib/validations";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getPublicAppConfig } from "@/lib/api-settings";

const registerSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
  password: passwordStrengthSchema,
  name: z.string().min(1, "请输入昵称").max(50),
  verificationCode: z.string().regex(/^\d{6}$/, "请输入6位邮箱验证码"),
  acceptedTerms: z.boolean().refine((value) => value, "请先阅读并同意用户协议和隐私政策"),
});

export async function POST(request: Request) {
  try {
    const appConfig = await getPublicAppConfig();
    if (!appConfig.features.registrationEnabled) {
      return NextResponse.json({ error: "当前站点未开放注册" }, { status: 403 });
    }
    const tooLarge = rejectLargeRequest(request, 32 * 1024);
    if (tooLarge) return tooLarge;

    const ip = getClientIp(request);
    if (!rateLimit(`register:ip:${ip}`, 5, 15 * 60 * 1000).success) {
      return NextResponse.json(
        { error: "请求过于频繁，请稍后再试" },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { password, name, verificationCode } = parsed.data;
    const email = normalizeEmail(parsed.data.email);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "该邮箱已被注册" },
        { status: 400 }
      );
    }

    const isCodeValid = await verifyRegistrationCode(email, verificationCode);
    if (!isCodeValid) {
      return NextResponse.json(
        { error: "验证码错误或已过期" },
        { status: 400 }
      );
    }

    const userCount = await prisma.user.count();
    const role = process.env.NODE_ENV === "development" && userCount === 0 ? "ADMIN" : "USER";

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.create({
      data: { email, passwordHash, name, role, credits: appConfig.features.newUserCredits, registerIp: ip },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "注册失败，请稍后再试" },
      { status: 500 }
    );
  }
}
