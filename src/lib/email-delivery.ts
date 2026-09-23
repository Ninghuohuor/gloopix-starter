import nodemailer from "nodemailer";

type EmailMessage = { to: string; subject: string; text: string };

export function getEmailDeliveryMode(env: NodeJS.ProcessEnv = process.env): "smtp" | "resend" | "development" {
  const selected = env.EMAIL_PROVIDER?.trim().toLowerCase();
  if (selected && selected !== "smtp" && selected !== "resend") {
    throw new Error("EMAIL_PROVIDER must be smtp or resend");
  }
  if (selected === "smtp" || (!selected && env.SMTP_HOST)) return "smtp";
  if (selected === "resend" || (!selected && env.RESEND_API_KEY)) return "resend";
  if (env.NODE_ENV === "production") throw new Error("Email provider is not configured");
  return "development";
}

export async function sendEmail({ to, subject, text }: EmailMessage): Promise<void> {
  const mode = getEmailDeliveryMode();
  if (mode === "development") {
    console.info(`[email-delivery] ${to}: ${subject}\n${text}`);
    return;
  }

  const from = process.env.EMAIL_FROM?.trim();
  if (!from) throw new Error("EMAIL_FROM is required to send email");

  if (mode === "smtp") {
    const host = process.env.SMTP_HOST?.trim();
    const port = Number(process.env.SMTP_PORT || "587");
    if (!host || !Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error("SMTP_HOST and a valid SMTP_PORT are required");
    }
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASSWORD;
    if (Boolean(user) !== Boolean(pass)) throw new Error("SMTP_USER and SMTP_PASSWORD must be configured together");
    const transport = nodemailer.createTransport({
      host,
      port,
      secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465,
      ...(user && pass ? { auth: { user, pass } } : {}),
    });
    await transport.sendMail({ from, to, subject, text });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) throw new Error("RESEND_API_KEY is required when EMAIL_PROVIDER=resend");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, text }),
  });
  if (!response.ok) throw new Error(`Email delivery failed (${response.status})`);
}
