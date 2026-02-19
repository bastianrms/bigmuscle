export const PUBLIC_ROUTES = [
  "/",
  "/signup",
  "/plasmic-host",
  "/confirmemail",
  "/signup-confirmed",
  "/passwordreset-request",
  "/passwordreset",
  "/profile-setup",
];

function normalizePath(p: string) {
  // keine query/hash, kein trailing slash (außer root)
  const path = (p || "").split("?")[0].split("#")[0];
  if (path !== "/" && path.endsWith("/")) return path.slice(0, -1);
  return path || "/";
}

export function isPublicRoute(pathname: string) {
  const p = normalizePath(pathname);

  // root nur exact
  if (p === "/") return true;

  // alle anderen exact (empfohlen, weil Middleware auch exact macht)
  return PUBLIC_ROUTES.includes(p);
}