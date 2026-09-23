import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

assert.ok(existsSync("src/app/terms/page.tsx"), "terms page should exist");
assert.ok(existsSync("src/app/privacy/page.tsx"), "privacy page should exist");
assert.ok(existsSync("src/components/legal/legal-page.tsx"), "shared legal page component should exist");

const registerFormSource = readFileSync("src/components/auth/register-form.tsx", "utf8");
const registerRouteSource = readFileSync("src/app/api/auth/register/route.ts", "utf8");
const loginPageSource = readFileSync("src/app/login/page.tsx", "utf8");
const registerPageSource = readFileSync("src/app/register/page.tsx", "utf8");
const authConfigSource = readFileSync("src/auth.config.ts", "utf8");
const middlewareSource = readFileSync("src/middleware.ts", "utf8");
const termsPageSource = readFileSync("src/app/terms/page.tsx", "utf8");
const privacyPageSource = readFileSync("src/app/privacy/page.tsx", "utf8");

assert.match(registerFormSource, /acceptedTerms/);
assert.match(registerFormSource, /请先阅读并同意用户协议和隐私政策/);
assert.match(registerFormSource, /href="\/terms"/);
assert.match(registerFormSource, /href="\/privacy"/);
assert.match(registerFormSource, /JSON\.stringify\(\{ name, email, password, verificationCode, acceptedTerms \}\)/);
assert.match(registerRouteSource, /acceptedTerms:\s*z\.boolean\(\)\.refine/);
assert.match(registerRouteSource, /请先阅读并同意用户协议和隐私政策/);

assert.match(loginPageSource, /《用户协议》/);
assert.match(loginPageSource, /《隐私政策》/);
assert.doesNotMatch(registerPageSource, /注册前请阅读/);
assert.doesNotMatch(registerPageSource, /《用户协议》/);
assert.doesNotMatch(registerPageSource, /《隐私政策》/);
assert.match(authConfigSource, /"\/terms", "\/privacy"/);
assert.match(middlewareSource, /"\/terms", "\/privacy"/);

assert.match(termsPageSource, /用户协议/);
assert.match(termsPageSource, /积分、生成与退款/);
assert.match(privacyPageSource, /隐私政策/);
assert.match(privacyPageSource, /第三方服务/);
