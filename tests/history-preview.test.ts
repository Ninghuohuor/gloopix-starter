import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("src/app/history/page.tsx", "utf8");

assert.match(source, /selectedPreviewImage/);
assert.match(source, /<Dialog[\s>]/);
assert.match(source, /setSelectedPreviewImage\(img\)/);
assert.match(source, /预览图片/);
assert.match(source, /\/api\/image-download\?url=\$\{encodeURIComponent\(selectedPreviewImage\.imageUrl\)\}/);
assert.doesNotMatch(source, /download=\{selectedPreviewImage\.imageUrl\}/);
