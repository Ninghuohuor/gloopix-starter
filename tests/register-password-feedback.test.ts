import { readFileSync } from "fs";
import assert from "node:assert/strict";

const registerFormSource = readFileSync("src/components/auth/register-form.tsx", "utf8");

assert.match(
  registerFormSource,
  /passwordStrengthSchema\.safeParse\(password\)/,
  "register form should use the shared strong password schema",
);

assert.match(
  registerFormSource,
  /onChange=\{\(event\) => handlePasswordChange\(event\.target\.value\)\}/,
  "register form should validate password immediately while typing",
);

assert.match(
  registerFormSource,
  /onChange=\{\(event\) => handleConfirmPasswordChange\(event\.target\.value\)\}/,
  "register form should validate password confirmation immediately while typing",
);

assert.match(
  registerFormSource,
  /aria-invalid=\{Boolean\(passwordError\)\}/,
  "password input should expose invalid state for immediate feedback",
);

assert.match(
  registerFormSource,
  /aria-invalid=\{Boolean\(confirmPasswordError\)\}/,
  "confirm password input should expose invalid state for immediate feedback",
);

assert.match(
  registerFormSource,
  /confirmPasswordError \|\| "两次输入的密码一致后即可注册"/,
  "confirm password helper text should update when the two passwords do not match",
);
