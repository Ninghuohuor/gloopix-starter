import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const queueSource = readFileSync("src/lib/generation-queue.ts", "utf8");
const taskRouteSource = readFileSync("src/app/api/user/generation-tasks/route.ts", "utf8");
const providerSource = readFileSync(
  "src/components/generation/generation-session-provider.tsx",
  "utf8"
);
const homePageSource = readFileSync("src/app/page.tsx", "utf8");

assert.match(queueSource, /lastError:\s*getErrorMessage\(error\)/);
assert.match(taskRouteSource, /formatGenerationFailureReason/);
assert.match(taskRouteSource, /lastErrorByGenerationId/);
assert.match(taskRouteSource, /status === "failed"[\s\S]*formatGenerationFailureReason\(lastErrorByGenerationId\.get\(generationId\)\)/);
assert.match(taskRouteSource, /内容或请求未通过上游处理，积分已返还。请换一种原创、合规描述后重试/);
assert.match(taskRouteSource, /copyright/);
assert.match(taskRouteSource, /intellectual property/);
assert.match(taskRouteSource, /trademark/);
assert.match(taskRouteSource, /policy/);
assert.match(taskRouteSource, /moderation/);
assert.match(taskRouteSource, /上游服务繁忙或排队超时，积分已返还/);
assert.match(taskRouteSource, /上游模型通道配置异常，积分已返还/);
assert.match(taskRouteSource, /当前模型不支持所选图片比例，积分已返还/);
assert.match(taskRouteSource, /参考图文件过大，积分已返还。请压缩到 20MB 以内后重试/);
assert.match(taskRouteSource, /payload too large/);
assert.match(taskRouteSource, /reference image upload exceeds apimart 20mb limit/);
assert.match(taskRouteSource, /file size/);
assert.match(taskRouteSource, /exceeds maximum/);
assert.match(taskRouteSource, /参考图上传失败，积分已返还/);
assert.match(taskRouteSource, /结果图片下载失败，积分已返还/);
assert.match(taskRouteSource, /服务响应超时，积分已返还/);
assert.match(taskRouteSource, /mime type must be image/);
assert.match(taskRouteSource, /failed to mirror image/);
assert.match(taskRouteSource, /r2 upload failed/);
assert.match(taskRouteSource, /上游服务没有返回图片，积分已返还/);
assert.match(taskRouteSource, /上游服务返回失败，积分已返还/);
assert.match(taskRouteSource, /未返回明确失败原因，积分已返还/);
assert.match(taskRouteSource, /生成服务异常，积分已返还/);
assert.doesNotMatch(taskRouteSource, /return "图片生成失败：/);
assert.match(homePageSource, /失败原因：\{img\.error/);
assert.match(providerSource, /error\?: string/);
