import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";

const root = resolve("out");
const basePath = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://tetoriapot.github.io/occupation-atlas/").pathname.replace(/\/$/, "");
const port = Number(process.env.PORT ?? 3000);
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".xml": "application/xml", ".txt": "text/plain", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".png": "image/png", ".ico": "image/x-icon", ".woff2": "font/woff2" };
createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", "http://localhost");
    const pathname = decodeURIComponent(url.pathname);
    if (pathname !== basePath && !pathname.startsWith(`${basePath}/`)) throw new Error("Outside basePath");
    let file = resolve(root, `.${pathname.slice(basePath.length) || "/"}`);
    if (file !== root && !file.startsWith(`${root}${sep}`)) throw new Error("Outside export");
    if ((await stat(file)).isDirectory()) {
      if (!pathname.endsWith("/")) {
        response.writeHead(308, { Location: `${pathname}/${url.search}` }).end();
        return;
      }
      file = resolve(file, "index.html");
    }
    const body = await readFile(file);
    response.writeHead(200, { "Content-Type": types[extname(file)] ?? "application/octet-stream", "Cache-Control": "no-store" }).end(body);
  } catch {
    response.writeHead(404, { "Content-Type": "text/html; charset=utf-8" }).end(await readFile(resolve(root, "404.html")));
  }
}).listen(port, "127.0.0.1", () => console.log(`Static preview: http://localhost:${port}${basePath}/`));
