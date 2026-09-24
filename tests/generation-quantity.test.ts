import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { generateSchema } from "../src/lib/validations";

const pageSource = readFileSync("src/app/page.tsx", "utf8");
const composerSource = readFileSync("src/components/generation/chat-composer.tsx", "utf8");
const providerSource = readFileSync("src/components/generation/generation-session-provider.tsx", "utf8");
const routeSource = readFileSync("src/app/api/generate/route.ts", "utf8");
const queueSource = readFileSync("src/lib/generation-queue.ts", "utf8");

assert.equal(generateSchema.safeParse({ prompt: "test", quantity: 1 }).success, true);
assert.equal(generateSchema.safeParse({ prompt: "test", quantity: 4 }).success, true);
assert.equal(generateSchema.safeParse({ prompt: "test", quantity: 5 }).success, false);
assert.equal(generateSchema.safeParse({ prompt: "test", quantity: 10 }).success, false);
assert.equal(generateSchema.safeParse({ prompt: "test", quantity: 0 }).success, false);
assert.equal(generateSchema.parse({ prompt: "test" }).quantity, 1);

assert.match(providerSource, /const \[quantity, setQuantity\] = useState\(1\)/);
assert.match(composerSource, /消耗 \{creditCost\} 积分/);
assert.match(composerSource, /单次数量/);
assert.match(pageSource, /selectedQuantity/);
assert.match(providerSource, /quantity:\s*selectedQuantity/);
assert.match(composerSource, /Array\.from\(\{ length: 4 \}/);
assert.doesNotMatch(composerSource, /Array\.from\(\{ length: 10 \}/);
assert.match(providerSource, /imageUrls:\s*data\.images\.map/);
assert.match(pageSource, /flex flex-wrap gap-1\.5/);

assert.match(routeSource, /const creditCost = apiSettings\.features\.creditsEnabled \? getModelCreditCost/);
assert.match(routeSource, /const creditCostPerImage = creditCost \/ parsed\.data\.quantity/);
assert.match(routeSource, /user\.credits < creditCost/);
assert.match(routeSource, /decrement: creditCost/);
assert.match(queueSource, /refundFailedImage\(task\.userId, task\.id, task\.creditCostPerImage\)/);
assert.match(routeSource, /amount: -creditCost/);
assert.match(routeSource, /prisma\.\$transaction/);
assert.match(routeSource, /imageIds\.map/);
assert.doesNotMatch(routeSource, /for \(let index = 0; index < parsed\.data\.quantity; index\+\+\)/);
assert.match(queueSource, /const failedCount = images\.filter/);
