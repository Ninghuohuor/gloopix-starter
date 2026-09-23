import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const pageSource = readFileSync("src/app/history/page.tsx", "utf8");
const routeSource = readFileSync("src/app/api/user/history/route.ts", "utf8");

assert.match(routeSource, /searchParams\.get\("query"\)/);
assert.match(routeSource, /searchParams\.get\("all"\)/);
assert.match(routeSource, /prompt:\s*\{\s*contains:\s*query/);
assert.match(routeSource, /where:\s*historyWhere/);
assert.match(routeSource, /take:\s*fetchAll\s*\?\s*undefined\s*:\s*limit/);

assert.match(pageSource, /searchInput/);
assert.match(pageSource, /activeSearchQuery/);
assert.match(pageSource, /handleSearch/);
assert.match(pageSource, /handleResetSearch/);
assert.match(pageSource, /placeholder="搜索提示词"/);
assert.match(pageSource, /w-\[min\(100%,28rem\)\]/);
assert.match(pageSource, /query=\$\{encodeURIComponent\(activeSearchQuery\)\}/);
assert.match(pageSource, /\/api\/user\/history\?all=1/);
assert.match(pageSource, /groupImagesByDate/);
assert.match(pageSource, /toLocaleDateString\("zh-CN"/);
assert.match(pageSource, /loading="lazy"/);
assert.match(pageSource, /没有找到相关图片/);
assert.match(pageSource, />\s*重置\s*</);
assert.doesNotMatch(pageSource, /上一页/);
assert.doesNotMatch(pageSource, /下一页/);
assert.doesNotMatch(pageSource, /totalPages/);
assert.doesNotMatch(pageSource, /limit=12/);
