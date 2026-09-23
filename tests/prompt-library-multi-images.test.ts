import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const schemaSource = readFileSync("prisma/schema.prisma", "utf8");
const validationSource = readFileSync("src/lib/validations.ts", "utf8");
const helperSource = readFileSync("src/lib/prompt-library.ts", "utf8");
const publicPageSource = readFileSync("src/app/prompts/page.tsx", "utf8");
const adminPageSource = readFileSync("src/app/admin/prompts/page.tsx", "utf8");
const publicRouteSource = readFileSync("src/app/api/prompts/route.ts", "utf8");
const adminRouteSource = readFileSync("src/app/api/admin/prompts/route.ts", "utf8");
const adminItemRouteSource = readFileSync("src/app/api/admin/prompts/[id]/route.ts", "utf8");

assert.match(schemaSource, /imageUrls\s+String\?/);
assert.match(schemaSource, /model\s+String\s+@default\("gpt-image-2"\)/);
assert.match(validationSource, /imageUrls:[\s\S]*max\(10,\s*"最多上传 10 张图片"\)/);
assert.match(validationSource, /model:[\s\S]*gpt-image-2/);

assert.match(helperSource, /parsePromptImageUrls/);
assert.match(helperSource, /serializePromptImageUrls/);
assert.match(helperSource, /formatPromptLibraryItem/);
assert.match(helperSource, /JSON\.parse\(item\.imageUrls\)/);
assert.match(helperSource, /DEFAULT_PROMPT_LIBRARY_MODEL/);

assert.match(publicRouteSource, /imageUrls:\s*true/);
assert.match(publicRouteSource, /model:\s*true/);
assert.match(publicRouteSource, /prompts\.map\(formatPromptLibraryItem\)/);
assert.match(adminRouteSource, /prompts\.map\(formatPromptLibraryItem\)/);
assert.match(adminRouteSource, /imageUrls:\s*serializePromptImageUrls\(parsed\.data\.imageUrls\)/);
assert.match(adminRouteSource, /model:\s*parsed\.data\.model/);
assert.match(adminItemRouteSource, /imageUrls:\s*serializePromptImageUrls\(parsed\.data\.imageUrls\)/);
assert.match(adminItemRouteSource, /model:\s*parsed\.data\.model/);

assert.match(publicPageSource, /imageUrls\?: string\[\]/);
assert.match(publicPageSource, /model\?: string/);
assert.match(publicPageSource, /PROMPT_MODEL_FILTERS/);
assert.match(publicPageSource, /GPT-Image-2/);
assert.match(publicPageSource, /selectedModelFilter/);
assert.match(publicPageSource, /visibleItems/);
assert.match(publicPageSource, /activeImageIndexes/);
assert.match(publicPageSource, /getActiveImageUrl/);
assert.match(publicPageSource, /切换提示词参考图/);
assert.match(publicPageSource, /setActiveImageIndex\(item\.id,\s*index\)/);
assert.match(publicPageSource, /setSelectedPreviewImage\(\{ imageUrl: activeImageUrl, prompt: item\.prompt \}\)/);
assert.match(publicPageSource, /h-\[min\(78vh,900px\)\]/);
assert.match(publicPageSource, /max-h-full max-w-full object-contain/);
assert.doesNotMatch(publicPageSource, /max-h-\[78vh\] overflow-auto/);

assert.match(adminPageSource, /imageUrls\?: string\[\]/);
assert.match(adminPageSource, /model\?: string/);
assert.match(adminPageSource, /const \[imageUrls, setImageUrls\]/);
assert.match(adminPageSource, /multiple/);
assert.match(adminPageSource, /files\.slice\(0,\s*remainingSlots\)/);
assert.match(adminPageSource, /body: JSON\.stringify\(\{ imageUrl: imageUrls\[0\], imageUrls, model: "gpt-image-2", prompt \}\)/);
assert.match(adminPageSource, /model: "gpt-image-2"/);
assert.match(adminPageSource, /removeImageUrl/);
assert.match(adminPageSource, /item\.imageUrls\.length/);
