import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const adminLayoutSource = readFileSync("src/app/admin/layout.tsx", "utf8");
const adminNavSource = readFileSync("src/components/admin/admin-nav.tsx", "utf8");
const adminPageSource = readFileSync("src/app/admin/page.tsx", "utf8");
const historyPageSource = readFileSync("src/app/history/page.tsx", "utf8");
const composerSource = readFileSync("src/components/generation/chat-composer.tsx", "utf8");
const headerSource = readFileSync("src/components/layout/header.tsx", "utf8");

assert.match(adminLayoutSource, /<AdminNav items=\{adminNavItems\}/);
assert.match(adminNavSource, /sm:hidden/);
assert.match(adminNavSource, /overflow-x-auto/);
assert.match(adminNavSource, /whitespace-nowrap/);
assert.match(adminNavSource, /sm:block/);

assert.match(adminPageSource, /text-\[clamp\(1\.5rem,8vw,1\.875rem\)\]/);
assert.match(adminPageSource, /text-\[clamp\(1\.5rem,8vw,1\.875rem\)\]/);

assert.match(historyPageSource, /max-\[420px\]:flex-wrap/);
assert.match(historyPageSource, /max-\[420px\]:w-full/);

assert.match(composerSource, /flex-wrap/);
assert.match(composerSource, /min-w-0/);
assert.match(composerSource, /w-full/);
assert.match(composerSource, /md:flex-wrap/);

assert.match(headerSource, /import \{ Menu \} from "lucide-react"/);
assert.match(headerSource, /hidden items-center space-x-4 text-sm sm:flex/);
assert.match(headerSource, /aria-label="打开导航菜单"/);
assert.match(headerSource, /sm:hidden/);
assert.match(headerSource, /navigationLinks\.map/);
