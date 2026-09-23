import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const routeSource = readFileSync("src/app/api/user/history/route.ts", "utf8");
const pageSource = readFileSync("src/app/history/page.tsx", "utf8");

assert.match(routeSource, /HISTORY_RETENTION_DAYS\s*=\s*30/);
assert.match(routeSource, /getHistoryRetentionCutoff/);
assert.match(routeSource, /createdAt:\s*\{\s*gte:\s*getHistoryRetentionCutoff\(\)\s*\}/s);

assert.match(pageSource, /生成图保存30天/);
