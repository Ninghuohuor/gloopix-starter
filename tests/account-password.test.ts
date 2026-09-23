import { existsSync, readFileSync } from "fs";
import assert from "assert";

assert.ok(existsSync("src/app/account/page.tsx"), "account page should exist");
assert.ok(existsSync("src/app/api/user/password/route.ts"), "password API route should exist");

const headerSource = readFileSync("src/components/layout/header.tsx", "utf8");
const accountPageSource = readFileSync("src/app/account/page.tsx", "utf8");
const changePasswordFormSource = readFileSync("src/components/account/change-password-form.tsx", "utf8");
const passwordRouteSource = readFileSync("src/app/api/user/password/route.ts", "utf8");
const validationsSource = readFileSync("src/lib/validations.ts", "utf8");

assert.match(headerSource, /个人信息/);
assert.match(headerSource, /href="\/account"/);

assert.match(accountPageSource, /当前邮箱/);
assert.match(accountPageSource, /修改密码/);
assert.match(accountPageSource, /至少 8 位，并包含大小写字母和特殊符号/);

assert.match(changePasswordFormSource, /当前密码/);
assert.match(changePasswordFormSource, /新密码/);
assert.match(changePasswordFormSource, /确认新密码/);
assert.match(changePasswordFormSource, /至少 8 位，并包含大小写字母和特殊符号/);
assert.match(changePasswordFormSource, /passwordStrengthSchema\.safeParse\(newPassword\)/);
assert.match(changePasswordFormSource, /setPasswordError/);
assert.match(changePasswordFormSource, /onChange=\{\(event\) => handleNewPasswordChange\(event\.target\.value\)\}/);
assert.match(changePasswordFormSource, /onChange=\{\(event\) => handleConfirmPasswordChange\(event\.target\.value\)\}/);
assert.match(changePasswordFormSource, /aria-invalid=\{Boolean\(passwordError\)\}/);
assert.match(changePasswordFormSource, /aria-invalid=\{Boolean\(confirmPasswordError\)\}/);
assert.match(changePasswordFormSource, /confirmPasswordError \|\| "两次输入的新密码一致后即可保存"/);
assert.match(changePasswordFormSource, /text-destructive/);

assert.match(passwordRouteSource, /auth\(\)/);
assert.match(passwordRouteSource, /bcrypt\.compare\(currentPassword,\s*user\.passwordHash\)/);
assert.match(passwordRouteSource, /bcrypt\.hash\(newPassword,\s*12\)/);
assert.match(passwordRouteSource, /passwordStrengthSchema/);

assert.match(validationsSource, /passwordStrengthSchema/);
assert.match(validationsSource, /至少 8 位，并包含大小写字母和特殊符号/);
assert.ok(validationsSource.includes("(?=.*[a-z])"));
assert.ok(validationsSource.includes("(?=.*[A-Z])"));
assert.ok(validationsSource.includes("(?=.*[^A-Za-z0-9])"));
