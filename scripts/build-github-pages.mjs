import { spawnSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const input = process.env.NEXT_PUBLIC_SITE_URL;
if (!input) throw new Error("NEXT_PUBLIC_SITE_URLにGitHub Pagesの公開URLを指定してください。");
const url = new URL(input);
if (!/^https?:$/.test(url.protocol) || url.search || url.hash || url.username || url.password) {
  throw new Error("公開URLは認証情報・クエリ・ハッシュのないHTTP(S) URLを指定してください。");
}
const env = {
  ...process.env,
  NEXT_STATIC_EXPORT: "1",
  NEXT_PUBLIC_STATIC_EXPORT: "1",
  NEXT_PUBLIC_SITE_URL: url.href.replace(/\/$/, ""),
  NEXT_PUBLIC_BASE_PATH: url.pathname.replace(/\/$/, ""),
  NEXT_TELEMETRY_DISABLED: "1",
};
for (const args of [
  ["scripts/generate-data.mjs"],
  ["node_modules/next/dist/bin/next", "build", "--webpack"],
]) {
  const result = spawnSync(process.execPath, args, { cwd: process.cwd(), env, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
await writeFile(resolve("out/.nojekyll"), "");
console.log(`GitHub Pages用の静的出力を生成しました: ${url.href}`);
