import assert from "node:assert/strict";
import {
  ADMIN_DASHBOARD_PATH,
  UNAUTHORIZED_ADMIN_REDIRECT_PATH,
  USER_HOME_PATH,
  getPostLoginPath,
} from "../src/lib/route-targets";

assert.equal(USER_HOME_PATH, "/");
assert.equal(ADMIN_DASHBOARD_PATH, "/admin");
assert.equal(UNAUTHORIZED_ADMIN_REDIRECT_PATH, "/");
assert.equal(getPostLoginPath("ADMIN"), "/admin");
assert.equal(getPostLoginPath("USER"), "/");
assert.equal(getPostLoginPath(null), "/");
assert.notEqual(getPostLoginPath("USER"), "/dashboard");
