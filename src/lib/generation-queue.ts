import crypto from "crypto";
import { unlink } from "fs/promises";
import { generateImage } from "@/lib/openai";
import { notifyGenerationFailureSpike } from "@/lib/ops-alerts";
import { prisma } from "@/lib/prisma";
import { getLocalUploadPath } from "@/lib/uploads";

const GENERATION_QUEUE_LOCK_TIMEOUT_MS = 10 * 60 * 1000;
const GENERATION_QUEUE_POLL_INTERVAL_MS = 2000;
const GENERATION_QUEUE_MAX_ATTEMPTS = 2;

type ClaimedGenerationTask = NonNullable<Awaited<ReturnType<typeof claimNextGenerationTask>>>;

let workerStarted = false;
let workerRunning = false;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseJsonArray(value: string | null): string[] | undefined {
  if (!value) return undefined;
  const parsed = JSON.parse(value) as unknown;
  return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : undefined;
}

function getWorkerId() {
  return `gloopix-${crypto.randomUUID()}`;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function refundFailedImage(userId: string, taskId: string, amount: number) {
  if (amount <= 0) return;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { credits: { increment: amount } },
    }),
    prisma.creditTransaction.create({
      data: {
        userId,
        amount,
        type: "GENERATION_FAILURE_REFUND",
        relatedId: taskId,
      },
    }),
  ]);
}

async function claimNextGenerationTask(workerId: string) {
  const now = new Date();
  const staleLockCutoff = new Date(Date.now() - GENERATION_QUEUE_LOCK_TIMEOUT_MS);

  const candidate = await prisma.generationTask.findFirst({
    where: {
      nextRunAt: { lte: now },
      attempts: { lt: GENERATION_QUEUE_MAX_ATTEMPTS },
      OR: [
        { status: "QUEUED" },
        { status: "RUNNING", lockedAt: { lt: staleLockCutoff } },
      ],
    },
    orderBy: [{ createdAt: "asc" }],
  });

  if (!candidate) return null;

  const claimed = await prisma.generationTask.updateMany({
    where: {
      id: candidate.id,
      nextRunAt: { lte: now },
      attempts: { lt: GENERATION_QUEUE_MAX_ATTEMPTS },
      OR: [
        { status: "QUEUED" },
        { status: "RUNNING", lockedAt: { lt: staleLockCutoff } },
      ],
    },
    data: {
      status: "RUNNING",
      lockedAt: now,
      lockedBy: workerId,
      attempts: { increment: 1 },
      lastError: null,
    },
  });

  if (claimed.count !== 1) return null;

  return prisma.generationTask.findUnique({ where: { id: candidate.id } });
}

async function removeGeneratedFileIfLocal(imageUrl: string) {
  const filepath = getLocalUploadPath(imageUrl);
  if (filepath) await unlink(filepath).catch(() => undefined);
}

async function removeStoredImage(imageUrl?: string | null, thumbnailUrl?: string | null) {
  if (imageUrl) await removeGeneratedFileIfLocal(imageUrl);
  if (thumbnailUrl) await removeGeneratedFileIfLocal(thumbnailUrl);
}

async function failPendingImage({
  imageId,
  task,
  error,
}: {
  imageId: string;
  task: ClaimedGenerationTask;
  error?: unknown;
}) {
  if (error) {
    console.error("Queued image generation failed:", error);
    await prisma.generationTask.update({
      where: { id: task.id },
      data: { lastError: getErrorMessage(error) },
    });
  }

  const failed = await prisma.image.updateMany({
    where: { id: imageId, userId: task.userId, status: "PENDING" },
    data: { status: "FAILED", completedAt: new Date() },
  });

  if (failed.count === 1) {
    await refundFailedImage(task.userId, task.id, task.creditCostPerImage);
  }
}

async function notifyGenerationFailureSpikeSafely() {
  try {
    await notifyGenerationFailureSpike();
  } catch (error) {
    console.error("Generation failure alert failed:", error);
  }
}

async function finishTask(task: ClaimedGenerationTask, imageIds: string[]) {
  const currentTask = await prisma.generationTask.findUnique({ where: { id: task.id } });
  if (currentTask?.status === "CANCELED") {
    await prisma.generationTask.update({
      where: { id: task.id },
      data: {
        lockedAt: null,
        lockedBy: null,
        referenceImages: null,
        completedAt: currentTask.completedAt || new Date(),
      },
    });
    return;
  }

  const images = await prisma.image.findMany({
    where: { id: { in: imageIds }, userId: task.userId },
  });
  const completedCount = images.filter((image) => image.status === "COMPLETED").length;
  const pendingCount = images.filter((image) => image.status === "PENDING").length;
  const failedCount = images.filter((image) => image.status === "FAILED").length;

  const updatedTask = await prisma.generationTask.update({
    where: { id: task.id },
    data: {
      status:
        pendingCount > 0
          ? "RUNNING"
          : completedCount > 0
            ? "COMPLETED"
            : failedCount > 0
              ? "FAILED"
              : "CANCELED",
      lockedAt: pendingCount > 0 ? new Date() : null,
      lockedBy: pendingCount > 0 ? task.lockedBy : null,
      referenceImages: pendingCount > 0 ? task.referenceImages : null,
      completedAt: pendingCount > 0 ? null : new Date(),
    },
  });

  if (updatedTask.status === "FAILED") {
    await notifyGenerationFailureSpikeSafely();
  }
}

async function processGenerationTask(task: ClaimedGenerationTask) {
  const imageIds = parseJsonArray(task.imageIds) || [];
  const referenceImages = parseJsonArray(task.referenceImages || null);

  for (const imageId of imageIds) {
    const currentTask = await prisma.generationTask.findUnique({ where: { id: task.id } });
    if (currentTask?.status === "CANCELED") break;

    const currentImage = await prisma.image.findUnique({ where: { id: imageId } });
    if (!currentImage) continue;
    if (currentImage.status === "CANCELED") continue;
    if (currentImage.status !== "PENDING") continue;

    try {
      const generatedImage = await generateImage(
        task.prompt,
        task.model,
        referenceImages,
        task.aspectRatio,
        task.quality as "low" | "medium" | "high",
        task.resolution as "1k" | "2k" | "4k",
        { traceId: task.id }
      );

      const latestTask = await prisma.generationTask.findUnique({ where: { id: task.id } });
      const latestImage = await prisma.image.findUnique({ where: { id: imageId } });
      if (latestTask?.status === "CANCELED" || latestImage?.status === "CANCELED") {
        await removeStoredImage(generatedImage.imageUrl, generatedImage.thumbnailUrl);
        continue;
      }

      const updated = await prisma.image.updateMany({
        where: { id: imageId, userId: task.userId, status: "PENDING" },
        data: {
          imageUrl: generatedImage.imageUrl,
          thumbnailUrl: generatedImage.thumbnailUrl,
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });

      if (updated.count === 0) {
        await removeStoredImage(generatedImage.imageUrl, generatedImage.thumbnailUrl);
      }
    } catch (error) {
      await failPendingImage({ imageId, task, error });
    }
  }

  await finishTask(task, imageIds);
}

async function releaseTaskAfterWorkerError(task: ClaimedGenerationTask, error: unknown) {
  const attemptsExhausted = task.attempts >= GENERATION_QUEUE_MAX_ATTEMPTS;
  await prisma.generationTask.update({
    where: { id: task.id },
    data: {
      status: attemptsExhausted ? "FAILED" : "QUEUED",
      lockedAt: null,
      lockedBy: null,
      nextRunAt: new Date(Date.now() + GENERATION_QUEUE_POLL_INTERVAL_MS),
      lastError: getErrorMessage(error),
      referenceImages: attemptsExhausted ? null : task.referenceImages,
      completedAt: attemptsExhausted ? new Date() : null,
    },
  });

  if (attemptsExhausted) {
    await notifyGenerationFailureSpikeSafely();
  }
}

export async function processNextGenerationTaskForTest() {
  const workerId = getWorkerId();
  const task = await claimNextGenerationTask(workerId);
  if (!task) return false;

  try {
    await processGenerationTask(task);
  } catch (error) {
    await releaseTaskAfterWorkerError(task, error);
    throw error;
  }

  return true;
}

export function ensureGenerationWorkerStarted() {
  if (workerStarted) return;
  workerStarted = true;

  void (async () => {
    const workerId = getWorkerId();
    while (workerStarted) {
      if (workerRunning) {
        await sleep(GENERATION_QUEUE_POLL_INTERVAL_MS);
        continue;
      }

      let task: ClaimedGenerationTask | null = null;
      workerRunning = true;
      try {
        task = await claimNextGenerationTask(workerId);
        if (task) {
          await processGenerationTask(task);
        } else {
          await sleep(GENERATION_QUEUE_POLL_INTERVAL_MS);
        }
      } catch (error) {
        console.error("Generation queue worker failed:", error);
        if (task) {
          await releaseTaskAfterWorkerError(task, error).catch((releaseError) => {
            console.error("Generation queue task release failed:", releaseError);
          });
        }
        await sleep(GENERATION_QUEUE_POLL_INTERVAL_MS);
      } finally {
        workerRunning = false;
      }
    }
  })();
}
