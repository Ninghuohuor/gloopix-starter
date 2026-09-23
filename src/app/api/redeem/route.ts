import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redeemSchema } from "@/lib/validations";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-security";
import { touchUserActivity } from "@/lib/user-activity";
import { NextResponse } from "next/server";
import { getPublicAppConfig } from "@/lib/api-settings";

export async function POST(request: Request) {
  try {
    const config = await getPublicAppConfig();
    if (!config.features.creditsEnabled) return NextResponse.json({ error: "当前站点未启用积分与兑换码" }, { status: 403 });
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    await touchUserActivity(session.user.id);

    const ip = getClientIp(request);
    const rl = rateLimit(`redeem:${session.user.id}`, 10, 15 * 60 * 1000);
    if (!rl.success) {
      return NextResponse.json({ error: "尝试次数过多，请15分钟后再试" }, { status: 429 });
    }

    const body = await request.json();
    const parsed = redeemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const code = await tx.redemptionCode.findUnique({
        where: { code: parsed.data.code },
      });

      if (!code || !code.isActive || code.usedById) {
        return null;
      }

      await tx.redemptionCode.update({
        where: { id: code.id },
        data: {
          usedById: session.user.id,
          usedAt: new Date(),
          usedIp: ip,
          isActive: false,
        },
      });

      await tx.user.update({
        where: { id: session.user.id },
        data: { credits: { increment: code.credits } },
      });

      await tx.creditTransaction.create({
        data: {
          userId: session.user.id,
          amount: code.credits,
          type: "REDEMPTION",
          relatedId: code.id,
        },
      });

      return code.credits;
    });

    if (result === null) {
      return NextResponse.json({ error: "兑换码无效或已被使用" }, { status: 400 });
    }

    return NextResponse.json({ success: true, credits: result });
  } catch {
    return NextResponse.json({ error: "兑换失败，请稍后再试" }, { status: 500 });
  }
}
