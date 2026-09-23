import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const imageUrlHelperSource = readFileSync("src/lib/image-url.ts", "utf8");
const pageSource = readFileSync("src/app/page.tsx", "utf8");
const historySource = readFileSync("src/app/history/page.tsx", "utf8");

assert.match(imageUrlHelperSource, /isRemoteImageUrl/);
assert.match(imageUrlHelperSource, /\^https\?:/);
assert.match(imageUrlHelperSource, /shouldBypassImageOptimizer/);
assert.match(imageUrlHelperSource, /startsWith\("\/uploads\/"\)/);
assert.doesNotMatch(imageUrlHelperSource, /cos-images/);

assert.match(pageSource, /shouldBypassImageOptimizer/);
assert.match(pageSource, /unoptimized=\{shouldBypassImageOptimizer\(activeThumbnailUrl\)\}/);
assert.match(pageSource, /unoptimized=\{shouldBypassImageOptimizer\(thumbnailUrl\)\}/);
assert.match(pageSource, /unoptimized=\{shouldBypassImageOptimizer\(selectedPreviewImage\.imageUrl \|\| ""\)\}/);

assert.match(historySource, /shouldBypassImageOptimizer/);
assert.match(historySource, /unoptimized=\{shouldBypassImageOptimizer\(img\.thumbnailUrl \|\| img\.imageUrl\)\}/);
assert.match(historySource, /unoptimized=\{shouldBypassImageOptimizer\(selectedPreviewImage\.imageUrl\)\}/);
