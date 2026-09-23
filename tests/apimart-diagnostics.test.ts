import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const openaiSource = readFileSync("src/lib/openai.ts", "utf8");
const queueSource = readFileSync("src/lib/generation-queue.ts", "utf8");
const apimartSource = readFileSync("src/lib/image-providers/apimart.ts", "utf8");

assert.match(openaiSource, /traceId\?:\s*string/);
assert.match(openaiSource, /traceId,/);
assert.match(queueSource, /traceId:\s*task\.id/);

assert.match(apimartSource, /function logApimartDiagnostic/);
assert.match(apimartSource, /\[apimart:image-generation\]/);
assert.match(apimartSource, /promptHash/);
assert.match(apimartSource, /promptLength/);
assert.match(apimartSource, /referenceBytes/);
assert.match(apimartSource, /requestSize/);
assert.match(apimartSource, /requestResolution/);
assert.match(apimartSource, /providerTaskId/);
assert.match(apimartSource, /pollElapsedMs/);
assert.match(apimartSource, /attempt/);
