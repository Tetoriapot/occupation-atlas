import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const stylesheet = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
const mobileMenuSource = await readFile(
  new URL("../app/components/layout/mobile-menu.tsx", import.meta.url),
  "utf8",
);
const detailPageSource = await readFile(
  new URL("../app/occupations/[slug]/page.tsx", import.meta.url),
  "utf8",
);

test("320pxではヘッダーを圧縮し、固定目次をヘッダー直下へ配置する", () => {
  const bodyRule = stylesheet.match(/body\s*\{([^}]*)\}/)?.[1];
  assert.ok(bodyRule, "bodyのCSSルールが必要です");
  assert.match(bodyRule, /min-width:\s*0/);
  assert.doesNotMatch(bodyRule, /min-width:\s*320px/);
  assert.match(stylesheet, /--site-header-height:\s*72px/);
  assert.match(stylesheet, /@media \(max-width: 400px\)[\s\S]*?--site-header-height:\s*64px/);
  assert.match(stylesheet, /--detail-toc-height:\s*56px/);
  assert.match(stylesheet, /\.occupation-detail__toc--sticky \{[\s\S]*?top:\s*calc\(var\(--site-header-height\) \+ 1px\)/);
  assert.match(stylesheet, /scroll-margin-top:\s*calc\(var\(--site-header-height\) \+ var\(--detail-toc-height\) \+ 16px\)/);
  assert.match(stylesheet, /\.mobile-menu-label\s*\{?[\s\S]*?display:\s*none/);
  assert.match(stylesheet, /\.occupation-detail__toc-more-panel\s*\{[\s\S]*?width:\s*min\(380px, calc\(100vw - 40px\)\)/);
});

test("主要な補助リンクと文字色は小画面でも読み取り・操作できる", () => {
  assert.match(stylesheet, /\.breadcrumbs\s*\{[\s\S]*?color:\s*var\(--ink-soft\)/);
  assert.match(stylesheet, /\.random-card-meta a\s*\{[\s\S]*?min-width:\s*44px/);
});

test("PCの比較トレイは左側の絞り込み欄と重ならない", () => {
  const desktop = stylesheet.match(/@media \(min-width: 820px\) \{[\s\S]*?@media \(min-width: 1060px\)/)?.[0];
  assert.ok(desktop, "820px以上のCSSが必要です");
  assert.match(desktop, /\.global-comparison-tray\s*\{[\s\S]*?left:\s*auto/);
  assert.match(desktop, /right:\s*max\(24px, calc\(\(100vw - 1180px\) \/ 2\)\)/);
  assert.match(desktop, /width:\s*min\(720px, calc\(100vw - 326px\)\)/);
});

test("固定目次は主要5リンクと展開式の全目次に圧縮する", () => {
  const primaryToc = detailPageSource.match(
    /<div className="occupation-detail__toc-primary">([\s\S]*?)<\/div>/,
  )?.[1];

  assert.ok(primaryToc, "主要目次が必要です");
  assert.equal((primaryToc.match(/<a /g) ?? []).length, 5);
  assert.match(detailPageSource, /<details className="occupation-detail__toc-more">/);
  assert.match(detailPageSource, /<summary>全目次<\/summary>/);
  assert.match(
    stylesheet,
    /\.occupation-detail__toc-primary\s*\{[\s\S]*?overflow-x:\s*auto/,
  );
  assert.match(
    stylesheet,
    /\.occupation-detail__toc-more-panel\s*\{[\s\S]*?max-height:\s*calc\([\s\S]*?overflow-y:\s*auto/,
  );
  assert.match(
    stylesheet,
    /\.occupation-detail__toc-more summary\s*\{[\s\S]*?min-height:\s*44px/,
  );
});

test("詳細ページの重要な補助文と法的注記は13px相当以上にする", () => {
  for (const selector of [
    "\\.occupation-fact__note",
    "\\.daily-schedule__note",
    "\\.creative-ideas-disclaimer",
    "\\.scenario-situations-note",
    "\\.aptitude-list__description",
    "\\.detail-actions__status",
    "\\.publication-dates > div",
    "\\.occupation-detail__disclaimer",
  ]) {
    assert.match(
      stylesheet,
      new RegExp(`${selector}\\s*\\{[\\s\\S]*?font-size:\\s*(?:0\\.8125|0\\.875)rem`),
      `${selector} は0.8125rem以上である必要があります`,
    );
  }
});

test("モバイルメニューは開閉状態と組み合わせて読める安定した名前を持つ", () => {
  assert.match(mobileMenuSource, /<summary role="button" aria-label="サイトメニュー">/);
  assert.doesNotMatch(mobileMenuSource, /aria-label="メニューを開く"/);
});

test("モバイル絞り込みは本文だけをスクロールし、結果操作を下部へ固定する", () => {
  assert.match(stylesheet, /\.filter-dialog\[open\] \{[\s\S]*?grid-template-rows:\s*minmax\(0, 1fr\) auto/);
  assert.match(stylesheet, /\.filter-dialog__body \{[\s\S]*?overflow-y:\s*auto/);
  assert.match(stylesheet, /\.filter-dialog__footer \{[\s\S]*?env\(safe-area-inset-bottom\)/);
});

test("PC用絞り込みパネルは画面内で固定し、内容だけを内部スクロールする", () => {
  const desktopMedia = stylesheet.match(/@media \(min-width: 820px\) \{[\s\S]*?@media \(min-width: 1060px\)/)?.[0];
  assert.ok(desktopMedia, "PC用メディアクエリが必要です");

  const filterRule = desktopMedia.match(/\.filter-panel \{([\s\S]*?)\n  \}/)?.[1];
  assert.ok(filterRule, "PC用絞り込みパネルのCSSルールが必要です");
  assert.match(filterRule, /position:\s*sticky/);
  assert.match(filterRule, /align-self:\s*start/);
  assert.match(filterRule, /max-height:\s*calc\(100dvh - 116px\)/);
  assert.match(filterRule, /overflow-x:\s*hidden/);
  assert.match(filterRule, /overflow-y:\s*auto/);
  assert.match(filterRule, /overscroll-behavior-y:\s*contain/);
  assert.match(filterRule, /scrollbar-gutter:\s*stable/);
});

test("モバイル比較表の横スクロールをページ全体へ伝播させない", () => {
  const explorerLayout = stylesheet.match(
    /\.explorer-layout\s*\{([\s\S]*?)\}/,
  )?.[1];
  const workspace = stylesheet.match(
    /\.occupation-workspace\s*\{([\s\S]*?)\}/,
  )?.[1];
  const constrainedContainers = stylesheet.match(
    /\.explorer-layout > \*,[\s\S]*?\.comparison-panel\s*\{([\s\S]*?)\}/,
  )?.[1];
  const scrollContainer = stylesheet.match(
    /\.comparison-table-scroll\s*\{([\s\S]*?)\}/,
  )?.[1];

  assert.ok(explorerLayout, "検索結果レイアウトのCSSルールが必要です");
  assert.match(explorerLayout, /grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.ok(workspace, "候補・比較ワークスペースのCSSルールが必要です");
  assert.match(workspace, /grid-template-columns:\s*minmax\(0,\s*1fr\)/);

  assert.ok(constrainedContainers, "比較表までのグリッド項目に幅制約が必要です");
  assert.match(constrainedContainers, /min-width:\s*0/);
  assert.match(constrainedContainers, /max-width:\s*100%/);

  assert.ok(scrollContainer, "比較表専用のスクロール領域が必要です");
  assert.match(scrollContainer, /width:\s*100%/);
  assert.match(scrollContainer, /max-width:\s*100%/);
  assert.match(scrollContainer, /overflow-x:\s*auto/);
  assert.match(stylesheet, /\.comparison-table\s*\{[\s\S]*?min-width:\s*620px/);
});
