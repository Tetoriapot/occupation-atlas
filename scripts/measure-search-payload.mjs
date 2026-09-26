import {
  createOccupationSearchBaseRecords,
  createOccupationSearchIndex,
  createOccupationSearchRecords,
} from "../app/lib/search.ts";
import { loadOccupationFiles } from "./data-tools.mjs";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const fullOccupations = (await loadOccupationFiles(repositoryRoot)).map(({ value }) => value);
const searchRecords = createOccupationSearchRecords(fullOccupations);
const initialSearchRecords = createOccupationSearchBaseRecords(fullOccupations);
const lazySearchIndex = createOccupationSearchIndex(fullOccupations);
const fullJson = JSON.stringify(fullOccupations);
const searchJson = JSON.stringify(searchRecords);
const initialSearchJson = JSON.stringify(initialSearchRecords);
const lazySearchIndexJson = JSON.stringify(lazySearchIndex);
const fullBytes = Buffer.byteLength(fullJson);
const searchBytes = Buffer.byteLength(searchJson);
const initialSearchBytes = Buffer.byteLength(initialSearchJson);
const lazySearchIndexBytes = Buffer.byteLength(lazySearchIndexJson);
const fullGzipBytes = gzipSync(fullJson).byteLength;
const searchGzipBytes = gzipSync(searchJson).byteLength;
const initialSearchGzipBytes = gzipSync(initialSearchJson).byteLength;
const lazySearchIndexGzipBytes = gzipSync(lazySearchIndexJson).byteLength;

console.log(
  JSON.stringify(
    {
      count: fullOccupations.length,
      fullBytes,
      previousInitialSearchBytes: searchBytes,
      initialSearchBytes,
      lazySearchIndexBytes,
      initialReductionFromPreviousPercent: Number(
        ((1 - initialSearchBytes / searchBytes) * 100).toFixed(1),
      ),
      searchBytes,
      savedBytes: fullBytes - searchBytes,
      reductionPercent: Number(((1 - searchBytes / fullBytes) * 100).toFixed(1)),
      fullGzipBytes,
      previousInitialSearchGzipBytes: searchGzipBytes,
      initialSearchGzipBytes,
      lazySearchIndexGzipBytes,
      initialGzipReductionFromPreviousPercent: Number(
        ((1 - initialSearchGzipBytes / searchGzipBytes) * 100).toFixed(1),
      ),
      searchGzipBytes,
      gzipReductionPercent: Number(((1 - searchGzipBytes / fullGzipBytes) * 100).toFixed(1)),
    },
    null,
    2,
  ),
);
