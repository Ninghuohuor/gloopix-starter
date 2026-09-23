import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const generateRoute = readFileSync("src/app/api/generate/route.ts", "utf8");
const cancelRoute = readFileSync("src/app/api/generate/cancel/route.ts", "utf8");
const queueWorker = readFileSync("src/lib/generation-queue.ts", "utf8");

assert.match(generateRoute, /index === 0 \? parsed\.data\.requestId : crypto\.randomUUID\(\)/);
assert.match(generateRoute, /id,/);
assert.match(generateRoute, /relatedId:\s*parsed\.data\.requestId/);
assert.match(queueWorker, /currentTask\?\.status === "CANCELED"/);
assert.match(queueWorker, /latestImage\?\.status === "CANCELED"/);
assert.match(queueWorker, /getLocalUploadPath\(imageUrl\)/);
assert.match(queueWorker, /creditCostPerImage/);
assert.doesNotMatch(queueWorker, /failedCount \* creditCostPerImage/);

assert.match(cancelRoute, /export async function POST/);
assert.match(cancelRoute, /status:\s*"PENDING"/);
assert.match(cancelRoute, /status:\s*"CANCELED"/);
assert.match(cancelRoute, /calculateImageCreditCost/);
assert.match(cancelRoute, /refundAmount/);
assert.match(cancelRoute, /amount:\s*refundAmount/);
assert.doesNotMatch(cancelRoute, /amount:\s*1/);
assert.match(cancelRoute, /type:\s*"GENERATION_CANCEL_REFUND"/);
assert.match(cancelRoute, /(?:tx|prisma)\.generationTask\.updateMany/);
assert.match(cancelRoute, /status:\s*"CANCELED"/);
assert.match(cancelRoute, /notIn:\s*\["COMPLETED",\s*"FAILED"\]/);
