import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_IMAGE_MODELS } from "../src/lib/image-models";

test("new Starter installations expose only GPT Image 2 by default", () => {
  assert.deepEqual(DEFAULT_IMAGE_MODELS.map(({ id, enabled }) => ({ id, enabled })), [
    { id: "gpt-image-2", enabled: true },
  ]);
});
