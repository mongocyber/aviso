#!/usr/bin/env node

import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { join, relative } from "node:path"

const requiredAssets = {
  "store-assets/chrome-web-store/output/icon-128.png": {
    width: 128,
    height: 128,
    type: "png"
  },
  "store-assets/chrome-web-store/output/promo-small-440x280.png": {
    width: 440,
    height: 280,
    type: "png"
  },
  "store-assets/chrome-web-store/output/promo-marquee-1400x560.png": {
    width: 1400,
    height: 560,
    type: "png"
  }
}

if (isDirectRun()) {
  try {
    const report = validateChromeWebStoreAssetMetadata()
    console.log("Chrome Web Store asset metadata passed.")
    for (const [path, asset] of Object.entries(report.assets)) {
      console.log(`ok ${path} ${asset.width}x${asset.height} ${asset.type}`)
    }
    if (report.completedScreenshots.length === 0) {
      console.log("ok no completed screenshot assets are claimed or present")
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

function isDirectRun() {
  return process.argv[1] === fileURLToPath(import.meta.url)
}

export function validateChromeWebStoreAssetMetadata({ rootDir = process.cwd() } = {}) {
  const root = normalizeRoot(rootDir)
  const assetRoot = join(root, "store-assets/chrome-web-store")
  const reportPath = join(assetRoot, "GENERATION_REPORT.md")
  const errors = []

  if (!existsSync(reportPath)) {
    errors.push("missing store-assets/chrome-web-store/GENERATION_REPORT.md")
  }

  const generationReport = existsSync(reportPath)
    ? readFileSync(reportPath, "utf8")
    : ""
  const completed = parseCompletedOutputFiles(generationReport)
  const outputFiles = existsSync(join(assetRoot, "output"))
    ? listFiles(join(assetRoot, "output"))
    : []
  const assets = {}
  const completedScreenshots = []

  for (const [path, expected] of Object.entries(requiredAssets)) {
    const absolute = join(root, path)
    if (!existsSync(absolute)) {
      errors.push(`missing required asset ${path}`)
      continue
    }
    const stat = lstatSync(absolute)
    if ((stat.mode & 0o111) !== 0) {
      errors.push(`executable asset ${path}`)
    }
    const actual = readImageDimensions(absolute)
    if (!actual) {
      errors.push(`unreadable image metadata ${path}`)
      continue
    }
    if (
      actual.width !== expected.width ||
      actual.height !== expected.height ||
      actual.type !== expected.type
    ) {
      errors.push(
        `${path} metadata mismatch: expected ${expected.width}x${expected.height} ${expected.type}, got ${actual.width}x${actual.height} ${actual.type}`
      )
      continue
    }
    assets[path] = actual
  }

  for (const absolute of outputFiles) {
    const path = normalizePath(relative(root, absolute))
    const stat = lstatSync(absolute)
    if ((stat.mode & 0o111) !== 0) {
      errors.push(`executable asset ${path}`)
    }

    if (!/\/screenshot-\d+-.+\.(?:png|jpe?g)$/i.test(path)) {
      continue
    }

    if (!completed.has(path)) {
      errors.push(`unreported screenshot asset ${path}`)
      continue
    }
    if (!/real runtime|runtime UI|browser capture|captured from/i.test(generationReport)) {
      errors.push(`completed screenshot lacks real-runtime provenance ${path}`)
      continue
    }

    const actual = readImageDimensions(absolute)
    if (!actual || actual.width !== 1280 || actual.height !== 800) {
      errors.push(`screenshot metadata mismatch ${path}`)
      continue
    }
    completedScreenshots.push(path)
    assets[path] = actual
  }

  if (errors.length) {
    throw new Error(errors.join("; "))
  }

  return {
    assets,
    completedScreenshots
  }
}

function parseCompletedOutputFiles(markdown) {
  const completed = new Set()
  const rowRegex = /\|\s*`(?<file>output\/[^`]+)`\s*\|\s*[^|]*\|\s*(?<status>Complete)\s*\|/gi
  for (const match of markdown.matchAll(rowRegex)) {
    completed.add(`store-assets/chrome-web-store/${normalizePath(match.groups.file)}`)
  }
  return completed
}

function readImageDimensions(path) {
  const buffer = readFileSync(path)
  if (isPng(buffer)) {
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
      type: "png"
    }
  }
  const jpeg = readJpegDimensions(buffer)
  if (jpeg) {
    return jpeg
  }
  return null
}

function isPng(buffer) {
  return (
    buffer.length >= 24 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  )
}

function readJpegDimensions(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return null
  }

  let offset = 2
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1
      continue
    }

    while (buffer[offset] === 0xff && offset < buffer.length) {
      offset += 1
    }
    const marker = buffer[offset]
    offset += 1
    if (marker === 0xd9 || marker === 0xda) {
      break
    }
    if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      continue
    }
    if (offset + 2 > buffer.length) {
      return null
    }
    const length = buffer.readUInt16BE(offset)
    if (length < 2 || offset + length > buffer.length) {
      return null
    }
    if (
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf)
    ) {
      return {
        height: buffer.readUInt16BE(offset + 3),
        width: buffer.readUInt16BE(offset + 5),
        type: "jpeg"
      }
    }
    offset += length
  }
  return null
}

function listFiles(dir) {
  const files = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const absolute = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...listFiles(absolute))
    } else if (entry.isFile()) {
      files.push(absolute)
    }
  }
  return files
}

function normalizeRoot(rootDir) {
  return rootDir instanceof URL ? fileURLToPath(rootDir) : rootDir
}

function normalizePath(path) {
  return path.replace(/\\/g, "/")
}
