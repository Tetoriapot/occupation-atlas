import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [layoutSource, traySource, selectionToolsSource, workspaceSource, stylesheet] = await Promise.all([
  readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  readFile(
    new URL("../app/components/layout/global-comparison-tray.tsx", import.meta.url),
    "utf8",
  ),
  readFile(
    new URL(
      "../app/components/occupation/occupation-selection-tools.tsx",
      import.meta.url,
    ),
    "utf8",
  ),
  readFile(
    new URL("../app/components/search/occupation-workspace.tsx", import.meta.url),
    "utf8",
  ),
  readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
]);

test("比較トレイは共通レイアウトに1つだけ配置される", () => {
  assert.equal(
    (layoutSource.match(/<GlobalComparisonTray\s*\/>/g) ?? []).length,
    1,
  );
  assert.match(traySource, /useComparedOccupationSlugs\(\)/);
  assert.match(traySource, /clearComparedOccupations/);
  assert.match(traySource, /role="status"/);
  assert.match(traySource, /aria-live="polite"/);
  assert.match(traySource, /比較候補は\{comparisonCount\}件/);
});

test("カードと詳細の候補操作は重複した比較画面リンクを描画しない", () => {
  assert.doesNotMatch(selectionToolsSource, /比較画面を見る/);
  assert.doesNotMatch(selectionToolsSource, /occupation-selection-tools__view/);
  assert.doesNotMatch(selectionToolsSource, /<Link/);
});

test("比較トレイは固定表示・44px操作領域・セーフエリアに対応する", () => {
  assert.match(
    stylesheet,
    /\.global-comparison-tray\s*\{[\s\S]*?position:\s*fixed/,
  );
  assert.match(
    stylesheet,
    /\.global-comparison-tray\s*\{[\s\S]*?env\(safe-area-inset-bottom\)/,
  );
  assert.match(
    stylesheet,
    /\.global-comparison-tray__view,[\s\S]*?\.global-comparison-tray__clear\s*\{[\s\S]*?min-height:\s*44px/,
  );
  assert.match(
    stylesheet,
    /body:has\(\.global-comparison-tray\)\s*\{[\s\S]*?padding-bottom:/,
  );
});

test("比較表は適性だけでなく、カテゴリー・設定・初心者理由・活躍場面を比べられる", () => {
  for (const label of [
    "カテゴリー",
    "時代・地域",
    "初心者評価の理由",
    "活躍しやすい場面",
    "立場・RPの入口",
  ]) {
    assert.match(workspaceSource, new RegExp(label));
  }
  assert.match(workspaceSource, /getEncodedSearchFacetLabels/);
  assert.match(workspaceSource, /getBeginnerEvaluationReason/);
  assert.match(workspaceSource, /searchPreviews\.settingAndScenarios/);
});
