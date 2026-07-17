import { createHash } from "node:crypto"
import { existsSync, readdirSync, readFileSync } from "node:fs"
import { basename } from "node:path"
import { pathToFileURL } from "node:url"
import { inflateRawSync } from "node:zlib"

export const expectedPermissions = [
  "contextMenus",
  "activeTab",
  "storage",
  "history",
  "bookmarks",
  "identity",
  "clipboardWrite"
]

export const expectedHostPermissions = [
  "https://api.openai.com/*",
  "https://api.anthropic.com/*",
  "https://ark.cn-beijing.volces.com/*",
  "https://api.deepseek.com/*",
  "https://api.moonshot.cn/*",
  "https://openrouter.ai/*",
  "https://generativelanguage.googleapis.com/*",
  "https://api.hunyuan.cloud.tencent.com/*",
  "https://aviso-backend-production.vercel.app/*"
]

const approvedMaximumMatches = ["<all_urls>"]

const expectedSourceContentScripts = [
  {
    name: "clipboard",
    plasmoPath: "src/contents/clipboard.tsx",
    wxtPath: "src/entrypoints/clipboard.content.tsx",
    allFrames: true,
    reason:
      "iframe clipboard toast and copy-current-context writer remain user-triggered; passive copy listener defaults off"
  },
  {
    name: "command",
    plasmoPath: "src/contents/command.tsx",
    wxtPath: "src/entrypoints/command.content.tsx",
    allFrames: false
  },
  {
    name: "double-click-menu",
    plasmoPath: "src/contents/double-click-menu.tsx",
    wxtPath: "src/entrypoints/double-click-menu.content.tsx",
    allFrames: true,
    reason: "optional iframe double-click menu is user-triggered and defaults off"
  },
  {
    name: "floating",
    plasmoPath: "src/contents/floating.tsx",
    wxtPath: "src/entrypoints/floating.content.tsx",
    allFrames: false
  },
  {
    name: "frame-bridge",
    plasmoPath: "src/contents/frame-bridge.ts",
    wxtPath: "src/entrypoints/frame-bridge.content.ts",
    allFrames: true,
    runAt: "document_start",
    reason: "iframe shortcut bridge needs to hear keydown inside focused frames"
  },
  {
    name: "readability",
    plasmoPath: "src/contents/readability.ts",
    wxtPath: "src/entrypoints/readability.content.ts",
    allFrames: true,
    runAt: "document_idle",
    reason: "user-triggered page/editable extraction must target the source frame"
  },
  {
    name: "screenshot",
    plasmoPath: "src/contents/screenshot.tsx",
    wxtPath: "src/entrypoints/screenshot.content.ts",
    allFrames: false
  },
  {
    name: "toolbar",
    plasmoPath: "src/contents/toolbar.tsx",
    wxtPath: "src/entrypoints/toolbar.content.tsx",
    allFrames: true,
    reason: "iframe user-triggered selection toolbar and inline translation must work"
  }
]

const chromeWebStorePublicKeyPath = "config/chrome-web-store-public-key.txt"
const expectedChromeWebStoreExtensionId = "phigblobbahhecgbcifmkamglcdnghcg"
const zipEncryptedFlag = 0x0001
const zipDataDescriptorFlag = 0x0008
const zipUtf8NamesFlag = 0x0800
const supportedZipGeneralPurposeFlags = zipUtf8NamesFlag
const maxManifestCompressedSize = 256 * 1024
const maxManifestUncompressedSize = 1024 * 1024
const maxManifestCompressionRatio = 100

const generatedManifestRefs = {
  plasmo: {
    label: "Plasmo generated manifest",
    path: "build/manifest-evidence/plasmo-manifest.json"
  },
  wxt: {
    label: "Intermediate WXT build",
    path: ".output/chrome-mv3/manifest.json"
  },
  canonical: {
    label: "Canonical release candidate",
    path: "build/chrome-mv3-prod/manifest.json"
  },
  zip: {
    label: "Canonical release candidate zip",
    path: "build/chrome-mv3-prod.zip",
    type: "zip"
  }
}

export function runManifestChecks() {
  const failures = []

  failures.push(...checkSourceManifestConfigs())
  const sourceResult = checkSourceContentScripts()
  failures.push(...sourceResult.failures)
  const expectedVersion = readExpectedPackageVersion({ failures })

  const generated = readGeneratedManifests()
  failures.push(...generated.failures)
  if (generated.manifests) {
    failures.push(
      ...compareGeneratedManifestSemantics({
        ...generated.manifests,
        contentScripts: sourceResult.contentScripts,
        expectedPermissions,
        expectedHostPermissions,
        expectedVersion,
        expectedChromeWebStoreExtensionId,
        publicKey: readChromeWebStorePublicKey({ failSoft: true, failures })
      })
    )
  }

  return failures
}

export function compareGeneratedManifestSemantics({
  plasmo,
  wxt,
  canonical,
  zip,
  contentScripts,
  expectedPermissions,
  expectedHostPermissions,
  expectedVersion,
  expectedChromeWebStoreExtensionId,
  publicKey
}) {
  const failures = []

  failures.push(
    ...checkGeneratedManifestBase({
      label: "Plasmo generated manifest",
      manifest: plasmo,
      expectedPermissions,
      expectedHostPermissions,
      expectedVersion,
      expectedTool: "plasmo"
    })
  )
  failures.push(
    ...checkGeneratedManifestBase({
      label: "Intermediate WXT build",
      manifest: wxt,
      expectedPermissions,
      expectedHostPermissions,
      expectedVersion,
      expectedTool: "wxt"
    })
  )
  failures.push(
    ...checkGeneratedManifestBase({
      label: "Canonical release candidate",
      manifest: canonical,
      expectedPermissions,
      expectedHostPermissions,
      expectedVersion,
      expectedTool: "wxt"
    })
  )
  failures.push(
    ...checkGeneratedManifestBase({
      label: "Canonical release candidate zip",
      manifest: zip,
      expectedPermissions,
      expectedHostPermissions,
      expectedVersion,
      expectedTool: "wxt"
    })
  )

  for (const [label, manifest] of [
    ["Plasmo generated manifest", plasmo],
    ["Intermediate WXT build", wxt],
    ["Canonical release candidate", canonical],
    ["Canonical release candidate zip", zip]
  ]) {
    failures.push(
      ...validateContentScriptManifestParity({
        label,
        manifest,
        contentScripts,
        approvedMaximumMatches
      })
    )
  }

  for (const [label, manifest] of [
    ["Canonical release candidate", canonical],
    ["Canonical release candidate zip", zip]
  ]) {
    checkCanonicalManifestKey({
      failures,
      label,
      manifest,
      publicKey,
      expectedChromeWebStoreExtensionId
    })
  }

  return failures
}

export function validateContentScriptManifestParity({
  label,
  manifest,
  contentScripts,
  approvedMaximumMatches
}) {
  const failures = []
  const expectedNames = contentScripts.map((script) => script.name)
  expectArray(failures, `${label}: content script set`, contentScriptNames(manifest), expectedNames)

  const manifestScripts = manifest.content_scripts ?? []
  for (const expected of contentScripts) {
    const scriptConfig = findContentScriptConfig(manifestScripts, expected.name)
    if (!scriptConfig) {
      failures.push(`${label}: missing ${expected.name} content script config`)
      continue
    }

    const matches = scriptConfig.matches ?? []
    expectArray(failures, `${label}: ${expected.name} matches`, matches, expected.matches)
    for (const match of matches) {
      if (!isWithinApprovedMatchBoundary(match, approvedMaximumMatches)) {
        failures.push(
          `${label}: ${expected.name} match ${JSON.stringify(match)} exceeds approved maximum ${JSON.stringify(approvedMaximumMatches)}`
        )
      }
    }

    expectEqual(
      failures,
      `${label}: ${expected.name} all_frames`,
      scriptConfig.all_frames ?? false,
      expected.allFrames
    )

    const actualRunAt = scriptConfig.run_at ?? "document_idle"
    const expectedRunAt = expected.runAt ?? "document_idle"
    expectEqual(
      failures,
      `${label}: ${expected.name} run_at`,
      actualRunAt,
      expectedRunAt
    )

    const actualWorld = scriptConfig.world ?? "ISOLATED"
    const expectedWorld = expected.world ?? "ISOLATED"
    expectEqual(
      failures,
      `${label}: ${expected.name} world`,
      actualWorld,
      expectedWorld
    )
  }

  return failures
}

function checkSourceManifestConfigs() {
  const failures = []
  if (!existsSync("package.json")) {
    failures.push("Plasmo source manifest: missing package.json")
    return failures
  }

  const pkg = JSON.parse(readFileSync("package.json", "utf8"))
  const plasmoManifest = pkg.manifest ?? {}

  expectEqual(failures, "Plasmo source manifest: name", plasmoManifest.name, "Aviso")
  expectEqual(
    failures,
    "Plasmo source manifest: default_locale",
    plasmoManifest.default_locale,
    "zh_CN"
  )
  expectEqual(
    failures,
    "Plasmo source manifest: description",
    plasmoManifest.description,
    "__MSG_app_description__"
  )
  expectArray(
    failures,
    "Plasmo source manifest: permissions",
    plasmoManifest.permissions,
    expectedPermissions
  )
  expectArray(
    failures,
    "Plasmo source manifest: host_permissions",
    plasmoManifest.host_permissions,
    expectedHostPermissions
  )
  expectCommandSemantics(failures, "Plasmo source manifest", plasmoManifest)

  if (!existsSync("wxt.config.ts")) {
    failures.push("WXT source manifest: missing wxt.config.ts")
    return failures
  }

  const wxtSource = readFileSync("wxt.config.ts", "utf8")
  expectIncludes(failures, "WXT source manifest: name", wxtSource, 'name: "Aviso"')
  expectIncludes(
    failures,
    "WXT source manifest: default_locale",
    wxtSource,
    'default_locale: "zh_CN"'
  )
  expectIncludes(
    failures,
    "WXT source manifest: description",
    wxtSource,
    'description: "__MSG_app_description__"'
  )
  expectArray(
    failures,
    "WXT source manifest: permissions",
    extractStringArrayProperty(wxtSource, "permissions", failures),
    expectedPermissions
  )
  expectArray(
    failures,
    "WXT source manifest: host_permissions",
    extractStringArrayProperty(wxtSource, "host_permissions", failures),
    expectedHostPermissions
  )
  expectIncludes(
    failures,
    "WXT source manifest: command default key",
    wxtSource,
    'default: "Ctrl+Shift+Space"'
  )
  expectIncludes(
    failures,
    "WXT source manifest: command mac key",
    wxtSource,
    'mac: "Command+Shift+Space"'
  )
  expectIncludes(
    failures,
    "WXT source manifest: command description",
    wxtSource,
    'description: "__MSG_open_command_palette_description__"'
  )

  return failures
}

function checkSourceContentScripts() {
  const failures = []
  const expectedNames = expectedSourceContentScripts.map((script) => script.name)
  expectArray(
    failures,
    "Plasmo source content script set",
    sourceContentScriptNames("src/contents", "plasmo"),
    expectedNames
  )
  expectArray(
    failures,
    "WXT source content script set",
    sourceContentScriptNames("src/entrypoints", "wxt"),
    expectedNames
  )

  const contentScripts = []
  for (const expected of expectedSourceContentScripts) {
    const result = checkSourceContentScript(expected)
    failures.push(...result.failures)
    if (result.policy) contentScripts.push(result.policy)
  }

  return { failures, contentScripts }
}

function checkSourceContentScript(expected) {
  const failures = []
  if (!existsSync(expected.plasmoPath)) {
    failures.push(`Plasmo source content script ${expected.name}: missing ${expected.plasmoPath}`)
    return { failures }
  }
  if (!existsSync(expected.wxtPath)) {
    failures.push(`WXT source content script ${expected.name}: missing ${expected.wxtPath}`)
    return { failures }
  }

  const plasmoSource = readFileSync(expected.plasmoPath, "utf8")
  const wxtSource = readFileSync(expected.wxtPath, "utf8")
  const plasmoMatches = extractStringArrayProperty(plasmoSource, "matches", failures)
  const wxtMatches = extractStringArrayProperty(wxtSource, "matches", failures)
  const plasmoAllFrames = extractBooleanProperty(plasmoSource, "all_frames", failures)
  const wxtAllFrames = extractBooleanProperty(wxtSource, "allFrames", failures)
  const plasmoRunAt = extractStringProperty(plasmoSource, "run_at")
  const wxtRunAt = extractStringProperty(wxtSource, "runAt")

  expectArray(
    failures,
    `Source content script ${expected.name}: Plasmo/WXT matches parity`,
    plasmoMatches,
    wxtMatches
  )
  for (const match of plasmoMatches) {
    if (!isWithinApprovedMatchBoundary(match, approvedMaximumMatches)) {
      failures.push(
        `Source content script ${expected.name}: match ${JSON.stringify(match)} exceeds approved maximum ${JSON.stringify(approvedMaximumMatches)}`
      )
    }
  }
  expectEqual(
    failures,
    `Plasmo source content script ${expected.name}: all_frames`,
    plasmoAllFrames,
    expected.allFrames
  )
  expectEqual(
    failures,
    `WXT source content script ${expected.name}: allFrames`,
    wxtAllFrames,
    expected.allFrames
  )

  const expectedRunAt = expected.runAt ?? "document_idle"
  expectEqual(
    failures,
    `Plasmo source content script ${expected.name}: run_at`,
    plasmoRunAt ?? "document_idle",
    expectedRunAt
  )
  expectEqual(
    failures,
    `WXT source content script ${expected.name}: runAt`,
    wxtRunAt ?? "document_idle",
    expectedRunAt
  )

  return {
    failures,
    policy: {
      name: expected.name,
      matches: plasmoMatches,
      allFrames: expected.allFrames,
      runAt: expected.runAt,
      world: expected.world
    }
  }
}

function readGeneratedManifests() {
  const failures = []
  const manifests = {}
  for (const [key, ref] of Object.entries(generatedManifestRefs)) {
    if (!existsSync(ref.path)) {
      failures.push(missingGeneratedManifestMessage(ref))
      continue
    }
    try {
      manifests[key] =
        ref.type === "zip"
          ? readManifestFromZip(ref.path, ref.label)
          : JSON.parse(readFileSync(ref.path, "utf8"))
    } catch (error) {
      failures.push(error instanceof Error ? error.message : `${ref.label}: failed to read manifest`)
    }
  }

  return {
    failures,
    manifests:
      manifests.plasmo && manifests.wxt && manifests.canonical && manifests.zip
        ? {
            plasmo: manifests.plasmo,
            wxt: manifests.wxt,
            canonical: manifests.canonical,
            zip: manifests.zip
          }
        : null
  }
}

function missingGeneratedManifestMessage(ref) {
  if (ref.type === "zip") {
    return `${ref.label}: missing ${ref.path}; run npm run package to regenerate the final directory and zip`
  }
  return `${ref.label}: missing ${ref.path}; run npm run build:plasmo before npm run package, then rerun manifest checks`
}

function checkGeneratedManifestBase({
  label,
  manifest,
  expectedPermissions,
  expectedHostPermissions,
  expectedVersion,
  expectedTool
}) {
  const failures = []
  expectEqual(failures, `${label}: manifest_version`, manifest.manifest_version, 3)
  if (expectedVersion) {
    expectEqual(failures, `${label}: version`, manifest.version, expectedVersion)
  }
  expectEqual(failures, `${label}: name`, manifest.name, "Aviso")
  expectEqual(failures, `${label}: default_locale`, manifest.default_locale, "zh_CN")
  expectEqual(
    failures,
    `${label}: description`,
    manifest.description,
    "__MSG_app_description__"
  )
  expectArray(failures, `${label}: permissions`, manifest.permissions, expectedPermissions)
  expectArray(
    failures,
    `${label}: host_permissions`,
    manifest.host_permissions,
    expectedHostPermissions
  )
  expectEqual(
    failures,
    `${label}: action.default_popup`,
    manifest.action?.default_popup,
    "popup.html"
  )
  expectCommandSemantics(failures, label, manifest)

  const tool = detectGeneratedManifestTool(manifest)
  if (expectedTool === "plasmo" && tool !== "plasmo") {
    failures.push(
      `${label}: expected real Plasmo generated manifest, got ${tool === "wxt" ? "WXT output" : "unknown output"}`
    )
  }
  if (expectedTool === "wxt" && tool !== "wxt") {
    failures.push(
      `${label}: expected WXT output, got ${tool === "plasmo" ? "Plasmo generated manifest" : "unknown output"}`
    )
  }

  if (!manifest.background?.service_worker) {
    failures.push(`${label}: missing background service_worker`)
  }

  return failures
}

function checkCanonicalManifestKey({
  failures,
  label,
  manifest,
  publicKey,
  expectedChromeWebStoreExtensionId
}) {
  if (!manifest.key) {
    failures.push(
      `${label}: missing manifest key; run npm run package to inject the Chrome Web Store public key`
    )
    return
  }

  if (publicKey && manifest.key !== publicKey) {
    failures.push(
      `${label}: manifest key is present but does not match the configured Chrome Web Store public key`
    )
  }

  if (expectedChromeWebStoreExtensionId) {
    const extensionId = extensionIdFromPublicKey(manifest.key)
    expectEqual(
      failures,
      `${label}: derived extension ID`,
      extensionId,
      expectedChromeWebStoreExtensionId
    )
  }
}

function readExpectedPackageVersion({ failures }) {
  if (!existsSync("package.json")) {
    return ""
  }

  try {
    const pkg = JSON.parse(readFileSync("package.json", "utf8"))
    if (!pkg.version) {
      failures.push("Package metadata: missing package.json version")
      return ""
    }
    return pkg.version
  } catch {
    failures.push("Package metadata: package.json is invalid JSON")
    return ""
  }
}

function readManifestFromZip(zipPath, label) {
  const buffer = readFileSync(zipPath)
  const entries = readZipCentralDirectory(buffer, label).map((entry) => ({
    ...entry,
    ...normalizeZipEntryName(entry.name, label)
  }))

  const nestedManifestEntries = entries.filter(
    (entry) => !entry.isDirectory && basename(entry.normalizedName) === "manifest.json" && entry.normalizedName !== "manifest.json"
  )
  if (nestedManifestEntries.length) {
    throw new Error(
      `${label}: ambiguous manifest entries; expected only manifest.json at zip root, found ${nestedManifestEntries.map((entry) => JSON.stringify(entry.name)).join(", ")}`
    )
  }

  const rootManifestEntries = entries.filter(
    (entry) => !entry.isDirectory && entry.normalizedName === "manifest.json"
  )
  if (!rootManifestEntries.length) {
    throw new Error(`${label}: missing manifest.json at zip root`)
  }
  if (rootManifestEntries.length > 1) {
    throw new Error(`${label}: duplicate manifest.json entry in zip`)
  }

  const manifestText = readZipEntryText(buffer, rootManifestEntries[0], label)
  try {
    return JSON.parse(manifestText)
  } catch {
    throw new Error(`${label}: manifest.json is invalid JSON`)
  }
}

function readZipCentralDirectory(buffer, label) {
  const eocdOffset = findEndOfCentralDirectory(buffer)
  if (eocdOffset === -1) {
    throw new Error(`${label}: invalid zip; missing end of central directory`)
  }

  const diskNumber = buffer.readUInt16LE(eocdOffset + 4)
  const centralDirectoryDisk = buffer.readUInt16LE(eocdOffset + 6)
  const entriesOnDisk = buffer.readUInt16LE(eocdOffset + 8)
  const entryCount = buffer.readUInt16LE(eocdOffset + 10)
  const centralDirectorySize = buffer.readUInt32LE(eocdOffset + 12)
  const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16)

  if (diskNumber !== 0 || centralDirectoryDisk !== 0 || entriesOnDisk !== entryCount) {
    throw new Error(`${label}: unsupported multi-disk zip`)
  }
  if (
    entryCount === 0xffff ||
    centralDirectorySize === 0xffffffff ||
    centralDirectoryOffset === 0xffffffff
  ) {
    throw new Error(`${label}: unsupported Zip64 archive`)
  }
  if (
    centralDirectoryOffset > eocdOffset ||
    centralDirectorySize > eocdOffset - centralDirectoryOffset
  ) {
    throw new Error(`${label}: invalid zip central directory bounds`)
  }

  const entries = []
  let cursor = centralDirectoryOffset
  for (let index = 0; index < entryCount; index += 1) {
    if (cursor + 46 > eocdOffset) {
      throw new Error(`${label}: truncated zip central directory`)
    }
    if (buffer.readUInt32LE(cursor) !== 0x02014b50) {
      throw new Error(`${label}: invalid zip central directory header`)
    }

    const versionNeeded = buffer.readUInt16LE(cursor + 6)
    const flags = buffer.readUInt16LE(cursor + 8)
    const compressionMethod = buffer.readUInt16LE(cursor + 10)
    const crc = buffer.readUInt32LE(cursor + 16)
    const compressedSize = buffer.readUInt32LE(cursor + 20)
    const uncompressedSize = buffer.readUInt32LE(cursor + 24)
    const nameLength = buffer.readUInt16LE(cursor + 28)
    const extraLength = buffer.readUInt16LE(cursor + 30)
    const commentLength = buffer.readUInt16LE(cursor + 32)
    const localHeaderOffset = buffer.readUInt32LE(cursor + 42)
    const nameStart = cursor + 46
    const nameEnd = nameStart + nameLength
    const nextCursor = nameEnd + extraLength + commentLength

    if (nextCursor > eocdOffset) {
      throw new Error(`${label}: truncated zip central directory`)
    }
    if (
      versionNeeded >= 45 ||
      compressedSize === 0xffffffff ||
      uncompressedSize === 0xffffffff ||
      localHeaderOffset === 0xffffffff
    ) {
      throw new Error(`${label}: unsupported Zip64 archive`)
    }
    const centralExtra = buffer.subarray(nameEnd, nameEnd + extraLength)
    if (hasZip64ExtraField(centralExtra, label)) {
      throw new Error(`${label}: unsupported Zip64 archive`)
    }

    entries.push({
      name: buffer.toString("utf8", nameStart, nameEnd),
      flags,
      compressionMethod,
      crc,
      compressedSize,
      uncompressedSize,
      localHeaderOffset,
      archiveDataEnd: centralDirectoryOffset
    })
    cursor = nextCursor
  }

  if (cursor !== centralDirectoryOffset + centralDirectorySize) {
    throw new Error(`${label}: invalid zip central directory size`)
  }

  return entries
}

function findEndOfCentralDirectory(buffer) {
  const minimumSize = 22
  const maximumCommentSize = 0xffff
  if (buffer.length < minimumSize) return -1

  const minimumOffset = Math.max(0, buffer.length - minimumSize - maximumCommentSize)

  for (let offset = buffer.length - minimumSize; offset >= minimumOffset; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      return offset
    }
  }

  return -1
}

function normalizeZipEntryName(name, label) {
  if (
    !name ||
    name.includes("\0") ||
    name.includes("\\") ||
    name.startsWith("/") ||
    /^[A-Za-z]:/.test(name)
  ) {
    throw new Error(`${label}: unsafe zip entry path ${JSON.stringify(name)}`)
  }

  const isDirectory = name.endsWith("/")
  const rawParts = name.split("/")
  const parts = isDirectory ? rawParts.slice(0, -1) : rawParts
  if (!parts.length || parts.some((part) => !part || part === "." || part === "..")) {
    throw new Error(`${label}: unsafe zip entry path ${JSON.stringify(name)}`)
  }

  return {
    normalizedName: parts.join("/"),
    isDirectory
  }
}

function readZipEntryText(buffer, entry, label) {
  assertSupportedManifestZipFlags(entry.flags, label)
  assertSupportedManifestCompressionMethod(entry.compressionMethod, label)
  assertManifestSizeLimits(entry, label)

  const localHeaderOffset = entry.localHeaderOffset
  if (localHeaderOffset + 30 > buffer.length) {
    throw new Error(`${label}: truncated manifest local header`)
  }
  if (buffer.readUInt32LE(localHeaderOffset) !== 0x04034b50) {
    throw new Error(`${label}: invalid manifest local header offset`)
  }

  const localVersionNeeded = buffer.readUInt16LE(localHeaderOffset + 4)
  const localFlags = buffer.readUInt16LE(localHeaderOffset + 6)
  const localCompressionMethod = buffer.readUInt16LE(localHeaderOffset + 8)
  const localCrc = buffer.readUInt32LE(localHeaderOffset + 14)
  const localCompressedSize = buffer.readUInt32LE(localHeaderOffset + 18)
  const localUncompressedSize = buffer.readUInt32LE(localHeaderOffset + 22)
  const nameLength = buffer.readUInt16LE(localHeaderOffset + 26)
  const extraLength = buffer.readUInt16LE(localHeaderOffset + 28)
  const nameStart = localHeaderOffset + 30
  const nameEnd = nameStart + nameLength
  const dataStart = nameEnd + extraLength

  if (dataStart > buffer.length) {
    throw new Error(`${label}: truncated manifest local header`)
  }
  if (
    localVersionNeeded >= 45 ||
    localCompressedSize === 0xffffffff ||
    localUncompressedSize === 0xffffffff
  ) {
    throw new Error(`${label}: unsupported Zip64 archive`)
  }

  const localExtra = buffer.subarray(nameEnd, dataStart)
  if (hasZip64ExtraField(localExtra, label)) {
    throw new Error(`${label}: unsupported Zip64 archive`)
  }

  assertSupportedManifestZipFlags(localFlags, label)
  assertSupportedManifestCompressionMethod(localCompressionMethod, label)

  const localName = buffer.toString("utf8", nameStart, nameEnd)
  const localEntryName = normalizeZipEntryName(localName, label)
  if (localEntryName.isDirectory || localName !== entry.name) {
    throw new Error(`${label}: manifest local/central name mismatch`)
  }
  if (localFlags !== entry.flags) {
    throw new Error(`${label}: manifest local/central flags mismatch`)
  }
  if (localCompressionMethod !== entry.compressionMethod) {
    throw new Error(`${label}: manifest local/central compression method mismatch`)
  }
  if (localCrc !== entry.crc) {
    throw new Error(`${label}: manifest local/central CRC mismatch`)
  }
  if (localCompressedSize !== entry.compressedSize) {
    throw new Error(`${label}: manifest local/central compressed size mismatch`)
  }
  if (localUncompressedSize !== entry.uncompressedSize) {
    throw new Error(`${label}: manifest local/central uncompressed size mismatch`)
  }

  const dataEnd = dataStart + entry.compressedSize
  if (dataEnd > buffer.length || dataEnd > entry.archiveDataEnd) {
    throw new Error(`${label}: truncated manifest entry`)
  }

  const compressedData = buffer.subarray(dataStart, dataEnd)
  const data = inflateOrReadManifestData(compressedData, entry, label)

  if (data.length !== entry.uncompressedSize) {
    throw new Error(`${label}: manifest uncompressed size mismatch`)
  }
  if (crc32(data) !== entry.crc) {
    throw new Error(`${label}: manifest CRC mismatch`)
  }

  return data.toString("utf8")
}

function assertSupportedManifestZipFlags(flags, label) {
  if (flags & zipEncryptedFlag) {
    throw new Error(`${label}: unsupported encrypted manifest entry`)
  }
  if (flags & zipDataDescriptorFlag) {
    throw new Error(`${label}: unsupported data descriptor flag for manifest.json`)
  }

  const unsupported = flags & ~supportedZipGeneralPurposeFlags
  if (unsupported) {
    throw new Error(
      `${label}: unsupported general-purpose flags ${formatZipFlagBits(unsupported)} for manifest.json`
    )
  }
}

function assertSupportedManifestCompressionMethod(method, label) {
  if (![0, 8].includes(method)) {
    throw new Error(`${label}: unsupported compression method ${method} for manifest.json`)
  }
}

function assertManifestSizeLimits(entry, label) {
  if (entry.compressedSize > maxManifestCompressedSize) {
    throw new Error(
      `${label}: manifest compressed size ${entry.compressedSize} exceeds limit ${maxManifestCompressedSize}`
    )
  }
  if (entry.uncompressedSize > maxManifestUncompressedSize) {
    throw new Error(
      `${label}: manifest uncompressed size ${entry.uncompressedSize} exceeds limit ${maxManifestUncompressedSize}`
    )
  }
  if (
    entry.uncompressedSize > 0 &&
    (entry.compressedSize === 0 ||
      entry.uncompressedSize > entry.compressedSize * maxManifestCompressionRatio)
  ) {
    throw new Error(
      `${label}: manifest compression ratio exceeds limit ${maxManifestCompressionRatio}`
    )
  }
}

function inflateOrReadManifestData(compressedData, entry, label) {
  if (entry.compressionMethod === 0) {
    return compressedData
  }

  try {
    return inflateRawSync(compressedData, {
      maxOutputLength: entry.uncompressedSize
    })
  } catch {
    throw new Error(`${label}: manifest inflate failed or exceeded declared size`)
  }
}

function hasZip64ExtraField(extra, label) {
  let cursor = 0
  while (cursor < extra.length) {
    if (cursor + 4 > extra.length) {
      throw new Error(`${label}: malformed zip extra field`)
    }
    const headerId = extra.readUInt16LE(cursor)
    const dataSize = extra.readUInt16LE(cursor + 2)
    const nextCursor = cursor + 4 + dataSize
    if (nextCursor > extra.length) {
      throw new Error(`${label}: malformed zip extra field`)
    }
    if (headerId === 0x0001) {
      return true
    }
    cursor = nextCursor
  }
  return false
}

function formatZipFlagBits(flags) {
  return `0x${flags.toString(16).padStart(4, "0")}`
}

function crc32(data) {
  let crc = 0xffffffff
  for (const byte of data) {
    crc ^= byte
    for (let index = 0; index < 8; index += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function detectGeneratedManifestTool(manifest) {
  const serviceWorker = manifest.background?.service_worker
  if (serviceWorker === "background.js") return "wxt"
  if (
    typeof serviceWorker === "string" &&
    /(^|\/)static\/background\/index\.js$/.test(serviceWorker)
  ) {
    return "plasmo"
  }
  return "unknown"
}

function findContentScriptConfig(contentScripts, scriptName) {
  return contentScripts.find((candidate) =>
    (candidate.js ?? []).some((script) => contentScriptNameFromPath(script) === scriptName)
  )
}

function contentScriptNames(manifest) {
  return (manifest.content_scripts ?? [])
    .flatMap((scriptConfig) => scriptConfig.js ?? [])
    .map(contentScriptNameFromPath)
    .sort()
}

function contentScriptNameFromPath(scriptPath) {
  return basename(scriptPath)
    .replace(/\.[a-f0-9]{8}(?=\.js$)/, "")
    .replace(/\.js$/, "")
}

function sourceContentScriptNames(dir, tool) {
  return readdirSync(dir)
    .filter((file) => {
      if (tool === "wxt") return /\.content\.(ts|tsx)$/.test(file)
      if (!/\.(ts|tsx)$/.test(file)) return false
      return readFileSync(`${dir}/${file}`, "utf8").includes("PlasmoCSConfig")
    })
    .map((file) =>
      tool === "wxt"
        ? file.replace(/\.content\.(ts|tsx)$/, "")
        : file.replace(/\.(ts|tsx)$/, "")
    )
    .sort()
}

function isWithinApprovedMatchBoundary(match, maximumMatches) {
  return maximumMatches.includes("<all_urls>") || maximumMatches.includes(match)
}

function extractStringArrayProperty(source, propertyName, failures) {
  const match = source.match(
    new RegExp(`(?:^|\\n)\\s*${propertyName}:\\s*\\[([\\s\\S]*?)\\]`)
  )
  if (!match) {
    failures.push(`Source manifest: missing ${propertyName} array`)
    return []
  }
  return Array.from(match[1].matchAll(/"([^"]+)"/g), (item) => item[1])
}

function extractBooleanProperty(source, propertyName, failures) {
  const match = source.match(new RegExp(`${propertyName}:\\s*(true|false)`))
  if (!match) {
    failures.push(`Source content script: missing ${propertyName} boolean`)
    return undefined
  }
  return match[1] === "true"
}

function extractStringProperty(source, propertyName) {
  const match = source.match(new RegExp(`${propertyName}:\\s*"([^"]+)"`))
  return match?.[1]
}

function expectCommandSemantics(failures, label, manifest) {
  expectEqual(
    failures,
    `${label}: command default key`,
    manifest.commands?.["open-command-palette"]?.suggested_key?.default,
    "Ctrl+Shift+Space"
  )
  expectEqual(
    failures,
    `${label}: command mac key`,
    manifest.commands?.["open-command-palette"]?.suggested_key?.mac,
    "Command+Shift+Space"
  )
  expectEqual(
    failures,
    `${label}: command description`,
    manifest.commands?.["open-command-palette"]?.description,
    "__MSG_open_command_palette_description__"
  )
}

function readChromeWebStorePublicKey({ failSoft = false, failures = [] } = {}) {
  if (!existsSync(chromeWebStorePublicKeyPath)) {
    const message = `Canonical release candidate: missing ${chromeWebStorePublicKeyPath}; required for stable extension ID`
    if (failSoft) {
      failures.push(message)
      return ""
    }
    throw new Error(message)
  }

  const publicKey = readFileSync(chromeWebStorePublicKeyPath, "utf8").replace(
    /\s+/g,
    ""
  )
  if (!publicKey) {
    const message = `Canonical release candidate: ${chromeWebStorePublicKeyPath} is empty`
    if (failSoft) {
      failures.push(message)
      return ""
    }
    throw new Error(message)
  }
  return publicKey
}

function extensionIdFromPublicKey(publicKey) {
  if (!publicKey) return ""

  const der = Buffer.from(publicKey, "base64")
  const hash = createHash("sha256").update(der).digest()
  const alphabet = "abcdefghijklmnop"
  let id = ""
  for (const byte of hash.subarray(0, 16)) {
    id += alphabet[byte >> 4] + alphabet[byte & 15]
  }
  return id
}

function expectIncludes(failures, label, source, expected) {
  if (!source.includes(expected)) {
    failures.push(`${label}: expected source to include ${JSON.stringify(expected)}`)
  }
}

function expectEqual(failures, label, actual, expected) {
  if (actual !== expected) {
    failures.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  }
}

function expectArray(failures, label, actual, expected) {
  const normalizedActual = [...(actual ?? [])].sort()
  const normalizedExpected = [...expected].sort()
  if (JSON.stringify(normalizedActual) !== JSON.stringify(normalizedExpected)) {
    failures.push(
      `${label}: expected ${JSON.stringify(normalizedExpected)}, got ${JSON.stringify(normalizedActual)}`
    )
  }
}

function main() {
  const failures = runManifestChecks()

  if (failures.length) {
    console.error("Manifest checks failed:")
    for (const failure of failures) {
      console.error(`- ${failure}`)
    }
    process.exit(1)
  }

  console.log(
    "Manifest checks passed for Plasmo source/generated, WXT source/intermediate, canonical release candidate directory, and canonical zip output."
  )
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}
