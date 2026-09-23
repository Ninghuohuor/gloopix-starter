import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const schemaSource = readFileSync("prisma/schema.prisma", "utf8");
const validationsSource = readFileSync("src/lib/validations.ts", "utf8");
const headerSource = readFileSync("src/components/layout/header.tsx", "utf8");
const adminLayoutSource = readFileSync("src/app/admin/layout.tsx", "utf8");
const publicRouteSource = readFileSync("src/app/api/announcements/current/route.ts", "utf8");
const adminRouteSource = readFileSync("src/app/api/admin/announcements/route.ts", "utf8");
const adminHistoryRouteSource = readFileSync("src/app/api/admin/announcements/history/route.ts", "utf8");
const adminPageSource = readFileSync("src/app/admin/announcements/page.tsx", "utf8");

assert.match(schemaSource, /model Announcement/);
assert.match(schemaSource, /content\s+String/);
assert.match(schemaSource, /imageUrl\s+String\?/);
assert.match(schemaSource, /isActive\s+Boolean\s+@default\(true\)/);
assert.match(schemaSource, /createdById\s+String/);

assert.match(validationsSource, /announcementSchema/);
assert.match(validationsSource, /max\(5000/);

assert.match(headerSource, /\/api\/announcements\/current/);
assert.match(headerSource, /ANNOUNCEMENT_REFRESH_INTERVAL_MS = 30 \* 1000/);
assert.match(headerSource, /if \(status !== "authenticated"\) \{/);
assert.match(headerSource, /setAnnouncement\(null\)/);
assert.match(headerSource, /setInterval\(refreshAnnouncement,\s*ANNOUNCEMENT_REFRESH_INTERVAL_MS\)/);
assert.match(headerSource, /window\.addEventListener\("focus", refreshAnnouncement\)/);
assert.match(headerSource, /document\.addEventListener\("visibilitychange", handleVisibilityChange\)/);
assert.match(headerSource, /isAnnouncementRead\(current\)/);
assert.match(headerSource, /storedValue === getAnnouncementReadMarker\(announcement\)/);
assert.match(headerSource, /localStorage\.setItem\(ANNOUNCEMENT_READ_KEY, getAnnouncementReadMarker\(announcement\)\)/);
assert.match(headerSource, /公告/);
assert.match(headerSource, /gloopix-announcement-read-id/);
assert.match(headerSource, /\{session\?\.user && \(\s*<Button[\s\S]*aria-label="查看公告"/);
assert.match(headerSource, /rounded-full bg-destructive/);

assert.match(adminLayoutSource, /href: "\/admin\/announcements"/);
assert.match(adminLayoutSource, /公告管理/);

assert.match(publicRouteSource, /export async function GET/);
assert.match(publicRouteSource, /prisma\.announcement\.findFirst/);
assert.match(publicRouteSource, /isActive:\s*true/);
assert.match(publicRouteSource, /imageUrl:\s*true/);

assert.match(adminRouteSource, /requireAdmin/);
assert.match(adminRouteSource, /export async function GET/);
assert.match(adminRouteSource, /export async function POST/);
assert.match(adminRouteSource, /announcementSchema\.safeParse/);
assert.match(adminRouteSource, /createdById:\s*session!\.user\.id/);
assert.match(adminRouteSource, /imageUrl:\s*parsed\.data\.imageUrl/);

assert.match(adminHistoryRouteSource, /export async function DELETE/);
assert.match(adminHistoryRouteSource, /requireAdmin/);
assert.match(adminHistoryRouteSource, /deleteMany/);
assert.match(adminHistoryRouteSource, /isActive:\s*false/);

assert.match(adminPageSource, /公告管理/);
assert.match(adminPageSource, /当前公告内容/);
assert.match(adminPageSource, /历史记录/);
assert.match(adminPageSource, /\/api\/admin\/announcements/);
assert.match(adminPageSource, /\/api\/admin\/announcements\/upload/);
assert.match(adminPageSource, /\/api\/admin\/announcements\/history/);
assert.match(adminPageSource, /上传公告图片/);
assert.match(adminPageSource, /清空历史记录/);
assert.match(adminPageSource, /当前公告会保留/);
assert.match(adminPageSource, /handleSave/);
