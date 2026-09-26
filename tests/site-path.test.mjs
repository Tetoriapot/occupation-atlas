import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

function inspect(basePath, staticExport, siteUrl) {
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", `
    import { sitePath, appPathname } from './app/lib/site-path.ts';
    import { absoluteUrl } from './app/lib/site.ts';
    console.log(JSON.stringify({
      fetch: sitePath('/occupation-search-index.json'),
      form: sitePath('/occupations/'),
      route: appPathname('${basePath}/occupations/'),
      home: absoluteUrl('/'),
      detail: absoluteUrl('/occupations/doctor'),
      image: absoluteUrl('/og.jpg'),
    }));
  `], {
    encoding: "utf8",
    env: { ...process.env, NEXT_PUBLIC_BASE_PATH: basePath,
      NEXT_PUBLIC_STATIC_EXPORT: staticExport, NEXT_PUBLIC_SITE_URL: siteUrl },
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

test("GitHub Pagesのベースパスをフォーム・検索索引・共有URLへ適用する", () => {
  const result = inspect("/occupation-atlas", "1", "https://tetoriapot.github.io/occupation-atlas");
  assert.deepEqual(result, {
    fetch: "/occupation-atlas/occupation-search-index.json",
    form: "/occupation-atlas/occupations/",
    route: "/occupations",
    home: "https://tetoriapot.github.io/occupation-atlas/",
    detail: "https://tetoriapot.github.io/occupation-atlas/occupations/doctor/",
    image: "https://tetoriapot.github.io/occupation-atlas/og.jpg",
  });
});

test("従来のルート直下での公開URLも維持する", () => {
  const result = inspect("", "", "https://tansakusha-occupation-atlas.tetoriapot.chatgpt.site");
  assert.equal(result.fetch, "/occupation-search-index.json");
  assert.equal(result.detail, "https://tansakusha-occupation-atlas.tetoriapot.chatgpt.site/occupations/doctor");
  assert.equal(result.route, "/occupations");
});
