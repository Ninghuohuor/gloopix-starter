import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { generateSchema, AVAILABLE_QUALITIES } from "../src/lib/validations";

const pageSource = readFileSync("src/app/page.tsx", "utf8");
const composerSource = readFileSync("src/components/generation/chat-composer.tsx", "utf8");
const providerSource = readFileSync("src/components/generation/generation-session-provider.tsx", "utf8");
const routeSource = readFileSync("src/app/api/generate/route.ts", "utf8");
const openaiSource = readFileSync("src/lib/openai.ts", "utf8");
const apimartSource = readFileSync("src/lib/image-providers/apimart.ts", "utf8");

assert.deepEqual(
  AVAILABLE_QUALITIES.map((item) => item.id),
  ["low", "medium", "high"]
);

assert.equal(generateSchema.safeParse({ prompt: "test", quality: "low" }).success, true);
assert.equal(generateSchema.safeParse({ prompt: "test", quality: "medium" }).success, true);
assert.equal(generateSchema.safeParse({ prompt: "test", quality: "high" }).success, true);
assert.equal(generateSchema.safeParse({ prompt: "test", quality: "ultra" }).success, false);
assert.equal(generateSchema.parse({ prompt: "test" }).quality, "low");

assert.match(providerSource, /const \[quality, setQuality\] = useState(?:<[^>]+>)?\("low"\)/);
assert.match(composerSource, /AVAILABLE_QUALITIES/);
assert.match(composerSource, /aria-label="Quality"/);
assert.match(pageSource, /selectedQuality/);
assert.match(providerSource, /quality:\s*selectedQuality/);
assert.match(pageSource, /selectedQuality:\s*quality/);
assert.match(pageSource, /selectedQuality:\s*message\.quality/);

assert.match(routeSource, /parsed\.data\.quality/);
assert.match(routeSource, /calculateImageCreditCost/);
assert.match(routeSource, /quality:\s*parsed\.data\.quality/);

assert.match(openaiSource, /quality\?:\s*"low" \| "medium" \| "high"/);
assert.match(openaiSource, /quality,\s*resolution,\s*filepath/s);

assert.match(apimartSource, /quality\?:\s*"low" \| "medium" \| "high"/);
assert.match(apimartSource, /quality = "low"/);
assert.match(apimartSource, /supportsQuality \? \{ quality \}/);
assert.doesNotMatch(apimartSource, /quality:\s*"low"/);
