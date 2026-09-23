import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

assert.ok(existsSync("scripts/test-image-providers.ts"));

const scriptSource = readFileSync("scripts/test-image-providers.ts", "utf8");
const envExampleSource = readFileSync(".env.example", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

assert.match(scriptSource, /APIMART_API_KEY/);
assert.match(scriptSource, /APIMART_BASE_URL/);
assert.match(scriptSource, /https:\/\/api\.apimart\.ai\/v1/);
assert.match(scriptSource, /\/images\/generations/);
assert.match(scriptSource, /\/tasks\/\$\{taskId\}/);
assert.match(scriptSource, /size:\s*options\.aspectRatio/);
assert.match(scriptSource, /n:\s*1/);

assert.match(scriptSource, /FAL_KEY/);
assert.match(scriptSource, /https:\/\/queue\.fal\.run/);
assert.match(scriptSource, /openai\/gpt-image-2\/edit/);
assert.match(scriptSource, /openai\/gpt-image-2/);
assert.match(scriptSource, /image_size/);
assert.match(scriptSource, /num_images:\s*options\.quantity/);
assert.match(scriptSource, /portrait_16_9/);
assert.match(scriptSource, /landscape_16_9/);

assert.match(scriptSource, /readReferenceImage/);
assert.match(scriptSource, /data:image\/\$\{mimeSubtype\};base64/);
assert.match(scriptSource, /provider:\s*"apimart"/);
assert.match(scriptSource, /provider:\s*"fal"/);

assert.equal(packageJson.scripts["test:providers"], "tsx scripts/test-image-providers.ts");

assert.match(envExampleSource, /APIMART_API_KEY/);
assert.match(envExampleSource, /APIMART_BASE_URL/);
assert.match(envExampleSource, /FAL_KEY/);
