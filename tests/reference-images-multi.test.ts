import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const providerSource = readFileSync("src/components/generation/generation-session-provider.tsx", "utf8");
const composerSource = readFileSync("src/components/generation/chat-composer.tsx", "utf8");
const pageSource = readFileSync("src/app/page.tsx", "utf8");
const generateRouteSource = readFileSync("src/app/api/generate/route.ts", "utf8");
const apimartSource = readFileSync("src/lib/image-providers/apimart.ts", "utf8");
const compatSource = readFileSync("src/lib/image-providers/openai-compatible.ts", "utf8");
const aspectRatioSource = readFileSync("src/lib/aspect-ratio.ts", "utf8");

assert.match(providerSource, /export type ReferenceImageItem/);
assert.match(providerSource, /referenceImages: ReferenceImageItem\[\]/);
assert.match(providerSource, /handleFilesSelect\(files: File\[\]\)/);
assert.match(providerSource, /MAX_REFERENCE_IMAGE_BYTES = 20 \* 1024 \* 1024/);
assert.match(providerSource, /MAX_REFERENCE_IMAGE_TOTAL_BYTES = 100 \* 1024 \* 1024/);
assert.match(providerSource, /function getReferenceImageBytes/);
assert.match(providerSource, /function getReferenceImageLimitError/);
assert.match(providerSource, /const oversizedImage = images\.find/);
assert.match(providerSource, /参考图「\$\{oversizedImage\.name \|\| "未命名图片"\}」不能超过 20MB/);
assert.match(providerSource, /const referenceImageLimitError = getReferenceImageLimitError\(selectedReferenceImages\)/);
assert.match(providerSource, /toast\.error\(referenceImageLimitError\)/);
assert.match(providerSource, /参考图「\$\{file\.name \|\| "未命名图片"\}」不能超过 20MB/);
assert.match(providerSource, /参考图总大小不能超过 100MB/);
assert.match(providerSource, /10 - referenceImages\.length/);
assert.match(providerSource, /files\.slice\(0,\s*remainingSlots\)/);
assert.match(providerSource, /setReferenceImages\(\[\]\)/);
assert.match(providerSource, /body\.referenceImages = selectedReferenceImages\.map/);

assert.match(composerSource, /referenceImages\.map/);
assert.match(composerSource, /type="file"[\s\S]*multiple/);
assert.match(composerSource, /onFilesSelect\(files\)/);
assert.match(composerSource, /setPreviewReferenceImage\(image\)/);
assert.match(composerSource, /预览参考图/);

assert.match(pageSource, /selectedReferenceImages: referenceImages/);
assert.match(pageSource, /selectedReferenceImages: message\.referenceImages \|\| \[\]/);
assert.match(pageSource, /img\.referenceImages\.map/);

assert.match(generateRouteSource, /parsed\.data\.referenceImages/);
assert.match(apimartSource, /normalizeReferenceImageForUpload/);
assert.match(apimartSource, /const endpoint = "\/images\/generations"/);
assert.match(apimartSource, /formData\.append\(\s*"file"/);
assert.match(apimartSource, /contentType: normalizedImage\.contentType/);
assert.match(apimartSource, /image_urls:\s*uploadedReferenceImageUrls/);
assert.match(apimartSource, /buildReferenceImagePrompt/);
assert.match(compatSource, /Promise\.all\(\s*referenceImages\.map/);
assert.match(compatSource, /reference-\$\{index \+ 1\}\.png/);
assert.match(compatSource, /buildReferenceImageFile/);
assert.match(compatSource, /getLocalUploadPath/);
assert.match(compatSource, /buildReferenceImagePrompt/);
assert.match(aspectRatioSource, /不要原样返回参考图/);
