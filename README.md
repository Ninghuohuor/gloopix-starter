# Gloopix Starter

Gloopix Starter is a clean, independently deployable starting point for an AI image-generation website. It was derived from the private Gloopix application without copying its Git history, runtime database, uploaded images, production configuration, or secrets.

This repository is a starter project, not the source code or operational state of the live Gloopix service.

## Included

- Text-to-image and reference-image generation
- OpenAI Images-compatible, Google Gemini, and configurable JSON asynchronous-task image adapters
- Multiple configurable image APIs, each with its own encrypted key and model list
- GPT Image 2 as the sole default model; administrators can add other models when needed
- Admin-configurable registration, initial credits, optional modules, defaults, branding, and legal contact details
- Email/password accounts and password reset through SMTP or Resend
- Generation history and downloads
- SQLite-backed generation queue
- Optional prompt library, credits, redemption codes, announcements, and admin tools

## Deliberately excluded

- The unfinished AI canvas and its Konva dependencies
- Gloopix production data, uploads, logs, configuration, and deployment history
- WeChat account integrations and new-user campaigns
- Affiliate and referral links
- Optional Tencent COS storage and its legacy SDK dependency
- Production backup, provider-balance calibration, and private deployment scripts
- Default administrator credentials

See [docs/STARTER_SCOPE.md](docs/STARTER_SCOPE.md) before adding features back.

## Local development

Requirements: Node.js 20 or newer and npm.

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npm run dev
```

Open `http://localhost:3000`.

To create the first administrator, set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`, then run:

```bash
npm run seed
```

`ADMIN_PASSWORD` must contain at least 12 characters. No default administrator password is included.

After signing in as an administrator, open **Admin → Site Settings**. You can add multiple API instances using OpenAI Images-compatible, Google Gemini image-generation, or a configurable asynchronous-task protocol. Use **OpenAI Images-compatible** for relays that implement that API. The asynchronous option sends a JSON generation request with a Bearer key, then polls a task by ID; its submit/poll paths, response JSON paths, status values, and optional multipart reference-image upload can be configured per API. It is not a universal adapter for every asynchronous API—check the relay's protocol before selecting it. Existing APIMart-style configurations without protocol fields keep using the legacy adapter until explicitly migrated. Each API can expose multiple models. Logo and favicon assets are uploaded directly; saved API keys are encrypted and never returned to the browser.

Each model card has a **Test model connection** action. It tests the current form values, including an unsaved key or the already saved key, by making one real image-generation request. Confirm before running it: the upstream provider may charge for the image. The test does not consume site credits, create user history, save the test image, or change settings. Tests are limited to three per administrator per ten minutes.

For an environment-only initial setup, set `IMAGE_PROVIDER=async`, `ASYNC_API_KEY`, and `ASYNC_BASE_URL`, then adjust protocol paths in Site Settings if the service differs from the defaults. `IMAGE_PROVIDER=apimart` and the `APIMART_*` variables remain supported for older installations.

For production email verification and password reset, configure `EMAIL_FROM` and either SMTP (`EMAIL_PROVIDER=smtp`, `SMTP_HOST`, `SMTP_PORT`, optional `SMTP_USER`/`SMTP_PASSWORD`; use `SMTP_SECURE=true` for implicit TLS such as port 465) or Resend (`EMAIL_PROVIDER=resend`, `RESEND_API_KEY`). The same transport sends optional operations alerts. Without either provider, development logs email content locally; production refuses to send. Review the actual provider, sender address, and legal/privacy disclosures before launch. No provider-specific free-tier quota is assumed.

## Checks

```bash
npm test
npm run lint
npm run build
```

## Before publishing

- Decide whether the Starter should keep accounts, credits, announcements, and the admin console.
- Review and customize the terms and privacy pages for the actual operator and deployment region.
- Test one complete deployment and image-generation flow using a new API key created for that deployment.
- Run a final secret and personal-data scan.

Do not commit `.env`, SQLite databases, generated images, uploaded files, or real user data.
