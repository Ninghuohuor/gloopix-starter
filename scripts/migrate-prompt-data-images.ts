import crypto from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { prisma } from "../src/lib/prisma";
import { parsePromptImageUrls, serializePromptImageUrls } from "../src/lib/prompt-library";

const PROMPT_IMAGE_MAX_EDGE = 2000;
const PROMPT_IMAGE_WEBP_QUALITY = 86;

function isDataImageUrl(value: string) {
  return value.startsWith("data:image/");
}

function dataUrlToBuffer(dataUrl: string) {
  const match = /^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/.exec(dataUrl);
  if (!match) {
    throw new Error("Unsupported data image URL");
  }

  return Buffer.from(match[1], "base64");
}

async function persistPromptImage(dataUrl: string) {
  const sourceBuffer = dataUrlToBuffer(dataUrl);
  const output = await sharp(sourceBuffer, { failOn: "none" })
    .rotate()
    .resize({
      width: PROMPT_IMAGE_MAX_EDGE,
      height: PROMPT_IMAGE_MAX_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: PROMPT_IMAGE_WEBP_QUALITY })
    .toBuffer();

  const uploadDir = path.join(process.cwd(), "public", "uploads", "prompts");
  await mkdir(uploadDir, { recursive: true });

  const filename = `${crypto.randomUUID()}.webp`;
  await writeFile(path.join(uploadDir, filename), output);
  return `/uploads/prompts/${filename}`;
}

async function main() {
  const items = await prisma.promptLibraryItem.findMany({
    where: {
      OR: [
        { imageUrl: { startsWith: "data:image/" } },
        { imageUrls: { contains: "data:image/" } },
      ],
    },
    select: {
      id: true,
      imageUrl: true,
      imageUrls: true,
      model: true,
    },
  });

  let convertedImages = 0;

  for (const item of items) {
    const imageUrls = parsePromptImageUrls(item);
    const migratedUrls = [];

    for (const imageUrl of imageUrls) {
      if (isDataImageUrl(imageUrl)) {
        migratedUrls.push(await persistPromptImage(imageUrl));
        convertedImages += 1;
      } else {
        migratedUrls.push(imageUrl);
      }
    }

    if (migratedUrls.length === 0 && isDataImageUrl(item.imageUrl)) {
      migratedUrls.push(await persistPromptImage(item.imageUrl));
      convertedImages += 1;
    }

    await prisma.promptLibraryItem.update({
      where: { id: item.id },
      data: {
        imageUrl: migratedUrls[0] || item.imageUrl,
        imageUrls: serializePromptImageUrls(migratedUrls),
      },
    });
  }

  console.log(`Migrated ${convertedImages} prompt image(s) from ${items.length} item(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
