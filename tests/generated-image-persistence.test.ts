import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const openaiSource = readFileSync("src/lib/openai.ts", "utf8");
const sharedSource = readFileSync("src/lib/image-providers/shared.ts", "utf8");

assert.match(openaiSource, /ensureGeneratedUploadDir/);
assert.match(openaiSource, /\/uploads\/generated\/\$\{filename\}/);
assert.match(openaiSource, /persistRemoteImage:\s*true/);
assert.doesNotMatch(openaiSource, /persistRemoteImage:\s*false/);

assert.match(sharedSource, /from "sharp"/);
assert.match(sharedSource, /normalizeImageBufferForPath/);
assert.match(sharedSource, /\.png\(\)/);
