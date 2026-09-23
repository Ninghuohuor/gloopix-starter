import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email-delivery";
import { getPublicAppConfig } from "@/lib/api-settings";

const REGISTER_PURPOSE = "REGISTER";
const RESET_PASSWORD_PURPOSE = "RESET_PASSWORD";
const CODE_TTL_MINUTES = 10;
const CODE_RESEND_INTERVAL_SECONDS = 60;
const MAX_ATTEMPTS = 5;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function generateVerificationCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

async function sendVerificationEmail(email: string, code: string, purpose: string) {
  const { branding } = await getPublicAppConfig();
  const subject = purpose === RESET_PASSWORD_PURPOSE ? `${branding.siteName} 重置密码验证码` : `${branding.siteName} 注册验证码`;
  const actionText = purpose === RESET_PASSWORD_PURPOSE ? "重置密码" : "注册";
  await sendEmail({ to: email, subject, text: `你的 ${branding.siteName} ${actionText}验证码是 ${code}，10 分钟内有效。如果不是你本人操作，请忽略这封邮件。` });
}

async function sendVerificationCode(email: string, purpose: string) {
  const normalizedEmail = normalizeEmail(email);
  const recentCode = await prisma.emailVerificationCode.findFirst({
    where: {
      email: normalizedEmail,
      purpose,
      createdAt: {
        gt: new Date(Date.now() - CODE_RESEND_INTERVAL_SECONDS * 1000),
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (recentCode) {
    return {
      ok: false,
      error: "验证码发送太频繁，请稍后再试",
    };
  }

  const code = generateVerificationCode();
  const codeHash = await bcrypt.hash(code, 12);
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);

  const verificationCode = await prisma.emailVerificationCode.create({
    data: {
      email: normalizedEmail,
      codeHash,
      purpose,
      expiresAt,
    },
  });

  try {
    await sendVerificationEmail(normalizedEmail, code, purpose);
  } catch (error) {
    await prisma.emailVerificationCode.delete({
      where: { id: verificationCode.id },
    });
    throw error;
  }

  return { ok: true };
}

export async function sendRegistrationVerificationCode(email: string) {
  return sendVerificationCode(email, REGISTER_PURPOSE);
}

export async function sendPasswordResetVerificationCode(email: string) {
  return sendVerificationCode(email, RESET_PASSWORD_PURPOSE);
}

async function verifyCode(email: string, code: string, purpose: string) {
  const normalizedEmail = normalizeEmail(email);
  const verificationCode = await prisma.emailVerificationCode.findFirst({
    where: {
      email: normalizedEmail,
      purpose,
      consumedAt: null,
      expiresAt: { gt: new Date() },
      attempts: { lt: MAX_ATTEMPTS },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!verificationCode) return false;

  const isValid = await bcrypt.compare(code, verificationCode.codeHash);

  if (!isValid) {
    await prisma.emailVerificationCode.update({
      where: { id: verificationCode.id },
      data: { attempts: { increment: 1 } },
    });
    return false;
  }

  await prisma.emailVerificationCode.update({
    where: { id: verificationCode.id },
    data: { consumedAt: new Date() },
  });

  return true;
}

export async function verifyRegistrationCode(email: string, code: string) {
  return verifyCode(email, code, REGISTER_PURPOSE);
}

export async function verifyPasswordResetCode(email: string, code: string) {
  return verifyCode(email, code, RESET_PASSWORD_PURPOSE);
}
