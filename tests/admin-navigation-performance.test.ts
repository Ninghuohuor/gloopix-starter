import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

assert.ok(existsSync("src/components/admin/admin-nav.tsx"));
assert.ok(existsSync("src/app/admin/loading.tsx"));

const adminLayoutSource = readFileSync("src/app/admin/layout.tsx", "utf8");
const adminNavSource = readFileSync("src/components/admin/admin-nav.tsx", "utf8");
const loadingSource = readFileSync("src/app/admin/loading.tsx", "utf8");

assert.match(adminLayoutSource, /AdminNav/);
assert.match(adminNavSource, /useRouter/);
assert.match(adminNavSource, /router\.prefetch\(item\.href\)/);
assert.match(adminNavSource, /onMouseEnter/);
assert.match(adminNavSource, /onFocus/);
assert.match(adminNavSource, /usePathname/);
assert.match(adminNavSource, /aria-current=\{isActive \? "page" : undefined\}/);
assert.match(loadingSource, /animate-pulse/);
