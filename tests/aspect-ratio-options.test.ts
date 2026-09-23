import assert from "node:assert/strict";
import { AVAILABLE_ASPECT_RATIOS, generateSchema } from "../src/lib/validations";
import { resolveAspectRatio } from "../src/lib/aspect-ratio";

assert.deepEqual(
  AVAILABLE_ASPECT_RATIOS.map((option) => option.id),
  [
    "auto",
    "3:4",
    "4:3",
    "1:1",
    "4:5",
    "5:4",
    "16:9",
    "9:16",
    "2:3",
    "3:2",
    "21:9",
    "9:21",
    "1:2",
    "2:1",
  ]
);

assert.equal(generateSchema.safeParse({ prompt: "test", aspectRatio: "9:16" }).success, true);
assert.equal(generateSchema.safeParse({ prompt: "test", aspectRatio: "7:5" }).success, false);

assert.deepEqual(resolveAspectRatio("生成一张马斯克的抖音截图", "auto"), {
  width: 9,
  height: 16,
  text: "9:16",
});
assert.deepEqual(resolveAspectRatio("生成一张马斯克的抖音截图", "4:3"), {
  width: 4,
  height: 3,
  text: "4:3",
});
