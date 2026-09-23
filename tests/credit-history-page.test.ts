import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const headerSource = readFileSync("src/components/layout/header.tsx", "utf8");
const pageSource = readFileSync("src/app/credits/page.tsx", "utf8");

assert.match(headerSource, /href="\/credits"/);
assert.match(headerSource, /aria-label="查看积分历史记录"/);

assert.match(pageSource, /积分历史记录/);
assert.match(pageSource, /creditTransaction\.findMany/);
assert.match(pageSource, /orderBy:\s*\{\s*createdAt:\s*"desc"\s*\}/s);
assert.match(pageSource, /formatCreditTransactionTime/);
assert.match(pageSource, /getCreditTransactionDisplay/);
assert.match(pageSource, /精确到秒/);
assert.match(pageSource, /container mx-auto px-4 py-5 sm:py-8/);
assert.match(pageSource, /<Card size="sm">/);
assert.match(pageSource, /const PAGE_SIZE = 12/);
assert.match(pageSource, /共 \{total\} 条记录，第 \{page\} \/ \{totalPages\} 页/);
assert.match(pageSource, /第 \{page\} \/ \{totalPages\} 页，共 \{total\} 条/);
assert.doesNotMatch(pageSource, /CardContent className="min-h-0 flex-1 overflow-y-auto"/);
assert.doesNotMatch(pageSource, /h-\[calc\(100dvh-3\.5rem\)\]/);
