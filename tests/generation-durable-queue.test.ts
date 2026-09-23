import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const schemaSource = readFileSync("prisma/schema.prisma", "utf8");
const migrationPath = "prisma/migrations/20260426190000_add_generation_tasks/migration.sql";
const migrationSource = existsSync(migrationPath) ? readFileSync(migrationPath, "utf8") : "";
const generateRouteSource = readFileSync("src/app/api/generate/route.ts", "utf8");
const cancelRouteSource = readFileSync("src/app/api/generate/cancel/route.ts", "utf8");
const taskRouteSource = readFileSync("src/app/api/user/generation-tasks/route.ts", "utf8");
const currentStateSource = readFileSync("docs/ops/current-state.md", "utf8");

assert.match(schemaSource, /generationTasks\s+GenerationTask\[\]/);
assert.match(schemaSource, /model GenerationTask\s+\{/);
assert.match(schemaSource, /referenceImages\s+String\?/);
assert.match(schemaSource, /imageIds\s+String/);
assert.match(schemaSource, /creditCostPerImage\s+Int/);
assert.match(schemaSource, /status\s+String\s+@default\("QUEUED"\)/);
assert.match(schemaSource, /attempts\s+Int\s+@default\(0\)/);
assert.match(schemaSource, /lockedAt\s+DateTime\?/);
assert.match(schemaSource, /lockedBy\s+String\?/);
assert.match(schemaSource, /nextRunAt\s+DateTime\s+@default\(now\(\)\)/);
assert.match(schemaSource, /@@index\(\[status,\s*nextRunAt,\s*createdAt\]\)/);
assert.match(schemaSource, /@@index\(\[userId,\s*status,\s*createdAt\]\)/);
assert.match(schemaSource, /@@index\(\[lockedAt\]\)/);

assert.ok(existsSync(migrationPath));
assert.match(migrationSource, /CREATE TABLE "GenerationTask"/);
assert.match(migrationSource, /"id" TEXT NOT NULL PRIMARY KEY/);
assert.match(migrationSource, /"status" TEXT NOT NULL DEFAULT 'QUEUED'/);
assert.match(migrationSource, /CREATE INDEX "GenerationTask_status_nextRunAt_createdAt_idx"/);
assert.match(migrationSource, /CREATE INDEX "GenerationTask_userId_status_createdAt_idx"/);
assert.match(migrationSource, /CREATE INDEX "GenerationTask_lockedAt_idx"/);

assert.match(generateRouteSource, /prisma\.generationTask\.create/);
assert.match(generateRouteSource, /import \{ ensureGenerationWorkerStarted \} from "@\/lib\/generation-queue"/);
assert.match(generateRouteSource, /prisma\.generationTask\.create\(\{\s*data:\s*\{/s);
assert.match(generateRouteSource, /imageIds:\s*JSON\.stringify\(imageIds\)/);
assert.match(generateRouteSource, /referenceImages:\s*persistedReferenceImages \? JSON\.stringify\(persistedReferenceImages\) : null/);
assert.match(generateRouteSource, /creditCostPerImage/);
assert.match(generateRouteSource, /ensureGenerationWorkerStarted\(\)/);
assert.match(generateRouteSource, /console\.error\("Image generation request failed"/);
assert.doesNotMatch(generateRouteSource, /void processPersistedGenerationTask/);
assert.match(cancelRouteSource, /(?:tx|prisma)\.generationTask\.updateMany/);
assert.match(taskRouteSource, /ensureGenerationWorkerStarted/);
assert.match(currentStateSource, /SQLite-backed durable generation queue/);
assert.match(currentStateSource, /GenerationTask/);
