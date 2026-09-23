import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const schemaSource = readFileSync("prisma/schema.prisma", "utf8");
const authSource = readFileSync("src/auth.ts", "utf8");
const adminLayoutSource = readFileSync("src/app/admin/layout.tsx", "utf8");
const usersRouteSource = readFileSync("src/app/api/admin/users/route.ts", "utf8");
const userToggleRouteSource = readFileSync("src/app/api/admin/users/[id]/route.ts", "utf8");
const usersPageSource = readFileSync("src/app/admin/users/page.tsx", "utf8");
const lastLoginMigrationSource = readFileSync(
  "prisma/migrations/20260426173000_add_user_last_login_at/migration.sql",
  "utf8"
);

assert.match(schemaSource, /isDisabled\s+Boolean\s+@default\(false\)/);
assert.match(schemaSource, /lastLoginAt\s+DateTime\?/);
assert.match(schemaSource, /lastActiveAt\s+DateTime\?/);
assert.match(lastLoginMigrationSource, /ADD COLUMN "lastLoginAt" DATETIME/);

assert.match(authSource, /if \(user\.isDisabled\)\s*\{[\s\S]*return null;\s*\}/);
assert.match(authSource, /const loginTime = new Date\(\)/);
assert.match(authSource, /lastLoginAt:\s*loginTime/);
assert.match(authSource, /lastActiveAt:\s*loginTime/);

assert.match(adminLayoutSource, /href:\s*"\/admin\/users"/);
assert.match(adminLayoutSource, /用户管理/);

assert.match(usersRouteSource, /isDisabled:\s*true/);
assert.match(usersRouteSource, /email:\s*true/);
assert.match(usersRouteSource, /lastLoginAt:\s*true/);
assert.match(usersRouteSource, /lastActiveAt:\s*true/);
assert.match(usersRouteSource, /_count:\s*\{\s*select:\s*\{\s*images:\s*true\s*\}/s);

assert.match(userToggleRouteSource, /export async function PATCH/);
assert.match(userToggleRouteSource, /requireAdmin/);
assert.match(userToggleRouteSource, /disabledSchema\.safeParse/);
assert.match(userToggleRouteSource, /if \(id === session!\.user\.id\)/);
assert.match(userToggleRouteSource, /isDisabled:\s*parsed\.data\.isDisabled/);
assert.match(userToggleRouteSource, /lastLoginAt:\s*true/);
assert.match(userToggleRouteSource, /lastActiveAt:\s*true/);

assert.match(usersPageSource, /用户管理/);
assert.match(usersPageSource, /邮箱/);
assert.match(usersPageSource, /生成图片/);
assert.match(usersPageSource, /最近活跃/);
assert.match(usersPageSource, /formatAdminDateTime\(user\.lastActiveAt \|\| user\.lastLoginAt\)/);
assert.match(usersPageSource, /timeZone:\s*"Asia\/Shanghai"/);
assert.match(usersPageSource, /禁用账号/);
assert.match(usersPageSource, /启用账号/);
assert.match(usersPageSource, /\/api\/admin\/users/);
assert.match(usersPageSource, /handleToggleDisabled/);
