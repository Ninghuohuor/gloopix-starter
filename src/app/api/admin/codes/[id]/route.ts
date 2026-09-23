import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  await prisma.redemptionCode.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true });
}
