import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const nextConfigSource = readFileSync("next.config.ts", "utf8");
const gitignoreSource = readFileSync(".gitignore", "utf8");
const middlewareSource = readFileSync("src/middleware.ts", "utf8");
const requestSecuritySource = readFileSync("src/lib/request-security.ts", "utf8");
const authSource = readFileSync("src/auth.ts", "utf8");
const emailVerificationSource = readFileSync("src/app/api/auth/email-verification/route.ts", "utf8");
const registerSource = readFileSync("src/app/api/auth/register/route.ts", "utf8");
const generateRouteSource = readFileSync("src/app/api/generate/route.ts", "utf8");
const validationsSource = readFileSync("src/lib/validations.ts", "utf8");
const uploadRouteSource = readFileSync("src/app/api/admin/prompts/upload/route.ts", "utf8");

assert.match(nextConfigSource, /Content-Security-Policy/);
assert.match(nextConfigSource, /frame-ancestors 'none'/);
assert.match(nextConfigSource, /X-Content-Type-Options/);
assert.match(nextConfigSource, /X-Frame-Options/);
assert.match(nextConfigSource, /Referrer-Policy/);
assert.match(nextConfigSource, /Permissions-Policy/);
assert.match(nextConfigSource, /Strict-Transport-Security/);

assert.match(middlewareSource, /rejectCrossSiteRequest/);
assert.match(middlewareSource, /pathname\.startsWith\("\/api\/"\)/);
assert.match(requestSecuritySource, /new URL\(origin\)\.host !== host/);
assert.match(requestSecuritySource, /status:\s*403/);
assert.match(requestSecuritySource, /status:\s*413/);

assert.match(authSource, /rateLimit\(`login:\$\{email\}`/);
assert.match(emailVerificationSource, /email-verification:ip:\$\{ip\}`,\s*8,\s*15 \* 60 \* 1000/);
assert.match(emailVerificationSource, /email-verification:email/);
assert.match(emailVerificationSource, /rejectLargeRequest\(request,\s*16 \* 1024\)/);
assert.match(registerSource, /register:ip:\$\{ip\}`,\s*5,\s*15 \* 60 \* 1000/);
assert.match(registerSource, /registerIp:\s*ip/);
assert.match(registerSource, /rejectLargeRequest\(request,\s*32 \* 1024\)/);

assert.match(generateRouteSource, /rejectLargeRequest\(request,\s*145 \* 1024 \* 1024\)/);
assert.match(validationsSource, /REFERENCE_IMAGE_DATA_URL_MAX_LENGTH = 28 \* 1024 \* 1024/);
assert.match(validationsSource, /referenceImage:[\s\S]*max\(REFERENCE_IMAGE_DATA_URL_MAX_LENGTH/);
assert.match(validationsSource, /referenceImages:[\s\S]*max\(10,\s*"最多上传 10 张参考图"\)/);
assert.match(validationsSource, /startsWith\("data:image\/"\)/);

assert.match(uploadRouteSource, /admin-prompt-upload/);
assert.match(uploadRouteSource, /rejectLargeRequest\(request,\s*MAX_UPLOAD_BYTES \+ 1024 \* 1024\)/);
assert.match(uploadRouteSource, /metadata\(\)/);
assert.match(uploadRouteSource, /图片格式无效/);
assert.match(gitignoreSource, /^dev\.db$/m);
assert.match(gitignoreSource, /^dev\.db-journal$/m);
