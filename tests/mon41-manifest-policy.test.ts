import assert from "node:assert/strict"
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "node:test"
import { deflateRawSync } from "node:zlib"

type Manifest = Record<string, any>
type ZipEntryFixture = {
  name: string
  data: string | Buffer
  method?: number
  localMethod?: number
  centralMethod?: number
  flags?: number
  localFlags?: number
  centralFlags?: number
  localName?: string
  crc?: number
  localCrc?: number
  centralCrc?: number
  compressedSize?: number
  localCompressedSize?: number
  centralCompressedSize?: number
  uncompressedSize?: number
  localUncompressedSize?: number
  centralUncompressedSize?: number
  localVersionNeeded?: number
  centralVersionNeeded?: number
  localExtra?: Buffer
  centralExtra?: Buffer
  centralLocalHeaderOffset?: number
}

const expectedPermissions = [
  "contextMenus",
  "activeTab",
  "storage",
  "history",
  "bookmarks",
  "identity",
  "clipboardWrite"
]

const expectedHostPermissions = [
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

const contentScripts = [
  {
    name: "toolbar",
    matches: ["<all_urls>"],
    allFrames: true
  },
  {
    name: "clipboard",
    matches: ["<all_urls>"],
    allFrames: true
  },
  {
    name: "double-click-menu",
    matches: ["<all_urls>"],
    allFrames: true
  },
  {
    name: "command",
    matches: ["<all_urls>"],
    allFrames: false
  },
  {
    name: "floating",
    matches: ["<all_urls>"],
    allFrames: false
  },
  {
    name: "screenshot",
    matches: ["<all_urls>"],
    allFrames: false
  },
  {
    name: "frame-bridge",
    matches: ["<all_urls>"],
    allFrames: true,
    runAt: "document_start"
  },
  {
    name: "readability",
    matches: ["<all_urls>"],
    allFrames: true,
    runAt: "document_idle"
  }
]

const publicKeyPath = resolve(
  fileURLToPath(new URL("../config/chrome-web-store-public-key.txt", import.meta.url))
)

test("manifest checker compares real Plasmo, WXT intermediate, and canonical final semantics", async () => {
  const mod = await import("../scripts/check-extension-manifests.mjs")
  assert.equal(typeof mod.compareGeneratedManifestSemantics, "function")

  const failures = mod.compareGeneratedManifestSemantics({
    plasmo: createPlasmoManifest(),
    wxt: createWxtManifest(),
    canonical: { ...createWxtManifest(), key: "test-public-key" },
    zip: { ...createWxtManifest(), key: "test-public-key" },
    contentScripts,
    expectedPermissions,
    expectedHostPermissions,
    expectedVersion: "0.1.1"
  })

  assert.deepEqual(failures, [])
})

test("production manifest checker passes when canonical zip manifest matches final directory", async () => {
  const mod = await import("../scripts/check-extension-manifests.mjs")
  const fixture = createManifestCheckerFixture()
  try {
    const result = runManifestChecker(fixture, mod)

    assert.equal(result.status, 0, result.stderr || result.stdout)
    assert.match(result.stdout, /Manifest checks passed/)
  } finally {
    rmSync(fixture, { recursive: true, force: true })
  }
})

test("production manifest checker fails when canonical zip manifest is stale", async () => {
  const mod = await import("../scripts/check-extension-manifests.mjs")
  const fixture = createManifestCheckerFixture({
    zipManifest: { ...createPlasmoManifest(), key: readPublicKey() }
  })
  try {
    const result = runManifestChecker(fixture, mod)

    assert.notEqual(result.status, 0, result.stdout)
    assert.match(result.stderr, /Canonical release candidate zip/)
    assert.match(result.stderr, /expected WXT output|background/)
  } finally {
    rmSync(fixture, { recursive: true, force: true })
  }
})

test("production manifest checker rejects malformed canonical zip manifest inputs", async (t) => {
  const mod = await import("../scripts/check-extension-manifests.mjs")
  const validManifest = `${JSON.stringify({
    ...createWxtManifest(),
    key: readPublicKey()
  })}\n`
  const cases = [
    {
      name: "missing zip",
      options: { skipZip: true },
      pattern: /Canonical release candidate zip: missing build\/chrome-mv3-prod\.zip/
    },
    {
      name: "missing manifest entry",
      options: { zipEntries: [{ name: "popup.html", data: "" }] },
      pattern: /Canonical release candidate zip: missing manifest\.json at zip root/
    },
    {
      name: "duplicate manifest entry",
      options: {
        zipEntries: [
          { name: "manifest.json", data: validManifest },
          { name: "manifest.json", data: validManifest }
        ]
      },
      pattern: /Canonical release candidate zip: duplicate manifest\.json entry/
    },
    {
      name: "ambiguous nested manifest entry",
      options: {
        zipEntries: [
          { name: "manifest.json", data: validManifest },
          { name: "nested/manifest.json", data: validManifest }
        ]
      },
      pattern: /Canonical release candidate zip: ambiguous manifest entries/
    },
    {
      name: "invalid JSON manifest",
      options: { zipEntries: [{ name: "manifest.json", data: "{\n" }] },
      pattern: /Canonical release candidate zip: manifest\.json is invalid JSON/
    },
    {
      name: "unsafe path traversal entry",
      options: {
        zipEntries: [
          { name: "../manifest.json", data: validManifest },
          { name: "manifest.json", data: validManifest }
        ]
      },
      pattern: /Canonical release candidate zip: unsafe zip entry path/
    }
  ]

  for (const testCase of cases) {
    await t.test(testCase.name, () => {
      const fixture = createManifestCheckerFixture(testCase.options)
      try {
        const result = runManifestChecker(fixture, mod)

        assert.notEqual(result.status, 0, result.stdout)
        assert.match(result.stderr, testCase.pattern)
      } finally {
        rmSync(fixture, { recursive: true, force: true })
      }
    })
  }
})

test("production manifest checker rejects unsafe canonical zip parser edge cases", async (t) => {
  const mod = await import("../scripts/check-extension-manifests.mjs")
  const validManifest = `${JSON.stringify({
    ...createWxtManifest(),
    key: readPublicKey()
  })}\n`
  const validManifestSize = Buffer.byteLength(validManifest)
  const deflatedBomb = Buffer.from("A".repeat(300 * 1024))
  const cases = [
    {
      name: "unsupported method",
      options: {
        zipEntries: [{ name: "manifest.json", data: validManifest, method: 12 }]
      },
      pattern: /Canonical release candidate zip: unsupported compression method 12 for manifest\.json/
    },
    {
      name: "encrypted entry",
      options: {
        zipEntries: [{ name: "manifest.json", data: validManifest, flags: 0x0001 }]
      },
      pattern: /Canonical release candidate zip: unsupported encrypted manifest entry/
    },
    {
      name: "data descriptor flag",
      options: {
        zipEntries: [{ name: "manifest.json", data: validManifest, flags: 0x0008 }]
      },
      pattern: /Canonical release candidate zip: unsupported data descriptor flag for manifest\.json/
    },
    {
      name: "unsupported general purpose flag",
      options: {
        zipEntries: [{ name: "manifest.json", data: validManifest, flags: 0x0004 }]
      },
      pattern: /Canonical release candidate zip: unsupported general-purpose flags 0x0004 for manifest\.json/
    },
    {
      name: "zip64 central directory metadata",
      options: {
        zipEntries: [
          {
            name: "manifest.json",
            data: validManifest,
            centralCompressedSize: 0xffffffff
          }
        ]
      },
      pattern: /Canonical release candidate zip: unsupported Zip64 archive/
    },
    {
      name: "truncated archive",
      options: {
        zipEntries: [{ name: "manifest.json", data: validManifest }],
        zipMutator: (buffer: Buffer) => buffer.subarray(0, buffer.length - 8)
      },
      pattern: /Canonical release candidate zip: invalid zip; missing end of central directory/
    },
    {
      name: "truncated entry",
      options: {
        zipEntries: [
          {
            name: "manifest.json",
            data: validManifest,
            compressedSize: validManifestSize + 8
          }
        ]
      },
      pattern: /Canonical release candidate zip: truncated manifest entry/
    },
    {
      name: "malformed local header offset",
      options: {
        zipEntries: [
          {
            name: "manifest.json",
            data: validManifest,
            centralLocalHeaderOffset: 0x00ffffff
          }
        ]
      },
      pattern: /Canonical release candidate zip: truncated manifest local header/
    },
    {
      name: "CRC mismatch",
      options: {
        zipEntries: [
          {
            name: "manifest.json",
            data: validManifest,
            crc: 0
          }
        ]
      },
      pattern: /Canonical release candidate zip: manifest CRC mismatch/
    },
    {
      name: "actual uncompressed size mismatch",
      options: {
        zipEntries: [
          {
            name: "manifest.json",
            data: validManifest,
            uncompressedSize: validManifestSize + 1
          }
        ]
      },
      pattern: /Canonical release candidate zip: manifest uncompressed size mismatch/
    },
    {
      name: "local central flags mismatch",
      options: {
        zipEntries: [
          {
            name: "manifest.json",
            data: validManifest,
            centralFlags: 0,
            localFlags: 0x0800
          }
        ]
      },
      pattern: /Canonical release candidate zip: manifest local\/central flags mismatch/
    },
    {
      name: "local central method mismatch",
      options: {
        zipEntries: [
          {
            name: "manifest.json",
            data: validManifest,
            centralMethod: 0,
            localMethod: 8
          }
        ]
      },
      pattern: /Canonical release candidate zip: manifest local\/central compression method mismatch/
    },
    {
      name: "local central name mismatch",
      options: {
        zipEntries: [
          {
            name: "manifest.json",
            localName: "MANIFEST.json",
            data: validManifest
          }
        ]
      },
      pattern: /Canonical release candidate zip: manifest local\/central name mismatch/
    },
    {
      name: "local central CRC mismatch",
      options: {
        zipEntries: [
          {
            name: "manifest.json",
            data: validManifest,
            centralCrc: crc32(Buffer.from(validManifest)),
            localCrc: 0
          }
        ]
      },
      pattern: /Canonical release candidate zip: manifest local\/central CRC mismatch/
    },
    {
      name: "local central compressed size mismatch",
      options: {
        zipEntries: [
          {
            name: "manifest.json",
            data: validManifest,
            centralCompressedSize: validManifestSize,
            localCompressedSize: validManifestSize + 1
          }
        ]
      },
      pattern: /Canonical release candidate zip: manifest local\/central compressed size mismatch/
    },
    {
      name: "local central uncompressed size mismatch",
      options: {
        zipEntries: [
          {
            name: "manifest.json",
            data: validManifest,
            centralUncompressedSize: validManifestSize,
            localUncompressedSize: validManifestSize + 1
          }
        ]
      },
      pattern: /Canonical release candidate zip: manifest local\/central uncompressed size mismatch/
    },
    {
      name: "oversized manifest",
      options: {
        zipEntries: [
          {
            name: "manifest.json",
            data: validManifest,
            uncompressedSize: 1024 * 1024 + 1
          }
        ]
      },
      pattern: /Canonical release candidate zip: manifest uncompressed size 1048577 exceeds limit 1048576/
    },
    {
      name: "oversized compressed manifest",
      options: {
        zipEntries: [
          {
            name: "manifest.json",
            data: validManifest,
            compressedSize: 256 * 1024 + 1
          }
        ]
      },
      pattern: /Canonical release candidate zip: manifest compressed size 262145 exceeds limit 262144/
    },
    {
      name: "extreme compression ratio",
      options: {
        zipEntries: [
          {
            name: "manifest.json",
            data: deflatedBomb,
            method: 8
          }
        ]
      },
      pattern: /Canonical release candidate zip: manifest compression ratio exceeds limit 100/
    }
  ]

  for (const testCase of cases) {
    await t.test(testCase.name, () => {
      const fixture = createManifestCheckerFixture(testCase.options)
      try {
        const result = runManifestChecker(fixture, mod)

        assert.notEqual(result.status, 0, result.stdout)
        assert.match(result.stderr, testCase.pattern)
      } finally {
        rmSync(fixture, { recursive: true, force: true })
      }
    })
  }
})

test("manifest checker fails if Plasmo evidence is replaced by WXT output", async () => {
  const mod = await import("../scripts/check-extension-manifests.mjs")
  assert.equal(typeof mod.compareGeneratedManifestSemantics, "function")

  const failures = mod.compareGeneratedManifestSemantics({
    plasmo: createWxtManifest(),
    wxt: createWxtManifest(),
    canonical: { ...createWxtManifest(), key: "test-public-key" },
    zip: { ...createWxtManifest(), key: "test-public-key" },
    contentScripts,
    expectedPermissions,
    expectedHostPermissions,
    expectedVersion: "0.1.1"
  })

  assert.match(failures.join("\n"), /Plasmo generated manifest/)
  assert.match(failures.join("\n"), /WXT output/)
})

test("content-script checks allow future match narrowing but require source/generated parity", async () => {
  const mod = await import("../scripts/check-extension-manifests.mjs")
  assert.equal(typeof mod.validateContentScriptManifestParity, "function")

  const narrowedPolicy = [
    {
      name: "toolbar",
      matches: ["https://docs.example.com/*"],
      allFrames: true
    }
  ]
  const narrowedManifest = {
    content_scripts: [
      {
        matches: ["https://docs.example.com/*"],
        all_frames: true,
        js: ["content-scripts/toolbar.js"]
      }
    ]
  }

  assert.deepEqual(
    mod.validateContentScriptManifestParity({
      label: "narrowed",
      manifest: narrowedManifest,
      contentScripts: narrowedPolicy,
      approvedMaximumMatches: ["<all_urls>"]
    }),
    []
  )

  assert.match(
    mod
      .validateContentScriptManifestParity({
        label: "widened",
        manifest: {
          content_scripts: [
            {
              matches: ["<all_urls>"],
              all_frames: true,
              js: ["content-scripts/toolbar.js"]
            }
          ]
        },
        contentScripts: narrowedPolicy,
        approvedMaximumMatches: ["<all_urls>"]
      })
      .join("\n"),
    /toolbar matches/
  )
})

function createBaseManifest(): Manifest {
  return {
    manifest_version: 3,
    version: "0.1.1",
    name: "Aviso",
    default_locale: "zh_CN",
    description: "__MSG_app_description__",
    permissions: expectedPermissions,
    host_permissions: expectedHostPermissions,
    action: { default_popup: "popup.html" },
    commands: {
      "open-command-palette": {
        suggested_key: {
          default: "Ctrl+Shift+Space",
          mac: "Command+Shift+Space"
        },
        description: "__MSG_open_command_palette_description__"
      }
    }
  }
}

function createPlasmoManifest(): Manifest {
  return {
    ...createBaseManifest(),
    background: {
      service_worker: "static/background/index.js"
    },
    content_scripts: contentScripts.map((script) => ({
      matches: script.matches,
      all_frames: script.allFrames,
      ...(script.runAt ? { run_at: script.runAt } : {}),
      js: [`static/${script.name}.abcd1234.js`]
    }))
  }
}

function createWxtManifest(): Manifest {
  return {
    ...createBaseManifest(),
    background: {
      service_worker: "background.js"
    },
    content_scripts: [
      {
        matches: ["<all_urls>"],
        all_frames: true,
        js: [
          "content-scripts/clipboard.js",
          "content-scripts/double-click-menu.js",
          "content-scripts/toolbar.js"
        ]
      },
      {
        matches: ["<all_urls>"],
        all_frames: false,
        js: [
          "content-scripts/command.js",
          "content-scripts/floating.js",
          "content-scripts/screenshot.js"
        ]
      },
      {
        matches: ["<all_urls>"],
        all_frames: true,
        run_at: "document_start",
        js: ["content-scripts/frame-bridge.js"]
      },
      {
        matches: ["<all_urls>"],
        all_frames: true,
        run_at: "document_idle",
        js: ["content-scripts/readability.js"]
      }
    ]
  }
}

function createManifestCheckerFixture({
  skipZip = false,
  zipEntries,
  zipManifest = { ...createWxtManifest(), key: readPublicKey() },
  zipMutator
}: {
  skipZip?: boolean
  zipEntries?: ZipEntryFixture[]
  zipManifest?: Manifest
  zipMutator?: (buffer: Buffer) => Buffer
} = {}) {
  const root = mkdtempSync(join(tmpdir(), "aviso-manifest-checker-"))

  writeJson(join(root, "package.json"), {
    version: "0.1.1",
    manifest: {
      name: "Aviso",
      default_locale: "zh_CN",
      description: "__MSG_app_description__",
      permissions: expectedPermissions,
      host_permissions: expectedHostPermissions,
      commands: createBaseManifest().commands
    }
  })
  writeText(
    join(root, "wxt.config.ts"),
    `export default defineConfig({
  manifest: {
    name: "Aviso",
    default_locale: "zh_CN",
    description: "__MSG_app_description__",
    permissions: ${JSON.stringify(expectedPermissions)},
    host_permissions: ${JSON.stringify(expectedHostPermissions)},
    commands: {
      "open-command-palette": {
        suggested_key: {
          default: "Ctrl+Shift+Space",
          mac: "Command+Shift+Space"
        },
        description: "__MSG_open_command_palette_description__"
      }
    }
  }
})
`
  )

  for (const script of contentScripts) {
    const plasmoExt = ["readability", "frame-bridge"].includes(script.name) ? "ts" : "tsx"
    const wxtExt = ["readability", "frame-bridge", "screenshot"].includes(script.name)
      ? "ts"
      : "tsx"
    writeText(
      join(root, "src/contents", `${script.name}.${plasmoExt}`),
      `import type { PlasmoCSConfig } from "plasmo"
export const config: PlasmoCSConfig = {
  matches: ${JSON.stringify(script.matches)},
  all_frames: ${script.allFrames}${script.runAt ? `,
  run_at: "${script.runAt}"` : ""}
}
`
    )
    writeText(
      join(root, "src/entrypoints", `${script.name}.content.${wxtExt}`),
      `export default defineContentScript({
  matches: ${JSON.stringify(script.matches)},
  allFrames: ${script.allFrames}${script.runAt ? `,
  runAt: "${script.runAt}"` : ""}
})
`
    )
  }

  cpSync(publicKeyPath, join(root, "config/chrome-web-store-public-key.txt"))
  writeJson(
    join(root, "build/manifest-evidence/plasmo-manifest.json"),
    createPlasmoManifest()
  )
  writeJson(join(root, ".output/chrome-mv3/manifest.json"), createWxtManifest())
  writeJson(join(root, "build/chrome-mv3-prod/manifest.json"), {
    ...createWxtManifest(),
    key: readPublicKey()
  })
  if (!skipZip) {
    writeZip(
      join(root, "build/chrome-mv3-prod.zip"),
      zipEntries ?? [
        {
          name: "manifest.json",
          data: `${JSON.stringify(zipManifest)}\n`
        }
      ],
      zipMutator
    )
  }

  return root
}

function runManifestChecker(
  cwd: string,
  mod: {
    runManifestChecks: () => string[]
  }
) {
  const previousCwd = process.cwd()
  process.chdir(cwd)
  try {
    const failures = mod.runManifestChecks()
    return {
      status: failures.length ? 1 : 0,
      stdout: failures.length ? "" : "Manifest checks passed",
      stderr: failures.length
        ? `Manifest checks failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`
        : ""
    }
  } finally {
    process.chdir(previousCwd)
  }
}

function readPublicKey() {
  return readFileSync(publicKeyPath, "utf8").replace(/\s+/g, "")
}

function writeJson(path: string, value: unknown) {
  writeText(path, `${JSON.stringify(value)}\n`)
}

function writeText(path: string, content: string) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, content)
}

function writeZip(
  path: string,
  entries: ZipEntryFixture[],
  mutate?: (buffer: Buffer) => Buffer
) {
  mkdirSync(dirname(path), { recursive: true })
  const localParts: Buffer[] = []
  const centralParts: Buffer[] = []
  let offset = 0

  for (const entry of entries) {
    const centralName = Buffer.from(entry.name)
    const localName = Buffer.from(entry.localName ?? entry.name)
    const data = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data)
    const method = entry.method ?? 0
    const localMethod = entry.localMethod ?? method
    const centralMethod = entry.centralMethod ?? method
    const compressedData = method === 8 ? deflateRawSync(data) : data
    const crc = crc32(data)
    const centralCrc = entry.centralCrc ?? entry.crc ?? crc
    const localCrc = entry.localCrc ?? entry.crc ?? crc
    const centralCompressedSize =
      entry.centralCompressedSize ?? entry.compressedSize ?? compressedData.length
    const localCompressedSize =
      entry.localCompressedSize ?? entry.compressedSize ?? compressedData.length
    const centralUncompressedSize =
      entry.centralUncompressedSize ?? entry.uncompressedSize ?? data.length
    const localUncompressedSize =
      entry.localUncompressedSize ?? entry.uncompressedSize ?? data.length
    const centralFlags = entry.centralFlags ?? entry.flags ?? 0
    const localFlags = entry.localFlags ?? entry.flags ?? 0
    const centralExtra = entry.centralExtra ?? Buffer.alloc(0)
    const localExtra = entry.localExtra ?? Buffer.alloc(0)
    const localHeader = Buffer.alloc(30)
    localHeader.writeUInt32LE(0x04034b50, 0)
    localHeader.writeUInt16LE(entry.localVersionNeeded ?? 20, 4)
    localHeader.writeUInt16LE(localFlags, 6)
    localHeader.writeUInt16LE(localMethod, 8)
    localHeader.writeUInt16LE(0, 10)
    localHeader.writeUInt16LE(0, 12)
    localHeader.writeUInt32LE(localCrc, 14)
    localHeader.writeUInt32LE(localCompressedSize, 18)
    localHeader.writeUInt32LE(localUncompressedSize, 22)
    localHeader.writeUInt16LE(localName.length, 26)
    localHeader.writeUInt16LE(localExtra.length, 28)

    localParts.push(localHeader, localName, localExtra, compressedData)

    const centralHeader = Buffer.alloc(46)
    centralHeader.writeUInt32LE(0x02014b50, 0)
    centralHeader.writeUInt16LE(20, 4)
    centralHeader.writeUInt16LE(entry.centralVersionNeeded ?? 20, 6)
    centralHeader.writeUInt16LE(centralFlags, 8)
    centralHeader.writeUInt16LE(centralMethod, 10)
    centralHeader.writeUInt16LE(0, 12)
    centralHeader.writeUInt16LE(0, 14)
    centralHeader.writeUInt32LE(centralCrc, 16)
    centralHeader.writeUInt32LE(centralCompressedSize, 20)
    centralHeader.writeUInt32LE(centralUncompressedSize, 24)
    centralHeader.writeUInt16LE(centralName.length, 28)
    centralHeader.writeUInt16LE(centralExtra.length, 30)
    centralHeader.writeUInt32LE(entry.centralLocalHeaderOffset ?? offset, 42)
    centralParts.push(centralHeader, centralName, centralExtra)

    offset += localHeader.length + localName.length + localExtra.length + compressedData.length
  }

  const centralOffset = offset
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(entries.length, 8)
  eocd.writeUInt16LE(entries.length, 10)
  eocd.writeUInt32LE(centralSize, 12)
  eocd.writeUInt32LE(centralOffset, 16)

  const zip = Buffer.concat([...localParts, ...centralParts, eocd])
  writeFileSync(path, mutate ? mutate(zip) : zip)
}

function crc32(data: Buffer) {
  let crc = 0xffffffff
  for (const byte of data) {
    crc ^= byte
    for (let index = 0; index < 8; index += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}
