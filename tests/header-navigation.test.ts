import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const headerSource = readFileSync("src/components/layout/header.tsx", "utf8");
const navStart = headerSource.indexOf("const navigationLinks");
const navEnd = headerSource.indexOf("return (", navStart);
const navSource = headerSource.slice(navStart, navEnd);
const authenticatedNavStart = headerSource.indexOf("const authenticatedNavigationLinks");
const authenticatedNavEnd = headerSource.indexOf("const navigationLinks", authenticatedNavStart);
const authenticatedNavSource = headerSource.slice(authenticatedNavStart, authenticatedNavEnd);

assert.match(headerSource, /<Link[\s\S]*href="\/"[\s\S]*aria-label="返回生图页面"[\s\S]*className="[^"]*mr-2[^"]*font-bold[^"]*sm:mr-6[^"]*"/);
assert.match(headerSource, /Gloopix\s*<\/Link>/);
assert.doesNotMatch(headerSource, /<span className="mr-2 flex items-center space-x-2 font-bold sm:mr-6">/);

const expectedOrder = ["生成", "积分", "历史", "提示词", "管理后台"];
let lastIndex = -1;
for (const label of expectedOrder) {
  const index = authenticatedNavSource.indexOf(label);
  assert.ok(index > lastIndex, `${label} should appear after the previous menu item`);
  lastIndex = index;
}

assert.match(authenticatedNavSource, /\{ href: "\/", label: "生成" \}/);
assert.match(authenticatedNavSource, /\{ href: "\/redeem", label: "积分" \}/);
assert.match(authenticatedNavSource, /\{ href: "\/history", label: "历史" \}/);
assert.match(authenticatedNavSource, /\{ href: "\/prompts", label: "提示词" \}/);
assert.match(navSource, /session\?\.user[\s\S]*authenticatedNavigationLinks[\s\S]*publicNavigationLinks/);
assert.match(headerSource, /const publicNavigationLinks = \[[\s\S]*\{ href: "\/", label: "生成" \}[\s\S]*\{ href: "\/prompts", label: "提示词" \}/);
assert.doesNotMatch(
  headerSource.slice(headerSource.indexOf("const publicNavigationLinks"), headerSource.indexOf("const authenticatedNavigationLinks")),
  /\/history|\/redeem|\/updates/
);
assert.doesNotMatch(authenticatedNavSource, /\/updates/);
assert.doesNotMatch(headerSource, /\/updates|版本更新/);
assert.doesNotMatch(headerSource, /inviteCode|Indream/);
