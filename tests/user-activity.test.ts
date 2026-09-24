import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const userActivitySource = readFileSync("src/lib/user-activity.ts", "utf8");
const creditsRouteSource = readFileSync("src/app/api/user/credits/route.ts", "utf8");
const generateRouteSource = readFileSync("src/app/api/generate/route.ts", "utf8");
const generationTasksRouteSource = readFileSync(
  "src/app/api/user/generation-tasks/route.ts",
  "utf8"
);
const adminGuardSource = readFileSync("src/lib/admin-guard.ts", "utf8");
const migrationSource = readFileSync(
  "prisma/migrations/00000000000000_init/migration.sql",
  "utf8"
);

assert.match(userActivitySource, /LAST_ACTIVE_UPDATE_WINDOW_MS = 5 \* 60 \* 1000/);
assert.match(userActivitySource, /export async function touchUserActivity/);
assert.match(userActivitySource, /lastActiveAt:\s*null/);
assert.match(userActivitySource, /lastActiveAt:\s*\{\s*lt:\s*cutoff/);
assert.match(userActivitySource, /lastActiveAt:\s*now/);
assert.match(userActivitySource, /catch \(error\)/);
assert.match(userActivitySource, /console\.warn\(\s*"Failed to touch user activity"/);
assert.match(migrationSource, /"lastActiveAt" DATETIME/);

assert.match(creditsRouteSource, /touchUserActivity\(session\.user\.id\)/);
assert.match(generateRouteSource, /touchUserActivity\(session\.user\.id\)/);
assert.match(generationTasksRouteSource, /touchUserActivity\(session\.user\.id\)/);
assert.match(adminGuardSource, /touchUserActivity\(session\.user\.id\)/);
