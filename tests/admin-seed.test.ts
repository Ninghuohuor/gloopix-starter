import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { PrismaClient } from "@prisma/client";

test("admin seed reads its env file and reports invalid credentials with a failing exit code", () => {
  const tempDir = mkdtempSync(path.join(tmpdir(), "gloopix-admin-seed-"));
  const envPath = path.join(tempDir, ".env");
  writeFileSync(envPath, 'ADMIN_EMAIL="owner@example.com"\nADMIN_PASSWORD="short"\n');

  try {
    const env = { ...process.env, DOTENV_CONFIG_PATH: envPath };
    delete env.ADMIN_EMAIL;
    delete env.ADMIN_PASSWORD;
    const result = spawnSync(process.execPath, ["--import", "tsx", "prisma/seed.ts"], {
      cwd: process.cwd(),
      env,
      encoding: "utf8",
    });

    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /ADMIN_PASSWORD must contain at least 12 characters/);
    assert.doesNotMatch(result.stderr, /owner@example\.com|short/);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("admin seed creates one administrator from a private env file", async () => {
  const tempDir = mkdtempSync(path.join(tmpdir(), "gloopix-admin-seed-"));
  const envPath = path.join(tempDir, ".env");
  const databaseUrl = `file:${path.join(tempDir, "seed.db")}`;
  writeFileSync(envPath, `DATABASE_URL="${databaseUrl}"\nADMIN_EMAIL="OWNER@example.com"\nADMIN_PASSWORD="a-private-password-123"\n`);
  const cwd = process.cwd();
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

  try {
    const migration = readFileSync(path.join(cwd, "prisma/migrations/00000000000000_init/migration.sql"), "utf8");
    for (const statement of migration.split(/;\s*(?:\r?\n|$)/).map((part) => part.trim()).filter(Boolean)) {
      await prisma.$executeRawUnsafe(statement);
    }

    const env = { ...process.env, DOTENV_CONFIG_PATH: envPath };
    delete env.DATABASE_URL;
    delete env.ADMIN_EMAIL;
    delete env.ADMIN_PASSWORD;
    const runSeed = () => spawnSync(process.execPath, ["--import", "tsx", "prisma/seed.ts"], {
      cwd,
      env,
      encoding: "utf8",
    });

    const first = runSeed();
    assert.equal(first.status, 0, first.stderr);
    const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    assert.equal(admin?.email, "owner@example.com");
    assert.notEqual(admin?.passwordHash, "a-private-password-123");

    const second = runSeed();
    assert.equal(second.status, 0, second.stderr);
    assert.equal(await prisma.user.count({ where: { role: "ADMIN" } }), 1);
  } finally {
    await prisma.$disconnect();
    rmSync(tempDir, { recursive: true, force: true });
  }
});
