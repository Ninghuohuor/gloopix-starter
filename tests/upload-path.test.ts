import assert from "node:assert/strict";
import path from "node:path";
import { getLocalUploadPath } from "../src/lib/uploads";

const uploadPath = getLocalUploadPath("/uploads/example.png");
assert.equal(uploadPath, path.join(process.cwd(), "public", "uploads", "example.png"));

assert.equal(getLocalUploadPath("https://example.com/example.png"), null);
assert.equal(getLocalUploadPath("/placeholder.png"), null);
assert.equal(getLocalUploadPath("/uploads/../secret.txt"), null);
