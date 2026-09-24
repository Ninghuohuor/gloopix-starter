import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const uploadRouteSource = readFileSync("src/app/api/admin/announcements/upload/route.ts", "utf8");
const headerSource = readFileSync("src/components/layout/header.tsx", "utf8");
const adminPageSource = readFileSync("src/app/admin/announcements/page.tsx", "utf8");

assert.match(readFileSync("prisma/migrations/00000000000000_init/migration.sql", "utf8"), /"imageUrl" TEXT/);
assert.match(uploadRouteSource, /requireAdmin/);
assert.match(uploadRouteSource, /sharp/);
assert.match(uploadRouteSource, /MAX_UPLOAD_BYTES = 5 \* 1024 \* 1024/);
assert.match(uploadRouteSource, /\/uploads\/announcements\//);
assert.match(uploadRouteSource, /\.webp/);

assert.match(adminPageSource, /imageUrl/);
assert.match(adminPageSource, /setImageUrl/);
assert.match(adminPageSource, /FormData/);
assert.match(adminPageSource, /accept="image\/\*"/);
assert.match(adminPageSource, /移除图片/);
assert.match(adminPageSource, /公告图片预览/);

assert.match(headerSource, /announcement\.imageUrl/);
assert.match(headerSource, /alt="公告图片"/);
