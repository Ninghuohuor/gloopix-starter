import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const registerRouteSource = readFileSync("src/app/api/auth/register/route.ts", "utf8");
const creditTransactionsSource = readFileSync("src/lib/credit-transactions.ts", "utf8");

assert.match(registerRouteSource, /credits:\s*0/);
assert.doesNotMatch(registerRouteSource, /credits:\s*10/);
assert.doesNotMatch(registerRouteSource, /REGISTER_BONUS/);
assert.doesNotMatch(registerRouteSource, /creditTransaction\.create/);

assert.doesNotMatch(creditTransactionsSource, /注册赠送/);
assert.doesNotMatch(creditTransactionsSource, /REGISTER_BONUS/);
