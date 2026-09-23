import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const authSource = readFileSync("src/auth.ts", "utf8");
const creditTransactionsSource = readFileSync("src/lib/credit-transactions.ts", "utf8");

assert.doesNotMatch(authSource, /lastLoginBonus/);
assert.doesNotMatch(authSource, /LOGIN_BONUS/);
assert.doesNotMatch(authSource, /credits:\s*\{\s*increment:\s*5\s*\}/);
assert.doesNotMatch(authSource, /Daily login bonus/);

assert.doesNotMatch(creditTransactionsSource, /每日登录奖励/);
assert.doesNotMatch(creditTransactionsSource, /LOGIN_BONUS/);
