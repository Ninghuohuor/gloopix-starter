import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

assert.ok(existsSync("src/app/api/image-download/route.ts"));

const routeSource = readFileSync("src/app/api/image-download/route.ts", "utf8");

assert.match(routeSource, /export async function GET/);
assert.match(routeSource, /searchParams\.get\("url"\)/);
assert.match(routeSource, /getLocalUploadPath/);
assert.match(routeSource, /upload\.apimart\.ai/);
assert.match(routeSource, /Content-Disposition/);
assert.match(routeSource, /attachment; filename=/);
assert.match(routeSource, /Content-Type/);
assert.match(routeSource, /不支持下载这个图片地址/);
assert.match(routeSource, /图片源已过期/);
assert.match(routeSource, /status:\s*410/);
