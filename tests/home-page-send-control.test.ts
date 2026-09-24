import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("src/app/page.tsx", "utf8");
const composerSource = readFileSync("src/components/generation/chat-composer.tsx", "utf8");

assert.match(composerSource, /disabled=\{!canSubmit\}/);
assert.match(composerSource, /aria-label="生成图片"/);
assert.match(source, /nativeEvent\.isComposing/);
assert.match(source, /isPromptComposingRef/);
assert.match(source, /ignoreNextPromptEnterRef/);
assert.match(source, /keyCode === 229/);
assert.match(source, /handlePromptCompositionStart/);
assert.match(source, /handlePromptCompositionEnd/);
assert.match(composerSource, /onPromptCompositionStart/);
assert.match(composerSource, /onPromptCompositionEnd/);
assert.doesNotMatch(source, /handleCancelGenerate/);
assert.doesNotMatch(source, /\/api\/generate\/cancel/);
