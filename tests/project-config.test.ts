import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const nextConfig = readFileSync("next.config.ts", "utf8");

assert.equal(packageJson.scripts.test, "tsx tests/*.test.ts");
assert.match(nextConfig, /middlewareClientMaxBodySize:\s*"150mb"/);
assert.match(nextConfig, /turbopack:\s*\{/);
assert.match(nextConfig, /root:\s*process\.cwd\(\)/);
