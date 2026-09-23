import { prisma } from "@/lib/prisma";

export const LOGIN_WARNING_THRESHOLD = 5;
export const LOGIN_LOCK_THRESHOLD = 10;
export const LOGIN_LOCK_DURATION_MINUTES = 15;

export function normalizeLoginEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function getLoginFailureStatus(email: string) {
  const normalizedEmail = normalizeLoginEmail(email);
  if (!normalizedEmail) {
    return {
      failureCount: 0,
      isLocked: false,
      remainingSeconds: 0,
      shouldSuggestPasswordReset: false,
    };
  }

  const failure = await prisma.loginFailure.findUnique({
    where: { email: normalizedEmail },
  });

  if (!failure) {
    return {
      failureCount: 0,
      isLocked: false,
      remainingSeconds: 0,
      shouldSuggestPasswordReset: false,
    };
  }

  const remainingSeconds = failure.lockedUntil
    ? Math.max(0, Math.ceil((failure.lockedUntil.getTime() - Date.now()) / 1000))
    : 0;

  return {
    failureCount: failure.failureCount,
    isLocked: remainingSeconds > 0,
    remainingSeconds,
    shouldSuggestPasswordReset: failure.failureCount >= LOGIN_WARNING_THRESHOLD,
  };
}

export async function recordFailedLogin(email: string, ip: string) {
  const normalizedEmail = normalizeLoginEmail(email);
  if (!normalizedEmail) return;

  const existing = await prisma.loginFailure.findUnique({
    where: { email: normalizedEmail },
  });
  const nextFailureCount = (existing?.failureCount || 0) + 1;
  const lockedUntil =
    nextFailureCount >= LOGIN_LOCK_THRESHOLD
      ? new Date(Date.now() + LOGIN_LOCK_DURATION_MINUTES * 60 * 1000)
      : existing?.lockedUntil || null;

  await prisma.loginFailure.upsert({
    where: { email: normalizedEmail },
    update: {
      failureCount: nextFailureCount,
      lockedUntil,
      lastIp: ip,
      lastFailedAt: new Date(),
    },
    create: {
      email: normalizedEmail,
      failureCount: nextFailureCount,
      lockedUntil,
      lastIp: ip,
      lastFailedAt: new Date(),
    },
  });

}

export async function recordSuccessfulLogin(email: string) {
  await resetLoginFailures(email);
}

export async function resetLoginFailures(email: string) {
  const normalizedEmail = normalizeLoginEmail(email);
  if (!normalizedEmail) return;

  await prisma.loginFailure.deleteMany({
    where: { email: normalizedEmail },
  });
}

