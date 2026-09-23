export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { ensureDatabaseWatchdogStarted } = await import("@/lib/database-watchdog");
  ensureDatabaseWatchdogStarted();
}

