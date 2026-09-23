import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email-delivery";

const GENERATION_FAILURE_ALERT_KEY = "generation-failure-spike";

type AlertConfig = {
  email: string;
  windowMinutes: number;
  minFailures: number;
  minImpactedUsers: number;
  failureRatePercent: number;
  cooldownMinutes: number;
};

function readPositiveInteger(name: string, fallback: number) {
  const value = process.env[name];
  if (!value) return fallback;

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getAlertConfig(): AlertConfig | null {
  const email = process.env.OPS_ALERT_EMAIL?.trim();
  if (!email) return null;

  return {
    email,
    windowMinutes: readPositiveInteger("OPS_ALERT_FAILURE_WINDOW_MINUTES", 15),
    minFailures: readPositiveInteger("OPS_ALERT_MIN_FAILURES", 5),
    minImpactedUsers: readPositiveInteger("OPS_ALERT_MIN_IMPACTED_USERS", 2),
    failureRatePercent: readPositiveInteger("OPS_ALERT_FAILURE_RATE_PERCENT", 40),
    cooldownMinutes: readPositiveInteger("OPS_ALERT_COOLDOWN_MINUTES", 30),
  };
}

function truncateText(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}

function countErrors(errors: string[]) {
  const counts = new Map<string, number>();
  for (const error of errors) {
    const normalized = truncateText(error.replace(/\s+/g, " ").trim(), 180);
    counts.set(normalized, (counts.get(normalized) || 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([message, count]) => `- ${count}x ${message}`)
    .join("\n");
}

export async function notifyGenerationFailureSpike() {
  const config = getAlertConfig();
  if (!config) return;
  const now = new Date();
  const windowStart = new Date(now.getTime() - config.windowMinutes * 60 * 1000);
  const cooldownCutoff = new Date(now.getTime() - config.cooldownMinutes * 60 * 1000);

  const existingAlert = await prisma.generationAlert.findUnique({
    where: { key: GENERATION_FAILURE_ALERT_KEY },
  });

  if (existingAlert && existingAlert.lastSentAt > cooldownCutoff) {
    return;
  }

  const recentTasks = await prisma.generationTask.findMany({
    where: {
      status: { in: ["COMPLETED", "FAILED"] },
      OR: [
        { completedAt: { gte: windowStart } },
        { completedAt: null, createdAt: { gte: windowStart } },
      ],
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      userId: true,
      status: true,
      lastError: true,
      createdAt: true,
      completedAt: true,
    },
  });

  const failedTasks = recentTasks.filter((task) => task.status === "FAILED");
  const totalTasks = recentTasks.length;
  const failedCount = failedTasks.length;
  const impactedUsers = new Set(failedTasks.map((task) => task.userId)).size;
  const failureRate = totalTasks > 0 ? Math.round((failedCount / totalTasks) * 100) : 0;

  if (failedCount < config.minFailures) return;
  if (impactedUsers < config.minImpactedUsers && failureRate < config.failureRatePercent) return;

  const recentTaskLines = failedTasks
    .slice(0, 8)
    .map((task) => `- ${task.id} user=${task.userId} at=${(task.completedAt || task.createdAt).toISOString()}`)
    .join("\n");
  const errorSummary = countErrors(failedTasks.map((task) => task.lastError || "Unknown generation failure"));
  const subject = "图片生成失败异常";
  const text = [
    `Alert: ${subject}`,
    `Environment: ${process.env.NODE_ENV || "development"}`,
    `Window: last ${config.windowMinutes} minutes, since ${windowStart.toISOString()}`,
    `Total tasks: ${totalTasks}`,
    `Failed tasks: ${failedCount}`,
    `Failure rate: ${failureRate}%`,
    `Impacted users: ${impactedUsers}`,
    "",
    "Recent failed tasks:",
    recentTaskLines || "- none",
    "",
    "Common errors:",
    errorSummary || "- none",
  ].join("\n");

  await sendEmail({
    to: config.email,
    subject,
    text,
  });

  await prisma.generationAlert.upsert({
    where: { key: GENERATION_FAILURE_ALERT_KEY },
    update: { lastSentAt: now },
    create: {
      key: GENERATION_FAILURE_ALERT_KEY,
      lastSentAt: now,
    },
  });
}
