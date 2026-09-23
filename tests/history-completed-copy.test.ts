import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const pageSource = readFileSync("src/app/history/page.tsx", "utf8");
const routeSource = readFileSync("src/app/api/user/history/route.ts", "utf8");

assert.match(routeSource, /status:\s*"COMPLETED"/);
assert.match(routeSource, /imageUrl:\s*\{\s*not:\s*""\s*\}/);
assert.doesNotMatch(routeSource, /status:\s*\{\s*not:\s*"CANCELED"\s*\}/);

assert.match(pageSource, /handleCopyPrompt/);
assert.match(pageSource, /navigator\.clipboard\.writeText\(prompt\)/);
assert.match(pageSource, /提示词已复制/);
assert.match(pageSource, /aria-label="复制提示词"/);
assert.match(pageSource, />\s*复制提示词\s*</);
assert.doesNotMatch(pageSource, /Badge/);
assert.doesNotMatch(pageSource, /img\.status === "FAILED"/);
