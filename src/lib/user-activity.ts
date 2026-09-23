import { prisma } from "@/lib/prisma";

const LAST_ACTIVE_UPDATE_WINDOW_MS = 5 * 60 * 1000;

export async function touchUserActivity(userId: string) {
  const now = new Date();
  const cutoff = new Date(now.getTime() - LAST_ACTIVE_UPDATE_WINDOW_MS);

  try {
    await prisma.user.updateMany({
      where: {
        id: userId,
        OR: [{ lastActiveAt: null }, { lastActiveAt: { lt: cutoff } }],
      },
      data: { lastActiveAt: now },
    });
  } catch (error) {
    console.warn(
      "Failed to touch user activity",
      error instanceof Error ? error.message : String(error)
    );
  }
}
