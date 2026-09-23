export const USER_HOME_PATH = "/";
export const ADMIN_DASHBOARD_PATH = "/admin";
export const UNAUTHORIZED_ADMIN_REDIRECT_PATH = USER_HOME_PATH;

export function getPostLoginPath(role?: string | null) {
  return role === "ADMIN" ? ADMIN_DASHBOARD_PATH : USER_HOME_PATH;
}
