import assert from "node:assert/strict";
import {
  formatCreditTransactionTime,
  getCreditTransactionDisplay,
} from "../src/lib/credit-transactions";

assert.deepEqual(getCreditTransactionDisplay("REDEMPTION", 100), {
  label: "兑换码充值",
  direction: "income",
  signedAmount: "+100",
});

assert.deepEqual(getCreditTransactionDisplay("GENERATION", -10), {
  label: "生成图片消耗",
  direction: "expense",
  signedAmount: "-10",
});

assert.deepEqual(getCreditTransactionDisplay("GENERATION", 10), {
  label: "生成失败退款",
  direction: "income",
  signedAmount: "+10",
});

assert.equal(
  formatCreditTransactionTime(new Date("2026-04-24T06:07:08.000+08:00")),
  "2026/04/24 06:07:08"
);
