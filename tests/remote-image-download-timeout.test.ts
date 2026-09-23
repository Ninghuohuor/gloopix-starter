import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sharedSource = readFileSync("src/lib/image-providers/shared.ts", "utf8");

assert.match(sharedSource, /url\.startsWith\("data:"\)/);
assert.match(sharedSource, /dataUrlToBuffer\(url\)/);
assert.match(sharedSource, /AbortController/);
assert.match(sharedSource, /setTimeout\(\(\) => controller\.abort\(\),\s*30_000\)/);
assert.match(sharedSource, /fetch\(url,\s*\{\s*signal:\s*controller\.signal\s*\}\)/);
