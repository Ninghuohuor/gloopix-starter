import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const promptsPageSource = readFileSync("src/app/prompts/page.tsx", "utf8");
const homePageSource = readFileSync("src/app/page.tsx", "utf8");

assert.match(promptsPageSource, /复制并立即生成/);
assert.match(promptsPageSource, /handleCopyAndGenerate/);
assert.match(promptsPageSource, /navigator\.clipboard\.writeText\(item\.prompt\)/);
assert.match(promptsPageSource, /router\.push\(`\/\?\$\{params\.toString\(\)\}`\)/);
assert.match(promptsPageSource, /naturalWidth/);
assert.match(promptsPageSource, /naturalHeight/);
assert.match(promptsPageSource, /choosePromptImageAspectRatio/);

assert.match(homePageSource, /new URLSearchParams\(window\.location\.search\)/);
assert.match(homePageSource, /params\.get\("prompt"\)/);
assert.match(homePageSource, /setPrompt\(prefillPrompt\)/);
assert.match(homePageSource, /params\.get\("aspectRatio"\)/);
assert.match(homePageSource, /setAspectRatio\(prefillAspectRatio\)/);
