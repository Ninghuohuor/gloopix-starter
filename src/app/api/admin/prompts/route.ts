import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";
import { formatPromptLibraryItem, serializePromptImageUrls } from "@/lib/prompt-library";
import { promptLibraryItemSchema } from "@/lib/validations";
import { NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const prompts = await prisma.promptLibraryItem.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ prompts: prompts.map(formatPromptLibraryItem) });
}

export async function POST(request: Request) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const body = await request.json();
  const parsed = promptLibraryItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const item = await prisma.promptLibraryItem.create({
    data: {
      imageUrl: parsed.data.imageUrl,
      imageUrls: serializePromptImageUrls(parsed.data.imageUrls),
      model: parsed.data.model,
      prompt: parsed.data.prompt,
      createdById: session!.user.id,
    },
  });

  return NextResponse.json({ success: true, item });
}
