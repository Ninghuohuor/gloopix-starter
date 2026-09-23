import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const routeSource = readFileSync("src/app/api/admin/codes/route.ts", "utf8");
const pageSource = readFileSync("src/app/admin/codes/page.tsx", "utf8");

assert.match(routeSource, /searchParams\.get\("status"\)/);
assert.match(routeSource, /searchParams\.get\("source"\)/);
assert.match(routeSource, /searchParams\.get\("createdFrom"\)/);
assert.match(routeSource, /searchParams\.get\("createdTo"\)/);
assert.match(routeSource, /where\.createdAt/);
assert.match(routeSource, /status === "AVAILABLE"/);
assert.match(routeSource, /status === "USED"/);
assert.match(routeSource, /status === "INACTIVE"/);
assert.match(routeSource, /status === "FIXED"/);

assert.match(pageSource, /statusFilter/);
assert.match(pageSource, /sourceFilter/);
assert.match(pageSource, /createdFrom/);
assert.match(pageSource, /createdTo/);
assert.match(pageSource, /aria-label="状态筛选"/);
assert.match(pageSource, /aria-label="来源筛选"/);
assert.match(pageSource, /aria-label="创建开始日期"/);
assert.match(pageSource, /aria-label="创建结束日期"/);
assert.match(pageSource, /全部状态/);
assert.match(pageSource, /全部来源/);
assert.match(pageSource, /<Label htmlFor="code-created-from">创建时间从<\/Label>/);
assert.match(pageSource, /<Label htmlFor="code-created-to">创建时间到<\/Label>/);
assert.doesNotMatch(pageSource, /<Label htmlFor="code-created-from">日期/);
assert.match(pageSource, /variant="outline"[\s\S]*复制/);
assert.match(pageSource, /variant="destructive"[\s\S]*作废/);
