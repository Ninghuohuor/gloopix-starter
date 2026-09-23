import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const schemaSource = readFileSync("prisma/schema.prisma", "utf8");
const authConfigSource = readFileSync("src/auth.config.ts", "utf8");
const appShellSource = readFileSync("src/components/layout/app-shell.tsx", "utf8");
const middlewareSource = readFileSync("src/middleware.ts", "utf8");
const loginFormSource = readFileSync("src/components/auth/login-form.tsx", "utf8");
const helperSource = readFileSync("src/lib/email-verification.ts", "utf8");

assert.ok(existsSync("src/app/forgot-password/page.tsx"));
assert.ok(existsSync("src/components/auth/forgot-password-form.tsx"));
assert.ok(existsSync("src/app/api/auth/password-reset/request/route.ts"));
assert.ok(existsSync("src/app/api/auth/password-reset/confirm/route.ts"));

const forgotPasswordPageSource = readFileSync("src/app/forgot-password/page.tsx", "utf8");
const forgotPasswordFormSource = readFileSync("src/components/auth/forgot-password-form.tsx", "utf8");
const requestResetRouteSource = readFileSync(
  "src/app/api/auth/password-reset/request/route.ts",
  "utf8"
);
const confirmResetRouteSource = readFileSync(
  "src/app/api/auth/password-reset/confirm/route.ts",
  "utf8"
);

assert.match(schemaSource, /purpose\s+String\s+@default\("REGISTER"\)/);
assert.match(authConfigSource, /"\/forgot-password"/);
assert.match(appShellSource, /"\/forgot-password"/);
assert.match(middlewareSource, /"\/forgot-password"/);
assert.match(loginFormSource, /忘记密码/);
assert.match(loginFormSource, /\/api\/auth\/login-status/);
assert.match(loginFormSource, /请点击“忘记密码”重置/);
assert.match(loginFormSource, /暂时锁定/);
assert.match(forgotPasswordPageSource, /AuthPageShell/);
assert.match(forgotPasswordPageSource, /重置密码/);

assert.match(helperSource, /RESET_PASSWORD/);
assert.match(helperSource, /sendPasswordResetVerificationCode/);
assert.match(helperSource, /verifyPasswordResetCode/);
assert.match(requestResetRouteSource, /sendPasswordResetVerificationCode/);
assert.match(requestResetRouteSource, /password-reset-request:ip/);
assert.match(confirmResetRouteSource, /verifyPasswordResetCode/);
assert.match(confirmResetRouteSource, /passwordStrengthSchema/);
assert.match(confirmResetRouteSource, /bcrypt\.hash\(newPassword,\s*12\)/);
assert.match(confirmResetRouteSource, /resetLoginFailures/);

assert.match(forgotPasswordFormSource, /\/api\/auth\/password-reset\/request/);
assert.match(forgotPasswordFormSource, /\/api\/auth\/password-reset\/confirm/);
assert.match(forgotPasswordFormSource, /passwordStrengthSchema\.safeParse\(nextPassword\)/);
assert.match(forgotPasswordFormSource, /aria-invalid=\{Boolean\(passwordError\)\}/);
assert.match(forgotPasswordFormSource, /两次输入的新密码不一致/);
