import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const explorerSource = await readFile(
  new URL("../app/components/search/occupation-explorer.tsx", import.meta.url),
  "utf8",
);

test("モバイル絞り込みはネイティブdialogのcancel既定動作で閉じる", () => {
  const cancelHandler = explorerSource.match(
    /onCancel=\{\(\) => \{([\s\S]*?)\n\s*\}\}/,
  )?.[1];

  assert.ok(cancelHandler, "dialogにcancelハンドラーが必要です");
  assert.match(cancelHandler, /restoreFilterFocusRef\.current\s*=\s*true/);
  assert.doesNotMatch(cancelHandler, /preventDefault|closeFilters|\.close\(/);
  assert.match(explorerSource, /dialog\.showModal\(\)/);
  assert.match(explorerSource, /onClose=\{handleFilterDialogClosed\}/);
});

test("ネイティブcancelを発火しない環境でもEscapeで閉じられる", () => {
  assert.match(
    explorerSource,
    /onKeyDown=\{\(event\) => \{[\s\S]*?event\.key !== "Escape"[\s\S]*?event\.preventDefault\(\);[\s\S]*?closeFilters\(\);/,
  );
  assert.match(explorerSource, /event\.nativeEvent\.isComposing/);
});

test("dialogの初期・復帰フォーカスとデスクトップ移行時の扱いを保持する", () => {
  assert.match(explorerSource, /className="filter-close"[\s\S]*?autoFocus/);
  assert.match(explorerSource, /trigger\.focus\(\{ preventScroll: true \}\)/);
  assert.match(explorerSource, /restoreFilterFocusRef\.current\s*=\s*false;[\s\S]*?dialog\.close\(\)/);
});

test("キーボードやTalkBackによる子要素のclickを背景クリックと誤判定しない", () => {
  assert.match(explorerSource, /onClick=\{\(event\) => \{\s*if \(event\.target !== event\.currentTarget\) return;/);
});

test("モバイル絞り込みの固定結果ボタンは閉じた後に結果件数へフォーカスする", () => {
  assert.match(explorerSource, /className="filter-dialog__body"/);
  assert.match(explorerSource, /className="filter-dialog__footer"/);
  assert.match(explorerSource, /結果を見る/);
  assert.match(explorerSource, /function showFilteredResults\(\)[\s\S]*?closeFilters\(false\)[\s\S]*?resultsStatusRef\.current\?\.focus\(\)/);
  assert.match(explorerSource, /ref=\{resultsStatusRef\}[\s\S]*?tabIndex=\{-1\}/);
});

test("診断と比較のURL同期も遅れて届いた古い遷移を採用しない", () => {
  assert.match(explorerSource, /pendingDiagnosisParamStringRef/);
  assert.match(explorerSource, /supersededDiagnosisParamStringsRef/);
  assert.match(explorerSource, /pendingComparisonParamStringRef/);
  assert.match(explorerSource, /supersededComparisonParamStringsRef/);
  assert.match(
    explorerSource,
    /getIncomingFilterSyncAction\(\s*pendingDiagnosisParamStringRef\.current/,
  );
  assert.match(
    explorerSource,
    /getIncomingFilterSyncAction\(\s*pendingComparisonParamStringRef\.current/,
  );
});

test("正規化フィルターは選択状態が変わってもdetailsを再生成せずフォーカスを保つ", () => {
  assert.ok(
    explorerSource.includes('key={`${location}-${group.key}`}'),
    "フィルターグループのkeyは選択数に依存させません",
  );
  assert.match(
    explorerSource,
    /const \[isOpen, setIsOpen\] = useState\(selectedValues\.length > 0\)/,
  );
  assert.match(
    explorerSource,
    /<details[\s\S]*?open=\{isOpen \|\| selectedValues\.length > 0\}[\s\S]*?onToggle=\{\(event\) => setIsOpen\(event\.currentTarget\.open\)\}/,
  );
  assert.doesNotMatch(
    explorerSource,
    /key=\{`\$\{location\}-\$\{group\.key\}-\$\{selectedValues\.length/,
  );
  assert.doesNotMatch(
    explorerSource,
    /open=\{selectedValues\.length > 0 \? true : undefined\}/,
    "最後の選択解除時も操作中のdetailsを強制的に閉じません",
  );
});
