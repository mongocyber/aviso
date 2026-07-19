import { spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  realpathSync,
} from "node:fs"
import { extname, isAbsolute, join, relative, sep } from "node:path"
import { fileURLToPath } from "node:url"

const expectedChromeWebStoreExtensionId = "phigblobbahhecgbcifmkamglcdnghcg"

const commandSteps = [
  nodeStep("supply-chain baseline", ["scripts/check-supply-chain-baseline.mjs"]),
  npmStep("unit tests", ["test"]),
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
  "build/canonical-chrome-mv3-prod/manifest.json",
  "build/canonical-chrome-mv3-prod.zip",
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
  "src/utils/i18n-core.ts",
  "website/README.md",
  "website/src",
  "website/docs",
  "website/i18n/en/docusaurus-plugin-content-docs/current",
  "website/docusaurus.config.ts",
  "website/i18n/en/code.json",
  "website/i18n/en/docusaurus-theme-classic/navbar.json",
  "website/i18n/en/docusaurus-theme-classic/footer.json",
  "store-assets/chrome-web-store",
  "package.json",
  "wxt.config.ts",
  "locales",
  "public/_locales",
  "build/chrome-mv3-prod/manifest.json",
  "build/canonical-chrome-mv3-prod/manifest.json",
  ".output/chrome-mv3/manifest.json"
]

const maxReleaseClaimWindowLines = 3
const maxReleaseClaimWindowChars = 260

const approvedReleaseScanTextExtensions = new Set([
  ".cjs",
  ".css",
  ".html",
  ".js",
  ".json",
  ".jsonc",
  ".jsx",
  ".md",
  ".mdx",
  ".mjs",
  ".sh",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml"
])

const defaultSafeNegationRegex =
  /\b(?:not|never|without|pending|blocked|forbidden|excluded|unavailable|cannot|can't|isn't|aren't|hasn't|doesn't|don't|does\s+not|do\s+not|is\s+not|are\s+not|has\s+not|have\s+not|must\s+not|should\s+not|no)\b|不|未|无|没有|不是|不能|不会|尚未|待|排除|暂不可用|不可用/i

const freeQuotaSafeNegationRegex =
  /\b(?:not|never|pending|blocked|forbidden|excluded|unavailable|cannot|can't|isn't|aren't|hasn't|doesn't|don't|does\s+not|do\s+not|is\s+not|are\s+not|has\s+not|have\s+not|must\s+not|should\s+not)\b|不(?:是|会|能|可|应)|未|没有|尚未|待|排除|暂不可用|不可用/i

const apiKeySubjectPattern = String.raw`(?:\bAPI\s*keys?\b|API\s*密钥|API\s*密匙|密钥)`
const apiKeyProtectionPredicatePattern = String.raw`(?:AES[-\s]?256\s*(?:encrypted|加密)?|encrypted\s+with\s+AES[-\s]?256|strong(?:ly)?\s+encrypted(?:\s+locally)?|strong\s+encryption|securely\s+encrypted|military[-\s]?grade(?:\s+(?:encryption|encrypted))?|HSM|hardware\s+security\s+module|hardware[-\s]?backed|keychain|secure\s+enclave|end-to-end|zero[- ]knowledge|completely\s+secure|fully\s+secure|totally\s+secure|absolutely\s+secure|compromise-resistant|强加密|安全加密|军用级(?:加密)?(?:.{0,30}(?:硬件安全模块|HSM))?|系统钥匙串|钥匙串|secure\s+enclave|安全硬件|hardware-backed|硬件级|硬件安全模块|端到端|zero[- ]knowledge|零知识|绝对安全|完全安全)`
const apiKeyProtectionPredicateRegex = new RegExp(apiKeyProtectionPredicatePattern, "i")
const apiKeyProtectionOverclaimRegex = new RegExp(
  `${apiKeySubjectPattern}.{0,80}${apiKeyProtectionPredicatePattern}`,
  "i"
)

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
    label: "API-key protection overclaim",
    reason:
      "API-key storage is local encryption/obfuscation only; it must not be described as AES-256, strong, hardware, keychain, end-to-end, zero-knowledge, or compromise-resistant protection.",
    regex: apiKeyProtectionOverclaimRegex
  },
  {
    label: "project backend absence overclaim",
    reason:
      "Aviso has an optional hosted-AI backend path; public copy must not claim the project has no server or no backend.",
    regex:
      /(?:\bAviso\b.{0,50}\b(?:has|needs|uses)\s+no\s+(?:project-owned\s+)?(?:server|backend)\b|\bno\s+Aviso\s+(?:project-owned\s+)?(?:server|backend)\b(?:\s+involved\b(?:\s+in\s+requests?)?)?|\bAviso\b.{0,50}\b(?:serverless|no-backend)\b|Aviso.{0,20}(?:没有|不设|无需|不需要)(?:项目方)?(?:服务器|后端)|\bwithout\s+an?\s+Aviso\s+(?:middle\s+)?(?:server|backend)\b|(?:\b(?:requests?|AI\s+requests?)\b.{0,20}(?:do\s+not|does\s+not|don['’]t|doesn['’]t)\s+go\s+through\s+us\b)|(?:请求|AI\s*请求)\s*不\s*经过\s*我们|不经过\s*Aviso\s*中间服务器)/i,
    safeNegationRegex: /$^/
  },
  {
    label: "unscoped direct-provider overclaim",
    reason:
      "Direct browser-to-provider routing is true for BYOK; hosted AI requests pass through the Aviso backend after the user chooses hosted AI and signs in.",
    regex:
      /(?:\bWhen\s+(?:you|the\s+user)\s+(?:start|actively\s+triggers?)\s+an?\s+AI\s+(?:request|action)\b(?:(?:(?!\bBYOK\b|\bAviso\s+AI\b).){0,220})(?:(?:browser|browser\s+extension).{0,120}(?:connects?|sends?|sent).{0,80}(?:directly|direct).{0,120}(?:model\s+provider(?:\s+you\s+choose)?|provider(?:\s+you\s+choose)?)|(?:content|required\s+content).{0,80}(?:is\s+)?sent\s+directly.{0,80}(?:browser|browser\s+extension).{0,120}(?:model\s+provider|user-selected\s+provider|provider))|(?:\b(?:all|every)\s+(?:AI\s+)?(?:requests?|traffic)\b.{0,80}(?:go(?:es)?|route(?:s)?|flow(?:s)?|connect(?:s)?|are\s+sent|is\s+sent|send(?:s)?)\b.{0,80}(?:directly|direct).{0,80}(?:providers?|model\s+providers?))|(?:你|用户)主动发起\s*AI\s*(?:请求|操作)时(?:(?!(?:BYOK|Aviso\s+AI|托管)).){0,220}(?:浏览器|浏览器扩展).{0,120}(?:直接发送|直连).{0,120}(?:provider|模型厂商|模型\s*provider)|(?:所有|全部|每次|一切)\s*(?:AI\s*)?(?:请求|流量|操作).{0,60}(?:浏览器|浏览器扩展).{0,60}(?:直连|直接发送).{0,80}(?:所选)?(?:provider|模型厂商|模型\s*provider|厂商))/i
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

  const manifestPath = "build/canonical-chrome-mv3-prod/manifest.json"
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"))
  const serviceWorker = manifest.background?.service_worker

  if (serviceWorker === "static/background/index.js") {
    console.error(
      "build/canonical-chrome-mv3-prod looks like stale/direct Plasmo output: background.service_worker is static/background/index.js"
    )
    console.error("Run npm run package and load build/canonical-chrome-mv3-prod only after it has been regenerated from WXT.")
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

  console.log("ok load build/canonical-chrome-mv3-prod, not .output/chrome-mv3")
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

function nodeStep(label, args) {
  return {
    label,
    command: process.execPath,
    args,
    displayCommand: ["node", ...args]
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
  if (/Operation not permitted|EACCES|EPERM|EROFS/i.test(output)) {
    return "environment or sandbox permission failure; rerun in an allowed local environment before treating this as a code regression"
  }
  if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|registry\.npmjs|registry\.npmmirror|fetch failed/i.test(output)) {
    return "environment or dependency registry/network failure; restore local dependencies before treating this as a code regression"
  }
  if (/Cannot find package|ERR_MODULE_NOT_FOUND/i.test(output)) {
    return "missing local dependency install; restore dependencies from the lockfile before treating this as a code regression"
  }
  if (
    /missing .*manifest\.json|missing .*chrome-mv3-prod\.zip|missing .*canonical-chrome-mv3-prod\.zip|run both build paths first|regenerate the final directory and zip/i.test(
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
    "build/canonical-chrome-mv3-prod/manifest.json",
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
    "ok release scan covers hosted-live, payment, permission, retention, API-key protection, backend/direct-routing, install CTA, website/privacy docs, Popup copy, recursive Chrome Web Store text assets, release evidence, and manifest surfaces"
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
    "ok no positive hosted-AI live/CWS-approved/no-login quota/payment/web-search/retention/API-key protection/backend/direct-routing/permission/install claims found"
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
          const findingLine = record.lineForOffset(resolveReleaseClaimMatchSourceOffset(clause, match))
          const key = `${filePath}:${findingLine}:${rule.label}:${matchedClaim}`
          if (seen.has(key)) {
            continue
          }
          seen.add(key)
          findings.push({
            filePath,
            line: findingLine,
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
  const normalizedClaim = normalizeClaimTextWithSourceMap(text)
  const normalized = normalizedClaim.text
  const clauses = []
  const boundary =
    /[|,，;；。!！?？:：()[\]{}]+|\.(?![A-Za-z0-9])|\s*[—–]\s*|\s*\/\s*|\s+because\s+(?=(?:they|it|these|those)\b)|\s+(?:and|or|but|while|whereas|however|although|yet)\s+|(?:但是|并且|同时|以及|但|而)|(?:和|或|且)(?=(?:Chrome\s*Web\s*Store|CWS|hosted\s*AI|Aviso\s*AI|托管\s*AI|托管路径|已\s*(?:公开\s*上线|公开\s*上架|上线|发布)|公开(?:上线|上架|发布|可用)|正式(?:上线|上架)|审核通过|已通过|已批准|当前可用|已经可用|可用|立即安装|公开可安装|正式可安装|已上架))/giu
  let start = 0
  let previousBoundary = ""
  for (const match of normalized.matchAll(boundary)) {
    if (isNegatedYetPredicateBoundary(normalized, match.index, match[0])) {
      continue
    }
    if (shouldKeepSlashInsideToken(normalized, match.index, match[0])) {
      continue
    }
    if (shouldKeepCommaInsideUnscopedDirectClaim(normalized, match.index, match[0])) {
      continue
    }

    pushClause(
      clauses,
      normalized.slice(start, match.index),
      start,
      previousBoundary,
      normalizedClaim.sourceOffsets
    )
    previousBoundary = match[0]
    start = match.index + match[0].length
  }
  pushClause(
    clauses,
    normalized.slice(start),
    start,
    previousBoundary,
    normalizedClaim.sourceOffsets
  )
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
  return [...new Set(listTextFiles(releaseClaimScanRoots))].sort()
}

export function normalizeReleaseClaimScanPath(path) {
  return path
    .replace(/\\/g, "/")
    .split("/")
    .filter((part) => part && part !== ".")
    .join("/")
}

function buildClaimScanRecords(content) {
  const lines = linesWithoutFencedBlocks(content)
  const records = []

  lines.forEach((line, index) => {
    if (line.trim()) {
      records.push(
        buildClaimScanRecord([{ lineNumber: index + 1, text: line.trim() }])
      )
    }

    const logicalWindow = [{ lineNumber: index + 1, text: line.trim() }]
    for (
      let end = index + 1;
      end < lines.length && logicalWindow.length < maxReleaseClaimWindowLines;
      end += 1
    ) {
      if (!shouldScanWrappedClaimLine(lines[end - 1], lines[end])) {
        break
      }

      logicalWindow.push({ lineNumber: end + 1, text: lines[end].trim() })
      const record = buildClaimScanRecord(logicalWindow)
      if (record.text.length > maxReleaseClaimWindowChars) {
        break
      }
      records.push(record)
    }
  })

  return records
}

function buildClaimScanRecord(lines) {
  const lineStarts = []
  let cursor = 0
  const text = lines
    .map((line, index) => {
      if (index > 0) {
        cursor += 1
      }
      lineStarts.push({ offset: cursor, line: line.lineNumber })
      cursor += line.text.length
      return line.text
    })
    .join(" ")

  return {
    line: lines[0]?.lineNumber ?? 1,
    text,
    lineForOffset(offset) {
      let line = lineStarts[0]?.line ?? 1
      for (const lineStart of lineStarts) {
        if (lineStart.offset > offset) {
          break
        }
        line = lineStart.line
      }
      return line
    }
  }
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
  if (isClaimScanBlockBoundaryLine(current) || isClaimScanBlockBoundaryLine(following)) {
    return false
  }
  if (/[.!?。！？]$/.test(current)) {
    return false
  }
  if (/[;；:：]$/.test(current)) {
    return startsWithWrappedClaimContinuation(following)
  }
  return true
}

function isClaimScanBlockBoundaryLine(line) {
  return /^(?:#{1,6}\s|>\s?|[-*+]\s+|\d+[.)]\s+)/.test(line)
}

function startsWithWrappedClaimContinuation(text) {
  return (
    /^(?:(?:they|these|those)\s+(?:are|remain|stay|use|uses|have|has)|it\s+(?:is|remains|stays|uses|has))\s+/i.test(
      text
    ) ||
    /^(?:is|are|has\s+been|have\s+been|publicly\s+available|publicly\s+listed|available\s+to\s+the\s+public|live\s+now|live|release-ready|public\s+beta|approved|published|listed|released)\b/i.test(
      text
    ) ||
    /^(?:审核通过|已\s*通过|已批准|正式上架|公开上架|已\s*公开\s*上架|已\s*公开\s*上线|已\s*上线|正式上线|公开发布|公开可用|已公开|已\s*发布|可公开使用)/i.test(
      text
    ) ||
    startsWithDirectProviderContinuation(text) ||
    /^(?:requests?|AI\s+requests?)\s+(?:do\s+not|does\s+not|don['’]t|doesn['’]t)\s+go\s+through\s+us\b/i.test(
      text
    ) ||
    /^(?:请求|AI\s*请求)\s*不\s*经过\s*我们/.test(text)
  )
}

function buildScannableReleaseClaimClauses(text) {
  const clauses = splitReleaseClaimClauses(text)
  const scannable = []
  let inheritedReleaseSubject = null
  let inheritedApiKeySubject = null
  let inheritedDirectProviderIntro = null
  let previousClause = null

  for (const clause of clauses) {
    if (isHardSentenceBoundary(clause.previousBoundary)) {
      inheritedReleaseSubject = null
      inheritedApiKeySubject = null
      inheritedDirectProviderIntro = null
      previousClause = null
    }

    const releaseSubject = extractReleaseClaimSubject(clause.text)
    const apiKeySubject = extractApiKeyClaimSubject(clause.text)
    const directProviderIntro = extractDirectProviderIntro(clause.text)
    const candidates = [clause]

    const canInheritReleaseSubject =
      !isHardSentenceBoundary(clause.previousBoundary) &&
      !isNegatedOrPredicateContinuation(clause, previousClause)
    if (!releaseSubject && canInheritReleaseSubject) {
      const expandedClause = expandElidedReleaseSubject(clause, inheritedReleaseSubject)
      if (expandedClause !== clause) {
        candidates.push({
          ...clause,
          ...expandedClause
        })
      }
    }

    if (!apiKeySubject && canInheritApiKeySubject(clause, inheritedApiKeySubject)) {
      const expandedClause = expandElidedApiKeySubject(clause, inheritedApiKeySubject)
      if (expandedClause !== clause) {
        candidates.push({
          ...clause,
          ...expandedClause
        })
      }
    }

    if (!directProviderIntro && canInheritDirectProviderIntro(clause, inheritedDirectProviderIntro)) {
      const expandedClause = expandElidedDirectProviderIntro(
        clause,
        inheritedDirectProviderIntro
      )
      if (expandedClause !== clause) {
        candidates.push({
          ...clause,
          ...expandedClause
        })
      }
    }

    scannable.push(...candidates)

    if (releaseSubject) {
      inheritedReleaseSubject = {
        text: releaseSubject.text,
        sourceOffsets: clause.sourceOffsets.slice(
          releaseSubject.index,
          releaseSubject.index + releaseSubject.text.length
        )
      }
    }
    if (apiKeySubject) {
      inheritedApiKeySubject = {
        text: apiKeySubject.text,
        sourceOffsets: clause.sourceOffsets.slice(
          apiKeySubject.index,
          apiKeySubject.index + apiKeySubject.text.length
        )
      }
    }
    if (directProviderIntro) {
      inheritedDirectProviderIntro = {
        text: directProviderIntro.text,
        sourceOffsets: clause.sourceOffsets.slice(
          directProviderIntro.index,
          directProviderIntro.index + directProviderIntro.text.length
        )
      }
    }
    previousClause = clause
  }

  return scannable
}

function extractReleaseClaimSubject(text) {
  const match = text.match(
    /\b(?:Chrome\s+Web\s+Store|CWS|hosted\s+AI|Aviso\s+AI)\b|(?:Chrome\s*Web\s*Store|CWS|托管\s*AI|托管路径)/i
  )
  return match
    ? {
        text: match[0],
        index: match.index ?? 0
      }
    : null
}

function extractApiKeyClaimSubject(text) {
  const match = text.match(new RegExp(apiKeySubjectPattern, "i"))
  return match
    ? {
        text: match[0],
        index: match.index ?? 0
      }
    : null
}

function extractDirectProviderIntro(text) {
  const match = text.match(
    /\bWhen\s+(?:you|the\s+user)\s+(?:start|actively\s+triggers?)\s+an?\s+AI\s+(?:request|action)(?:\s+(?:with\s+(?:BYOK|(?:(?:your|their|the\s+user'?s|users'?)\s+own|own)\s+API\s*keys?)|(?:in\s+the\s+BYOK\s+path)|(?:using\s+BYOK)))?\b|(?:你|用户)主动发起\s*AI\s*(?:请求|操作)时/i
  )
  return match
    ? {
        text: match[0],
        index: match.index ?? 0
      }
    : null
}

function expandElidedReleaseSubject(clause, subject) {
  if (!subject) {
    return clause
  }

  const continuation = stripLeadingReleaseConnector(clause.text, clause.sourceOffsets)

  if (/^(?:is|are|has\s+been|have\s+been)\b/i.test(continuation.text)) {
    return buildExpandedClause(subject, [" "], continuation)
  }

  if (
    /^(?:publicly\s+available|publicly\s+listed|available\s+to\s+the\s+public|live\s+now|live|release-ready|public\s+beta|approved|published|listed|released)\b/i.test(
      continuation.text
    )
  ) {
    return buildExpandedClause(subject, [" is "], continuation)
  }

  if (
    /^(?:审核通过|已\s*通过|已批准|正式上架|公开上架|已\s*公开\s*上架|已\s*公开\s*上线|已\s*上线|正式上线|公开发布|公开可用|已公开|已\s*发布|可公开使用)/i.test(
      continuation.text
    )
  ) {
    return buildExpandedClause(subject, [" "], continuation)
  }

  return clause
}

function canInheritApiKeySubject(clause, subject) {
  if (!subject || isHardSentenceBoundary(clause.previousBoundary)) {
    return false
  }

  const continuation = stripLeadingApiKeyPronoun(clause.text, clause.sourceOffsets)
  return Boolean(continuation && apiKeyProtectionPredicateRegex.test(continuation.text))
}

function expandElidedApiKeySubject(clause, subject) {
  if (!subject) {
    return clause
  }

  const continuation = stripLeadingApiKeyPronoun(clause.text, clause.sourceOffsets)
  if (!continuation) {
    return clause
  }

  return buildExpandedClause(subject, [apiKeySubjectLinkingVerb(subject.text)], continuation)
}

function canInheritDirectProviderIntro(clause, intro) {
  if (!intro || isHardSentenceBoundary(clause.previousBoundary)) {
    return false
  }

  const continuation = stripLeadingDirectProviderConnector(clause.text, clause.sourceOffsets)
  return startsWithDirectProviderContinuation(continuation.text)
}

function expandElidedDirectProviderIntro(clause, intro) {
  if (!intro) {
    return clause
  }

  const continuation = stripLeadingDirectProviderConnector(clause.text, clause.sourceOffsets)
  if (!startsWithDirectProviderContinuation(continuation.text)) {
    return clause
  }

  return buildExpandedClause(intro, [directProviderIntroLink(intro.text)], continuation)
}

function stripLeadingDirectProviderConnector(text, sourceOffsets) {
  const match = text.match(/^(?:and|or|but|then|so|while|whereas|however|although)\s+/i)
  if (!match) {
    return { text, sourceOffsets }
  }

  const start = match[0].length
  return {
    text: text.slice(start),
    sourceOffsets: sourceOffsets.slice(start)
  }
}

function startsWithDirectProviderContinuation(text) {
  return /^(?:(?:the\s+)?browser(?:\s+extension)?|your\s+browser)\s+(?:connects?|talks?|sends?|sent|routes?|flows?)\b|^(?:content|required\s+content)\s+(?:is\s+)?sent\s+directly\b|^(?:内容|所需内容).{0,20}(?:由)?(?:浏览器|浏览器扩展)|^(?:浏览器|浏览器扩展).{0,40}(?:直接发送|直连)/i.test(
    text
  )
}

function directProviderIntroLink(text) {
  return /(?:你|用户)/.test(text) ? "，" : ", "
}

function stripLeadingApiKeyPronoun(text, sourceOffsets) {
  const match = text.match(
    /^(?:(?:they|these|those)\s+(?:are|remain|stay|use|uses|have|has)|it\s+(?:is|remains|stays|uses|has))\s+/i
  )
  if (!match) {
    return null
  }

  const start = match[0].length
  return {
    text: text.slice(start),
    sourceOffsets: sourceOffsets.slice(start)
  }
}

function apiKeySubjectLinkingVerb(subject) {
  return /\bAPI\s*keys\b/i.test(subject) ? " are " : " is "
}

function buildExpandedClause(subject, syntheticParts, continuation) {
  const syntheticOffset =
    subject.sourceOffsets[subject.sourceOffsets.length - 1] ?? continuation.sourceOffsets[0] ?? 0
  return {
    text: `${subject.text}${syntheticParts.join("")}${continuation.text}`,
    start: subject.sourceOffsets[0] ?? continuation.sourceOffsets[0] ?? 0,
    findingSourceOffset: continuation.sourceOffsets[0] ?? subject.sourceOffsets[0] ?? 0,
    sourceOffsets: [
      ...subject.sourceOffsets,
      ...syntheticParts.flatMap((part) => Array.from(part, () => syntheticOffset)),
      ...continuation.sourceOffsets
    ]
  }
}

function stripLeadingReleaseConnector(text, sourceOffsets) {
  const match = text.match(/^(?:and|or|but|while|whereas|however|although)\s+/i)
  if (!match) {
    return { text, sourceOffsets }
  }

  const start = match[0].length
  return {
    text: text.slice(start),
    sourceOffsets: sourceOffsets.slice(start)
  }
}

function isHardSentenceBoundary(boundary) {
  return /[|。.!！?？]/.test(boundary)
}

function isNegatedOrPredicateContinuation(clause, previousClause) {
  return (
    /\bor\b/i.test(clause.previousBoundary) &&
    previousClause &&
    defaultSafeNegationRegex.test(previousClause.text) &&
    startsWithBareReleasePredicate(clause.text)
  )
}

function isNegatedYetPredicateBoundary(text, boundaryIndex, boundary) {
  if (!/^\s+yet\s+$/i.test(boundary)) {
    return false
  }

  const before = text.slice(0, boundaryIndex).trimEnd()
  const after = text.slice(boundaryIndex + boundary.length).trimStart()
  return (
    /\b(?:not|isn['’]?t|aren['’]?t|can['’]?t|cannot|doesn['’]?t|don['’]?t|hasn['’]?t|haven['’]?t|wasn['’]?t|weren['’]?t)$/i.test(
      before
    ) && startsWithBareReleasePredicate(after)
  )
}

function shouldKeepSlashInsideToken(text, boundaryIndex, boundary) {
  const slashOffset = boundary.indexOf("/")
  if (slashOffset === -1) {
    return false
  }

  const slashIndex = boundaryIndex + slashOffset
  const tokenStart = text.slice(0, slashIndex).search(/\S+$/)
  const tokenEndMatch = text.slice(slashIndex + 1).match(/\S+/)
  const leftTokenStart = tokenStart === -1 ? slashIndex : tokenStart
  const rightTokenEnd = tokenEndMatch
    ? slashIndex + 1 + tokenEndMatch.index + tokenEndMatch[0].length
    : slashIndex + 1
  const token = text.slice(leftTokenStart, rightTokenEnd)

  if (/^https?:\/\//i.test(token)) {
    return true
  }

  const left = text.slice(leftTokenStart, slashIndex)
  const right = text.slice(slashIndex + 1, rightTokenEnd)
  return /(?:\bscreenshots?|截图)$/i.test(left) && /^base64\b/i.test(right)
}

function shouldKeepCommaInsideUnscopedDirectClaim(text, boundaryIndex, boundary) {
  if (!/^[,，]$/.test(boundary)) {
    return false
  }

  const before = text.slice(Math.max(0, boundaryIndex - 90), boundaryIndex)
  const after = text.slice(boundaryIndex + boundary.length, boundaryIndex + boundary.length + 220)
  return (
    /(?:\bWhen\s+(?:you|the\s+user)\s+(?:start|actively\s+triggers?)\s+an?\s+AI\s+(?:request|action)\b|(?:你|用户)主动发起\s*AI\s*(?:请求|操作)时)/i.test(
      before
    ) &&
    /(?:browser|browser\s+extension|content|required\s+content|浏览器|浏览器扩展|内容|所需内容)/i.test(
      after
    ) &&
    /(?:directly|direct|直接发送|直连)/i.test(after)
  )
}

function startsWithBareReleasePredicate(text) {
  return /^(?:publicly\s+available|publicly\s+listed|available\s+to\s+the\s+public|live\s+now|live|release-ready|public\s+beta|approved|published|listed|released)\b/i.test(
    text
  )
}

function pushClause(clauses, text, start, previousBoundary, sourceOffsets) {
  const trimmed = text.trim()
  if (trimmed) {
    const trimStart = text.indexOf(trimmed)
    const normalizedStart = start + trimStart
    const normalizedEnd = normalizedStart + trimmed.length
    const clauseSourceOffsets = sourceOffsets.slice(normalizedStart, normalizedEnd)
    clauses.push({
      text: trimmed,
      start: clauseSourceOffsets[0] ?? normalizedStart,
      sourceOffsets: clauseSourceOffsets,
      previousBoundary
    })
  }
}

function normalizeClaimText(text) {
  return normalizeClaimTextWithSourceMap(text).text
}

function normalizeClaimTextWithSourceMap(text) {
  const normalized = []
  const sourceOffsets = []
  let pendingWhitespaceOffset = null

  for (let index = 0; index < text.length; index += 1) {
    const urlEnd = findClaimScanUrlTokenEnd(text, index)
    if (urlEnd != null) {
      if (pendingWhitespaceOffset != null && normalized.length > 0) {
        normalized.push(" ")
        sourceOffsets.push(pendingWhitespaceOffset)
      }
      pendingWhitespaceOffset = null
      for (const char of "[url]") {
        normalized.push(char)
        sourceOffsets.push(index)
      }
      index = urlEnd - 1
      continue
    }

    const char = text[index]
    if (/[`*_~]/.test(char)) {
      continue
    }

    if (/\s/.test(char)) {
      pendingWhitespaceOffset ??= index
      continue
    }

    if (pendingWhitespaceOffset != null && normalized.length > 0) {
      normalized.push(" ")
      sourceOffsets.push(pendingWhitespaceOffset)
    }
    pendingWhitespaceOffset = null
    normalized.push(char)
    sourceOffsets.push(index)
  }

  return {
    text: normalized.join(""),
    sourceOffsets
  }
}

function findClaimScanUrlTokenEnd(text, start) {
  const match = text.slice(start).match(/^https?:\/\/[^\s"'`<>)]+/i)
  if (!match) {
    return null
  }

  let end = start + match[0].length
  while (end > start && /[.,!?;:，。！？；：]$/.test(text.slice(end - 1, end))) {
    end -= 1
  }
  return end > start ? end : start + match[0].length
}

function isNegatedReleaseClaimClause(clause, match, rule, fullText, clauseStart, previousBoundary) {
  const matchStart = clauseStart + match.index
  if (
    isNegatedByInstructionPrefix(fullText, clauseStart) ||
    isNegatedByReleaseStatusPrefix(fullText, clauseStart, previousBoundary) ||
    isNonAssertionClaimContext(fullText, matchStart) ||
    isMetaClaimReference(fullText, matchStart)
  ) {
    return true
  }

  if (rule.label === "free quota without sign-in overclaim" && isQuotaSignInRequiredClause(clause)) {
    return true
  }
  if (rule.label === "API-key protection overclaim") {
    return isNegatedApiKeyProtectionClause(clause, match)
  }
  if (
    rule.label === "unscoped direct-provider overclaim" &&
    isScopedDirectProviderClause(clause, match, fullText, clauseStart)
  ) {
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

function resolveReleaseClaimMatchSourceOffset(clause, match) {
  if (clause.findingSourceOffset != null) {
    return clause.findingSourceOffset
  }

  if (clause.sourceOffsets?.[match.index] != null) {
    return clause.sourceOffsets[match.index]
  }

  return (clause.sourceStart ?? clause.start) + (match.index ?? 0)
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

function isNonAssertionClaimContext(fullText, matchStart) {
  const before = fullText.slice(Math.max(0, matchStart - 80), matchStart)
  return (
    /\b(?:it\s+is\s+)?false\s+that\s*$/i.test(before) ||
    /\b(?:do\s+not|don't|must\s+not|should\s+not)\s+(?:say|imply|claim|describe|write|publish|include)\s+(?:that\s+)?$/i.test(
      before
    ) ||
    /(?:不得|不能|不要|不应).{0,20}(?:宣称|声称|暗示|写成|描述|包含|发布)\s*$/.test(before)
  )
}

function isNegatedApiKeyProtectionClause(clause, match) {
  const matchedText = match[0]
  const predicateMatch = matchedText.match(apiKeyProtectionPredicateRegex)
  if (!predicateMatch) {
    return false
  }

  const beforePredicate = matchedText.slice(0, predicateMatch.index ?? 0)
  return /(?:\b(?:not|never|without|isn['’]?t|aren['’]?t|no)\s+|不(?:是|会|能|可|应)?\s*)$/i.test(
    beforePredicate
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

function isScopedDirectProviderClause(clause, match, fullText, clauseStart) {
  if (
    /^(?:\s*\b(?:all|every)\s+(?:AI\s+)?(?:requests?|traffic)\b|\s*(?:所有|全部|每次|一切)\s*(?:AI\s*)?(?:请求|流量|操作))/i.test(
      match[0]
    )
  ) {
    return false
  }

  const matchEnd = match.index + match[0].length
  const clauseThroughMatch = clause.slice(0, matchEnd)
  if (hasDirectProviderScopeMarker(clauseThroughMatch)) {
    return true
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
  return hasDirectProviderScopeMarker(currentPrefix)
}

function hasDirectProviderScopeMarker(text) {
  return /\bBYOK\b|direct-provider|\b(?:your|their|the\s+user'?s|users'?|own)\s+own\s+API\s*keys?\b|\b(?:your|their|the\s+user'?s|users'?|own)\s+provider\s+keys?\b|自带\s*API\s*Key|自备\s*API\s*Key|自己的\s*API\s*Key|BYOK\s*(?:路径|模式)/i.test(
    text
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
    "build/canonical-chrome-mv3-prod",
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
  const canonicalRepoRoot = realpathSync(process.cwd())
  for (const path of paths) {
    if (!existsSync(path)) {
      continue
    }
    collectTextFiles(path, files, new Set(), canonicalRepoRoot)
  }
  return files
}

function collectTextFiles(path, files, visitedDirectories, canonicalRepoRoot) {
  const stats = lstatSync(path)
  if (stats.isSymbolicLink()) {
    return
  }

  let realPath
  try {
    realPath = realpathSync(path)
  } catch {
    return
  }
  if (!isPathInsideCanonicalRoot(canonicalRepoRoot, realPath)) {
    return
  }

  const normalizedPath = normalizeReleaseClaimScanPath(path)
  if (stats.isDirectory()) {
    if (shouldSkipDirectory(normalizedPath)) {
      return
    }

    if (visitedDirectories.has(realPath)) {
      return
    }
    visitedDirectories.add(realPath)

    for (const entry of readdirSync(path).sort()) {
      collectTextFiles(join(path, entry), files, visitedDirectories, canonicalRepoRoot)
    }
    return
  }

  if (!stats.isFile() || shouldSkipFile(normalizedPath, stats.size)) {
    return
  }

  const buffer = readFileSync(path)
  if (isLikelyText(buffer)) {
    files.push(normalizedPath)
  }
}

function isPathInsideCanonicalRoot(canonicalRepoRoot, realPath) {
  const relativePath = relative(canonicalRepoRoot, realPath)
  return (
    relativePath === "" ||
    (relativePath !== ".." && !relativePath.startsWith(`..${sep}`) && !isAbsolute(relativePath))
  )
}

function shouldSkipDirectory(path) {
  const normalizedPath = normalizeReleaseClaimScanPath(path)
  if (normalizedPath === "store-assets/chrome-web-store/output") {
    return true
  }

  const parts = normalizedPath.split("/").filter(Boolean)
  return parts.some((part) =>
    [
      ".git",
      "node_modules",
      ".cache",
      ".parcel-cache",
      ".plasmo",
      ".wxt",
      "coverage",
      "generated",
      "output"
    ].includes(part)
  )
}

function shouldSkipFile(path, size) {
  if (size > 8 * 1024 * 1024) {
    return true
  }

  return !approvedReleaseScanTextExtensions.has(extname(path).toLowerCase())
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
