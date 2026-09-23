import { readFileSync } from "fs";
import assert from "node:assert/strict";

const registerFormSource = readFileSync("src/components/auth/register-form.tsx", "utf8");

assert.match(
  registerFormSource,
  /import \{ signIn \} from "next-auth\/react"/,
  "register form should be able to create a session immediately after successful registration",
);

assert.match(
  registerFormSource,
  /signIn\("credentials",\s*\{[\s\S]*email,[\s\S]*password,[\s\S]*redirect:\s*false/,
  "register form should sign in with the newly created credentials",
);

assert.match(
  registerFormSource,
  /fetch\("\/api\/auth\/session",\s*\{ cache:\s*"no-store" \}\)/,
  "register form should read the fresh session after auto-login",
);

assert.match(
  registerFormSource,
  /router\.push\(getPostLoginPath\(session\?\.user\?\.role\)\)/,
  "register form should send the user to the same post-login target as normal login",
);

assert.doesNotMatch(
  registerFormSource,
  /router\.push\("\/login"\)/,
  "successful registration should not force the user to log in again",
);

assert.doesNotMatch(
  registerFormSource,
  /注册成功，请登录/,
  "successful registration copy should not tell the user to log in manually",
);
