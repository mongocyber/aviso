import { spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import {
  existsSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync
} from "node:fs"
import { extname, join } from "node:path"
import { fileURLToPath } from "node:url"

const expectedChromeWebStoreExtensionId = "phigblobbahhecgbcifmkamglcdnghcg"

const commandSteps = [
  npmStep("unit tests", ["test"]),
  npmStep("supply-chain baseline", ["run", "supply-chain:check"]),
  {
    label: "typecheck",
    command: process.execPath,
    args: [join("node_modules", "typescript", "bin", "tsc"), "--noEmit"],
    displayCommand: ["npx", "tsc", "--noEmit"]
  },
  npmStep("WXT production build", ["run", "build:wxt"]),
  npmStep("Plasmo production build", ["run", "build:plasmo"]),
  npmStep("canonical production package", ["run", "package"]),
  npmStep("manifest boundary check", ["run", "check:manifests"])
]

const requiredArtifacts = [
  "build/chrome-mv3-prod/manifest.json",
  "build/chrome-mv3-prod.zip",
  "build/manifest-evidence/plasmo-manifest.json",
  ".output/chrome-mv3/manifest.json"
]

const releaseClaimScanRoots = [
  "docs/STATE.md",
  "README.md",
  "STATUS.md",
  "RELEASE_CHECKLIST.md",
  "docs/ai",
  "docs/planning/v0.3",
  "docs/release/README.md",
  "docs/architecture/website-and-store-copy.md",
  "docs/privacy-and-security.md",
  "website/README.md",
  "website/src",
  "website/docs",
  "website/i18n/en/docusaurus-plugin-content-docs/current",
  "website/docusaurus.config.ts",
  "website/i18n/en/code.json",
  "website/i18n/en/docusaurus-theme-classic/navbar.json",
  "website/i18n/en/docusaurus-theme-classic/footer.json",
  "store-assets/chrome-web-store/STORE_LISTING_COPY.md",
  "store-assets/chrome-web-store/README.md",
  "store-assets/chrome-web-store/THREAD_BRIEF.md",
  "package.json",
  "wxt.config.ts",
  "locales",
  "public/_locales",
  "build/chrome-mv3-prod/manifest.json",
  ".output/chrome-mv3/manifest.json"
]

const defaultSafeNegationRegex =
  /\b(?:not|never|without|pending|blocked|forbidden|excluded|unavailable|cannot|can't|isn't|aren't|hasn't|doesn't|don't|does\s+not|do\s+not|is\s+not|are\s+not|has\s+not|have\s+not|must\s+not|should\s+not|no)\b|不|未|无|没有|不是|不能|不会|尚未|待|排除|暂不可用|不可用/i

const freeQuotaSafeNegationRegex =
  /\b(?:not|never|pending|blocked|forbidden|excluded|unavailable|cannot|can't|isn't|aren't|hasn't|doesn't|don't|does\s+not|do\s+not|is\s+not|are\s+not|has\s+not|have\s+not|must\s+not|should\s+not)\b|不(?:是|会|能|可|应)|未|没有|尚未|待|排除|暂不可用|不可用/i

const releaseClaimRules = [
  {
    label: "hosted AI live/public overclaim",
    reason: "Hosted AI is candidate-only and must not be described as public live.",
    regex:
      /\b(?:hosted\s+AI|Aviso\s+AI)\b.{0,120}\b(?:is\s+live|live\s+now|is\s+public\s+live|public\s+live\s+now|is\s+publicly\s+available|is\s+available\s+to\s+the\s+public|is\s+release-ready|is\s+public\s+beta|has\s+been\s+released|has\s+been\s+published)\b/i
  },
  {
    label: "Chinese hosted AI live/public overclaim",
    reason: "Hosted AI is candidate-only and must not be described as public live.",
    regex:
      /(?:hosted\s+AI|Aviso\s+AI|托管\s*AI|托管路径).{0,120}(?:已\s*公开\s*上线|已\s*上线|正式上线|公开发布|公开可用|已公开|已发布|可公开使用)/i
  },
  {
    label: "Chrome Web Store approval overclaim",
    reason: "Chrome Web Store approval and public listing are still pending gates.",
    regex:
      /(?:\b(?:Chrome\s+Web\s+Store|CWS)\b.{0,120}\b(?:is\s+approved|has\s+been\s+approved|is\s+published|has\s+been\s+published|is\s+publicly\s+listed|is\s+listed)\b|(?:Chrome\s*Web\s*Store|CWS).{0,120}(?:审核通过|已通过|已批准|正式上架|已\s*公开\s*上架|公开上架))/i
  },
  {
    label: "free quota without sign-in overclaim",
    reason:
      "Aviso AI free quota must require sign-in; anonymous or no-login quota is outside the release scope.",
    regex:
      /(?:\bfree\s+quota\b.{0,80}\b(?:without|with\s+no|no|not\s+requiring|does\s+not\s+require|doesn't\s+require)\b.{0,30}\b(?:sign-?in|login)\b|\b(?:without|with\s+no|no|not\s+requiring|does\s+not\s+require|doesn't\s+require)\b.{0,30}\b(?:sign-?in|login)\b.{0,80}\bfree\s+quota\b|免费额度.{0,40}(?:无需登录|不需要登录|免登录|匿名|公开)|(?:无需登录|不需要登录|免登录|匿名).{0,40}免费额度)/i,
    safeNegationRegex: freeQuotaSafeNegationRegex
  },
  {
    label: "anonymous quota overclaim",
    reason: "Public anonymous quota is excluded from the current release.",
    regex:
      /(?:(?:anonymous\s+free\s+quota|anonymous\s+quota|free\s+tier\s+for\s+anonymous\s+users).{0,80}\b(?:is\s+live|is\s+available|is\s+enabled|included|ready|released|published|can\s+be\s+used)\b|(?:匿名额度|公开免费额度|匿名免费额度).{0,40}(?:已上线|上线|已发布|可用|已启用|已包含|已支持))/i
  },
  {
    label: "paid hosted AI overclaim",
    reason: "Subscription, payment, billing, checkout, and paid hosted AI are outside the release scope.",
    regex:
      /(?:(?:subscription|payment|billing|checkout|paid\s+hosted\s+AI)\s+(?:is|are)\s+(?:live|available|enabled|included|ready|released|published)|(?:subscription|payment|billing|checkout|paid\s+hosted\s+AI).{0,40}\b(?:has\s+been\s+released|has\s+been\s+published)\b|(?:订阅|支付|计费|结账|付费托管\s*AI).{0,40}(?:已上线|上线|已发布|可用|已启用|已包含|已支持))/i
  },
  {
    label: "web-search overclaim",
    reason: "Web search and remote link-body fetching are outside the release scope.",
    regex:
      /(?:web\s+search|remote\s+link-body\s+fetching).{0,80}\b(?:is\s+live|is\s+available|is\s+enabled|included|ready|released|published)\b|(?:联网搜索|远端链接正文抓取).{0,40}(?:已上线|上线|已发布|可用|已启用|已包含|已支持)/i
  },
  {
    label: "retention overclaim",
    reason:
      "Raw prompts, page bodies, screenshots/base64, clipboard content, and full URLs must not be described as retained or persisted by Aviso.",
    regex:
      /(?:(?:raw\s+prompts?|raw\s+responses?|page\s+bodies|page\s+body|screenshots?\/base64|clipboard\s+content|full\s+URLs?|页面正文|截图\/base64|剪贴板内容|完整\s*URL).{0,80}\b(?:are\s+)?(?:retained|persisted|stored|logged|saved|kept)\b|(?:Aviso|backend|hosted\s+path|Aviso\s+backend).{0,80}\b(?:retains?|persists?|stores?|logs?|saves?|keeps?)\b.{0,80}(?:raw\s+prompts?|raw\s+responses?|page\s+bodies|page\s+body|screenshots?\/base64|clipboard\s+content|full\s+URLs?)|(?:托管后端|后端|Aviso).{0,40}(?:持久化|保存|记录|留存).{0,40}(?:raw\s*prompt|raw\s*response|页面正文|截图\/base64|剪贴板内容|完整\s*URL))/i
  },
  {
    label: "permission scope overclaim",
    reason: "Public permission wording must stay within approved permissions and approved host origins.",
    regex:
      /(?:Aviso|extension|host\s+permissions?|权限|扩展).{0,120}(?:read\s+and\s+change\s+all\s+(?:your\s+)?data|all\s+site\s+data|broad\s+host\s+permissions?|all\s+websites?|all\s+URLs?|抓取任意远端链接正文|广域\s*host\s*permissions|读取并更改所有网站数据)/i
  },
  {
    label: "install CTA overclaim",
    reason:
      "Chrome Web Store install CTA must not be described as currently available before the store link gate passes.",
    regex:
      /(?:(?:official\s+Chrome\s+Web\s+Store\s+install\s+link|Chrome\s+Web\s+Store\s+install\s+link|official\s+store\s+link|store\s+listing\s+URL|install\s+from\s+Chrome\s+Web\s+Store|Add\s+to\s+Chrome).{0,100}\b(?:available\s+now|available|ready|public|published|listed|install\s+now|now)\b|(?:正式商店链接|正式链接|商店链接|Chrome\s+Web\s+Store).{0,80}(?:当前可用|已经可用|可用|立即安装|公开可安装|正式可安装|已上架))/i,
    skipConditionalFuture: true
  }
]

if (isDirectRun()) {
  main()
}

function isDirectRun() {
  return process.argv[1] === fileURLToPath(import.meta.url)
}

function main() {
  console.log("Aviso release-candidate verification")
  console.log("Scope: local tests, supply-chain baseline, typecheck, canonical package output, manifest boundary, claim scan, and hygiene scan.")
  console.log("No deploy, CWS submission, provider call, or secret read is performed.\n")

  if (process.argv.includes("--claim-scan-only")) {
    checkRequiredArtifacts()
    checkCanonicalLoadDirectory()
    checkReleaseSurfaceConsistency()
    runForbiddenClaimsScan()
    console.log("\nRelease claim scan passed.")
    return
  }

  for (const step of commandSteps) {
    runCommandStep(step)
  }

  checkRequiredArtifacts()
  checkCanonicalLoadDirectory()
  checkReleaseSurfaceConsistency()
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

function npmStep(label, args) {
  const npmExecPath = resolveNpmExecPath()
  if (npmExecPath) {
    return {
      label,
      command: process.execPath,
      args: [npmExecPath, ...args],
      displayCommand: ["npm", ...args]
    }
  }
  return {
    label,
    command: "npm",
    args,
    displayCommand: ["npm", ...args]
  }
}

function resolveNpmExecPath() {
  if (process.env.npm_execpath) {
    return process.env.npm_execpath
  }

  for (const dir of (process.env.PATH ?? "").split(":")) {
    if (!dir) {
      continue
    }
    const candidate = join(dir, "npm")
    if (!existsSync(candidate)) {
      continue
    }
    try {
      const real = realpathSync(candidate)
      if (real.endsWith("npm-cli.js")) {
        return real
      }
    } catch {
      // Fall back to spawning npm below.
    }
  }

  return null
}

export function runCommandStep(
  { label, command, args, displayCommand },
  {
    spawnSync: spawn = spawnSync,
    stdout = process.stdout,
    stderr = process.stderr,
    exit = process.exit
  } = {}
) {
  writeLine(stdout, `\n==> ${label}`)
  writeLine(stdout, `$ ${(displayCommand ?? [command, ...args]).join(" ")}`)

  const result = spawn(command, args, {
    encoding: "utf8",
    maxBuffer: 100 * 1024 * 1024
  })
  const childStdout = result.stdout ?? ""
  const childStderr = result.stderr ?? ""

  if (childStdout) {
    stdout.write(childStdout)
  }
  if (childStderr) {
    stderr.write(childStderr)
  }

  if (didSpawnFailBeforeCompletion(result)) {
    const failureOutput = `${result.error?.message ?? ""}\n${childStdout}\n${childStderr}`
    writeLine(
      stderr,
      `\n${label} failed before completion: ${result.error?.message ?? "unknown spawn error"}`
    )
    writeLine(stderr, `Classification: ${classifyCommandFailure(failureOutput)}`)
    exit(1)
    return
  }

  if (result.status !== 0) {
    const output = `${childStdout}\n${childStderr}`
    const classification = classifyCommandFailure(output)
    writeLine(stderr, `\n${label} failed with exit code ${result.status ?? "unknown"}.`)
    writeLine(stderr, `Classification: ${classification}`)
    exit(result.status ?? 1)
  }
}

export function didSpawnFailBeforeCompletion(result) {
  return Boolean(result.error) && result.status == null && result.signal == null
}

export function classifyCommandFailure(output) {
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

function writeLine(stream, line) {
  stream.write(`${line}\n`)
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

function checkReleaseSurfaceConsistency() {
  console.log("\n==> release surface consistency")

  const packageJson = JSON.parse(readFileSync("package.json", "utf8"))
  const version = packageJson.version
  const state = readFileSync("docs/STATE.md", "utf8")
  if (!state.includes(`Current upload/package version: \`${version}\``)) {
    console.error(
      `docs/STATE.md does not record package.json version ${version} as the current upload/package version.`
    )
    process.exit(1)
  }

  for (const manifestPath of [
    "build/chrome-mv3-prod/manifest.json",
    ".output/chrome-mv3/manifest.json"
  ]) {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"))
    if (manifest.version !== version) {
      console.error(
        `${manifestPath} version mismatch: expected ${version}, got ${JSON.stringify(manifest.version)}`
      )
      process.exit(1)
    }
  }

  console.log("ok package.json, docs/STATE.md, and source/final manifests agree on version")
  console.log(
    "ok release scan covers hosted-live, payment, permission, retention, install CTA, website, privacy, store, reviewer-note, evidence, and manifest surfaces"
  )
}

function runForbiddenClaimsScan() {
  console.log("\n==> forbidden release-claim scan")

  const files = listReleaseClaimScanFiles().map((filePath) => ({
    filePath,
    content: readFileSync(filePath, "utf8")
  }))
  const findings = scanForbiddenReleaseClaimsInFiles(files)

  if (findings.length) {
    console.error("Forbidden release claims found:")
    for (const finding of findings) {
      console.error(
        `- ${finding.filePath}:${finding.line} ${finding.label} claim=${JSON.stringify(
          finding.matchedClaim
        )} reason=${finding.reason}`
      )
    }
    process.exit(1)
  }

  console.log(
    "ok no positive hosted-AI live/CWS-approved/no-login quota/payment/web-search/retention/permission/install claims found"
  )
}

export function scanForbiddenReleaseClaimsInFiles(files) {
  const findings = []
  const seen = new Set()

  for (const { filePath, content } of files) {
    for (const record of buildClaimScanRecords(content)) {
      if (isCommandExample(record.text)) {
        continue
      }

      for (const clause of buildScannableReleaseClaimClauses(record.text)) {
        for (const rule of releaseClaimRules) {
          const match = clause.text.match(rule.regex)
          if (!match) {
            continue
          }
          if (rule.skipConditionalFuture && isConditionalFutureClause(clause.text, match)) {
            continue
          }
          if (
            isNegatedReleaseClaimClause(
              clause.text,
              match,
              rule,
              record.text,
              clause.start,
              clause.previousBoundary
            )
          ) {
            continue
          }

          const matchedClaim = sanitizeClaimForOutput(match[0])
          const key = `${filePath}:${record.line}:${rule.label}:${matchedClaim}`
          if (seen.has(key)) {
            continue
          }
          seen.add(key)
          findings.push({
            filePath,
            line: record.line,
            label: rule.label,
            matchedClaim,
            reason: rule.reason
          })
        }
      }
    }
  }

  return findings
}

export function splitReleaseClaimClauses(text) {
  const normalized = normalizeClaimText(text)
  const clauses = []
  const boundary =
    /[|,，;；。!！?？:：()[\]{}]+|\.(?![A-Za-z0-9])|\s+(?:and|or|but|while|whereas|however)\s+|(?:但是|并且|同时|以及|但|而)|(?:和|或|且)(?=(?:Chrome\s*Web\s*Store|CWS|hosted\s*AI|Aviso\s*AI|托管\s*AI|托管路径|已\s*(?:公开\s*上线|公开\s*上架|上线|发布)|公开(?:上线|上架|发布|可用)|正式(?:上线|上架)|审核通过|已通过|已批准|当前可用|已经可用|可用|立即安装|公开可安装|正式可安装|已上架))/giu
  let start = 0
  let previousBoundary = ""
  for (const match of normalized.matchAll(boundary)) {
    pushClause(clauses, normalized.slice(start, match.index), start, previousBoundary)
    previousBoundary = match[0]
    start = match.index + match[0].length
  }
  pushClause(clauses, normalized.slice(start), start, previousBoundary)
  return clauses
}

export function sanitizeClaimForOutput(text) {
  return text
    .replace(/https?:\/\/[^\s"'`<>)]+/gi, "[url]")
    .replace(/[`*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220)
}

export function listReleaseClaimScanFiles() {
  return listTextFiles(releaseClaimScanRoots)
}

function buildClaimScanRecords(content) {
  const lines = linesWithoutFencedBlocks(content)
  const records = []

  lines.forEach((line, index) => {
    if (line.trim()) {
      records.push({ line: index + 1, text: line })
    }

    const next = lines[index + 1]
    if (shouldScanWrappedClaimLine(line, next)) {
      records.push({ line: index + 1, text: `${line.trim()} ${next.trim()}` })
    }
  })

  return records
}

function linesWithoutFencedBlocks(content) {
  const out = []
  let fence = null
  for (const line of content.split(/\r?\n/)) {
    const marker = line.match(/^\s*(```+|~~~+)/)
    if (fence) {
      out.push("")
      if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length) {
        fence = null
      }
    } else if (marker) {
      fence = marker[1]
      out.push("")
    } else {
      out.push(line)
    }
  }
  return out
}

function shouldScanWrappedClaimLine(line, next) {
  const current = line?.trim()
  const following = next?.trim()
  if (!current || !following) {
    return false
  }
  if (/^[#>|-]/.test(following)) {
    return false
  }
  return !/[.!?。！？;；:]$/.test(current)
}

function buildScannableReleaseClaimClauses(text) {
  const clauses = splitReleaseClaimClauses(text)
  const scannable = []
  let inheritedSubject = null
  let previousClause = null

  for (const clause of clauses) {
    if (isHardSentenceBoundary(clause.previousBoundary)) {
      inheritedSubject = null
      previousClause = null
    }

    const subject = extractReleaseClaimSubject(clause.text)
    const canInherit =
      !isHardSentenceBoundary(clause.previousBoundary) &&
      !isNegatedOrPredicateContinuation(clause, previousClause)
    const expandedText =
      subject || !canInherit
        ? clause.text
        : expandElidedReleaseSubject(clause.text, inheritedSubject)

    scannable.push({
      ...clause,
      text: expandedText
    })

    inheritedSubject = subject ?? inheritedSubject
    previousClause = clause
  }

  return scannable
}

function extractReleaseClaimSubject(text) {
  const match = text.match(
    /\b(?:Chrome\s+Web\s+Store|CWS|hosted\s+AI|Aviso\s+AI)\b|(?:Chrome\s*Web\s*Store|CWS|托管\s*AI|托管路径)/i
  )
  return match?.[0] ?? null
}

function expandElidedReleaseSubject(text, subject) {
  if (!subject) {
    return text
  }

  if (/^(?:is|are|has\s+been|have\s+been)\b/i.test(text)) {
    return `${subject} ${text}`
  }

  if (
    /^(?:publicly\s+available|publicly\s+listed|available\s+to\s+the\s+public|live\s+now|live|release-ready|public\s+beta|approved|published|listed|released)\b/i.test(
      text
    )
  ) {
    return `${subject} is ${text}`
  }

  if (
    /^(?:审核通过|已\s*通过|已批准|正式上架|公开上架|已\s*公开\s*上架|已\s*公开\s*上线|已\s*上线|正式上线|公开发布|公开可用|已公开|已\s*发布|可公开使用)/i.test(
      text
    )
  ) {
    return `${subject} ${text}`
  }

  return text
}

function isHardSentenceBoundary(boundary) {
  return /[。.!！?？]/.test(boundary)
}

function isNegatedOrPredicateContinuation(clause, previousClause) {
  return (
    /\bor\b/i.test(clause.previousBoundary) &&
    previousClause &&
    defaultSafeNegationRegex.test(previousClause.text) &&
    startsWithBareReleasePredicate(clause.text)
  )
}

function startsWithBareReleasePredicate(text) {
  return /^(?:publicly\s+available|publicly\s+listed|available\s+to\s+the\s+public|live\s+now|live|release-ready|public\s+beta|approved|published|listed|released)\b/i.test(
    text
  )
}

function pushClause(clauses, text, start, previousBoundary) {
  const trimmed = text.trim()
  if (trimmed) {
    clauses.push({
      text: trimmed,
      start: start + text.indexOf(trimmed),
      previousBoundary
    })
  }
}

function normalizeClaimText(text) {
  return text
    .replace(/[`*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function isNegatedReleaseClaimClause(clause, match, rule, fullText, clauseStart, previousBoundary) {
  const matchStart = clauseStart + match.index
  if (
    isNegatedByInstructionPrefix(fullText, clauseStart) ||
    isNegatedByReleaseStatusPrefix(fullText, clauseStart, previousBoundary) ||
    isMetaClaimReference(fullText, matchStart)
  ) {
    return true
  }

  if (rule.label === "free quota without sign-in overclaim" && isQuotaSignInRequiredClause(clause)) {
    return true
  }

  const negationRegex = rule.safeNegationRegex ?? defaultSafeNegationRegex
  const start = Math.max(0, match.index - 80)
  const end = Math.min(clause.length, match.index + match[0].length + 40)
  const context = clause
    .slice(start, end)
    .replace(/\bnot\s+only\b/gi, "")

  return negationRegex.test(context)
}

function isNegatedByInstructionPrefix(fullText, clauseStart) {
  const prefix = fullText.slice(0, clauseStart)
  const hardBoundary = Math.max(
    prefix.lastIndexOf(";"),
    prefix.lastIndexOf("；"),
    prefix.lastIndexOf("."),
    prefix.lastIndexOf("。"),
    prefix.lastIndexOf("!"),
    prefix.lastIndexOf("！"),
    prefix.lastIndexOf("?"),
    prefix.lastIndexOf("？")
  )
  const currentInstruction = prefix.slice(hardBoundary + 1)
  return (
    /\b(?:do\s+not|don't|must\s+not|should\s+not)\s+(?:say|imply|claim|describe|write|publish|include)\b/i.test(
      currentInstruction
    ) ||
    /(?:不得|不能|不要|不应).{0,20}(?:宣称|暗示|写成|描述|包含|发布)/.test(currentInstruction)
  )
}

function isNegatedByReleaseStatusPrefix(fullText, clauseStart, previousBoundary) {
  if (!/[:：]/.test(previousBoundary)) {
    return false
  }

  const prefix = fullText.slice(0, clauseStart)
  const hardBoundary = Math.max(
    prefix.lastIndexOf(";"),
    prefix.lastIndexOf("；"),
    prefix.lastIndexOf("."),
    prefix.lastIndexOf("。"),
    prefix.lastIndexOf("!"),
    prefix.lastIndexOf("！"),
    prefix.lastIndexOf("?"),
    prefix.lastIndexOf("？")
  )
  const currentPrefix = prefix.slice(hardBoundary + 1)
  return /(?:not\s+ready|not\s+approved|not\s+live|not\s+public|approval\s+pending|pending|incomplete|remain(?:s)?\s+incomplete|still\s+required|未完成|尚未|仍未|待|仍需|需要|未通过|未公开|不(?:是|代表|等于|包含|可用|公开|批准|上线))/i.test(
    currentPrefix
  )
}

function isMetaClaimReference(fullText, matchStart) {
  const before = fullText.slice(Math.max(0, matchStart - 48), matchStart)
  return /\b(?:to\s+claim|claim(?:s|ing)?|say(?:s|ing)?|describe(?:s|d|ing)?|wording)\s*$/i.test(
    before
  )
}

function isQuotaSignInRequiredClause(clause) {
  const hasChineseNoLoginQuota = /免费额度.{0,30}(?:无需登录|不需要登录|免登录)|(?:无需登录|不需要登录|免登录).{0,30}免费额度/i.test(
    clause
  )
  return (
    /\bfree\s+quota\b.{0,50}\b(?:requires?|needs?|is\s+available\s+after|after)\b.{0,30}\b(?:sign-?in|login)\b/i.test(
      clause
    ) ||
    /\bno\s+free\s+quota\b.{0,40}\bwithout\b.{0,30}\b(?:sign-?in|login)\b/i.test(
      clause
    ) ||
    (!hasChineseNoLoginQuota && /免费额度.{0,30}(?:需要登录|登录后|需登录)/i.test(clause))
  )
}

function isConditionalFutureClause(clause, match) {
  const throughMatch = clause.slice(0, match.index + match[0].length)
  return (
    /\b(?:when|once|after|before|if)\b/i.test(throughMatch) ||
    /\b(?:will|would|later|future)\b/i.test(clause) ||
    /(?:可用前|可用后|之前|后续|之后|届时|将|会随|会更新)/.test(clause)
  )
}

function isCommandExample(line) {
  return /^\s*(?:\$ )?(?:rg|grep|npm|npx|node|git)\s/.test(line)
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
