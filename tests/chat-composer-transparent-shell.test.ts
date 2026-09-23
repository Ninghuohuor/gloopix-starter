import { readFileSync } from "fs";
import assert from "node:assert/strict";

const composerSource = readFileSync("src/components/generation/chat-composer.tsx", "utf8");

assert.match(
  composerSource,
  /<div className="bg-transparent px-2 py-1\.5 pb-\[calc\(env\(safe-area-inset-bottom\)\+0\.5rem\)\] sm:px-4 sm:py-3">/,
  "composer shell should stay transparent so it does not create a black bottom band",
);

assert.doesNotMatch(
  composerSource,
  /<div className="bg-background\/95 px-4 py-3">/,
  "composer shell should not paint an opaque page-width background",
);
