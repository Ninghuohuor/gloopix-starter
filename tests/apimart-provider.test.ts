import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const dispatcher = readFileSync("src/lib/openai.ts", "utf8");
const legacyAdapter = readFileSync("src/lib/image-providers/apimart.ts", "utf8");
const compatibleAdapter = readFileSync("src/lib/image-providers/openai-compatible.ts", "utf8");
const settings = readFileSync("src/lib/api-settings.ts", "utf8");

// Dispatch from saved provider configuration rather than a global APIMart switch.
// Older APIMart installations retain their legacy adapter.
assert.match(dispatcher, /getRuntimeApiSettings/);
assert.match(dispatcher, /settings\.models\.find/);
assert.match(dispatcher, /settings\.providers\.find/);
assert.match(dispatcher, /provider\.type === "ASYNC_TASK_COMPATIBLE"/);
assert.match(dispatcher, /generateWithAsyncTask/);
assert.match(dispatcher, /generateWithApimart/);
assert.match(dispatcher, /generateWithOpenAICompatible/);
assert.match(dispatcher, /generateWithGoogleGemini/);
assert.doesNotMatch(dispatcher, /process\.env\.APIMART_API_KEY/);

assert.match(settings, /APIMART_API_KEY/);
assert.match(legacyAdapter, /apiKey: string/);
assert.match(legacyAdapter, /normalizeReferenceImageForUpload/);
assert.match(legacyAdapter, /extractApimartTaskId/);
assert.match(legacyAdapter, /extractApimartImageUrls/);
assert.match(compatibleAdapter, /generateWithOpenAICompatible/);
assert.match(compatibleAdapter, /buildReferenceImageFile/);
