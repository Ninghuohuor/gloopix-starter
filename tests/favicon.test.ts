import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const layoutSource = readFileSync("src/app/layout.tsx", "utf8");
const middlewareSource = readFileSync("src/middleware.ts", "utf8");
const iconSvgSource = readFileSync("src/app/icon.svg", "utf8");

assert.ok(existsSync("src/app/favicon.ico"));
assert.ok(existsSync("src/app/apple-icon.png"));
assert.match(layoutSource, /\/favicon\.ico/);
assert.match(layoutSource, /\/icon\.svg/);
assert.match(layoutSource, /apple:\s*\[/);
assert.match(layoutSource, /\/apple-icon\.png/);
assert.match(middlewareSource, /apple-icon\.png/);
assert.match(iconSvgSource, />\s*G\s*</);
