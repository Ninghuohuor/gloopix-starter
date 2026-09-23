import { prisma } from "@/lib/prisma";
import { formatPromptLibraryItem } from "@/lib/prompt-library";
import { NextResponse } from "next/server";
import { getPublicAppConfig } from "@/lib/api-settings";

export async function GET() {
  const config = await getPublicAppConfig();
  if (!config.features.promptLibraryEnabled) return NextResponse.json({ prompts: [], disabled: true });
  const prompts = await prisma.promptLibraryItem.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      imageUrl: true,
      imageUrls: true,
      model: true,
      prompt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(
    { prompts: prompts.map(formatPromptLibraryItem) },
    {
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      },
    }
  );
}
