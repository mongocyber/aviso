import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync
} from "node:fs"
import { dirname, isAbsolute, join, posix, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"

export const evidencePackSchemaVersion = "aviso.v013.release-evidence-pack.v1"

export const evidencePackSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://aviso.local/schemas/v013-release-evidence-pack.schema.json",
  title: "Aviso V013 Immutable Release Evidence Pack",
  type: "object",
  additionalProperties: false,
  required: [
    "schemaVersion",
    "releaseLine",
    "generatedAt",
    "generator",
    "repositories",
    "contract",
    "boundEvidence",
    "verificationCommands",
    "qaEvidence",
    "externalGates"
  ],
  properties: {
    schemaVersion: { const: evidencePackSchemaVersion },
    releaseLine: { const: "V013" },
    generatedAt: { type: "string", format: "date-time" },
    generator: {
      type: "object",
      additionalProperties: false,
      required: ["name", "version", "mode"],
      properties: {
        name: { const: "scripts/release-evidence-pack.mjs" },
        version: { type: "integer", minimum: 1 },
        mode: { const: "local-only-no-live-provider-calls" }
      }
    },
    repositories: {
      type: "object",
      additionalProperties: false,
      required: ["frontend", "backend"],
      properties: {
        frontend: { $ref: "#/$defs/repositoryBinding" },
        backend: { $ref: "#/$defs/repositoryBinding" }
      }
    },
    contract: {
      type: "object",
      additionalProperties: false,
      required: ["version"],
      properties: {
        version: { const: "V013" }
      }
    },
    boundEvidence: {
      type: "object",
      additionalProperties: false,
      required: [
        "prd",
        "contract",
        "supabaseMigrations",
        "creemAdapterFixtures",
        "packageArtifacts",
        "publicCopy",
        "assets"
      ],
      properties: {
        prd: { $ref: "#/$defs/fileEvidenceList" },
        contract: { $ref: "#/$defs/fileEvidenceList" },
        supabaseMigrations: { $ref: "#/$defs/fileEvidenceList" },
        creemAdapterFixtures: { $ref: "#/$defs/fileEvidenceList" },
        packageArtifacts: { $ref: "#/$defs/fileEvidenceList" },
        publicCopy: { $ref: "#/$defs/fileEvidenceList" },
        assets: { $ref: "#/$defs/fileEvidenceList" }
      }
    },
    verificationCommands: {
      type: "array",
      minItems: 1,
      items: { $ref: "#/$defs/verificationCommand" }
    },
    qaEvidence: {
      type: "array",
      minItems: 1,
      items: { $ref: "#/$defs/evidenceGate" }
    },
    externalGates: {
      type: "array",
      minItems: 1,
      items: { $ref: "#/$defs/evidenceGate" }
    }
  },
  $defs: {
    repositoryBinding: {
      type: "object",
      additionalProperties: false,
      required: ["name", "commit"],
      properties: {
        name: { type: "string", minLength: 1 },
        commit: { pattern: "^[0-9a-fA-F]{40}$", type: "string" }
      }
    },
    fileEvidence: {
      type: "object",
      additionalProperties: false,
      required: ["label", "repository", "path", "sourceCommit"],
      properties: {
        label: { type: "string", minLength: 1 },
        repository: { enum: ["frontend", "backend"] },
        path: { type: "string", minLength: 1 },
        sha256: { pattern: "^sha256:[0-9a-f]{64}$", type: "string" },
        sourceCommit: { pattern: "^[0-9a-fA-F]{40}$", type: "string" },
        status: { enum: ["present", "missing"] }
      },
      allOf: [
        {
          if: {
            properties: { status: { const: "present" } }
          },
          then: {
            required: ["sha256"]
          }
        }
      ]
    },
    fileEvidenceList: {
      type: "array",
      items: { $ref: "#/$defs/fileEvidence" }
    },
    verificationCommand: {
      type: "object",
      additionalProperties: false,
      required: ["label", "command", "exitCode", "evidenceRefs"],
      properties: {
        label: { type: "string", minLength: 1 },
        command: { type: "string", minLength: 1 },
        exitCode: { type: ["integer", "null"] },
        evidenceRefs: {
          type: "array",
          items: { $ref: "#/$defs/fileEvidence" }
        }
      }
    },
    evidenceGate: {
      type: "object",
      additionalProperties: false,
      required: ["key", "label", "status", "evidenceRefs"],
      properties: {
        key: { type: "string", minLength: 1 },
        label: { type: "string", minLength: 1 },
        status: {
          enum: ["passed", "waived", "blocked", "pending", "missing", "not_applicable"]
        },
        openCriticalImportantFindings: {
          type: ["integer", "null"],
          minimum: 0
        },
        reason: { type: "string" },
        evidenceRefs: {
          type: "array",
          items: { $ref: "#/$defs/fileEvidence" }
        }
      }
    }
  }
}

const commitShaRegex = /^[0-9a-fA-F]{40}$/
const sha256Regex = /^sha256:[0-9a-f]{64}$/

const defaultFrontendRepository = "mongocyber/aviso"
const defaultBackendRepository = "mongocyber/aviso-backend"

const defaultPrdPaths = ["docs/prd.md"]
const defaultContractPaths = [
  "docs/architecture/supabase-auth-migration.md",
  "docs/acceptance-criteria.md",
  "docs/tech-spec.md"
]
const defaultPackageArtifactPaths = [
  "package.json",
  "package-lock.json",
  "build/canonical-chrome-mv3-prod/manifest.json",
  "build/canonical-chrome-mv3-prod.zip",
  "build/manifest-evidence/plasmo-manifest.json"
]
const defaultPublicCopyPaths = [
  "README.md",
  "STATUS.md",
  "RELEASE_CHECKLIST.md",
  "docs/STATE.md",
  "docs/ai/CURRENT_GATE.md",
  "docs/privacy-and-security.md",
  "store-assets/chrome-web-store/STORE_LISTING_COPY.md",
  "website/docs/intro.md",
  "website/docs/privacy-policy.md",
  "website/docs/data-permissions.md",
  "website/i18n/en/docusaurus-plugin-content-docs/current/intro.md",
  "website/i18n/en/docusaurus-plugin-content-docs/current/privacy-policy.md",
  "website/i18n/en/docusaurus-plugin-content-docs/current/data-permissions.md"
]
const defaultAssetPaths = [
  "assets/icon.png",
  "public/icon-16.png",
  "public/icon-32.png",
  "public/icon-48.png",
  "public/icon-64.png",
  "public/icon-128.png",
  "store-assets/chrome-web-store/output/icon-128.png",
  "store-assets/chrome-web-store/output/promo-small-440x280.png",
  "store-assets/chrome-web-store/output/promo-marquee-1400x560.png"
]

const defaultVerificationCommands = [
  {
    label: "supply-chain baseline",
    command: "npm run supply-chain:check",
    exitCode: null,
    evidenceRefs: []
  },
  {
    label: "unit tests",
    command: "npm test",
    exitCode: null,
    evidenceRefs: []
  },
  {
    label: "typecheck",
    command: "npx tsc --noEmit",
    exitCode: null,
    evidenceRefs: []
  },
  {
    label: "release candidate verifier",
    command: "npm run verify:release-candidate",
    exitCode: null,
    evidenceRefs: []
  },
  {
    label: "immutable evidence pack verifier",
    command: "npm run evidence:verify -- --pack <artifact>",
    exitCode: null,
    evidenceRefs: []
  }
]

const requiredQaEvidence = [
  {
    key: "loadedExtensionQa",
    label: "Loaded extension QA",
    status: "missing",
    evidenceRefs: []
  }
]

const requiredExternalGates = [
  {
    key: "independentSpecReview",
    label: "Independent spec review",
    status: "missing",
    openCriticalImportantFindings: null,
    evidenceRefs: []
  },
  {
    key: "independentSecurityCodeReview",
    label: "Independent security/code review",
    status: "missing",
    openCriticalImportantFindings: null,
    evidenceRefs: []
  },
  {
    key: "chromeWebStoreApproval",
    label: "Chrome Web Store approval",
    status: "missing",
    evidenceRefs: []
  },
  {
    key: "ownerReleaseApproval",
    label: "Owner release approval",
    status: "missing",
    evidenceRefs: []
  },
  {
    key: "supabaseMigrationGate",
    label: "Supabase migration gate",
    status: "missing",
    evidenceRefs: []
  },
  {
    key: "creemAdapterGate",
    label: "Creem adapter gate",
    status: "missing",
    evidenceRefs: []
  }
]

export function hashFile(path) {
  return `sha256:${createHash("sha256").update(readFileSync(path)).digest("hex")}`
}

export function generateEvidencePack(options = {}) {
  const frontendRoot = resolve(options.frontendRoot ?? process.cwd())
  const backendRoot = options.backendRoot ? resolve(options.backendRoot) : undefined
  const frontendSha = options.frontendSha ?? gitOutput(frontendRoot, ["rev-parse", "HEAD"])
  const backendSha = options.backendSha ?? ""

  assertExactCommitInput("frontendSha", frontendSha)
  if (backendSha) {
    assertExactCommitInput("backendSha", backendSha)
  }

  const roots = {
    backend: backendRoot,
    frontend: frontendRoot
  }
  const commits = {
    backend: backendSha,
    frontend: frontendSha
  }

  return {
    schemaVersion: evidencePackSchemaVersion,
    releaseLine: "V013",
    generatedAt: new Date().toISOString(),
    generator: {
      name: "scripts/release-evidence-pack.mjs",
      version: 1,
      mode: "local-only-no-live-provider-calls"
    },
    repositories: {
      frontend: {
        name: options.frontendRepository ?? defaultFrontendRepository,
        commit: frontendSha
      },
      backend: {
        name: options.backendRepository ?? defaultBackendRepository,
        commit: backendSha
      }
    },
    contract: {
      version: options.contractVersion ?? "V013"
    },
    boundEvidence: {
      prd: buildFileRefs({
        paths: options.prdPaths ?? defaultPrdPaths,
        repository: "frontend",
        root: frontendRoot,
        sourceCommit: frontendSha
      }),
      contract: buildFileRefs({
        paths: options.contractPaths ?? defaultContractPaths,
        repository: "frontend",
        root: frontendRoot,
        sourceCommit: frontendSha
      }),
      supabaseMigrations: buildFileRefs({
        paths: options.supabaseMigrationPaths ?? collectSupabaseMigrationPaths(backendRoot),
        repository: "backend",
        root: backendRoot,
        sourceCommit: backendSha
      }),
      creemAdapterFixtures: buildFileRefs({
        paths: options.creemAdapterFixturePaths ?? collectCreemAdapterFixturePaths(backendRoot),
        repository: "backend",
        root: backendRoot,
        sourceCommit: backendSha
      }),
      packageArtifacts: buildFileRefs({
        paths: options.packageArtifactPaths ?? defaultPackageArtifactPaths,
        repository: "frontend",
        root: frontendRoot,
        sourceCommit: frontendSha
      }),
      publicCopy: buildFileRefs({
        paths: options.publicCopyPaths ?? defaultPublicCopyPaths,
        repository: "frontend",
        root: frontendRoot,
        sourceCommit: frontendSha
      }),
      assets: buildFileRefs({
        paths: options.assetPaths ?? defaultAssetPaths,
        repository: "frontend",
        root: frontendRoot,
        sourceCommit: frontendSha
      })
    },
    verificationCommands: normalizeVerificationCommands(
      options.verificationCommands ?? defaultVerificationCommands,
      roots,
      commits
    ),
    qaEvidence: mergeEvidenceGates(requiredQaEvidence, options.qaEvidence ?? [], roots, commits),
    externalGates: mergeEvidenceGates(
      requiredExternalGates,
      options.externalGates ?? [],
      roots,
      commits
    )
  }
}

export function verifyEvidencePack(pack, options = {}) {
  const reasons = []
  const roots = {
    backend: options.roots?.backend ? resolve(options.roots.backend) : undefined,
    frontend: options.roots?.frontend ? resolve(options.roots.frontend) : undefined
  }
  const commits = {
    backend: pack?.repositories?.backend?.commit,
    frontend: pack?.repositories?.frontend?.commit
  }

  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    return {
      status: "BLOCKED",
      reasons: ["pack must be a JSON object"]
    }
  }

  scanMutableReferences(pack, "$", reasons)
  verifySchemaSurface(pack, reasons)
  verifyRepositoryBindings(pack, roots, reasons)
  verifyBoundEvidence(pack, roots, commits, reasons)
  verifyVerificationCommands(pack, roots, commits, reasons)
  verifyEvidenceGateList({
    commits,
    gates: pack.qaEvidence,
    label: "qaEvidence",
    reasons,
    required: requiredQaEvidence,
    roots
  })
  verifyEvidenceGateList({
    commits,
    gates: pack.externalGates,
    label: "externalGates",
    reasons,
    required: requiredExternalGates,
    roots
  })

  return {
    status: reasons.length === 0 ? "PASS" : "BLOCKED",
    reasons
  }
}

export function formatVerificationReport(result) {
  if (result.status === "PASS") {
    return "PASS: immutable release evidence pack binds all required V013 evidence."
  }

  return [
    "BLOCKED: immutable release evidence pack is incomplete or changed.",
    ...result.reasons.map((reason) => `- ${reason}`)
  ].join("\n")
}

function assertExactCommitInput(name, value) {
  if (!commitShaRegex.test(value)) {
    throw new Error(`${name} must be a 40-character commit SHA; mutable refs are not accepted`)
  }
}

function buildFileRefs({ paths, repository, root, sourceCommit }) {
  return [...new Set(paths)].sort().map((path) =>
    buildFileRef({
      label: path,
      path,
      repository,
      root,
      sourceCommit
    })
  )
}

function buildFileRef({ label, path, repository, root, sourceCommit }) {
  const normalizedPath = normalizeEvidencePath(path)
  const base = {
    label,
    repository,
    path: normalizedPath,
    sourceCommit
  }

  if (!root) {
    return {
      ...base,
      status: "missing"
    }
  }

  const absPath = join(root, normalizedPath)
  if (!isInside(root, absPath) || !existsSync(absPath) || !lstatSync(absPath).isFile()) {
    return {
      ...base,
      status: "missing"
    }
  }

  return {
    ...base,
    sha256: hashFile(absPath),
    status: "present"
  }
}

function normalizeVerificationCommands(commands, roots, commits) {
  return commands.map((command) => ({
    label: command.label,
    command: command.command,
    exitCode: command.exitCode ?? null,
    evidenceRefs: normalizeEvidenceRefs(command.evidenceRefs ?? [], roots, commits)
  }))
}

function mergeEvidenceGates(required, provided, roots, commits) {
  const byKey = new Map(required.map((gate) => [gate.key, { ...gate }]))

  for (const gate of provided) {
    const prior = byKey.get(gate.key) ?? {}
    byKey.set(gate.key, {
      ...prior,
      ...gate,
      evidenceRefs: normalizeEvidenceRefs(gate.evidenceRefs ?? [], roots, commits)
    })
  }

  return [...byKey.values()].map((gate) => ({
    ...gate,
    evidenceRefs: normalizeEvidenceRefs(gate.evidenceRefs ?? [], roots, commits)
  }))
}

function normalizeEvidenceRefs(refs, roots, commits) {
  return refs.map((ref) => {
    const repository = ref.repository
    const root = roots[repository]
    const sourceCommit = ref.sourceCommit ?? commits[repository]
    const normalizedPath = normalizeEvidencePath(ref.path)
    const normalized = {
      ...ref,
      path: normalizedPath,
      sourceCommit
    }

    if (ref.sha256) {
      return {
        ...normalized,
        status: ref.status ?? "present"
      }
    }

    return buildFileRef({
      label: ref.label,
      path: normalizedPath,
      repository,
      root,
      sourceCommit
    })
  })
}

function collectSupabaseMigrationPaths(root) {
  if (!root || !existsSync(root)) {
    return []
  }

  return listFiles(root).filter((path) => {
    const lower = path.toLowerCase()
    return lower.endsWith(".sql") && lower.includes("supabase/migrations/")
  })
}

function collectCreemAdapterFixturePaths(root) {
  if (!root || !existsSync(root)) {
    return []
  }

  return listFiles(root).filter((path) => {
    const lower = path.toLowerCase()
    const isFixture =
      lower.includes("fixture") ||
      lower.includes("fixtures/") ||
      lower.includes("test/") ||
      lower.includes("tests/")
    const isSupportedFixture = /\.(json|jsonl|mjs|ts|tsx)$/.test(lower)
    return lower.includes("creem") && isFixture && isSupportedFixture
  })
}

function listFiles(root) {
  const out = []
  walk(root, "")
  return out.sort()

  function walk(absDir, relDir) {
    for (const entry of readdirSync(absDir, { withFileTypes: true })) {
      if (entry.name === ".git" || entry.name === "node_modules") {
        continue
      }

      const relPath = relDir ? `${relDir}/${entry.name}` : entry.name
      const absPath = join(absDir, entry.name)
      if (entry.isDirectory()) {
        walk(absPath, relPath)
      } else if (entry.isFile()) {
        out.push(relPath)
      }
    }
  }
}

function verifySchemaSurface(pack, reasons) {
  if (pack.schemaVersion !== evidencePackSchemaVersion) {
    reasons.push(`schemaVersion must be ${evidencePackSchemaVersion}`)
  }
  if (pack.releaseLine !== "V013") {
    reasons.push("releaseLine must be V013; stale V012 evidence cannot satisfy MON-49")
  }
  if (pack.contract?.version !== "V013") {
    reasons.push("contract.version must be V013; stale V012 contract evidence cannot satisfy MON-49")
  }
  if (pack.generator?.mode !== "local-only-no-live-provider-calls") {
    reasons.push("generator.mode must be local-only-no-live-provider-calls")
  }
}

function verifyRepositoryBindings(pack, roots, reasons) {
  verifyCommitField(pack.repositories?.frontend?.commit, "repositories.frontend.commit", reasons)
  verifyCommitField(pack.repositories?.backend?.commit, "repositories.backend.commit", reasons)

  if (!roots.frontend) {
    reasons.push("repositories.frontend.root is required to verify bound frontend file hashes")
  } else {
    verifyGitCommitExists(roots.frontend, pack.repositories?.frontend?.commit, "repositories.frontend.commit", reasons)
  }

  if (!roots.backend) {
    reasons.push("repositories.backend.root is required to verify bound backend file hashes")
  } else {
    verifyGitCommitExists(roots.backend, pack.repositories?.backend?.commit, "repositories.backend.commit", reasons)
  }
}

function verifyCommitField(value, label, reasons) {
  if (!commitShaRegex.test(value ?? "")) {
    reasons.push(`${label} must be a 40-character commit SHA`)
  }
}

function verifyGitCommitExists(root, commit, label, reasons) {
  if (!commitShaRegex.test(commit ?? "")) {
    return
  }

  try {
    gitOutput(root, ["cat-file", "-e", `${commit}^{commit}`])
  } catch {
    reasons.push(`${label} ${commit} is not present in ${root}`)
  }
}

function verifyBoundEvidence(pack, roots, commits, reasons) {
  const evidence = pack.boundEvidence ?? {}
  verifyFileRefList({
    commits,
    label: "boundEvidence.prd",
    minItems: 1,
    refs: evidence.prd,
    reasons,
    roots
  })
  verifyFileRefList({
    commits,
    label: "boundEvidence.contract",
    minItems: 1,
    refs: evidence.contract,
    reasons,
    roots
  })
  verifyFileRefList({
    commits,
    label: "boundEvidence.supabaseMigrations",
    minItems: 1,
    refs: evidence.supabaseMigrations,
    reasons,
    roots
  })
  verifyFileRefList({
    commits,
    label: "boundEvidence.creemAdapterFixtures",
    minItems: 1,
    refs: evidence.creemAdapterFixtures,
    reasons,
    roots
  })
  verifyFileRefList({
    commits,
    label: "boundEvidence.packageArtifacts",
    minItems: 4,
    refs: evidence.packageArtifacts,
    reasons,
    roots
  })
  verifyFileRefList({
    commits,
    label: "boundEvidence.publicCopy",
    minItems: 1,
    refs: evidence.publicCopy,
    reasons,
    roots
  })
  verifyFileRefList({
    commits,
    label: "boundEvidence.assets",
    minItems: 1,
    refs: evidence.assets,
    reasons,
    roots
  })
}

function verifyVerificationCommands(pack, roots, commits, reasons) {
  if (!Array.isArray(pack.verificationCommands) || pack.verificationCommands.length === 0) {
    reasons.push("verificationCommands must include at least one command with exitCode 0")
    return
  }

  pack.verificationCommands.forEach((command, index) => {
    const label = `verificationCommands[${index}]`
    if (!command?.label) {
      reasons.push(`${label}.label is required`)
    }
    if (!command?.command) {
      reasons.push(`${label}.command is required`)
    }
    if (command?.exitCode !== 0) {
      reasons.push(`${label}.exitCode must be 0`)
    }
    verifyFileRefList({
      commits,
      label: `${label}.evidenceRefs`,
      minItems: 1,
      refs: command?.evidenceRefs,
      reasons,
      roots
    })
  })
}

function verifyEvidenceGateList({ commits, gates, label, reasons, required, roots }) {
  if (!Array.isArray(gates)) {
    reasons.push(`${label} must be an array`)
    return
  }

  for (const requiredGate of required) {
    const gate = gates.find((candidate) => candidate?.key === requiredGate.key)
    const gateLabel = `${label}.${requiredGate.key}`
    if (!gate) {
      reasons.push(`${gateLabel} is required`)
      continue
    }

    if (gate.status !== "passed" && gate.status !== "waived") {
      reasons.push(`${gateLabel} must be passed or waived, got ${JSON.stringify(gate.status)}`)
    }

    if (
      (gate.key === "independentSpecReview" ||
        gate.key === "independentSecurityCodeReview") &&
      gate.openCriticalImportantFindings !== 0
    ) {
      reasons.push(`${gateLabel}.openCriticalImportantFindings must be 0`)
    }

    if (gate.status === "waived" && !gate.reason) {
      reasons.push(`${gateLabel}.reason is required when status is waived`)
    }

    verifyFileRefList({
      commits,
      label: `${gateLabel}.evidenceRefs`,
      minItems: 1,
      refs: gate.evidenceRefs,
      reasons,
      roots
    })
  }
}

function verifyFileRefList({ commits, label, refs, minItems, reasons, roots }) {
  const minItemsLabel = minItems === 1 ? "one" : String(minItems)
  if (!Array.isArray(refs)) {
    reasons.push(`${label} must include at least ${minItemsLabel} content-hashed file reference(s)`)
    return
  }

  if (refs.length < minItems) {
    reasons.push(`${label} must include at least ${minItemsLabel} content-hashed file reference(s)`)
  }

  refs.forEach((ref, index) => verifyFileRef(ref, `${label}[${index}]`, roots, commits, reasons))
}

function verifyFileRef(ref, label, roots, commits, reasons) {
  if (!ref || typeof ref !== "object") {
    reasons.push(`${label} must be a file evidence object`)
    return
  }

  if (ref.repository !== "frontend" && ref.repository !== "backend") {
    reasons.push(`${label}.repository must be frontend or backend`)
    return
  }

  if (!ref.label) {
    reasons.push(`${label}.label is required`)
  }

  const normalizedPath = validateEvidencePath(ref.path, `${label}.path`, reasons)
  if (!sha256Regex.test(ref.sha256 ?? "")) {
    reasons.push(`${label}.sha256 must be sha256:<64 lowercase hex chars>`)
  }

  const expectedCommit = commits?.[ref.repository]
  if (expectedCommit && ref.sourceCommit !== expectedCommit) {
    reasons.push(`${label}.sourceCommit must match ${ref.repository} repository commit`)
  }

  if (isStaleReleaseEvidencePath(ref.path)) {
    reasons.push(`${label}.path points at stale V012 evidence and cannot satisfy MON-49`)
  }

  const root = roots[ref.repository]
  if (!root) {
    reasons.push(`${label} repository root is required to verify ${ref.path}`)
    return
  }

  if (!normalizedPath || !sha256Regex.test(ref.sha256 ?? "")) {
    return
  }

  const absPath = join(root, normalizedPath)
  if (!isInside(root, absPath) || !existsSync(absPath) || !lstatSync(absPath).isFile()) {
    reasons.push(`${label} missing file ${normalizedPath}`)
    return
  }

  const actualHash = hashFile(absPath)
  if (actualHash !== ref.sha256) {
    reasons.push(`${label} hash mismatch for ${normalizedPath}: expected ${ref.sha256}, got ${actualHash}`)
  }

  if (expectedCommit && commitShaRegex.test(expectedCommit)) {
    const gitObjectHash = tryHashGitFile(root, expectedCommit, normalizedPath)
    if (gitObjectHash && gitObjectHash !== ref.sha256) {
      reasons.push(
        `${label} git object hash mismatch for ${normalizedPath} at ${expectedCommit}: expected ${ref.sha256}, got ${gitObjectHash}`
      )
    }
  }
}

function validateEvidencePath(path, label, reasons) {
  if (typeof path !== "string" || path.length === 0) {
    reasons.push(`${label} is required`)
    return null
  }

  let normalized
  try {
    normalized = normalizeEvidencePath(path)
  } catch (error) {
    reasons.push(`${label} ${error.message}`)
    return null
  }

  if (normalized !== path) {
    reasons.push(`${label} must be normalized relative POSIX path ${JSON.stringify(normalized)}`)
  }
  return normalized
}

function scanMutableReferences(value, path, reasons) {
  if (typeof value === "string") {
    const mutable = mutableReferenceLabel(value)
    if (mutable) {
      reasons.push(`${path} mutable reference "${mutable}" is not allowed; use an exact commit SHA or sha256 content hash`)
    }
    return
  }

  if (!value || typeof value !== "object") {
    return
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => scanMutableReferences(item, `${path}[${index}]`, reasons))
    return
  }

  for (const [key, nested] of Object.entries(value)) {
    if (key.toLowerCase().includes("branch")) {
      reasons.push(`${path}.${key} branch fields are mutable and not allowed in an evidence pack`)
    }
    scanMutableReferences(nested, `${path}.${key}`, reasons)
  }
}

function mutableReferenceLabel(value) {
  const trimmed = value.trim()
  const lower = trimmed.toLowerCase()

  if (
    lower === "latest" ||
    lower === "head" ||
    lower === "main" ||
    lower === "master" ||
    lower.startsWith("origin/") ||
    lower.startsWith("refs/heads/") ||
    lower.startsWith("refs/remotes/") ||
    lower.startsWith("refs/tags/latest") ||
    /^integration\/[a-z0-9._/-]+$/i.test(trimmed)
  ) {
    return trimmed
  }

  const embedded = embeddedMutableReferenceLabel(trimmed)
  if (embedded) {
    return embedded
  }

  return null
}

function embeddedMutableReferenceLabel(value) {
  const tokenBoundary = "(?:^|[\\s\"'`=,;:([{])"
  const tokenEnd = "(?=$|[\\s\"'`,;:)\\]}])"
  const packageName = String.raw`(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+`
  const mutableDistTag = String.raw`(?:latest|next|beta|alpha|rc|canary|dev|nightly|experimental|stable)`
  const mutableSemverRange = String.raw`(?:[\^~]\d+(?:\.\d+){0,2}(?:[-+][0-9a-z.-]+)?|\*|[xX]|\d+(?:\.(?:[xX]|\*))+(?:[-+][0-9a-z.-]+)?|\d+(?:\.\d+)?)`

  const embeddedPackageRef = new RegExp(
    `${tokenBoundary}(${packageName}@(?:${mutableDistTag}|${mutableSemverRange}))${tokenEnd}`,
    "i"
  )
  const packageRefMatch = value.match(embeddedPackageRef)
  if (packageRefMatch) {
    return packageRefMatch[1]
  }

  const gitRefTail = "[^\\s\"'`,;:)\\]}]+"
  const embeddedGitRef = new RegExp(
    `${tokenBoundary}((?:origin|refs\\/(?:heads|remotes|tags))\\/${gitRefTail}|integration\\/[a-z0-9._/-]+)${tokenEnd}`,
    "i"
  )
  const gitRefMatch = value.match(embeddedGitRef)
  if (gitRefMatch) {
    return gitRefMatch[1]
  }

  const gitCommandOperand = embeddedGitCommandOperandLabel(value)
  if (gitCommandOperand) {
    return gitCommandOperand
  }

  return null
}

function embeddedGitCommandOperandLabel(value) {
  const gitRefOperandCommands = new Set([
    "checkout",
    "diff",
    "log",
    "merge",
    "pull",
    "rebase",
    "reset",
    "show",
    "switch"
  ])
  const mutableBranchOperands = new Set(["head", "main", "master"])
  const tokens = commandTokens(value)

  for (let index = 0; index < tokens.length; index += 1) {
    if (tokens[index].toLowerCase() !== "git") {
      continue
    }

    for (let commandIndex = index + 1; commandIndex < tokens.length; commandIndex += 1) {
      const commandToken = tokens[commandIndex]
      if (isCommandSeparator(commandToken)) {
        break
      }
      if (commandToken.startsWith("-")) {
        commandIndex += gitOptionValueCount(commandToken)
        continue
      }

      const command = commandToken.toLowerCase()
      if (!gitRefOperandCommands.has(command)) {
        break
      }

      for (let operandIndex = commandIndex + 1; operandIndex < tokens.length; operandIndex += 1) {
        const operandToken = tokens[operandIndex]
        if (isCommandSeparator(operandToken)) {
          break
        }
        if (operandToken.startsWith("-")) {
          operandIndex += gitOptionValueCount(operandToken)
          continue
        }

        const refOperand = normalizeGitRefOperandToken(operandToken)
        if (mutableBranchOperands.has(refOperand.toLowerCase())) {
          return refOperand
        }
      }
      break
    }
  }

  return null
}

function commandTokens(value) {
  return value.match(/&&|\|\||[;|]|[^\s"'`,;|()[\]{}]+/g) ?? []
}

function isCommandSeparator(token) {
  return token === "&&" || token === "||" || token === ";" || token === "|"
}

function gitOptionValueCount(option) {
  if (option.includes("=")) {
    return 0
  }
  return new Set(["-C", "-c", "--config-env", "--git-dir", "--namespace", "--work-tree"]).has(option)
    ? 1
    : 0
}

function normalizeGitRefOperandToken(token) {
  const colonIndex = token.indexOf(":")
  return colonIndex === -1 ? token : token.slice(0, colonIndex)
}

function normalizeEvidencePath(path) {
  if (typeof path !== "string" || path.length === 0) {
    throw new Error("is required")
  }
  if (isAbsolute(path)) {
    throw new Error("must be relative, not absolute")
  }
  if (path.includes("\\")) {
    throw new Error("must use POSIX / separators")
  }

  const normalized = posix.normalize(path)
  if (normalized === "." || normalized.startsWith("../") || normalized === "..") {
    throw new Error("must stay inside its repository root")
  }
  return normalized
}

function isStaleReleaseEvidencePath(path) {
  return /(^|\/)(?:v012|v0\.12|aviso-v012)(?:\/|$)|integration\/aviso-v012/i.test(path ?? "")
}

function gitOutput(root, args) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  }).trim()
}

function tryHashGitFile(root, commit, path) {
  try {
    const content = execFileSync("git", ["show", `${commit}:${path}`], {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"]
    })
    return `sha256:${createHash("sha256").update(content).digest("hex")}`
  } catch {
    return null
  }
}

function isInside(root, target) {
  const relativePath = relative(resolve(root), resolve(target))
  return relativePath === "" || (!relativePath.startsWith("..") && !isAbsolute(relativePath))
}

function parseArgs(argv) {
  const out = { _: [] }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (!arg.startsWith("--")) {
      out._.push(arg)
      continue
    }

    const key = arg.slice(2)
    const next = argv[index + 1]
    if (!next || next.startsWith("--")) {
      out[key] = true
    } else {
      out[key] = next
      index += 1
    }
  }

  return out
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"))
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
}

function main() {
  const [command, ...rest] = process.argv.slice(2)
  const args = parseArgs(rest)

  if (command === "schema") {
    if (args.out) {
      writeJson(resolve(String(args.out)), evidencePackSchema)
    } else {
      process.stdout.write(`${JSON.stringify(evidencePackSchema, null, 2)}\n`)
    }
    return
  }

  if (command === "generate") {
    if (!args["backend-sha"]) {
      throw new Error("generate requires --backend-sha <40-character SHA>")
    }

    const frontendRoot = resolve(String(args["frontend-root"] ?? "."))
    const pack = generateEvidencePack({
      backendRoot: args["backend-root"] ? resolve(String(args["backend-root"])) : undefined,
      backendSha: String(args["backend-sha"]),
      contractVersion: String(args["contract-version"] ?? "V013"),
      frontendRoot,
      frontendSha: args["frontend-sha"]
        ? String(args["frontend-sha"])
        : gitOutput(frontendRoot, ["rev-parse", "HEAD"])
    })

    if (args.out) {
      writeJson(resolve(String(args.out)), pack)
    } else {
      process.stdout.write(`${JSON.stringify(pack, null, 2)}\n`)
    }
    return
  }

  if (command === "verify") {
    const packPath = args.pack ? resolve(String(args.pack)) : undefined
    if (!packPath) {
      throw new Error("verify requires --pack <evidence-pack.json>")
    }

    const result = verifyEvidencePack(readJson(packPath), {
      roots: {
        backend: args["backend-root"] ? resolve(String(args["backend-root"])) : undefined,
        frontend: resolve(String(args["frontend-root"] ?? "."))
      }
    })
    console.log(formatVerificationReport(result))
    process.exitCode = result.status === "PASS" ? 0 : 1
    return
  }

  console.error(
    [
      "Usage:",
      "  node scripts/release-evidence-pack.mjs schema [--out docs/release/v013-evidence-pack.schema.json]",
      "  node scripts/release-evidence-pack.mjs generate --backend-sha <sha> [--backend-root <path>] [--frontend-sha <sha>] [--out <path>]",
      "  node scripts/release-evidence-pack.mjs verify --pack <path> [--frontend-root <path>] [--backend-root <path>]"
    ].join("\n")
  )
  process.exitCode = 2
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main()
}
