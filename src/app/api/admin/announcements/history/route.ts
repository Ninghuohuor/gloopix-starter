import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function DELETE() {
  const { error } = await requireAdmin();
  if (error) return error;

  const result = await prisma.announcement.deleteMany({
    where: { isActive: false },
  });

  return NextResponse.json({ success: true, deletedCount: result.count });
}
