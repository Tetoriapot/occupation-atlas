import assert from "node:assert/strict";
import test from "node:test";
import {
  formatJapaneseDateLabel,
  getDailyOccupationIndex,
  getTokyoDateKey,
} from "../app/components/home/daily-occupation-selection.ts";

const MILLISECONDS_PER_DAY = 86_400_000;

function dateKeyFromEpochDay(epochDay) {
  return new Date(epochDay * MILLISECONDS_PER_DAY).toISOString().slice(0, 10);
}

test("Asia/Tokyoの日付境界を正しく求める", () => {
  assert.equal(getTokyoDateKey(new Date("2026-07-16T14:59:59.999Z")), "2026-07-16");
  assert.equal(getTokyoDateKey(new Date("2026-07-16T15:00:00.000Z")), "2026-07-17");
  assert.equal(getTokyoDateKey(new Date("2026-12-31T15:00:00.000Z")), "2027-01-01");
});

test("同じ日付と掲載件数では常に同じ位置を選ぶ", () => {
  const first = getDailyOccupationIndex("2026-07-17", 50);
  const second = getDailyOccupationIndex("2026-07-17", 50);

  assert.equal(first, second);
  assert.ok(first >= 0 && first < 50);
});

test("複数年にわたり連続日で同じ職業を選ばない", () => {
  for (const occupationCount of [2, 3, 7, 50]) {
    let previous;
    for (let epochDay = 18_262; epochDay < 20_819; epochDay += 1) {
      const current = getDailyOccupationIndex(dateKeyFromEpochDay(epochDay), occupationCount);
      if (previous !== undefined) assert.notEqual(current, previous);
      previous = current;
    }
  }
});

test("件数日ごとのブロック内で全職業を1回ずつ選ぶ", () => {
  for (const occupationCount of [2, 3, 7, 50]) {
    const blockIndex = 500;
    const indexes = Array.from({ length: occupationCount }, (_, offset) =>
      getDailyOccupationIndex(
        dateKeyFromEpochDay(blockIndex * occupationCount + offset),
        occupationCount,
      ),
    );

    assert.deepEqual(
      [...indexes].sort((left, right) => left - right),
      Array.from({ length: occupationCount }, (_, index) => index),
    );
  }
});

test("1件だけの場合は常に唯一の位置を選ぶ", () => {
  assert.equal(getDailyOccupationIndex("2026-07-17", 1), 0);
  assert.equal(getDailyOccupationIndex("2030-01-01", 1), 0);
});

test("日付ラベルを日本語の曜日付きで表示する", () => {
  assert.equal(formatJapaneseDateLabel("2026-07-17"), "2026年7月17日（金）");
});

test("不正な日付や掲載件数を黙って受け入れない", () => {
  assert.throws(() => getDailyOccupationIndex("2026-02-30", 50), RangeError);
  assert.throws(() => getDailyOccupationIndex("2026/07/17", 50), RangeError);
  assert.throws(() => getDailyOccupationIndex("2026-07-17", 0), RangeError);
  assert.throws(() => getDailyOccupationIndex("2026-07-17", -1), RangeError);
  assert.throws(() => getDailyOccupationIndex("2026-07-17", 1.5), RangeError);
  assert.throws(() => getDailyOccupationIndex("2026-07-17", Number.NaN), RangeError);
  assert.throws(() => getDailyOccupationIndex("2026-07-17", Number.MAX_VALUE), RangeError);
  assert.throws(() => getTokyoDateKey(new Date("invalid")), RangeError);
});
