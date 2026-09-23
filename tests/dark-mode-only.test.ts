import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const layoutSource = readFileSync("src/app/layout.tsx", "utf8");
const headerSource = readFileSync("src/components/layout/header.tsx", "utf8");

assert.match(layoutSource, /forcedTheme="dark"/);
assert.match(layoutSource, /defaultTheme="dark"/);
assert.match(layoutSource, /enableSystem=\{false\}/);

assert.doesNotMatch(headerSource, /useTheme/);
assert.doesNotMatch(headerSource, /setTheme/);
assert.doesNotMatch(headerSource, /resolvedTheme/);
assert.doesNotMatch(headerSource, /切换主题/);
assert.doesNotMatch(headerSource, /☀|☾/);
