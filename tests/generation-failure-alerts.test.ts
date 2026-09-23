import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const alertPath = "src/lib/ops-alerts.ts";
const alertSource = existsSync(alertPath) ? readFileSync(alertPath, "utf8") : "";
const queueSource = readFileSync("src/lib/generation-queue.ts", "utf8");
const schemaSource = readFileSync("prisma/schema.prisma", "utf8");
const envExampleSource = readFileSync(".env.example", "utf8");
const migrationPath = "prisma/migrations/00000000000000_init/migration.sql";
const migrationSource = existsSync(migrationPath) ? readFileSync(migrationPath, "utf8") : "";

assert.ok(existsSync(alertPath));
assert.match(alertSource, /OPS_ALERT_EMAIL/);
assert.match(alertSource, /OPS_ALERT_FAILURE_WINDOW_MINUTES/);
assert.match(alertSource, /OPS_ALERT_MIN_FAILURES/);
assert.match(alertSource, /OPS_ALERT_MIN_IMPACTED_USERS/);
assert.match(alertSource, /OPS_ALERT_FAILURE_RATE_PERCENT/);
assert.match(alertSource, /OPS_ALERT_COOLDOWN_MINUTES/);
assert.match(alertSource, /export async function notifyGenerationFailureSpike/);
assert.match(alertSource, /prisma\.generationTask\.findMany/);
assert.match(alertSource, /task\.status === "FAILED"/);
assert.match(alertSource, /prisma\.generationAlert\.upsert/);
assert.match(alertSource, /sendEmail/);
assert.match(alertSource, /图片生成失败异常/);

assert.match(queueSource, /import \{ notifyGenerationFailureSpike \} from "@\/lib\/ops-alerts"/);
assert.match(queueSource, /await notifyGenerationFailureSpike\(\)/);
assert.match(queueSource, /Generation failure alert failed/);

assert.match(schemaSource, /model GenerationAlert \{/);
assert.match(schemaSource, /key\s+String\s+@id/);
assert.match(schemaSource, /lastSentAt\s+DateTime/);

assert.ok(existsSync(migrationPath));
assert.match(migrationSource, /CREATE TABLE "GenerationAlert"/);

assert.match(envExampleSource, /OPS_ALERT_EMAIL=""/);
