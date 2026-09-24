import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("src/app/page.tsx", "utf8");
const composerSource = readFileSync("src/components/generation/chat-composer.tsx", "utf8");
const providerSource = readFileSync("src/components/generation/generation-session-provider.tsx", "utf8");
const validationsSource = readFileSync("src/lib/validations.ts", "utf8");

assert.match(validationsSource, /AVAILABLE_ASPECT_RATIOS/);
assert.match(composerSource, /getAvailableAspectRatiosForModel/);
assert.match(composerSource, /aspectRatioOptions\.map/);
assert.match(providerSource, /const \[aspectRatio, setAspectRatio\] = useState\("auto"\)/);
assert.match(source, /selectedAspectRatio/);
assert.match(source, /isAspectRatioCompatibleWithModel/);
assert.match(source, /setAspectRatio\(fallbackAspectRatio\)/);
assert.match(providerSource, /aspectRatio:\s*selectedAspectRatio/);
assert.match(composerSource, /value=\{aspectRatio\}/);
assert.match(composerSource, /onAspectRatioChange\(event\.target\.value\)/);
