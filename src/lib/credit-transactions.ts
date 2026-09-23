export type CreditTransactionDirection = "income" | "expense";

const CREDIT_TRANSACTION_LABELS: Record<string, string> = {
  REDEMPTION: "兑换码充值",
  NEW_USER_BENEFIT: "新用户福利",
  GENERATION_CANCEL_REFUND: "生成取消退款",
  GENERATION_FAILURE_REFUND: "生成失败退款",
};

export function getCreditTransactionDisplay(type: string, amount: number) {
  const direction: CreditTransactionDirection = amount >= 0 ? "income" : "expense";
  const fallbackLabel = amount >= 0 ? "积分充值" : "积分消耗";
  const label =
    type === "GENERATION"
      ? amount < 0
        ? "生成图片消耗"
        : "生成失败退款"
      : CREDIT_TRANSACTION_LABELS[type] || fallbackLabel;

  return {
    label,
    direction,
    signedAmount: `${amount > 0 ? "+" : ""}${amount}`,
  };
}

export function formatCreditTransactionTime(date: Date, timeZone = "Asia/Shanghai") {
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || "";

  return `${value("year")}/${value("month")}/${value("day")} ${value("hour")}:${value("minute")}:${value("second")}`;
}
