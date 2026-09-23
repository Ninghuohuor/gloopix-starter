import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const helperPath = "src/lib/reference-images.ts";
const helperSource = existsSync(helperPath) ? readFileSync(helperPath, "utf8") : "";
const generateRouteSource = readFileSync("src/app/api/generate/route.ts", "utf8");
const apimartSource = readFileSync("src/lib/image-providers/apimart.ts", "utf8");

assert.ok(existsSync(helperPath));
assert.match(helperSource, /REFERENCE_IMAGE_RETENTION_MS = 24 \* 60 \* 60 \* 1000/);
assert.match(helperSource, /ensureReferenceUploadDir/);
assert.match(helperSource, /persistReferenceImages/);
assert.match(helperSource, /pruneExpiredReferenceUploads/);
assert.match(helperSource, /\/uploads\/references\//);

assert.match(generateRouteSource, /persistReferenceImages/);
assert.match(generateRouteSource, /pruneExpiredReferenceUploads/);
assert.match(generateRouteSource, /const persistedReferenceImages = await persistReferenceImages/);
assert.match(generateRouteSource, /referenceImages:\s*persistedReferenceImages \? JSON\.stringify\(persistedReferenceImages\) : null/);
assert.doesNotMatch(generateRouteSource, /referenceImages:\s*referenceImages \? JSON\.stringify\(referenceImages\) : null/);

assert.match(apimartSource, /getLocalUploadPath/);
assert.match(apimartSource, /readFile/);
assert.match(apimartSource, /referenceImage\.startsWith\("\/uploads\/"\)/);
