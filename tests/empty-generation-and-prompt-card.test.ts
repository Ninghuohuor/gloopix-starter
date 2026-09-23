import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const homeSource = readFileSync("src/app/page.tsx", "utf8");
const promptsSource = readFileSync("src/app/prompts/page.tsx", "utf8");

assert.match(homeSource, /const hasConversation = messages\.length > 0;/);
assert.match(homeSource, /function renderComposer\(\)/);
assert.match(homeSource, /hasConversation \? \(/);
assert.match(homeSource, /className="flex h-full flex-col items-center justify-center gap-5 px-4 pb-\[8vh\] pt-6"/);
assert.match(homeSource, /<div className="w-full max-w-3xl">[\s\S]*\{renderComposer\(\)\}[\s\S]*<\/div>/);
assert.match(homeSource, /\{hasConversation && \([\s\S]*<div className="z-20 shrink-0 bg-transparent md:static md:bg-transparent md:backdrop-blur-none">[\s\S]*\{renderComposer\(\)\}/);

assert.match(promptsSource, /type PromptImageLoadState = Record<string, boolean>;/);
assert.match(promptsSource, /const \[loadedPromptImageUrls, setLoadedPromptImageUrls\]/);
assert.match(promptsSource, /function markPromptImageLoaded\(imageUrl: string\)/);
assert.match(promptsSource, /<button[\s\S]*aria-label="预览提示词示例图片"[\s\S]*<\/button>[\s\S]*<CardContent className="space-y-3 p-4">/);
assert.doesNotMatch(promptsSource, /<CardContent className="space-y-3 p-4">[\s\S]*复制并立即生成[\s\S]*<\/CardContent>[\s\S]*<button[\s\S]*aria-label="预览提示词示例图片"/);
assert.match(promptsSource, /aria-hidden="true"[\s\S]*图片加载中/);
