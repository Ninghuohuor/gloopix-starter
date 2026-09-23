import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { touchUserActivity } from "@/lib/user-activity";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  await touchUserActivity(session.user.id);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { credits: true },
  });

  return NextResponse.json({ credits: user?.credits ?? 0 });
}
