import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const adminLayoutSource = readFileSync("src/app/admin/layout.tsx", "utf8");
const redeemPageSource = readFileSync("src/app/redeem/page.tsx", "utf8");
const creditsPageSource = readFileSync("src/app/credits/page.tsx", "utf8");

const alignedContainerPattern = /container mx-auto[^"]*px-4[^"]*py-5[^"]*sm:py-8/;

assert.match(adminLayoutSource, alignedContainerPattern);
assert.match(redeemPageSource, alignedContainerPattern);
assert.match(creditsPageSource, alignedContainerPattern);
assert.doesNotMatch(redeemPageSource, /max-w-lg/);
