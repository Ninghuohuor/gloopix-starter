import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const apimartSource = readFileSync("src/lib/image-providers/apimart.ts", "utf8");

assert.match(apimartSource, /isLikelyApimartBackupImage/);
assert.match(apimartSource, /backup_task/);
assert.match(apimartSource, /getGeneratedImageUrls/);
assert.match(apimartSource, /directGeneratedImages/);
assert.match(apimartSource, /directGeneratedImages\.length > 0/);
assert.match(apimartSource, /directImages\.length > 0 && !taskId/);
