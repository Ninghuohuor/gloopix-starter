import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("src/app/page.tsx", "utf8");
const providerSource = readFileSync("src/components/generation/generation-session-provider.tsx", "utf8");

assert.match(providerSource, /interface ChatMessage/);
assert.match(providerSource, /status:\s*"generating"\s*\|\s*"completed"\s*\|\s*"failed"/);
assert.match(providerSource, /setMessages\(\(prev\) => \[\.\.\.prev, pendingMessage\]\)/);
assert.match(providerSource, /setPrompt\(""\)/);
assert.match(source, /正在生成/);
assert.match(source, /生成失败/);
assert.match(source, /重新生成/);
assert.match(source, /handleRegenerate/);
assert.match(source, /download/);
