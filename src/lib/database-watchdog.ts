import { prisma } from "@/lib/prisma";

const DEFAULT_INTERVAL_MS = 60 * 1000;
const DEFAULT_TIMEOUT_MS = 5 * 1000;
const DEFAULT_FAILURE_THRESHOLD = 3;
const WATCHDOG_EXIT_CODE = 75;

type WatchdogGlobal = typeof globalThis & {
  gloopixDatabaseWatchdogStarted?: boolean;
};

function readPositiveInteger(name: string, fallback: number) {
  const value = process.env[name];
  if (!value) return fallback;

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function isEnabled() {
  if (process.env.DATABASE_WATCHDOG_ENABLED === "false") return false;
  return process.env.NODE_ENV === "production";
}

function isDatabaseLockError(error: unknown) {
  if (!error) return false;
  const maybeError = error as { code?: string; meta?: { code?: string; message?: string }; message?: string };
  const message = `${maybeError.message || ""} ${maybeError.meta?.message || ""}`.toLowerCase();

  return (
    maybeError.code === "P1008" ||
    maybeError.code === "P2010" ||
    maybeError.meta?.code === "5" ||
    message.includes("database is locked") ||
    message.includes("database failed to respond") ||
    message.includes("watchdog probe timed out") ||
    message.includes("operations timed out")
  );
}

async function queryWithTimeout(timeoutMs: number) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("Database watchdog probe timed out")), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export function ensureDatabaseWatchdogStarted() {
  if (!isEnabled()) return;

  const globalForWatchdog = globalThis as WatchdogGlobal;
  if (globalForWatchdog.gloopixDatabaseWatchdogStarted) return;
  globalForWatchdog.gloopixDatabaseWatchdogStarted = true;

  const intervalMs = readPositiveInteger("DATABASE_WATCHDOG_INTERVAL_MS", DEFAULT_INTERVAL_MS);
  const timeoutMs = readPositiveInteger("DATABASE_WATCHDOG_TIMEOUT_MS", DEFAULT_TIMEOUT_MS);
  const failureThreshold = readPositiveInteger(
    "DATABASE_WATCHDOG_FAILURE_THRESHOLD",
    DEFAULT_FAILURE_THRESHOLD
  );
  let consecutiveFailures = 0;

  const runProbe = async () => {
    try {
      await queryWithTimeout(timeoutMs);
      consecutiveFailures = 0;
    } catch (error) {
      if (!isDatabaseLockError(error)) {
        console.error("[database-watchdog] probe failed without restart:", error);
        return;
      }

      consecutiveFailures += 1;
      console.error(
        `[database-watchdog] database probe failed (${consecutiveFailures}/${failureThreshold})`,
        error
      );

      if (consecutiveFailures >= failureThreshold) {
        console.error("[database-watchdog] database appears locked; exiting for PM2 restart");
        process.exit(WATCHDOG_EXIT_CODE);
      }
    }
  };

  const interval = setInterval(() => {
    void runProbe();
  }, intervalMs);
  interval.unref?.();
  void runProbe();
}
