import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const adminPageSource = readFileSync("src/app/admin/page.tsx", "utf8");

for (const label of ["总用户数", "生成图片数", "可用兑换码", "已使用兑换码"]) {
  assert.match(adminPageSource, new RegExp(label));
}
assert.doesNotMatch(adminPageSource, /EMAIL_MONTHLY_FREE_QUOTA|emailVerificationCode\.count|邮箱免费额度/);
