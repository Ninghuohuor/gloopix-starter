import assert from "node:assert/strict";
import { AVAILABLE_MODELS, generateSchema } from "../src/lib/validations";
import {
  calculateImageCreditCost,
  getAvailableAspectRatiosForModel,
  getDefaultAspectRatioForModel,
  getImageModelConfig,
  isAspectRatioCompatibleWithModel,
} from "../src/lib/image-models";


assert.deepEqual(
  AVAILABLE_MODELS.map((model) => model.id),
  [
    "gpt-image-2",
    "gpt-image-2-official",
    "gemini-3.1-flash-image-preview",
    "gemini-3.1-flash-image-preview-official",
  ]
);

assert.equal(generateSchema.safeParse({ prompt: "test", model: "gpt-image-2" }).success, true);
assert.equal(generateSchema.safeParse({ prompt: "test", model: "gpt-image-2-official" }).success, true);
assert.equal(generateSchema.safeParse({ prompt: "test", model: "gemini-3.1-flash-image-preview" }).success, true);
assert.equal(generateSchema.safeParse({ prompt: "test", model: "gemini-3.1-flash-image-preview-official" }).success, true);
assert.equal(generateSchema.safeParse({ prompt: "test", model: "gemini-3.1-flash-image-preview", aspectRatio: "auto" }).success, true);
assert.equal(generateSchema.safeParse({ prompt: "test", model: "gemini-3.1-flash-image-preview", aspectRatio: "21:9" }).success, true);
assert.equal(generateSchema.safeParse({ prompt: "test", model: "gemini-3.1-flash-image-preview", aspectRatio: "9:21" }).success, true);
assert.equal(generateSchema.safeParse({ prompt: "test", model: "gemini-3.1-flash-image-preview", aspectRatio: "1:2" }).success, true);
assert.equal(generateSchema.safeParse({ prompt: "test", model: "gemini-3.1-flash-image-preview", aspectRatio: "2:1" }).success, true);
assert.equal(generateSchema.safeParse({ prompt: "test", model: "custom-model" }).success, true);
assert.equal(
  generateSchema.safeParse({
    prompt: "test",
    model: "gpt-image-2",
    requestId: "550e8400-e29b-41d4-a716-446655440000",
  }).success,
  true
);

assert.equal(getImageModelConfig("gpt-image-2").supportsQuality, false);
assert.equal(getImageModelConfig("gpt-image-2").supportsResolution, true);
assert.equal(getImageModelConfig("gpt-image-2-official").supportsQuality, true);
assert.equal(getImageModelConfig("gpt-image-2-official").supportsResolution, true);
assert.equal(getImageModelConfig("gemini-3.1-flash-image-preview").name, "Nano Banana 2");
assert.equal(getImageModelConfig("gemini-3.1-flash-image-preview").supportsQuality, false);
assert.equal(getImageModelConfig("gemini-3.1-flash-image-preview").supportsResolution, true);
assert.deepEqual(getImageModelConfig("gemini-3.1-flash-image-preview").supportedAspectRatios, [
  "1:1",
  "3:2",
  "2:3",
  "4:3",
  "3:4",
  "16:9",
  "9:16",
  "5:4",
  "4:5",
  "21:9",
]);
assert.equal(getImageModelConfig("gemini-3.1-flash-image-preview-official").name, "Nano Banana 2 Official");
assert.equal(getImageModelConfig("gemini-3.1-flash-image-preview-official").supportsQuality, false);
assert.equal(getImageModelConfig("gemini-3.1-flash-image-preview-official").supportsResolution, true);
assert.deepEqual(
  getAvailableAspectRatiosForModel("gemini-3.1-flash-image-preview").map((item) => item.id),
  ["3:4", "4:3", "1:1", "4:5", "5:4", "16:9", "9:16", "2:3", "3:2", "21:9"]
);
assert.equal(isAspectRatioCompatibleWithModel("gemini-3.1-flash-image-preview", "21:9"), true);
assert.equal(isAspectRatioCompatibleWithModel("gemini-3.1-flash-image-preview", "9:21"), false);
assert.equal(isAspectRatioCompatibleWithModel("gemini-3.1-flash-image-preview", "1:2"), false);
assert.equal(isAspectRatioCompatibleWithModel("gemini-3.1-flash-image-preview", "2:1"), false);
assert.equal(getDefaultAspectRatioForModel("gemini-3.1-flash-image-preview", "1k"), "3:4");
assert.equal(getDefaultAspectRatioForModel("gemini-3.1-flash-image-preview", "4k"), "16:9");
assert.equal(
  generateSchema.safeParse({
    prompt: "test",
    model: "gemini-3.1-flash-image-preview",
    resolution: "4k",
  }).data?.aspectRatio,
  "16:9"
);

assert.equal(
  calculateImageCreditCost({
    model: "gpt-image-2",
    resolution: "4k",
    quality: "high",
    quantity: 2,
  }),
  80
);
assert.equal(
  calculateImageCreditCost({
    model: "gpt-image-2-official",
    resolution: "2k",
    quality: "medium",
    quantity: 3,
  }),
  600
);
assert.equal(
  calculateImageCreditCost({
    model: "gpt-image-2-official",
    resolution: "1k",
    quality: "low",
    quantity: 1,
  }),
  10
);
assert.equal(
  calculateImageCreditCost({
    model: "gpt-image-2-official",
    resolution: "1k",
    quality: "high",
    quantity: 1,
  }),
  240
);
assert.equal(
  calculateImageCreditCost({
    model: "gpt-image-2-official",
    resolution: "4k",
    quality: "medium",
    quantity: 1,
  }),
  400
);
assert.equal(
  calculateImageCreditCost({
    model: "gpt-image-2-official",
    resolution: "4k",
    quality: "high",
    quantity: 1,
  }),
  1800
);
assert.equal(
  calculateImageCreditCost({
    model: "gemini-3.1-flash-image-preview",
    resolution: "1k",
    quality: "high",
    quantity: 1,
  }),
  40
);
assert.equal(
  calculateImageCreditCost({
    model: "gemini-3.1-flash-image-preview",
    resolution: "2k",
    quality: "medium",
    quantity: 2,
  }),
  100
);
assert.equal(
  calculateImageCreditCost({
    model: "gemini-3.1-flash-image-preview-official",
    resolution: "1k",
    quality: "high",
    quantity: 1,
  }),
  70
);
assert.equal(
  calculateImageCreditCost({
    model: "gemini-3.1-flash-image-preview-official",
    resolution: "4k",
    quality: "medium",
    quantity: 2,
  }),
  300
);
