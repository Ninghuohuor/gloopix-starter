import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const directory = mkdtempSync(path.join(tmpdir(), "gloopix-db-init-test-"));
const databasePath = path.join(directory, "fresh.db");

try {
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = spawnSync("npm", ["run", "db:init"], {
      encoding: "utf8",
      env: { ...process.env, DATABASE_URL: `file:${databasePath}` },
      timeout: 30_000,
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.ok(existsSync(databasePath));
    assert.match(result.stdout, attempt === 0 ? /All migrations have been successfully applied/ : /No pending migrations to apply/);
  }
} finally {
  rmSync(directory, { recursive: true, force: true });
}
