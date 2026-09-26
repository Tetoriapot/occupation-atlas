import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://tetoriapot.github.io/occupation-atlas/");
const basePath = siteUrl.pathname.replace(/\/$/, "");
const records = JSON.parse(await readFile("data/occupations.generated.json", "utf8"));
const categories = JSON.parse(await readFile("data/categories.json", "utf8"));
const paths = ["", "about", "categories", "occupations", "updates",
  ...categories.map(({ slug }) => `categories/${slug}`),
  ...records.map(({ slug }) => `occupations/${slug}`),
];
const checkedAssets = new Set();
for (const path of paths) {
  const html = await readFile(join("out", path, "index.html"), "utf8");
  const expectedUrl = `${siteUrl.origin}${basePath}/${path ? `${path}/` : ""}`;
  assert.ok(html.includes(`rel="canonical" href="${expectedUrl}"`), `${path}: canonicalが違います`);
  assert.match(html, /<h1\b/);
  assert.ok(!html.includes("https://tansakusha-occupation-atlas.tetoriapot.chatgpt.site"), `${path}: 旧サイトURLが残っています`);
  for (const [, attribute, raw] of html.matchAll(/\b(src|href|action)="([^"]+)"/g)) {
    const value = raw.replaceAll("&amp;", "&");
    if (!value.startsWith("/") || value.startsWith("//")) continue;
    assert.ok(value === basePath || value.startsWith(`${basePath}/`), `${path}: ${attribute}がベースパス外です: ${value}`);
    const pathname = decodeURIComponent(new URL(value, siteUrl).pathname.slice(basePath.length));
    const file = join("out", pathname, pathname.endsWith("/") ? "index.html" : "");
    if (checkedAssets.has(file)) continue;
    await access(file).catch(() => { throw new Error(`${path}: 参照先がありません: ${file}`); });
    checkedAssets.add(file);
  }
}
for (const file of ["404.html", "robots.txt", "sitemap.xml", "og.jpg", ".nojekyll", "occupation-search-index.json", "occupation-search-index.compressed.json"]) {
  await access(join("out", file));
}
const sitemap = await readFile("out/sitemap.xml", "utf8");
for (const path of paths) assert.ok(sitemap.includes(`${siteUrl.origin}${basePath}/${path ? `${path}/` : ""}`), path);
assert.equal((await readdir("out/occupations", { withFileTypes: true }))
  .filter((entry) => entry.isDirectory() && !entry.name.startsWith("__next.")).length, records.length);
console.log(`${paths.length}ページ、${records.length}職業、${checkedAssets.size}参照先、SEO・検索索引・404を検証しました。`);
