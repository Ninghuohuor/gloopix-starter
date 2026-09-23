import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_IMAGE_MODELS } from "../src/lib/image-models";
import { providerInputSchema } from "../src/lib/api-settings";
import { providerTestErrorMessage, runProviderModelTest, testResolution } from "../src/lib/provider-model-test";

const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg==";
const model = providerInputSchema.parse({
  id: "test", name: "Test", type: "GOOGLE_GEMINI", enabled: true,
  baseUrl: "https://relay.example/v1", models: DEFAULT_IMAGE_MODELS,
}).models[0];

test("model test uses the lowest available resolution", () => {
  assert.equal(testResolution(model), "1k");
  assert.equal(testResolution({ ...model, supportedResolutions: ["2k", "4k"] }), "2k");
});

test("provider errors never echo the API key", () => {
  const message = providerTestErrorMessage(new Error("upstream rejected secret+key and secret%2Bkey"), "secret+key");
  assert.doesNotMatch(message, /secret/);
  assert.match(message, /API Key 已隐藏/);
});

test("model test performs a real provider request without saving a user image", async () => {
  const originalFetch = globalThis.fetch;
  const provider = providerInputSchema.parse({
    id: "test", name: "Test", type: "GOOGLE_GEMINI", enabled: true,
    baseUrl: "https://relay.example/v1", models: [model],
  });
  try {
    globalThis.fetch = async (input, init) => {
      assert.match(String(input), /\/models\/gpt-image-2:generateContent\?key=test-key$/);
      const body = JSON.parse(String(init?.body));
      assert.equal(body.generationConfig.imageConfig.imageSize, "1K");
      assert.match(body.contents[0].parts[0].text, /red circle/);
      return Response.json({ candidates: [{ content: { parts: [{ inlineData: { data: png } }] } }] });
    };
    const result = await runProviderModelTest(provider, model, "test-key");
    assert.deepEqual(result, { resolution: "1k", width: 1, height: 1 });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
