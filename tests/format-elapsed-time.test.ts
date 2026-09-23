import assert from "node:assert/strict";
import { formatElapsedTime } from "../src/lib/time";

assert.equal(formatElapsedTime(0), "0:00");
assert.equal(formatElapsedTime(1), "0:01");
assert.equal(formatElapsedTime(65), "1:05");
assert.equal(formatElapsedTime(600), "10:00");
