import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const schemaSource = readFileSync("prisma/schema.prisma", "utf8");
const authSource = readFileSync("src/auth.ts", "utf8");
const loginSecurityMigrationPath =
  "prisma/migrations/00000000000000_init/migration.sql";

assert.ok(existsSync("src/lib/login-security.ts"));
assert.ok(existsSync("src/app/api/auth/login-status/route.ts"));
assert.ok(existsSync(loginSecurityMigrationPath));

const loginSecuritySource = readFileSync("src/lib/login-security.ts", "utf8");
const loginStatusRouteSource = readFileSync("src/app/api/auth/login-status/route.ts", "utf8");
const loginSecurityMigrationSource = readFileSync(loginSecurityMigrationPath, "utf8");

assert.match(schemaSource, /model LoginFailure/);
assert.match(schemaSource, /email\s+String\s+@unique/);
assert.match(schemaSource, /failureCount\s+Int\s+@default\(0\)/);
assert.match(schemaSource, /lockedUntil\s+DateTime\?/);
assert.doesNotMatch(schemaSource, /model AuthSecurityEvent/);
assert.match(loginSecurityMigrationSource, /CREATE TABLE "LoginFailure"/);
assert.match(loginSecurityMigrationSource, /CREATE UNIQUE INDEX "LoginFailure_email_key"/);
assert.doesNotMatch(loginSecurityMigrationSource, /AuthSecurityEvent/);

assert.match(loginSecuritySource, /LOGIN_WARNING_THRESHOLD\s*=\s*5/);
assert.match(loginSecuritySource, /LOGIN_LOCK_THRESHOLD\s*=\s*10/);
assert.match(loginSecuritySource, /LOGIN_LOCK_DURATION_MINUTES\s*=\s*15/);
assert.match(loginSecuritySource, /recordFailedLogin/);
assert.match(loginSecuritySource, /recordSuccessfulLogin/);
assert.match(loginSecuritySource, /resetLoginFailures/);
assert.match(loginSecuritySource, /getLoginFailureStatus/);
assert.doesNotMatch(loginSecuritySource, /authSecurityEvent|AUTH_SECURITY_EVENT/);

assert.match(authSource, /getLoginFailureStatus/);
assert.match(authSource, /recordFailedLogin/);
assert.match(authSource, /recordSuccessfulLogin/);
assert.match(authSource, /getClientIpFromHeaders/);
assert.match(loginStatusRouteSource, /getLoginFailureStatus/);
assert.match(loginStatusRouteSource, /remainingSeconds/);
