import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const watchdogPath = "src/lib/database-watchdog.ts";
const instrumentationPath = "src/instrumentation.ts";
const watchdogSource = readFileSync(watchdogPath, "utf8");
const instrumentationSource = readFileSync(instrumentationPath, "utf8");

assert.ok(existsSync(watchdogPath));
assert.match(watchdogSource, /DATABASE_WATCHDOG_ENABLED === "false"/);
assert.match(watchdogSource, /process\.env\.NODE_ENV === "production"/);
assert.match(watchdogSource, /DEFAULT_INTERVAL_MS = 60 \* 1000/);
assert.match(watchdogSource, /DEFAULT_TIMEOUT_MS = 5 \* 1000/);
assert.match(watchdogSource, /DEFAULT_FAILURE_THRESHOLD = 3/);
assert.match(watchdogSource, /maybeError\.code === "P1008"/);
assert.match(watchdogSource, /maybeError\.code === "P2010"/);
assert.match(watchdogSource, /maybeError\.meta\?\.code === "5"/);
assert.match(watchdogSource, /message\.includes\("database is locked"\)/);
assert.match(watchdogSource, /message\.includes\("watchdog probe timed out"\)/);
assert.match(watchdogSource, /prisma\.\$queryRaw`SELECT 1`/);
assert.match(watchdogSource, /consecutiveFailures >= failureThreshold/);
assert.match(watchdogSource, /process\.exit\(WATCHDOG_EXIT_CODE\)/);
assert.match(watchdogSource, /interval\.unref\?\.\(\)/);

assert.ok(existsSync(instrumentationPath));
assert.match(instrumentationSource, /export async function register/);
assert.match(instrumentationSource, /process\.env\.NEXT_RUNTIME !== "nodejs"/);
assert.match(instrumentationSource, /ensureDatabaseWatchdogStarted/);
