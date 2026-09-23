import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("src/app/page.tsx", "utf8");

assert.match(source, /selectedPreviewImage/);
assert.match(source, /<Dialog[\s>]/);
assert.match(source, /openResultPreview/);
assert.match(source, /setPreviewImageIndex/);
assert.match(source, /imageUrls/);
assert.match(source, /activeIndex/);
assert.match(source, /上一张/);
assert.match(source, /下一张/);
assert.match(source, /切换预览图片/);
assert.match(source, /预览第 \$\{index \+ 1\} 张生成图/);
assert.match(source, /预览图片/);
assert.match(source, /showCloseButton=\{false\}/);
assert.match(source, /aria-label="关闭图片预览"/);
assert.match(source, /setSelectedPreviewImage\(null\)/);
assert.match(source, />\s*关闭\s*</);
assert.match(source, /\/api\/image-download\?url=\$\{encodeURIComponent\(selectedPreviewImage\.imageUrl\)\}/);
assert.match(source, /\/api\/image-download\?url=\$\{encodeURIComponent\(getActiveResultImageUrl\(img\)\)\}/);
assert.doesNotMatch(source, /href=\{getActiveResultImageUrl\(img\)\}/);
assert.doesNotMatch(source, /download=\{selectedPreviewImage\.imageUrl\}/);
