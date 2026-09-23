import { readFileSync } from "fs";
import assert from "node:assert/strict";

const pageSource = readFileSync("src/app/page.tsx", "utf8");

assert.match(
  pageSource,
  /shouldAutoScrollResultsRef/,
  "chat results should remember whether the user is near the bottom before auto-scrolling",
);

assert.match(
  pageSource,
  /previousMessageCountRef/,
  "chat results should distinguish newly appended messages from background message updates",
);

assert.match(
  pageSource,
  /onScroll=\{handleResultsScroll\}/,
  "chat results should update auto-scroll intent when the user scrolls manually",
);

assert.doesNotMatch(
  pageSource,
  /useEffect\(\(\) => \{\s*if \(resultRef\.current\) \{\s*resultRef\.current\.scrollTop = resultRef\.current\.scrollHeight;\s*\}\s*\}, \[messages\]\);/,
  "chat results should not force-scroll to the newest image on every message update",
);
