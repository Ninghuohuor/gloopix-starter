import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const routeSource = readFileSync("src/app/api/user/history/route.ts", "utf8");
const pageSource = readFileSync("src/app/history/page.tsx", "utf8");

assert.match(routeSource, /export async function DELETE/);
assert.match(routeSource, /findFirst\(\{\s*where:\s*\{\s*id,\s*userId:\s*session\.user\.id/s);
assert.match(routeSource, /prisma\.image\.delete/);
assert.match(routeSource, /getLocalUploadPath/);

assert.match(pageSource, /handleDelete/);
assert.match(pageSource, /method:\s*"DELETE"/);
assert.match(pageSource, /确认删除这张图片/);
assert.match(pageSource, /Trash2/);
