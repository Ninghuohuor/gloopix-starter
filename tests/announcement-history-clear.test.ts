import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const routeSource = readFileSync("src/app/api/admin/announcements/history/route.ts", "utf8");
const adminPageSource = readFileSync("src/app/admin/announcements/page.tsx", "utf8");

assert.ok(existsSync("src/app/api/admin/announcements/history/route.ts"));
assert.match(routeSource, /DELETE/);
assert.match(routeSource, /where:\s*\{\s*isActive:\s*false\s*\}/);
assert.match(routeSource, /deletedCount:\s*result\.count/);

assert.match(adminPageSource, /handleClearHistory/);
assert.match(adminPageSource, /window\.confirm/);
assert.match(adminPageSource, /清空公告历史记录/);
assert.match(adminPageSource, /当前公告会保留/);
assert.match(adminPageSource, /announcements\.every\(\(item\) => item\.isActive\)/);
