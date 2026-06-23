import { existsSync, readFileSync } from "node:fs"
import { basename } from "node:path"

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
  "https://aviso-backend-staging.vercel.app/*"
]

const expectedContentScripts = [
  "clipboard",
  "command",
  "double-click-menu",
  "floating",
  "frame-bridge",
  "readability",
  "screenshot",
  "toolbar"
]

const manifests = [
  {
    label: "Plasmo",
    path: "build/chrome-mv3-prod/manifest.json"
  },
  {
    label: "WXT",
    path: ".output/chrome-mv3/manifest.json"
  }
]

const failures = []

for (const manifestRef of manifests) {
  checkManifest(manifestRef)
}

if (failures.length) {
  console.error("Manifest checks failed:")
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log("Manifest checks passed for Plasmo and WXT outputs.")

function checkManifest({ label, path }) {
  if (!existsSync(path)) {
    failures.push(`${label}: missing ${path}; run both build paths first`)
    return
  }

  const manifest = JSON.parse(readFileSync(path, "utf8"))

  expectEqual(`${label}: manifest_version`, manifest.manifest_version, 3)
  expectEqual(`${label}: name`, manifest.name, "Aviso")
  expectEqual(`${label}: default_locale`, manifest.default_locale, "zh_CN")
  expectEqual(
    `${label}: description`,
    manifest.description,
    "__MSG_app_description__"
  )
  expectArray(
    `${label}: permissions`,
    manifest.permissions,
    expectedPermissions
  )
  expectArray(
    `${label}: host_permissions`,
    manifest.host_permissions,
    expectedHostPermissions
  )
  expectEqual(
    `${label}: action.default_popup`,
    manifest.action?.default_popup,
    "popup.html"
  )
  expectEqual(
    `${label}: command default key`,
    manifest.commands?.["open-command-palette"]?.suggested_key?.default,
    "Ctrl+Shift+Space"
  )
  expectEqual(
    `${label}: command mac key`,
    manifest.commands?.["open-command-palette"]?.suggested_key?.mac,
    "Command+Shift+Space"
  )
  expectEqual(
    `${label}: command description`,
    manifest.commands?.["open-command-palette"]?.description,
    "__MSG_open_command_palette_description__"
  )

  if (!manifest.background?.service_worker) {
    failures.push(`${label}: missing background service_worker`)
  }

  const scripts = contentScriptNames(manifest)
  for (const script of expectedContentScripts) {
    if (!scripts.includes(script)) {
      failures.push(`${label}: missing content script ${script}`)
    }
  }

  const contentScripts = manifest.content_scripts ?? []
  for (const [index, scriptConfig] of contentScripts.entries()) {
    expectArray(
      `${label}: content_scripts[${index}].matches`,
      scriptConfig.matches,
      ["<all_urls>"]
    )
  }

  const frameBridge = contentScripts.find((scriptConfig) =>
    (scriptConfig.js ?? []).some((script) => script.includes("frame-bridge"))
  )
  if (!frameBridge) {
    failures.push(`${label}: missing frame bridge content script config`)
  } else {
    expectEqual(`${label}: frame bridge all_frames`, frameBridge.all_frames, true)
    expectEqual(
      `${label}: frame bridge run_at`,
      frameBridge.run_at,
      "document_start"
    )
  }
}

function contentScriptNames(manifest) {
  return (manifest.content_scripts ?? [])
    .flatMap((scriptConfig) => scriptConfig.js ?? [])
    .map((scriptPath) => basename(scriptPath))
    .map((name) => name.replace(/\.[a-f0-9]{8}(?=\.js$)/, ""))
    .map((name) => name.replace(/\.js$/, ""))
    .sort()
}

function expectEqual(label, actual, expected) {
  if (actual !== expected) {
    failures.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  }
}

function expectArray(label, actual, expected) {
  const normalizedActual = [...(actual ?? [])].sort()
  const normalizedExpected = [...expected].sort()
  if (JSON.stringify(normalizedActual) !== JSON.stringify(normalizedExpected)) {
    failures.push(
      `${label}: expected ${JSON.stringify(normalizedExpected)}, got ${JSON.stringify(normalizedActual)}`
    )
  }
}
