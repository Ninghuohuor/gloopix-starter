import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const nextConfigSource = readFileSync("next.config.ts", "utf8");
const pageSource = readFileSync("src/app/page.tsx", "utf8");

assert.match(nextConfigSource, /images:\s*\{/);
assert.match(nextConfigSource, /remotePatterns/);
assert.match(nextConfigSource, /protocol:\s*"https"/);
assert.match(nextConfigSource, /hostname:\s*"upload\.apimart\.ai"/);

assert.match(pageSource, /src=\{imageUrl\}/);
assert.match(pageSource, /openResultPreview\(message: ChatMessage, imageUrl: string, index: number\)/);
assert.match(pageSource, /imageUrls,[\s\S]*activeIndex: index/);
assert.match(pageSource, /unoptimized=\{shouldBypassImageOptimizer\(imageUrl\)\}/);
