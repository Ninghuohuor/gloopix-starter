import assert from "node:assert/strict";
import {
  buildImagePrompt,
  chooseGenerationSize,
  inferAspectRatio,
  parseAspectRatio,
  targetCropSize,
} from "../src/lib/aspect-ratio";

assert.deepEqual(parseAspectRatio("马斯克直播截图，9:16，抖音风格"), {
  width: 9,
  height: 16,
  text: "9:16",
});
assert.deepEqual(parseAspectRatio("生成 4：3 横版封面"), {
  width: 4,
  height: 3,
  text: "4:3",
});
assert.equal(parseAspectRatio("没有比例要求"), null);

assert.deepEqual(inferAspectRatio("生成一张马斯克的抖音截图"), {
  width: 9,
  height: 16,
  text: "9:16",
});
assert.deepEqual(inferAspectRatio("手机直播截图，马斯克正在讲话"), {
  width: 9,
  height: 16,
  text: "9:16",
});
assert.deepEqual(inferAspectRatio("生成一张马斯克的抖音截图，4:3"), {
  width: 4,
  height: 3,
  text: "4:3",
});

assert.equal(chooseGenerationSize({ width: 9, height: 16 }), "1024x1536");
assert.equal(chooseGenerationSize({ width: 3, height: 4 }), "1024x1536");
assert.equal(chooseGenerationSize({ width: 4, height: 3 }), "1536x1024");
assert.equal(chooseGenerationSize({ width: 1, height: 1 }), "1024x1024");

assert.deepEqual(targetCropSize(1024, 1536, { width: 9, height: 16 }), {
  width: 864,
  height: 1536,
});
assert.deepEqual(targetCropSize(1536, 1024, { width: 4, height: 3 }), {
  width: 1365,
  height: 1024,
});
assert.match(buildImagePrompt("直播截图 9:16"), /不要黑边/);
assert.match(buildImagePrompt("直播截图 9:16"), /主体居中/);
assert.match(buildImagePrompt("生成一张马斯克的抖音截图"), /9:16/);
