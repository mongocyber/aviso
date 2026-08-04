import assert from "node:assert/strict"
import { Buffer } from "node:buffer"
import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"

import {
  validateChromeWebStoreAssetMetadata
} from "../scripts/check-cws-assets.mjs"

const repoRoot = new URL("..", import.meta.url)

test("current Chrome Web Store asset metadata has no unverified screenshot files", () => {
  const report = validateChromeWebStoreAssetMetadata({ rootDir: repoRoot })

  assert.deepEqual(report.completedScreenshots, [])
  assert.equal(report.assets["store-assets/chrome-web-store/output/icon-128.png"].width, 128)
  assert.equal(report.assets["store-assets/chrome-web-store/output/icon-128.png"].height, 128)
  assert.equal(report.assets["store-assets/chrome-web-store/output/promo-small-440x280.png"].width, 440)
  assert.equal(report.assets["store-assets/chrome-web-store/output/promo-small-440x280.png"].height, 280)
  assert.equal(report.assets["store-assets/chrome-web-store/output/promo-marquee-1400x560.png"].width, 1400)
  assert.equal(report.assets["store-assets/chrome-web-store/output/promo-marquee-1400x560.png"].height, 560)
})

test("asset metadata validation rejects executable assets and unreported screenshots", () => {
  const root = mkdtempSync(join(tmpdir(), "aviso-cws-assets-"))
  mkdirSync(join(root, "store-assets/chrome-web-store/output/zh"), { recursive: true })
  writeFileSync(
    join(root, "store-assets/chrome-web-store/GENERATION_REPORT.md"),
    [
      "# Chrome Web Store Asset Generation Report",
      "",
      "| File | Size | Status | Notes |",
      "| --- | --- | --- | --- |",
      "| `output/icon-128.png` | 128x128 | Complete | Derived from source icon. |",
      ""
    ].join("\n")
  )
  writeFileSync(
    join(root, "store-assets/chrome-web-store/output/icon-128.png"),
    pngHeader(128, 128)
  )
  writeFileSync(
    join(root, "store-assets/chrome-web-store/output/zh/screenshot-01-selection-toolbar-1280x800.jpg"),
    jpegHeader(1280, 800)
  )
  chmodSync(join(root, "store-assets/chrome-web-store/output/icon-128.png"), 0o755)

  assert.throws(
    () => validateChromeWebStoreAssetMetadata({ rootDir: root }),
    /executable|unreported screenshot/
  )
})

function pngHeader(width: number, height: number): Buffer {
  const buffer = Buffer.alloc(33)
  Buffer.from("89504e470d0a1a0a", "hex").copy(buffer, 0)
  buffer.writeUInt32BE(13, 8)
  buffer.write("IHDR", 12, 4, "ascii")
  buffer.writeUInt32BE(width, 16)
  buffer.writeUInt32BE(height, 20)
  return buffer
}

function jpegHeader(width: number, height: number): Buffer {
  return Buffer.from([
    0xff, 0xd8,
    0xff, 0xc0,
    0x00, 0x11,
    0x08,
    (height >> 8) & 0xff,
    height & 0xff,
    (width >> 8) & 0xff,
    width & 0xff,
    0x03
  ])
}
