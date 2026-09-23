import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const schemaSource = readFileSync("prisma/schema.prisma", "utf8");
const generateRouteSource = readFileSync("src/app/api/generate/route.ts", "utf8");
const taskRouteSource = readFileSync("src/app/api/user/generation-tasks/route.ts", "utf8");
const providerSource = readFileSync("src/components/generation/generation-session-provider.tsx", "utf8");
const queueWorkerSource = readFileSync("src/lib/generation-queue.ts", "utf8");

assert.ok(existsSync("prisma/migrations/20260424151000_add_generation_task_metadata/migration.sql"));
assert.match(schemaSource, /generationId\s+String\?/);
assert.match(schemaSource, /completedAt\s+DateTime\?/);
assert.match(schemaSource, /@@index\(\[userId,\s*generationId,\s*createdAt\]\)/);

assert.match(generateRouteSource, /generationId:\s*parsed\.data\.requestId/);
assert.match(generateRouteSource, /model:\s*parsed\.data\.model/);
assert.match(generateRouteSource, /aspectRatio:\s*parsed\.data\.aspectRatio/);
assert.match(generateRouteSource, /quality:\s*parsed\.data\.quality/);
assert.match(generateRouteSource, /resolution:\s*parsed\.data\.resolution/);
assert.match(generateRouteSource, /quantity:\s*parsed\.data\.quantity/);
assert.match(queueWorkerSource, /completedAt:\s*new Date\(\)/);
assert.match(generateRouteSource, /ensureGenerationWorkerStarted/);
assert.match(generateRouteSource, /prisma\.generationTask\.create/);
assert.match(generateRouteSource, /status:\s*"queued"/);
assert.match(generateRouteSource, /\{\s*status:\s*202\s*\}/);

assert.match(taskRouteSource, /generationId:\s*\{\s*not:\s*null\s*\}/);
assert.match(taskRouteSource, /status:\s*"PENDING"/);
assert.match(taskRouteSource, /import \{ ensureGenerationWorkerStarted \} from "@\/lib\/generation-queue"/);
assert.match(taskRouteSource, /ensureGenerationWorkerStarted\(\)/);
assert.match(taskRouteSource, /activeGenerationIds/);
assert.match(taskRouteSource, /notIn:\s*activeGenerationIds/);
assert.match(taskRouteSource, /STALE_PENDING_TASK_MS/);
assert.match(taskRouteSource, /markStalePendingTasksAsFailed/);
assert.match(taskRouteSource, /GENERATION_STALE_REFUND/);
assert.match(taskRouteSource, /RECENT_TASK_WINDOW_MS/);
assert.match(taskRouteSource, /pendingCount > 0/);
assert.match(taskRouteSource, /imageUrls:\s*completedImages\.map/);

assert.match(providerSource, /\/api\/user\/generation-tasks/);
assert.match(providerSource, /syncGenerationTasks/);
assert.match(providerSource, /usePathname/);
assert.match(providerSource, /pathname !== "\/"/);
assert.match(providerSource, /setMessages\(\(currentMessages\) =>/);
assert.match(providerSource, /currentMessage\?\.referenceImages/);
assert.match(providerSource, /mergeSyncedGenerationTasks/);
assert.match(providerSource, /unsyncedGeneratingMessages/);
assert.match(providerSource, /message\.status === "generating"/);
assert.match(providerSource, /!taskIds\.has\(message\.id\)/);
assert.match(providerSource, /window\.dispatchEvent\(new Event\("credits-updated"\)\)/);
