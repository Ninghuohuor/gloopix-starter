import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  containsForbiddenPromptTerm,
  FORBIDDEN_PROMPT_MESSAGE,
} from "../src/lib/forbidden-prompts";

const forbiddenSource = readFileSync("src/lib/forbidden-prompts.ts", "utf8");
const generateRouteSource = readFileSync("src/app/api/generate/route.ts", "utf8");
const providerSource = readFileSync("src/components/generation/generation-session-provider.tsx", "utf8");

assert.equal(FORBIDDEN_PROMPT_MESSAGE, "提示词里包含违规词，无法生成图片。");
assert.equal(containsForbiddenPromptTerm("这是一段正常提示词"), false);
assert.equal(containsForbiddenPromptTerm("提示词里有 色 情 内容"), true);

assert.match(forbiddenSource, /DEFAULT_FORBIDDEN_PROMPT_TERMS/);
assert.match(forbiddenSource, /FORBIDDEN_PROMPT_TERMS/);
assert.match(forbiddenSource, /NEXT_PUBLIC_FORBIDDEN_PROMPT_TERMS/);

assert.match(generateRouteSource, /containsForbiddenPromptTerm\(parsed\.data\.prompt\)/);
assert.match(generateRouteSource, /FORBIDDEN_PROMPT_MESSAGE/);
assert.match(generateRouteSource, /return NextResponse\.json\(\{ error: FORBIDDEN_PROMPT_MESSAGE \}, \{ status: 400 \}\)/);

const blockIndex = generateRouteSource.indexOf("containsForbiddenPromptTerm(parsed.data.prompt)");
const userLookupIndex = generateRouteSource.indexOf("const user = await prisma.user.findUnique");
const createIndex = generateRouteSource.indexOf("prisma.image.create");
assert.ok(blockIndex > 0);
assert.ok(blockIndex < userLookupIndex, "forbidden prompt check should run before user lookup and credit calculation");
assert.ok(blockIndex < createIndex, "forbidden prompt check should run before image records are created");

assert.match(providerSource, /containsForbiddenPromptTerm\(trimmedPrompt\)/);
assert.match(providerSource, /FORBIDDEN_PROMPT_MESSAGE/);
assert.match(providerSource, /status: "failed"/);
assert.match(providerSource, /toast\.error\(FORBIDDEN_PROMPT_MESSAGE\)/);
