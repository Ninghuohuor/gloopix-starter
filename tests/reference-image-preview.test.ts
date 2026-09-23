import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("src/app/page.tsx", "utf8");

assert.match(source, /reference-image-preview/);
assert.match(source, /selectedReferencePreviewImage/);
assert.match(source, /setSelectedReferencePreviewImage\(referenceImage\)/);
assert.match(source, /aria-label=\{`预览参考图 \$\{referenceImage\.name\}`\}/);
assert.match(source, /className="reference-image-preview group relative h-16 w-16/);
assert.match(source, /className="object-cover transition group-hover:scale-\[1\.04\]"/);
assert.match(source, /预览参考图/);
assert.match(source, /className="h-full w-full object-contain"/);
assert.doesNotMatch(source, /getReferenceImageFrameStyle/);
assert.doesNotMatch(source, /h-20 w-20/);
