import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { touchUserActivity } from "@/lib/user-activity";

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "未登录" }, { status: 401 }), session: null };
  }
  if (session.user.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "无权限" }, { status: 403 }), session: null };
  }
  await touchUserActivity(session.user.id);
  return { error: null, session };
}
