import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const pageSource = readFileSync("src/app/page.tsx", "utf8");
const cssSource = readFileSync("src/app/globals.css", "utf8");

assert.match(pageSource, /function ImageGenerationLoader/);
assert.match(pageSource, /正在生成/);
assert.match(pageSource, /gpt-image-loader-card/);
assert.match(pageSource, /gpt-image-loader-dots/);
assert.doesNotMatch(pageSource, /text-2xl/);

assert.match(cssSource, /\.gpt-image-loader-card/);
assert.match(cssSource, /\.gpt-image-loader-dots::before/);
assert.match(cssSource, /@keyframes gpt-image-dots-drift/);
assert.match(cssSource, /@keyframes gpt-image-dots-pulse/);
assert.doesNotMatch(cssSource, /38rem/);
