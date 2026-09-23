import { readFileSync } from "fs";
import assert from "assert";

const homePageSource = readFileSync("src/app/page.tsx", "utf8");
const historyPageSource = readFileSync("src/app/history/page.tsx", "utf8");
const metadataLineSource = readFileSync("src/components/generation/generation-metadata-line.tsx", "utf8");
const taskRouteSource = readFileSync("src/app/api/user/generation-tasks/route.ts", "utf8");

assert.match(homePageSource, /GenerationMetadataLine/);
assert.match(historyPageSource, /GenerationMetadataLine/);

assert.match(metadataLineSource, /生成参数/);
assert.match(metadataLineSource, /模型/);
assert.match(metadataLineSource, /尺寸/);
assert.match(metadataLineSource, /分辨率/);
assert.match(metadataLineSource, /质量/);
assert.match(metadataLineSource, /supportsQuality/);

assert.match(taskRouteSource, /\.sort\(\(a,\s*b\)\s*=>\s*a\.startedAt\s*-\s*b\.startedAt\)/);
