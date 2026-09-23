import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";
import { formatPromptLibraryItem, serializePromptImageUrls } from "@/lib/prompt-library";
import { promptLibraryItemSchema } from "@/lib/validations";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = promptLibraryItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const item = await prisma.promptLibraryItem.update({
    where: { id },
    data: {
      imageUrl: parsed.data.imageUrl,
      imageUrls: serializePromptImageUrls(parsed.data.imageUrls),
      model: parsed.data.model,
      prompt: parsed.data.prompt,
    },
  });

  return NextResponse.json({ success: true, item: formatPromptLibraryItem(item) });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  await prisma.promptLibraryItem.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true });
}
