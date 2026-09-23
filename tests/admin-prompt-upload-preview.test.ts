import { readFileSync } from "fs";
import assert from "node:assert/strict";

const adminPromptPageSource = readFileSync("src/app/admin/prompts/page.tsx", "utf8");

assert.doesNotMatch(
  adminPromptPageSource,
  /import Image from "next\/image"/,
  "admin prompt uploads are runtime files and should not use next/image optimization",
);

assert.match(
  adminPromptPageSource,
  /<img[\s\S]*src=\{imageUrl\}[\s\S]*alt=\{`上传图片预览/,
  "newly uploaded prompt image previews should render as direct static images",
);

assert.match(
  adminPromptPageSource,
  /<img[\s\S]*src=\{item\.imageUrl\}[\s\S]*alt="提示词图片"/,
  "admin prompt list images should render as direct static images",
);
