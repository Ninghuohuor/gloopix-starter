import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const adminPageSource = readFileSync("src/app/admin/announcements/page.tsx", "utf8");

assert.match(adminPageSource, /try\s*\{[\s\S]*fetch\("\/api\/admin\/announcements"/);
assert.match(adminPageSource, /finally\s*\{\s*setSaving\(false\);?\s*\}/);
assert.match(adminPageSource, /保存失败，请稍后再试/);

assert.match(adminPageSource, /finally\s*\{\s*setUploadingImage\(false\);?\s*\}/);
assert.match(adminPageSource, /上传失败，请稍后再试/);

assert.match(adminPageSource, /finally\s*\{\s*setClearingHistory\(false\);?\s*\}/);
assert.match(adminPageSource, /清空失败，请稍后再试/);
