import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const schemaSource = readFileSync("prisma/schema.prisma", "utf8");
const registerRouteSource = readFileSync("src/app/api/auth/register/route.ts", "utf8");
const registerFormSource = readFileSync("src/components/auth/register-form.tsx", "utf8");
const envExampleSource = readFileSync(".env.example", "utf8");

assert.match(schemaSource, /model EmailVerificationCode/);
assert.match(schemaSource, /email\s+String/);
assert.match(schemaSource, /codeHash\s+String/);
assert.match(schemaSource, /purpose\s+String\s+@default\("REGISTER"\)/);
assert.match(schemaSource, /expiresAt\s+DateTime/);
assert.match(schemaSource, /consumedAt\s+DateTime\?/);
assert.match(schemaSource, /attempts\s+Int\s+@default\(0\)/);

assert.ok(
  existsSync("src/app/api/auth/email-verification/route.ts"),
  "email verification send route should exist"
);
const sendRouteSource = readFileSync("src/app/api/auth/email-verification/route.ts", "utf8");
assert.match(sendRouteSource, /export async function POST/);
assert.match(sendRouteSource, /sendRegistrationVerificationCode/);
assert.match(sendRouteSource, /该邮箱已被注册/);

assert.ok(
  existsSync("src/lib/email-verification.ts"),
  "email verification helper should exist"
);
const helperSource = readFileSync("src/lib/email-verification.ts", "utf8");
const deliverySource = readFileSync("src/lib/email-delivery.ts", "utf8");
assert.match(helperSource, /sendEmail/);
assert.match(deliverySource, /RESEND_API_KEY/);
assert.match(deliverySource, /SMTP_HOST/);
assert.match(deliverySource, /EMAIL_FROM/);
assert.match(helperSource, /generateVerificationCode/);
assert.match(helperSource, /verifyRegistrationCode/);
assert.match(helperSource, /expiresAt:\s*\{\s*gt:\s*new Date\(\)\s*\}/s);
assert.match(helperSource, /MAX_ATTEMPTS\s*=\s*5/);
assert.match(helperSource, /attempts:\s*\{\s*lt:\s*MAX_ATTEMPTS\s*\}/s);
assert.match(helperSource, /consumedAt:\s*new Date\(\)/);

assert.match(registerRouteSource, /verificationCode:\s*z\.string\(\)/);
assert.match(registerRouteSource, /passwordStrengthSchema/);
assert.match(registerRouteSource, /verifyRegistrationCode/);
assert.match(registerRouteSource, /验证码错误或已过期/);
assert.match(registerRouteSource, /process\.env\.NODE_ENV === "development"/);
assert.match(registerRouteSource, /userCount === 0/);

assert.match(registerFormSource, /验证码/);
assert.match(registerFormSource, /发送验证码/);
assert.match(registerFormSource, /verificationCode/);
assert.match(registerFormSource, /\/api\/auth\/email-verification/);
assert.match(registerFormSource, /cooldown/);
assert.match(registerFormSource, /noValidate/);
assert.match(registerFormSource, /passwordStrengthSchema\.safeParse\(password\)/);
assert.match(registerFormSource, /请输入6位邮箱验证码/);
assert.doesNotMatch(registerFormSource, /pattern="\\\\d\{6\}"/);

assert.match(envExampleSource, /RESEND_API_KEY/);
assert.match(envExampleSource, /SMTP_HOST/);
assert.match(envExampleSource, /EMAIL_FROM/);
assert.doesNotMatch(envExampleSource, /WECHAT/);
