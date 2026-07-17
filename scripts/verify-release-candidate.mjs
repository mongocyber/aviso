import { spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync
} from "node:fs"
import { extname, join } from "node:path"
import { pathToFileURL } from "node:url"

const expectedChromeWebStoreExtensionId = "phigblobbahhecgbcifmkamglcdnghcg"

const commandSteps = [
  {
    label: "unit tests",
    command: "npm",
    args: ["test"]
  },
  {
    label: "typecheck",
    command: "npx",
    args: ["tsc", "--noEmit"]
  },
  {
    label: "WXT production build",
    command: "npm",
    args: ["run", "build:wxt"]
  },
  {
    label: "Plasmo production build",
    command: "npm",
    args: ["run", "build:plasmo"]
  },
  {
    label: "canonical production package",
    command: "npm",
    args: ["run", "package"]
  },
  {
    label: "manifest boundary check",
    command: "npm",
    args: ["run", "check:manifests"]
  }
]

const requiredArtifacts = [
  "build/chrome-mv3-prod/manifest.json",
  "build/chrome-mv3-prod.zip",
  "build/manifest-evidence/plasmo-manifest.json",
  ".output/chrome-mv3/manifest.json"
]

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}

function main() {
  console.log("Aviso release-candidate verification")
  console.log("Scope: local tests, typecheck, canonical package output, manifest boundary, claim scan, and hygiene scan.")
  console.log("No deploy, CWS submission, provider call, or secret read is performed.\n")

  for (const step of commandSteps) {
    runCommandStep(step)
  }

  checkRequiredArtifacts()
  checkCanonicalLoadDirectory()
  runForbiddenClaimsScan()
  runSecretAndArtifactHygieneScan()

  console.log("\nRelease-candidate verification passed.")
}

function checkCanonicalLoadDirectory() {
  console.log("\n==> canonical load directory check")

  const manifestPath = "build/chrome-mv3-prod/manifest.json"
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"))
  const serviceWorker = manifest.background?.service_worker

  if (serviceWorker === "static/background/index.js") {
    console.error(
      "build/chrome-mv3-prod looks like stale/direct Plasmo output: background.service_worker is static/background/index.js"
    )
    console.error("Run npm run package and load build/chrome-mv3-prod only after it has been regenerated from WXT.")
    process.exit(1)
  }

  if (serviceWorker !== "background.js") {
    console.error(
      `Canonical release candidate must use background.js, got ${JSON.stringify(serviceWorker)}`
    )
    process.exit(1)
  }

  if (!manifest.key) {
    console.error(
      "Canonical release candidate manifest is missing key; run npm run package to inject the Chrome Web Store public key."
    )
    process.exit(1)
  }

  const extensionId = extensionIdFromPublicKey(manifest.key)
  if (extensionId !== expectedChromeWebStoreExtensionId) {
    console.error(
      `Canonical release candidate derives extension ID ${extensionId}, expected ${expectedChromeWebStoreExtensionId}`
    )
    process.exit(1)
  }

  console.log("ok load build/chrome-mv3-prod, not .output/chrome-mv3")
  console.log("ok canonical background is background.js")
  console.log("ok manifest key present")
  console.log(`ok derived extension ID ${extensionId}`)
  console.log(".output/chrome-mv3 is only the intermediate WXT build output.")
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

function runCommandStep({ label, command, args }) {
  console.log(`\n==> ${label}`)
  console.log(`$ ${[command, ...args].join(" ")}`)

  const result = spawnSync(command, args, {
    encoding: "utf8",
    maxBuffer: 100 * 1024 * 1024
  })

  if (result.stdout) {
    process.stdout.write(result.stdout)
  }
  if (result.stderr) {
    process.stderr.write(result.stderr)
  }

  if (didSpawnFailBeforeCompletion(result)) {
    console.error(`\n${label} failed before completion: ${result.error.message}`)
    process.exit(1)
  }

  if (result.status !== 0) {
    const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`
    const classification = classifyCommandFailure(output)
    console.error(`\n${label} failed with exit code ${result.status}.`)
    console.error(`Classification: ${classification}`)
    process.exit(result.status ?? 1)
  }
}

export function didSpawnFailBeforeCompletion(result) {
  return Boolean(result.error) && result.status == null && result.signal == null
}

function classifyCommandFailure(output) {
  if (/Operation not permitted|EACCES|EPERM/i.test(output)) {
    return "environment or sandbox permission failure; rerun in an allowed local environment before treating this as a code regression"
  }
  if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|registry\.npmjs|registry\.npmmirror|fetch failed/i.test(output)) {
    return "environment or dependency registry/network failure; restore local dependencies before treating this as a code regression"
  }
  if (/Cannot find package|ERR_MODULE_NOT_FOUND/i.test(output)) {
    return "missing local dependency install; restore dependencies from the lockfile before treating this as a code regression"
  }
  if (
    /missing .*manifest\.json|missing .*chrome-mv3-prod\.zip|run both build paths first|regenerate the final directory and zip/i.test(
      output
    )
  ) {
    return "missing build artifact; rerun WXT and Plasmo build/package steps"
  }
  return "command failure; inspect the command output above"
}

function checkRequiredArtifacts() {
  console.log("\n==> production candidate artifact presence")

  const missingArtifacts = requiredArtifacts.filter((path) => !existsSync(path))
  if (missingArtifacts.length) {
    console.error("Missing required production candidate artifacts:")
    for (const artifact of missingArtifacts) {
      console.error(`- ${artifact}`)
    }
    console.error("Run the WXT/Plasmo build and package steps before relying on manifest/package evidence.")
    process.exit(1)
  }

  for (const artifact of requiredArtifacts) {
    console.log(`ok ${artifact}`)
  }
}

function runForbiddenClaimsScan() {
  console.log("\n==> forbidden release-claim scan")

  const scanRoots = [
    "README.md",
    "STATUS.md",
    "RELEASE_CHECKLIST.md",
    "docs/ai",
    "docs/planning/v0.3",
    "website/docs",
    "website/i18n/en/docusaurus-plugin-content-docs/current",
    "website/src"
  ]

  const claimPatterns = [
    {
      label: "hosted AI live/public overclaim",
      regex: /\b(hosted AI|Aviso AI)\b.{0,100}\b(is live|is publicly available|is release-ready|is public beta|is available to public|has been released|has been published)\b/i
    },
    {
      label: "Chinese hosted AI live/public overclaim",
      regex: /(hosted AI|Aviso AI|托管 AI|托管路径).{0,100}(已上线|正式上线|公开发布|公开可用|已公开|已发布|可公开使用)/i
    },
    {
      label: "Chrome Web Store approval overclaim",
      regex: /\b(Chrome Web Store|CWS)\b.{0,100}\b(is approved|has been approved|is published|has been published|is publicly listed|审核通过|已通过|正式上架|公开上架)\b/i
    },
    {
      label: "anonymous quota overclaim",
      regex: /(anonymous free quota|anonymous quota|free tier for anonymous users|匿名额度|公开免费额度|匿名免费额度)/i
    },
    {
      label: "paid hosted AI overclaim",
      regex: /(subscription is live|payment is live|billing is live|订阅支付已上线|支付已上线|订阅已上线|付费托管 AI)/i
    },
    {
      label: "web-search overclaim",
      regex: /(web search is live|remote link-body fetching is live|联网搜索已上线|远端链接正文抓取已上线)/i
    }
  ]

  const findings = []
  for (const filePath of listTextFiles(scanRoots)) {
    const lines = readFileSync(filePath, "utf8").split(/\r?\n/)
    lines.forEach((line, index) => {
      if (isCommandExample(line)) {
        return
      }
      if (isNegatedClaimContext(line)) {
        return
      }

      for (const pattern of claimPatterns) {
        if (pattern.regex.test(line)) {
          findings.push({
            filePath,
            line: index + 1,
            label: pattern.label,
            text: line.trim()
          })
        }
      }
    })
  }

  if (findings.length) {
    console.error("Forbidden release claims found:")
    for (const finding of findings) {
      console.error(`- ${finding.filePath}:${finding.line} ${finding.label}: ${finding.text}`)
    }
    process.exit(1)
  }

  console.log("ok no positive hosted-AI live/CWS-approved/quota/payment/web-search claims found")
}

function isCommandExample(line) {
  return /^\s*(?:\$ )?(?:rg|grep|npm|npx|node|git)\s/.test(line)
}

function isNegatedClaimContext(line) {
  return /\bnot\b|\bno\b|\bdoes not\b|\bdo not\b|\bwithout\b|\bpending\b|\bblocked\b|\bforbidden\b|\brequires\b|\brequire\b|\bclaim\b|\bclaims\b|\bmust\b|\bshould\b|不|未|无|没有|不是|不代表|不能|不包含|不做|禁止|待|仍需|需要|尚未|排除|不等于/i.test(line)
}

function runSecretAndArtifactHygieneScan() {
  console.log("\n==> secret and artifact hygiene scan")

  const trackedArtifactFiles = gitLsFiles([
    "build",
    ".output",
    "dist",
    "out",
    "coverage",
    "logs",
    "*.zip",
    "*.crx",
    "*.pem",
    "*.key",
    "*.p12",
    "*.pfx"
  ])

  if (trackedArtifactFiles.length) {
    console.error("Tracked generated artifact or secret-like file paths found:")
    for (const filePath of trackedArtifactFiles) {
      console.error(`- ${filePath}`)
    }
    console.error("Release candidate outputs must remain ignored and untracked.")
    process.exit(1)
  }

  const secretScanRoots = [
    "AGENTS.md",
    "README.md",
    "STATUS.md",
    "RELEASE_CHECKLIST.md",
    "docs",
    "src",
    "scripts",
    "config",
    "package.json",
    "build/chrome-mv3-prod",
    ".output/chrome-mv3"
  ]

  const secretPatterns = [
    {
      label: "OpenAI-style API key",
      regex: /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}\b/g
    },
    {
      label: "Anthropic-style API key",
      regex: /\bsk-ant-[A-Za-z0-9_-]{32,}\b/g
    },
    {
      label: "GitHub token",
      regex: /\bgh[opsur]_[A-Za-z0-9_]{36,}\b/g
    },
    {
      label: "AWS access key",
      regex: /\bAKIA[0-9A-Z]{16}\b/g
    },
    {
      label: "Google API key",
      regex: /\bAIza[0-9A-Za-z_-]{35}\b/g
    },
    {
      label: "Slack token",
      regex: /\bxox[baprs]-[0-9A-Za-z-]{20,}\b/g
    },
    {
      label: "private key block",
      regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g
    }
  ]

  const findings = []
  for (const filePath of listTextFiles(secretScanRoots)) {
    const content = readFileSync(filePath, "utf8")
    for (const pattern of secretPatterns) {
      for (const match of content.matchAll(pattern.regex)) {
        const line = content.slice(0, match.index).split(/\r?\n/).length
        findings.push({
          filePath,
          line,
          label: pattern.label
        })
      }
    }
  }

  if (findings.length) {
    console.error("High-confidence secret-like values found:")
    for (const finding of findings) {
      console.error(`- ${finding.filePath}:${finding.line} ${finding.label}`)
    }
    process.exit(1)
  }

  console.log("ok no tracked generated artifacts and no high-confidence secret-like values found")
}

function gitLsFiles(pathspecs) {
  const result = spawnSync("git", ["ls-files", "--", ...pathspecs], {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024
  })

  if (result.status !== 0) {
    console.error(result.stderr)
    console.error("Unable to inspect tracked artifact paths.")
    process.exit(result.status ?? 1)
  }

  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function listTextFiles(paths) {
  const files = []
  for (const path of paths) {
    if (!existsSync(path)) {
      continue
    }
    collectTextFiles(path, files)
  }
  return files
}

function collectTextFiles(path, files) {
  const stats = statSync(path)
  if (stats.isDirectory()) {
    if (shouldSkipDirectory(path)) {
      return
    }

    for (const entry of readdirSync(path)) {
      collectTextFiles(join(path, entry), files)
    }
    return
  }

  if (!stats.isFile() || shouldSkipFile(path, stats.size)) {
    return
  }

  const buffer = readFileSync(path)
  if (isLikelyText(buffer)) {
    files.push(path)
  }
}

function shouldSkipDirectory(path) {
  const normalized = path.split("/").filter(Boolean)
  return normalized.some((part) =>
    [
      ".git",
      "node_modules",
      ".cache",
      ".parcel-cache",
      ".plasmo",
      ".wxt",
      "coverage"
    ].includes(part)
  )
}

function shouldSkipFile(path, size) {
  if (size > 8 * 1024 * 1024) {
    return true
  }

  return [
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".ico",
    ".zip",
    ".gz",
    ".br",
    ".woff",
    ".woff2",
    ".ttf",
    ".map"
  ].includes(extname(path).toLowerCase())
}

function isLikelyText(buffer) {
  if (buffer.includes(0)) {
    return false
  }

  const sample = buffer.subarray(0, Math.min(buffer.length, 4096))
  if (!sample.length) {
    return true
  }

  let printable = 0
  for (const byte of sample) {
    if (byte === 9 || byte === 10 || byte === 13 || (byte >= 32 && byte <= 126) || byte >= 128) {
      printable += 1
    }
  }
  return printable / sample.length > 0.85
}
