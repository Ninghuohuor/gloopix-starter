import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { AVAILABLE_RESOLUTIONS, generateSchema } from "../src/lib/validations";
import { isAspectRatioCompatibleWithResolution } from "../src/lib/image-models";

const pageSource = readFileSync("src/app/page.tsx", "utf8");
const composerSource = readFileSync("src/components/generation/chat-composer.tsx", "utf8");
const providerSource = readFileSync("src/components/generation/generation-session-provider.tsx", "utf8");
const routeSource = readFileSync("src/app/api/generate/route.ts", "utf8");
const openaiSource = readFileSync("src/lib/openai.ts", "utf8");
const apimartSource = readFileSync("src/lib/image-providers/apimart.ts", "utf8");

assert.deepEqual(
  AVAILABLE_RESOLUTIONS.map((item) => item.id),
  ["1k", "2k", "4k"]
);

assert.equal(generateSchema.safeParse({ prompt: "test", resolution: "1k" }).success, true);
assert.equal(generateSchema.safeParse({ prompt: "test", resolution: "2k" }).success, true);
assert.equal(generateSchema.safeParse({ prompt: "test", resolution: "4k" }).success, false);
assert.equal(generateSchema.safeParse({ prompt: "test", aspectRatio: "16:9", resolution: "4k" }).success, true);
assert.equal(generateSchema.safeParse({ prompt: "test", aspectRatio: "9:16", resolution: "4k" }).success, true);
assert.equal(generateSchema.safeParse({ prompt: "test", aspectRatio: "2:1", resolution: "4k" }).success, true);
assert.equal(generateSchema.safeParse({ prompt: "test", aspectRatio: "1:2", resolution: "4k" }).success, true);
assert.equal(generateSchema.safeParse({ prompt: "test", aspectRatio: "21:9", resolution: "4k" }).success, true);
assert.equal(generateSchema.safeParse({ prompt: "test", aspectRatio: "9:21", resolution: "4k" }).success, true);
assert.equal(generateSchema.safeParse({ prompt: "test", aspectRatio: "1:1", resolution: "4k" }).success, false);
assert.equal(generateSchema.safeParse({ prompt: "test", aspectRatio: "auto", resolution: "4k" }).success, false);
assert.equal(generateSchema.safeParse({ prompt: "test", resolution: "8k" }).success, false);
assert.equal(generateSchema.parse({ prompt: "test" }).resolution, "1k");
assert.equal(isAspectRatioCompatibleWithResolution("16:9", "4k"), true);
assert.equal(isAspectRatioCompatibleWithResolution("1:1", "4k"), false);
assert.equal(isAspectRatioCompatibleWithResolution("auto", "4k"), false);

assert.match(providerSource, /const \[resolution, setResolution\] = useState(?:<[^>]+>)?\("1k"\)/);
assert.match(composerSource, /AVAILABLE_RESOLUTIONS/);
assert.match(composerSource, /onResolutionChange\(event\.target\.value as ImageResolution\)/);
assert.doesNotMatch(composerSource, /CircleAlert/);
assert.doesNotMatch(composerSource, /DropdownMenu/);
assert.doesNotMatch(composerSource, /selectedResolutionName/);
assert.doesNotMatch(composerSource, /aria-disabled=\{isDisabled\}/);
assert.doesNotMatch(composerSource, /disabled=\{!isAspectRatioCompatibleWithResolution/);
assert.match(composerSource, /aria-label="Resolution"/);
assert.match(pageSource, /selectedResolution/);
assert.match(pageSource, /isAspectRatioCompatibleWithResolution/);
assert.match(pageSource, /当前尺寸不支持 4K，请改用/);
assert.match(providerSource, /resolution:\s*selectedResolution/);
assert.match(pageSource, /selectedResolution:\s*resolution/);
assert.match(pageSource, /selectedResolution:\s*message\.resolution/);

assert.match(routeSource, /parsed\.data\.resolution/);
assert.match(routeSource, /calculateImageCreditCost/);
assert.match(routeSource, /resolution:\s*parsed\.data\.resolution/);

assert.match(openaiSource, /resolution\?:\s*"1k" \| "2k" \| "4k"/);
assert.match(openaiSource, /resolution,\s*filepath/s);

assert.match(apimartSource, /resolution\?:\s*"1k" \| "2k" \| "4k"/);
assert.match(apimartSource, /resolution = "1k"/);
assert.match(apimartSource, /formatApimartResolution/);
assert.match(apimartSource, /supportsResolution \? \{ resolution: requestResolution \}/);
assert.doesNotMatch(apimartSource, /\{\s*resolution:\s*"1k"\s*\}/);
