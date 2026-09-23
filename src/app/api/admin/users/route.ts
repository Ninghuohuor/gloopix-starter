import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
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

  return NextResponse.json({ users });
}
