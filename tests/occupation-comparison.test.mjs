import assert from "node:assert/strict";
import test from "node:test";
import {
  COMPARISON_LIMIT,
  normalizeComparedOccupationSlugs,
  parseComparisonParam,
  setComparisonParam,
  shouldReplaceComparisonUrl,
} from "../app/lib/occupation-comparison.ts";
import { getIncomingFilterSyncAction } from "../app/lib/search.ts";

test("comparison slugs are normalized, deduplicated, and capped at four", () => {
  assert.equal(COMPARISON_LIMIT, 4);
  assert.deepEqual(
    normalizeComparedOccupationSlugs([
      " Doctor ",
      "nurse",
      "doctor",
      "invalid slug",
      "detective",
      "teacher",
      "farmer",
    ]),
    ["doctor", "nurse", "detective", "teacher"],
  );
});

test("parseComparisonParam accepts an optional occupation allow-list", () => {
  const params = new URLSearchParams(
    "q=medical&compare=Doctor,nurse,missing,doctor,detective",
  );

  assert.deepEqual(
    parseComparisonParam(params, ["doctor", "nurse", "detective"]),
    ["doctor", "nurse", "detective"],
  );
  assert.deepEqual(parseComparisonParam(new URLSearchParams("q=medical")), []);
});

test("setComparisonParam preserves other filters and writes a canonical value", () => {
  const params = new URLSearchParams("q=medical&category=medical");
  const returned = setComparisonParam(params, [
    "doctor",
    "nurse",
    "doctor",
    "detective",
    "teacher",
    "farmer",
  ]);

  assert.equal(returned, params);
  assert.equal(params.get("q"), "medical");
  assert.equal(params.get("category"), "medical");
  assert.equal(params.get("compare"), "doctor,nurse,detective,teacher");

  setComparisonParam(params, []);
  assert.equal(params.has("compare"), false);
  assert.equal(params.get("q"), "medical");
});

test("追加URLの反映前に解除しても、遅れて届く追加状態を採用しない", () => {
  let pending = "doctor";
  const superseded = new Set();
  const currentUrlValue = null;
  const desiredSlugs = [];

  assert.equal(
    shouldReplaceComparisonUrl(currentUrlValue, desiredSlugs, pending),
    true,
    "見かけ上URLと一致しても、別の遷移が保留中なら解除URLを再発行する",
  );

  const desiredValue = "";
  superseded.add(pending);
  pending = desiredValue;

  assert.equal(getIncomingFilterSyncAction(pending, "doctor", superseded), "ignore");
  assert.equal(getIncomingFilterSyncAction(pending, desiredValue, superseded), "acknowledge");
  assert.equal(shouldReplaceComparisonUrl(null, desiredSlugs, null), false);
});
