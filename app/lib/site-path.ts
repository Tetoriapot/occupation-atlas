/** Native forms, fetch and browser history do not apply Next.js basePath. */
export const siteBasePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");

export function sitePath(path: string): string {
  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new Error("サイト内のパスは / で始まる必要があります。");
  }
  return `${siteBasePath}${path}`;
}

export function appPathname(pathname: string): string {
  const path = siteBasePath && (pathname === siteBasePath || pathname.startsWith(`${siteBasePath}/`))
    ? pathname.slice(siteBasePath.length) || "/"
    : pathname;
  return path.replace(/\/$/, "") || "/";
}
