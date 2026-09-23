import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const headerSource = readFileSync("src/components/layout/header.tsx", "utf8");

assert.match(headerSource, /renderAnnouncementContent/);
assert.match(headerSource, /ANNOUNCEMENT_URL_PATTERN/);
assert.match(headerSource, /target="_blank"/);
assert.match(headerSource, /rel="noopener noreferrer"/);
assert.match(headerSource, /href=\{normalizeAnnouncementUrl/);
assert.match(headerSource, /www\./);
assert.match(headerSource, /announcement\.content/);
