# Gloopix Starter

Gloopix Starter is a clean, independently deployable starting point for a multi-user AI image-generation website. It was derived from the private Gloopix application without copying its Git history, runtime database, uploaded images, production configuration, or secrets.

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

Requirements: Node.js 20 or newer and npm. First install dependencies and create your private configuration file:

```bash
npm install
cp .env.example .env
```

Edit `.env` before continuing. Set `ADMIN_EMAIL` to the email address you will use to sign in and `ADMIN_PASSWORD` to a password you choose (at least 12 characters). Also replace `AUTH_SECRET` with a long random value. There is **no default administrator account or password**.

For example, the relevant `.env` entries are:

```dotenv
AUTH_SECRET="replace-with-a-long-random-value"
ADMIN_EMAIL="you@example.com"
ADMIN_PASSWORD="choose-your-own-password-of-at-least-12-characters"
```

These are placeholders, not working credentials. Keep `.env` private and never commit it. After the first administrator is created, remove `ADMIN_PASSWORD` from `.env`; the password is stored as a hash in the database. Running `npm run seed` again does not change an existing administrator's password. Use the account page to change it after signing in.

Then initialize the database, create the first administrator, and start the site:

```bash
npx prisma migrate dev
npm run seed
npm run dev
```

The seed command reads `.env` and exits with an error if the administrator settings are missing or invalid. Open `http://localhost:3000/login` and sign in with the email and password you chose. New users can register separately when registration is enabled.

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

- Check that the multi-user features you want to offer are configured for your site.
- Review and customize the terms and privacy pages for the actual operator and deployment region.
- Test one complete deployment and image-generation flow using a new API key created for that deployment.
- Run a final secret and personal-data scan.

Do not commit `.env`, SQLite databases, generated images, uploaded files, or real user data.
