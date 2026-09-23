import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

assert.ok(existsSync("src/components/auth/auth-page-shell.tsx"));
assert.ok(existsSync("src/components/layout/app-shell.tsx"));
assert.ok(existsSync("src/app/icon.svg"));

const authConfigSource = readFileSync("src/auth.config.ts", "utf8");
const middlewareSource = readFileSync("src/middleware.ts", "utf8");
const loginPageSource = readFileSync("src/app/login/page.tsx", "utf8");
const registerPageSource = readFileSync("src/app/register/page.tsx", "utf8");
const layoutSource = readFileSync("src/app/layout.tsx", "utf8");
const appShellSource = readFileSync("src/components/layout/app-shell.tsx", "utf8");
const authShellSource = readFileSync("src/components/auth/auth-page-shell.tsx", "utf8");
const globalCssSource = readFileSync("src/app/globals.css", "utf8");
const appIconSource = readFileSync("src/app/icon.svg", "utf8");

assert.match(authConfigSource, /const publicRoutes = \["\/", "\/generate", "\/prompts", "\/login", "\/register", "\/forgot-password", "\/terms", "\/privacy"\]/);
assert.match(authConfigSource, /const protectedRoutes = \["\/credits", "\/redeem", "\/history", "\/account"\]/);
assert.match(authConfigSource, /protectedRoutes\.includes\(pathname\)/);
assert.match(authConfigSource, /Response\.redirect\(new URL\("\/login", nextUrl\)\)/);
assert.match(middlewareSource, /hasSessionCookie/);
assert.match(middlewareSource, /"\/forgot-password"/);
assert.match(middlewareSource, /const publicPageRoutes = \["\/", "\/generate", "\/prompts", "\/login", "\/register", "\/forgot-password", "\/terms", "\/privacy"\]/);
assert.match(middlewareSource, /const protectedPageRoutes = \["\/credits", "\/redeem", "\/history", "\/account"\]/);
assert.match(middlewareSource, /protectedPageRoutes\.some\(\s*\(route\) => request\.nextUrl\.pathname === route \|\| request\.nextUrl\.pathname\.startsWith\(`\$\{route\}\/`\)\s*\)/);
assert.match(middlewareSource, /NextResponse\.redirect\(new URL\("\/login", request\.url\)\)/);
assert.match(middlewareSource, /assets\//);
assert.match(middlewareSource, /icon\.svg/);

assert.match(loginPageSource, /auth\(\)/);
assert.match(loginPageSource, /redirect\(getPostLoginPath\(session\.user\.role\)\)/);
assert.match(loginPageSource, /AuthPageShell/);
assert.match(loginPageSource, /登录你的账号，开始创作/);
assert.doesNotMatch(loginPageSource, /登录你的帐号开始生成图片/);
assert.match(registerPageSource, /auth\(\)/);
assert.match(registerPageSource, /AuthPageShell/);

assert.match(layoutSource, /AppShell/);
assert.match(layoutSource, /icons:/);
assert.match(layoutSource, /url: "\/icon\.svg"/);
assert.doesNotMatch(layoutSource, /next\/font\/google/);
assert.doesNotMatch(layoutSource, /Geist/);
assert.match(appShellSource, /usePathname/);
assert.match(appShellSource, /const authRoutes = \["\/login", "\/register", "\/forgot-password", "\/terms", "\/privacy"\]/);
assert.match(appShellSource, /authRoutes\.includes\(pathname\)/);
assert.match(appShellSource, /<Header \/>/);

assert.match(authShellSource, /md:grid-cols-2/);
assert.match(authShellSource, /auth-visual-image/);
assert.match(authShellSource, /\/assets\/login-register-visual\.png/);
assert.match(authShellSource, /mb-6 text-3xl font-bold tracking-normal text-foreground">Gloopix/);
assert.doesNotMatch(authShellSource, /AI 图片生成工作台/);
assert.doesNotMatch(authShellSource, /登录后进入生成页面/);
assert.match(globalCssSource, /--font-app-sans/);
assert.match(globalCssSource, /-apple-system/);
assert.match(globalCssSource, /BlinkMacSystemFont/);
assert.match(globalCssSource, /PingFang SC/);
assert.match(globalCssSource, /Hiragino Sans GB/);
assert.doesNotMatch(globalCssSource, /--font-app-sans:\s*var\(--font-geist-sans\)/);
assert.match(globalCssSource, /--font-sans: var\(--font-app-sans\)/);
assert.doesNotMatch(globalCssSource, /--font-mono:\s*var\(--font-geist-mono\)/);
assert.match(globalCssSource, /html,\s+body,\s+button,\s+input,\s+textarea,\s+select \{\s+font-family:/);
assert.doesNotMatch(globalCssSource, /body \{\s+@apply bg-background text-foreground;\s+font-family: var\(--font-app-sans\);/);
assert.match(appIconSource, />\s*G\s*<\/text>/);
