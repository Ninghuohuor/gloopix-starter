import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const workerPath = "src/lib/generation-queue.ts";
const workerSource = existsSync(workerPath) ? readFileSync(workerPath, "utf8") : "";

assert.ok(existsSync(workerPath));
assert.match(workerSource, /export function ensureGenerationWorkerStarted/);
assert.match(workerSource, /export async function processNextGenerationTaskForTest/);
assert.match(workerSource, /const GENERATION_QUEUE_LOCK_TIMEOUT_MS = 10 \* 60 \* 1000/);
assert.match(workerSource, /const GENERATION_QUEUE_POLL_INTERVAL_MS = 2000/);
assert.match(workerSource, /const GENERATION_QUEUE_MAX_ATTEMPTS = 2/);
assert.match(workerSource, /crypto\.randomUUID\(\)/);
assert.match(workerSource, /prisma\.generationTask\.findFirst/);
assert.match(workerSource, /status:\s*"QUEUED"/);
assert.match(workerSource, /status:\s*"RUNNING"/);
assert.match(workerSource, /lockedAt:\s*\{\s*lt:\s*staleLockCutoff\s*\}/);
assert.match(workerSource, /prisma\.generationTask\.updateMany/);
assert.match(workerSource, /status:\s*"RUNNING"/);
assert.match(workerSource, /attempts:\s*\{\s*increment:\s*1\s*\}/);
assert.match(workerSource, /parseJsonArray\(task\.imageIds\)/);
assert.match(workerSource, /parseJsonArray\(task\.referenceImages/);
assert.match(workerSource, /generateImage\(/);
assert.match(workerSource, /currentTask\?\.status === "CANCELED"/);
assert.match(workerSource, /currentImage\.status === "CANCELED"/);
assert.match(workerSource, /GENERATION_FAILURE_REFUND/);
assert.match(workerSource, /creditCostPerImage/);
assert.match(workerSource, /status:\s*"COMPLETED"/);
assert.match(workerSource, /status:\s*"FAILED"/);
