import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const dialogSource = readFileSync("src/components/ui/dialog.tsx", "utf8");
const headerSource = readFileSync("src/components/layout/header.tsx", "utf8");
const homeSource = readFileSync("src/app/page.tsx", "utf8");

assert.match(dialogSource, /fixed right-\[calc\(env\(safe-area-inset-right\)\+0\.75rem\)\]/);
assert.match(dialogSource, /top-\[calc\(env\(safe-area-inset-top\)\+0\.75rem\)\]/);
assert.match(dialogSource, /z-\[60\]/);
assert.match(dialogSource, /size-11/);
assert.match(dialogSource, /sm:absolute/);
assert.match(dialogSource, /max-h-\[calc\(100dvh-2rem\)\]/);
assert.match(dialogSource, /overflow-y-auto/);
assert.match(homeSource, /fixed right-\[calc\(env\(safe-area-inset-right\)\+0\.75rem\)\]/);
assert.match(homeSource, /aria-label="关闭图片预览"/);

assert.match(headerSource, /mobile-menu-content/);
assert.match(headerSource, /mobile-menu-item/);
assert.match(headerSource, /min-h-11/);
assert.match(headerSource, /text-base/);
