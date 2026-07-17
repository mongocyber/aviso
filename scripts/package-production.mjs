import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs"
import { join } from "node:path"

const intermediateWxtDir = ".output/chrome-mv3"
const canonicalLoadDir = "build/chrome-mv3-prod"
const canonicalZip = "build/chrome-mv3-prod.zip"
const manifestEvidenceDir = "build/manifest-evidence"
const plasmoManifestEvidencePath = join(
  manifestEvidenceDir,
  "plasmo-manifest.json"
)
const chromeWebStorePublicKeyPath = "config/chrome-web-store-public-key.txt"
const expectedChromeWebStoreExtensionId = "phigblobbahhecgbcifmkamglcdnghcg"

preservePlasmoManifestEvidence()
run("npm", ["run", "build:wxt"])

if (!existsSync(join(intermediateWxtDir, "manifest.json"))) {
  fail(`Missing ${intermediateWxtDir}/manifest.json after WXT build`)
}

rmSync(canonicalLoadDir, { recursive: true, force: true })
rmSync(canonicalZip, { force: true })
mkdirSync("build", { recursive: true })
cpSync(intermediateWxtDir, canonicalLoadDir, { recursive: true })

const extensionId = injectChromeWebStoreKey(canonicalLoadDir)

run("zip", ["-qr", "../chrome-mv3-prod.zip", "."], {
  cwd: canonicalLoadDir
})

run("npm", ["run", "check:manifests"])

console.log(`Canonical load directory ready: ${canonicalLoadDir}`)
console.log(`Canonical zip ready: ${canonicalZip}`)
console.log(`Plasmo manifest evidence: ${plasmoManifestEvidencePath}`)
console.log(`Manifest key present: true`)
console.log(`Derived extension ID: ${extensionId}`)
console.log(`${intermediateWxtDir} is an intermediate WXT build output, not the owner-loaded release candidate.`)

function run(command, args, options = {}) {
  execFileSync(command, args, {
    stdio: "inherit",
    ...options
  })
}

function injectChromeWebStoreKey(dir) {
  const manifestPath = join(dir, "manifest.json")
  const publicKey = readChromeWebStorePublicKey()
  const extensionId = extensionIdFromPublicKey(publicKey)
  if (extensionId !== expectedChromeWebStoreExtensionId) {
    fail(
      `Chrome Web Store public key derives ${extensionId}, expected ${expectedChromeWebStoreExtensionId}`
    )
  }

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"))
  manifest.key = publicKey
  writeFileSync(manifestPath, `${JSON.stringify(manifest)}\n`)
  return extensionId
}

function preservePlasmoManifestEvidence() {
  const manifestPath = join(canonicalLoadDir, "manifest.json")
  if (!existsSync(manifestPath) || !isPlasmoManifest(manifestPath)) {
    run("npm", ["run", "build:plasmo"])
  }

  if (!existsSync(manifestPath)) {
    fail(`Missing ${manifestPath} after Plasmo build`)
  }
  if (!isPlasmoManifest(manifestPath)) {
    fail(
      `${manifestPath} does not look like real Plasmo output; refusing to use WXT output as Plasmo evidence`
    )
  }

  mkdirSync(manifestEvidenceDir, { recursive: true })
  cpSync(manifestPath, plasmoManifestEvidencePath)
}

function isPlasmoManifest(manifestPath) {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"))
  const serviceWorker = manifest.background?.service_worker
  return (
    typeof serviceWorker === "string" &&
    /(^|\/)static\/background\/index\.js$/.test(serviceWorker)
  )
}

function readChromeWebStorePublicKey() {
  if (!existsSync(chromeWebStorePublicKeyPath)) {
    fail(
      `Missing ${chromeWebStorePublicKeyPath}; required to keep the production package extension ID stable`
    )
  }

  const publicKey = readFileSync(chromeWebStorePublicKeyPath, "utf8").replace(
    /\s+/g,
    ""
  )
  if (!publicKey) {
    fail(`${chromeWebStorePublicKeyPath} is empty`)
  }
  return publicKey
}

function extensionIdFromPublicKey(publicKey) {
  const der = Buffer.from(publicKey, "base64")
  const hash = createHash("sha256").update(der).digest()
  const alphabet = "abcdefghijklmnop"
  let id = ""
  for (const byte of hash.subarray(0, 16)) {
    id += alphabet[byte >> 4] + alphabet[byte & 15]
  }
  return id
}

function fail(message) {
  console.error(message)
  process.exit(1)
}
