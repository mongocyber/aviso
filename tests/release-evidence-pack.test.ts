import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { test } from "node:test"

import {
  generateEvidencePack,
  hashFile,
  verifyEvidencePack,
  type EvidencePack,
  type EvidencePackVerificationResult
} from "../scripts/release-evidence-pack.mjs"

const repoRoot = new URL("..", import.meta.url).pathname
const minimumBackendSha = "f30f6cccb1f7805d8ef95975a425c0c97c26379c"

function git(root: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8"
  }).trim()
}

function currentFrontendSha(): string {
  return git(repoRoot, ["rev-parse", "HEAD"])
}

function makeSyntheticRepo(name: string, files: Record<string, string>): {
  commit: string
  root: string
} {
  const root = mkdtempSync(join(tmpdir(), `aviso-${name}-`))
  git(root, ["init", "-q"])
  git(root, ["config", "user.name", "Aviso Test"])
  git(root, ["config", "user.email", "aviso-test@example.invalid"])

  for (const [path, content] of Object.entries(files)) {
    const absPath = join(root, path)
    mkdirSync(dirname(absPath), { recursive: true })
    writeFileSync(absPath, content)
  }

  git(root, ["add", "."])
  git(root, ["commit", "-qm", "synthetic MON-49 evidence fixture"])
  return { root, commit: git(root, ["rev-parse", "HEAD"]) }
}

function completeSyntheticPack(): {
  backendRoot: string
  frontendRoot: string
  pack: EvidencePack
} {
  const frontend = makeSyntheticRepo("frontend", {
    "docs/prd.md": "# Synthetic V013 PRD fixture\n",
    "docs/architecture/supabase-auth-migration.md": "# Synthetic V013 contract fixture\n",
    "package.json": "{\"name\":\"synthetic-aviso\"}\n",
    "package-lock.json": "{\"lockfileVersion\":3}\n",
    "build/canonical-chrome-mv3-prod/manifest.json": "{\"manifest_version\":3,\"name\":\"Aviso\"}\n",
    "build/canonical-chrome-mv3-prod.zip": "synthetic zip bytes\n",
    "store-assets/chrome-web-store/STORE_LISTING_COPY.md": "Synthetic public copy fixture for V013.\n",
    "public/icon-128.png": "synthetic asset bytes\n",
    "evidence/qa/loaded-extension.md": "Synthetic QA PASS fixture for tests only.\n",
    "evidence/reviews/spec.md": "Synthetic independent spec review PASS fixture for tests only.\n",
    "evidence/reviews/security-code.md":
      "Synthetic independent security/code review PASS fixture for tests only.\n",
    "evidence/external/cws.md": "Synthetic CWS gate PASS fixture for tests only.\n",
    "evidence/external/owner.md": "Synthetic owner release approval PASS fixture for tests only.\n",
    "evidence/external/supabase.md": "Synthetic Supabase migration gate PASS fixture for tests only.\n",
    "evidence/external/creem.md": "Synthetic Creem billing gate PASS fixture for tests only.\n",
    "evidence/commands/npm-test.log": "Synthetic command output fixture: npm test exited 0.\n"
  })
  const backend = makeSyntheticRepo("backend", {
    "supabase/migrations/20260804000000_v013.sql": "-- Synthetic V013 migration fixture\n",
    "tests/fixtures/creem/subscription-active.json":
      "{\"fixture\":\"synthetic-creem-adapter-pass\"}\n"
  })

  const commandEvidenceRef = {
    label: "synthetic npm test output",
    repository: "frontend" as const,
    path: "evidence/commands/npm-test.log",
    sha256: hashFile(join(frontend.root, "evidence/commands/npm-test.log")),
    sourceCommit: frontend.commit
  }

  const pack = generateEvidencePack({
    assetPaths: ["public/icon-128.png"],
    backendRoot: backend.root,
    backendSha: backend.commit,
    contractPaths: ["docs/architecture/supabase-auth-migration.md"],
    contractVersion: "V013",
    externalGates: [
      {
        key: "independentSpecReview",
        label: "Independent spec review",
        openCriticalImportantFindings: 0,
        status: "passed",
        evidenceRefs: [
          {
            label: "synthetic independent spec review fixture",
            repository: "frontend",
            path: "evidence/reviews/spec.md"
          }
        ]
      },
      {
        key: "independentSecurityCodeReview",
        label: "Independent security/code review",
        openCriticalImportantFindings: 0,
        status: "passed",
        evidenceRefs: [
          {
            label: "synthetic independent security/code review fixture",
            repository: "frontend",
            path: "evidence/reviews/security-code.md"
          }
        ]
      },
      {
        key: "chromeWebStoreApproval",
        label: "Chrome Web Store approval",
        status: "passed",
        evidenceRefs: [
          {
            label: "synthetic Chrome Web Store gate fixture",
            repository: "frontend",
            path: "evidence/external/cws.md"
          }
        ]
      },
      {
        key: "ownerReleaseApproval",
        label: "Owner release approval",
        status: "passed",
        evidenceRefs: [
          {
            label: "synthetic owner approval fixture",
            repository: "frontend",
            path: "evidence/external/owner.md"
          }
        ]
      },
      {
        key: "supabaseMigrationGate",
        label: "Supabase migration gate",
        status: "passed",
        evidenceRefs: [
          {
            label: "synthetic Supabase gate fixture",
            repository: "frontend",
            path: "evidence/external/supabase.md"
          }
        ]
      },
      {
        key: "creemAdapterGate",
        label: "Creem adapter gate",
        status: "passed",
        evidenceRefs: [
          {
            label: "synthetic Creem gate fixture",
            repository: "frontend",
            path: "evidence/external/creem.md"
          }
        ]
      }
    ],
    frontendRoot: frontend.root,
    frontendSha: frontend.commit,
    packageArtifactPaths: [
      "package.json",
      "package-lock.json",
      "build/canonical-chrome-mv3-prod/manifest.json",
      "build/canonical-chrome-mv3-prod.zip"
    ],
    prdPaths: ["docs/prd.md"],
    publicCopyPaths: ["store-assets/chrome-web-store/STORE_LISTING_COPY.md"],
    qaEvidence: [
      {
        key: "loadedExtensionQa",
        label: "Loaded extension QA",
        status: "passed",
        evidenceRefs: [
          {
            label: "synthetic loaded-extension QA fixture",
            repository: "frontend",
            path: "evidence/qa/loaded-extension.md"
          }
        ]
      }
    ],
    verificationCommands: [
      {
        label: "Synthetic npm test",
        command: "npm test",
        exitCode: 0,
        evidenceRefs: [commandEvidenceRef]
      }
    ]
  })

  return { backendRoot: backend.root, frontendRoot: frontend.root, pack }
}

function verify(pack: EvidencePack, frontendRoot: string, backendRoot?: string): EvidencePackVerificationResult {
  return verifyEvidencePack(pack, {
    roots: {
      backend: backendRoot,
      frontend: frontendRoot
    }
  })
}

function joinedReasons(result: EvidencePackVerificationResult): string {
  return result.reasons.join("\n")
}

test("MON-49 package evidence scripts bind the current candidate defaults", () => {
  const packageJson = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"))

  assert.equal(
    packageJson.scripts["evidence:generate"],
    `node scripts/release-evidence-pack.mjs generate --backend-sha ${minimumBackendSha} --out build/release-evidence/v013-evidence-pack.json`
  )
  assert.equal(
    packageJson.scripts["evidence:verify"],
    "node scripts/release-evidence-pack.mjs verify --pack build/release-evidence/v013-evidence-pack.json"
  )
})

test("MON-49 verifier blocks the current real V013 candidate while required external evidence is incomplete", () => {
  const pack = generateEvidencePack({
    backendSha: minimumBackendSha,
    contractVersion: "V013",
    frontendRoot: repoRoot,
    frontendSha: currentFrontendSha()
  })

  const result = verify(pack, repoRoot)

  assert.equal(result.status, "BLOCKED")
  assert.match(joinedReasons(result), /repositories\.backend\.root is required/)
  assert.match(joinedReasons(result), /supabaseMigrations must include at least one/)
  assert.match(joinedReasons(result), /creemAdapterFixtures must include at least one/)
  assert.match(joinedReasons(result), /externalGates\.independentSpecReview must be passed or waived/)
  assert.match(joinedReasons(result), /qaEvidence\.loadedExtensionQa must be passed or waived/)
})

test("MON-49 verifier passes only for a complete synthetic immutable fixture", () => {
  const { backendRoot, frontendRoot, pack } = completeSyntheticPack()

  try {
    const result = verify(pack, frontendRoot, backendRoot)

    assert.equal(result.status, "PASS")
    assert.deepEqual(result.reasons, [])
  } finally {
    rmSync(frontendRoot, { force: true, recursive: true })
    rmSync(backendRoot, { force: true, recursive: true })
  }
})

test("MON-49 verifier rejects mutable branch/latest references even if other evidence is complete", () => {
  const { backendRoot, frontendRoot, pack } = completeSyntheticPack()

  try {
    const mutablePack = structuredClone(pack)
    mutablePack.repositories.frontend.commit = "integration/aviso-v013"
    mutablePack.boundEvidence.publicCopy[0].sha256 = "latest"

    const result = verify(mutablePack, frontendRoot, backendRoot)

    assert.equal(result.status, "BLOCKED")
    assert.match(joinedReasons(result), /repositories\.frontend\.commit must be a 40-character commit SHA/)
    assert.match(joinedReasons(result), /mutable reference "latest" is not allowed/)
  } finally {
    rmSync(frontendRoot, { force: true, recursive: true })
    rmSync(backendRoot, { force: true, recursive: true })
  }
})

test("MON-49 verifier rejects embedded mutable references in command strings", () => {
  const { backendRoot, frontendRoot, pack } = completeSyntheticPack()
  const mutableCommands = [
    {
      command: "npx tool@latest --check",
      expected: "tool@latest"
    },
    {
      command: "npx tool@^1 --check",
      expected: "tool@^1"
    },
    {
      command: "git checkout integration/aviso-v013 && npm test",
      expected: "integration/aviso-v013"
    },
    {
      command: "git checkout main && npm test",
      expected: "main"
    },
    {
      command: "git pull origin main",
      expected: "main"
    },
    {
      command: "npx tool@1 --check",
      expected: "tool@1"
    },
    {
      command: "npx tool@1.2 --check",
      expected: "tool@1.2"
    },
    {
      command: "git show refs/tags/latest:release/evidence.json",
      expected: "refs/tags/latest"
    },
    {
      command: "git checkout refs/tags/v1.2.3 && npm test",
      expected: "refs/tags/v1.2.3"
    }
  ]

  try {
    for (const { command, expected } of mutableCommands) {
      const mutablePack = structuredClone(pack)
      mutablePack.verificationCommands[0].command = command

      const result = verify(mutablePack, frontendRoot, backendRoot)

      assert.equal(result.status, "BLOCKED", command)
      assert.match(joinedReasons(result), /verificationCommands\[0\]\.command mutable reference/)
      assert.ok(joinedReasons(result).includes(`"${expected}"`), command)
    }
  } finally {
    rmSync(frontendRoot, { force: true, recursive: true })
    rmSync(backendRoot, { force: true, recursive: true })
  }
})

test("MON-49 verifier accepts exact package versions and embedded commit SHAs in command strings", () => {
  const { backendRoot, frontendRoot, pack } = completeSyntheticPack()
  const immutableCommands = [
    "npx package@1.2.3 --check",
    "git checkout 0123456789abcdef0123456789abcdef01234567 && npm test"
  ]

  try {
    for (const command of immutableCommands) {
      const immutablePack = structuredClone(pack)
      immutablePack.verificationCommands[0].command = command

      const result = verify(immutablePack, frontendRoot, backendRoot)

      assert.equal(result.status, "PASS", command)
      assert.deepEqual(result.reasons, [], command)
    }
  } finally {
    rmSync(frontendRoot, { force: true, recursive: true })
    rmSync(backendRoot, { force: true, recursive: true })
  }
})

test("MON-49 verifier blocks changed evidence after generation", () => {
  const { backendRoot, frontendRoot, pack } = completeSyntheticPack()

  try {
    writeFileSync(
      join(frontendRoot, "store-assets/chrome-web-store/STORE_LISTING_COPY.md"),
      "Synthetic public copy fixture changed after pack generation.\n"
    )

    const result = verify(pack, frontendRoot, backendRoot)

    assert.equal(result.status, "BLOCKED")
    assert.match(
      joinedReasons(result),
      /boundEvidence\.publicCopy\[0\] hash mismatch for store-assets\/chrome-web-store\/STORE_LISTING_COPY\.md/
    )
  } finally {
    rmSync(frontendRoot, { force: true, recursive: true })
    rmSync(backendRoot, { force: true, recursive: true })
  }
})

test("MON-49 verifier rejects hashes that do not match the file at the bound commit", () => {
  const { backendRoot, frontendRoot, pack } = completeSyntheticPack()

  try {
    const dirtyPack = structuredClone(pack)
    const copyPath = join(frontendRoot, "store-assets/chrome-web-store/STORE_LISTING_COPY.md")
    writeFileSync(copyPath, "Synthetic dirty public copy fixture after commit.\n")
    dirtyPack.boundEvidence.publicCopy[0].sha256 = hashFile(copyPath)

    const result = verify(dirtyPack, frontendRoot, backendRoot)

    assert.equal(result.status, "BLOCKED")
    assert.match(
      joinedReasons(result),
      /boundEvidence\.publicCopy\[0\] git object hash mismatch for store-assets\/chrome-web-store\/STORE_LISTING_COPY\.md/
    )
  } finally {
    rmSync(frontendRoot, { force: true, recursive: true })
    rmSync(backendRoot, { force: true, recursive: true })
  }
})
