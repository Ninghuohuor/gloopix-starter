import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

assert.ok(existsSync("src/components/generation/chat-composer.tsx"));

const pageSource = readFileSync("src/app/page.tsx", "utf8");
const composerSource = readFileSync("src/components/generation/chat-composer.tsx", "utf8");

assert.match(pageSource, /import \{ ChatComposer \} from "@\/components\/generation\/chat-composer"/);
assert.match(pageSource, /<ChatComposer/);
assert.doesNotMatch(pageSource, /Bottom input bar/);

assert.match(composerSource, /rounded-2xl/);
assert.match(composerSource, /border/);
assert.doesNotMatch(composerSource, /<div className="border-t bg-background\/95/);
assert.match(composerSource, /referenceImages\.map/);
assert.match(composerSource, /setPreviewReferenceImage/);
assert.match(composerSource, /DialogContent/);
assert.match(composerSource, /\{referenceImages\.length\}\/10/);
assert.match(composerSource, /multiple/);
assert.match(composerSource, /onFilesSelect\(files\)/);
assert.match(composerSource, /onDragOver/);
assert.match(composerSource, /onDrop/);
assert.match(composerSource, /dataTransfer\.files/);
assert.match(composerSource, /isDraggingReferenceImage/);
assert.match(composerSource, /拖放图片到这里/);
assert.match(composerSource, /field-sizing-content/);
assert.match(composerSource, /border-0/);
assert.match(composerSource, /resize-none/);
assert.match(composerSource, /Bottom Action Bar/);
assert.match(composerSource, /AVAILABLE_MODELS/);
assert.match(composerSource, /AVAILABLE_ASPECT_RATIOS/);
assert.match(composerSource, /AVAILABLE_QUALITIES/);
assert.match(composerSource, /AVAILABLE_RESOLUTIONS/);
assert.match(composerSource, /getImageModelConfig/);
assert.match(composerSource, /supportsQuality/);
assert.match(composerSource, /supportsResolution/);
assert.match(composerSource, /calculateImageCreditCost/);
assert.match(composerSource, /消耗 \{creditCost\} 积分/);
assert.match(composerSource, /aria-label="生成图片"/);
