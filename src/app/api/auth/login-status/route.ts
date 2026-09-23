import { NextResponse } from "next/server";
import { z } from "zod";
import { getLoginFailureStatus, normalizeLoginEmail } from "@/lib/login-security";
import { rejectLargeRequest } from "@/lib/request-security";

const loginStatusSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
});

export async function POST(request: Request) {
  const tooLarge = rejectLargeRequest(request, 8 * 1024);
  if (tooLarge) return tooLarge;

  const parsed = loginStatusSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }

  const status = await getLoginFailureStatus(normalizeLoginEmail(parsed.data.email));

  return NextResponse.json({
    failureCount: status.failureCount,
    isLocked: status.isLocked,
    remainingSeconds: status.remainingSeconds,
    shouldSuggestPasswordReset: status.shouldSuggestPasswordReset,
  });
}
