import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const pageSource = readFileSync("src/app/page.tsx", "utf8");

assert.match(pageSource, /import \{ Copy \} from "lucide-react"/);
assert.match(pageSource, /copyPromptToClipboard/);
assert.match(pageSource, /navigator\.clipboard\.writeText\(promptText\)/);
assert.match(pageSource, /aria-label="复制提示词"/);
assert.match(pageSource, /group-hover\/message:opacity-100/);
assert.match(pageSource, /focus-visible:opacity-100/);
