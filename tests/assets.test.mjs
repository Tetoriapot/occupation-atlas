import assert from "node:assert/strict";
import { access, readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const optimizedOgUrl = new URL("../public/og.jpg", import.meta.url);
const legacyOgUrl = new URL("../public/og.png", import.meta.url);

function readJpegDimensions(buffer) {
  assert.equal(buffer[0], 0xff);
  assert.equal(buffer[1], 0xd8);

  const startOfFrameMarkers = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7,
    0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
  ]);
  let offset = 2;

  while (offset + 8 < buffer.length) {
    while (buffer[offset] === 0xff) offset += 1;
    const marker = buffer[offset];
    offset += 1;
    if (marker === 0xd9 || marker === 0xda) break;

    const segmentLength = buffer.readUInt16BE(offset);
    if (startOfFrameMarkers.has(marker)) {
      return {
        height: buffer.readUInt16BE(offset + 3),
        width: buffer.readUInt16BE(offset + 5),
      };
    }
    offset += segmentLength;
  }

  throw new Error("JPEGの寸法情報が見つかりません");
}

test("OG画像は1200×675の軽量JPEGとして共通metadataから配信する", async () => {
  const [image, imageStats, layoutSource, siteSource] = await Promise.all([
    readFile(optimizedOgUrl),
    stat(optimizedOgUrl),
    readFile(`${repositoryRoot}app/layout.tsx`, "utf8"),
    readFile(`${repositoryRoot}app/lib/site.ts`, "utf8"),
  ]);

  assert.deepEqual(readJpegDimensions(image), { width: 1200, height: 675 });
  assert.ok(imageStats.size >= 50_000, "画像が不自然に小さくなっています");
  assert.ok(imageStats.size <= 200_000, `OG画像は200KB以下を目標にします（現在 ${imageStats.size} bytes）`);
  assert.match(layoutSource, /images:\s*\[sharedOpenGraphImage\]/);
  assert.match(siteSource, /url:\s*absoluteUrl\("\/og\.jpg"\)/);
  assert.match(siteSource, /type:\s*"image\/jpeg"/);
  await assert.rejects(access(legacyOgUrl), { code: "ENOENT" });
});
