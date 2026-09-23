import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("src/lib/image-providers/openai-compatible.ts", "utf8");

assert.match(source, /resolveAspectRatio\(prompt, aspectRatioOption\)/);
assert.match(source, /chooseGenerationSize/);
assert.match(source, /buildImagePrompt/);
assert.match(source, /runImageGeneration/);
assert.match(source, /fallbackSize:\s*RequestSize\s*=\s*"auto"/);
assert.match(source, /isRetryableImageSizeError/);
assert.doesNotMatch(source, /cropImageToAspectRatio/);
assert.doesNotMatch(source, /targetCropSize/);
assert.doesNotMatch(source, /fit:\s*"cover"/);
assert.doesNotMatch(source, /size:\s*"1024x1024"/);
