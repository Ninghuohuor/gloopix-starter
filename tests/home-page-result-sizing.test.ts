import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("src/app/page.tsx", "utf8");

assert.match(source, /getImageFrameStyle/);
assert.match(source, /resolveAspectRatio\(message\.prompt, message\.aspectRatio\)/);
assert.match(source, /GeneratedResultImagePicker/);
assert.match(source, /activeResultImageIndexes/);
assert.match(source, /getActiveResultImageUrl/);
assert.match(source, /setActiveResultImageIndex/);
assert.match(source, /openResultPreview/);
assert.match(source, /setPreviewImageIndex/);
assert.match(source, /切换预览图片/);
assert.match(source, /flex max-w-full items-start gap-3/);
assert.match(source, /w-\[min\(18rem,78vw\)\] shrink-0/);
assert.match(source, /flex max-h-\[min\(18rem,78vw\)\] flex-col gap-2 overflow-y-auto/);
assert.match(source, /切换生成结果图片/);
assert.match(source, /查看第 \$\{index \+ 1\} 张生成图/);
assert.match(source, /href=\{`\/api\/image-download\?url=\$\{encodeURIComponent\(getActiveResultImageUrl\(img\)\)\}`\}/);
assert.doesNotMatch(source, /flex max-w-full gap-3 overflow-x-auto pb-1/);
assert.doesNotMatch(source, /img\.imageUrls\.length === 1/);
assert.doesNotMatch(source, /sm:grid-cols-2/);
assert.match(source, /style=\{getImageFrameStyle\(message\)\}/);
assert.match(source, /onPreview=\{\(imageUrl, index\) => openResultPreview\(img, imageUrl, index\)\}/);
