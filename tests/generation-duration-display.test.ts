import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const pageSource = readFileSync("src/app/page.tsx", "utf8");
const providerSource = readFileSync("src/components/generation/generation-session-provider.tsx", "utf8");

assert.match(providerSource, /startedAt:\s*number/);
assert.match(providerSource, /durationSeconds\?:\s*number/);
assert.match(providerSource, /const startedAt = Date\.now\(\)/);
assert.match(providerSource, /durationSeconds:\s*Math\.max\(1,\s*Math\.round\(\(Date\.now\(\) - startedAt\) \/ 1000\)\)/);

assert.match(pageSource, /本次生成图片用时/);
assert.match(pageSource, /img\.durationSeconds/);
assert.match(pageSource, /\{img\.durationSeconds\} 秒/);
