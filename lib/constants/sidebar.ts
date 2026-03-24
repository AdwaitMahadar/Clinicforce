/** Cookie used by `(app)/layout` + `SideNav` to persist collapsed width without flash on refresh. */
export const SIDEBAR_COLLAPSED_COOKIE_NAME = "sidebar-collapsed" as const;

/** ~1 year — matches client `document.cookie` Max-Age. */
export const SIDEBAR_COLLAPSED_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

/** Server and client: `"1"` = collapsed, `"0"` or absent = expanded. */
export function parseSidebarCollapsedCookie(value: string | undefined): boolean {
  return value === "1";
}
