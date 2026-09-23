import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getPublicAppConfig } from "@/lib/api-settings";

export async function GET() {
  const config = await getPublicAppConfig();
  if (!config.features.announcementsEnabled) return NextResponse.json({ announcement: null, disabled: true });
  const announcement = await prisma.announcement.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      content: true,
      imageUrl: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ announcement });
}
