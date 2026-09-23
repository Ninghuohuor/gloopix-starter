import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const pageSource = readFileSync("src/app/prompts/page.tsx", "utf8");
const nextConfigSource = readFileSync("next.config.ts", "utf8");
const publicRouteSource = readFileSync("src/app/api/prompts/route.ts", "utf8");
const validationsSource = readFileSync("src/lib/validations.ts", "utf8");
const migrationScriptSource = readFileSync("scripts/migrate-prompt-data-images.ts", "utf8");

assert.match(pageSource, /loading="lazy"/);
assert.match(pageSource, /decoding="async"/);
assert.match(nextConfigSource, /source:\s*"\/uploads\/prompts\/:path\*"/);
assert.match(nextConfigSource, /Cache-Control/);
assert.match(nextConfigSource, /public,\s*max-age=31536000,\s*immutable/);
assert.match(publicRouteSource, /stale-while-revalidate=300/);
assert.match(validationsSource, /!value\.startsWith\("data:image\/"\)/);
assert.match(migrationScriptSource, /data:image\//);
assert.match(migrationScriptSource, /\/uploads\/prompts\//);
