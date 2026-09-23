import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workerSource = readFileSync("src/lib/generation-queue.ts", "utf8");

assert.match(workerSource, /referenceImages:\s*null,\s*completedAt:\s*currentTask\.completedAt/);
assert.match(workerSource, /referenceImages:\s*pendingCount > 0 \? task\.referenceImages : null/);
assert.match(workerSource, /referenceImages:\s*attemptsExhausted \? null : task\.referenceImages/);

