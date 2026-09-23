import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("src/app/admin/settings/page.tsx", "utf8");

assert.match(source, /function addProvider\(\)/);
assert.match(source, /provider-name-\$\{newProviderId\}/);
assert.match(source, /aria-label="API 列表"/);
assert.match(source, /provider\.id === activeProviderId &&/);
assert.match(source, /setSelectedProviderId\(provider\.id\)/);
assert.match(source, /aria-labelledby=\{`provider-heading-\$\{provider\.id\}`\}/);
assert.match(source, /连接配置/);
assert.match(source, /此 API 的模型/);
assert.match(source, /aria-label=\{`模型 \$\{modelIndex \+ 1\}/);
