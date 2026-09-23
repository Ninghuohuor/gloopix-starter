import { sendRegistrationVerificationCode, normalizeEmail } from "@/lib/email-verification";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp, rejectLargeRequest } from "@/lib/request-security";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getPublicAppConfig } from "@/lib/api-settings";

const sendCodeSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
});

export async function POST(request: Request) {
  try {
    const config = await getPublicAppConfig();
    if (!config.features.registrationEnabled) return NextResponse.json({ error: "当前站点未开放注册" }, { status: 403 });
    const tooLarge = rejectLargeRequest(request, 16 * 1024);
    if (tooLarge) return tooLarge;

    const ip = getClientIp(request);
    if (!rateLimit(`email-verification:ip:${ip}`, 8, 15 * 60 * 1000).success) {
      return NextResponse.json(
        { error: "请求过于频繁，请稍后再试" },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = sendCodeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const email = normalizeEmail(parsed.data.email);
    if (!rateLimit(`email-verification:email:${email}`, 5, 15 * 60 * 1000).success) {
      return NextResponse.json(
        { error: "请求过于频繁，请稍后再试" },
        { status: 429 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      return NextResponse.json(
        { error: "该邮箱已被注册" },
        { status: 400 }
      );
    }

    const result = await sendRegistrationVerificationCode(email);

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: 429 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "验证码发送失败，请稍后再试" },
      { status: 500 }
    );
  }
}
