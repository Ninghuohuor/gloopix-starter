import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

assert.ok(existsSync("src/components/generation/generation-session-provider.tsx"));

const layoutSource = readFileSync("src/app/layout.tsx", "utf8");
const pageSource = readFileSync("src/app/page.tsx", "utf8");
const providerSource = readFileSync(
  "src/components/generation/generation-session-provider.tsx",
  "utf8"
);

assert.match(layoutSource, /GenerationSessionProvider/);
assert.match(layoutSource, /<GenerationSessionProvider>/);
assert.match(layoutSource, /<\/GenerationSessionProvider>/);

assert.match(pageSource, /useGenerationSession/);
assert.doesNotMatch(pageSource, /useSession/);
assert.doesNotMatch(pageSource, /useRouter/);
assert.doesNotMatch(pageSource, /const \[messages, setMessages\]/);
assert.doesNotMatch(pageSource, /const \[quality, setQuality\]/);

assert.match(providerSource, /createContext/);
assert.match(providerSource, /useSession/);
assert.match(providerSource, /authStatus:\s*status/);
assert.match(providerSource, /useRouter/);
assert.match(providerSource, /const \[messages, setMessages\]/);
assert.match(providerSource, /const \[quality, setQuality\]/);
assert.match(providerSource, /const \[elapsed, setElapsed\]/);
assert.match(providerSource, /activeUserIdRef/);
assert.match(providerSource, /sessionGenerationVersionRef/);
assert.match(providerSource, /resetGenerationSession/);
assert.match(providerSource, /activeUserIdRef\.current !== currentUserId/);
assert.match(providerSource, /sessionGenerationVersionRef\.current !== generationVersion/);
assert.match(providerSource, /startedAt/);
assert.match(providerSource, /durationSeconds/);
assert.match(providerSource, /Math\.round\(\(Date\.now\(\) - startedAt\) \/ 1000\)/);
assert.match(providerSource, /timerRef/);
assert.match(providerSource, /runGeneration/);
assert.match(providerSource, /handleFileSelect/);
assert.match(providerSource, /handleFilesSelect\(files: File\[\]\)/);
assert.match(providerSource, /const \[referenceImages, setReferenceImages\]/);
assert.match(providerSource, /name: file\.name \|\| "参考图片"/);
assert.match(providerSource, /window\.dispatchEvent\(new Event\("credits-updated"\)\)/);
