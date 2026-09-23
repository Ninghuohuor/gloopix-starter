import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getEmailDeliveryMode } from "../src/lib/email-delivery";

assert.equal(getEmailDeliveryMode({ NODE_ENV: "test" }), "development");
assert.equal(getEmailDeliveryMode({ NODE_ENV: "test", RESEND_API_KEY: "test-key" }), "resend");
assert.equal(getEmailDeliveryMode({ NODE_ENV: "test", SMTP_HOST: "smtp.example.com" }), "smtp");
assert.equal(getEmailDeliveryMode({ NODE_ENV: "test", SMTP_HOST: "smtp.example.com", RESEND_API_KEY: "test-key" }), "smtp");
assert.equal(getEmailDeliveryMode({ NODE_ENV: "test", EMAIL_PROVIDER: "resend", SMTP_HOST: "smtp.example.com" }), "resend");
assert.throws(() => getEmailDeliveryMode({ NODE_ENV: "production" }), /Email provider is not configured/);
assert.throws(() => getEmailDeliveryMode({ NODE_ENV: "test", EMAIL_PROVIDER: "unknown" }), /EMAIL_PROVIDER/);

const verificationSource = readFileSync("src/lib/email-verification.ts", "utf8");
const opsAlertsSource = readFileSync("src/lib/ops-alerts.ts", "utf8");
const settingsSource = readFileSync("src/app/admin/settings/page.tsx", "utf8");
assert.match(verificationSource, /sendEmail\(/);
assert.match(verificationSource, /branding\.siteName/);
assert.match(opsAlertsSource, /sendEmail\(/);
assert.match(settingsSource, /异步任务（JSON 提交与轮询）/);
assert.match(settingsSource, /htmlFor="legal-operator-name"/);
assert.match(settingsSource, /htmlFor="legal-contact-email"/);
