# Starter scope

## Product boundary

The Starter should help a learner deploy and customize an independent AI image-generation website. It must not depend on the original Gloopix server, database, API keys, user accounts, uploads, or operational tooling.

## Core path

The core path is:

1. Configure a database, authentication secret, email sender, and image provider.
2. Start the application and create the first administrator explicitly.
3. Register or sign in.
4. Submit a text or reference-image generation request.
5. View, download, and revisit completed images.

## Removed in the first cleanup

- Hidden `/canvas` workspace and canvas APIs
- `konva` and `react-konva`
- WeChat callback, fixed-code, QR, and menu publishing features
- Indream referral links
- Tencent COS storage; the first Starter release uses local persistent uploads
- Private production deployment, backup, and calibration scripts
- Old production handoff notes and incremental migration history
- Hard-coded alert recipient and default administrator credentials

## Product decision

Gloopix Starter is the multi-user version. Keep accounts, history, credits, and the administration needed to run an independent multi-user site. The separate Gloopix Lite project is the personal, single-operator version. Do not mix their deployment steps, database schema, security requirements, or user-facing legal copy.
