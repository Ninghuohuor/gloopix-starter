import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { DEFAULT_ASYNC_TASK_PROTOCOL, asyncTaskProtocolSchema } from "../src/lib/async-task-protocol";
import { generateWithAsyncTask } from "../src/lib/image-providers/async-task";

const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg==";
const image = `data:image/png;base64,${png}`;
const model = { supportsResolution: true, defaultResolution: "1k", supportsQuality: false } as Parameters<typeof generateWithAsyncTask>[0]["configuredModel"];

test("async protocol validates task paths and JSON mappings", () => {
  assert.equal(asyncTaskProtocolSchema.safeParse(DEFAULT_ASYNC_TASK_PROTOCOL).success, true);
  assert.equal(asyncTaskProtocolSchema.safeParse({ ...DEFAULT_ASYNC_TASK_PROTOCOL, taskPath: "/tasks" }).success, false);
  assert.equal(asyncTaskProtocolSchema.safeParse({ ...DEFAULT_ASYNC_TASK_PROTOCOL, submitPath: "https://other.host/path" }).success, false);
});

test("JSON async protocol generates from a text prompt", async () => {
  const originalFetch = globalThis.fetch;
  const dir = await mkdtemp(path.join(os.tmpdir(), "gloopix-async-text-"));
  const calls: string[] = [];
  try {
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      calls.push(url);
      if (url.endsWith("/images/generations")) {
        const body = JSON.parse(String(init?.body));
        assert.equal(body.prompt, "a cat");
        assert.equal(body.model, "test-model");
        assert.equal(body.image_urls, undefined);
        return Response.json({ data: { task_id: "task 1" } });
      }
      assert.equal(url, "https://relay.example/v1/tasks/task%201");
      return Response.json({ data: { status: "completed", images: [{ url: image }] } });
    };
    const filepath = path.join(dir, "result.png");
    await generateWithAsyncTask({ apiKey: "test-key", baseURL: "https://relay.example/v1", protocol: DEFAULT_ASYNC_TASK_PROTOCOL, prompt: "a cat", model: "test-model", aspectRatioOption: "auto", filepath, configuredModel: model });
    assert.equal((await readFile(filepath)).subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal(calls.length, 2);
  } finally {
    globalThis.fetch = originalFetch;
    await rm(dir, { recursive: true, force: true });
  }
});

test("JSON async protocol uploads a reference image with configurable fields", async () => {
  const originalFetch = globalThis.fetch;
  const dir = await mkdtemp(path.join(os.tmpdir(), "gloopix-async-reference-"));
  const protocol = { ...DEFAULT_ASYNC_TASK_PROTOCOL, uploadPath: "/assets", uploadField: "image", uploadUrlPath: "payload.url", referenceField: "references", taskIdPath: "job.id", statusPath: "job.state", resultPath: "job.output.0.url" };
  try {
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      if (url.endsWith("/assets")) {
        assert.equal(init?.method, "POST");
        assert.ok(init?.body instanceof FormData);
        assert.ok(init.body.get("image") instanceof Blob);
        return Response.json({ payload: { url: "https://relay.example/reference.png" } });
      }
      if (url.endsWith("/images/generations")) {
        const body = JSON.parse(String(init?.body));
        assert.deepEqual(body.references, ["https://relay.example/reference.png"]);
        assert.match(body.prompt, /参考图要求/);
        return Response.json({ job: { id: "123" } });
      }
      assert.equal(url, "https://relay.example/v1/tasks/123");
      return Response.json({ job: { state: "completed", output: [{ url: image }] } });
    };
    const filepath = path.join(dir, "result.png");
    await generateWithAsyncTask({ apiKey: "test-key", baseURL: "https://relay.example/v1", protocol, prompt: "a cat", model: "test-model", referenceImages: [image], aspectRatioOption: "auto", filepath, configuredModel: model });
    assert.equal((await readFile(filepath)).subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  } finally {
    globalThis.fetch = originalFetch;
    await rm(dir, { recursive: true, force: true });
  }
});
