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

function makeSyntheticRepo(
  name: string,
  files: Record<string, string>
): {
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
    "docs/architecture/supabase-auth-migration.md":
      "# Synthetic V013 contract fixture\n",
    "package.json": `${JSON.stringify(
      {
        name: "synthetic-aviso",
        version: "0.0.0",
        scripts: {
          "supply-chain:check": "node scripts/check-supply-chain-baseline.mjs",
          test: "node --test",
          "docs:check": "node scripts/check-docs.mjs --root .",
          "verify:release-candidate":
            "node scripts/verify-release-candidate.mjs",
          "evidence:verify":
            "node scripts/release-evidence-pack.mjs verify --pack build/release-evidence/v013-evidence-pack.json"
        },
        devDependencies: {
          typescript: "5.3.3"
        }
      },
      null,
      2
    )}\n`,
    "package-lock.json": `${JSON.stringify(
      {
        name: "synthetic-aviso",
        version: "0.0.0",
        lockfileVersion: 3,
        requires: true,
        packages: {
          "": {
            name: "synthetic-aviso",
            version: "0.0.0",
            devDependencies: {
              typescript: "5.3.3"
            }
          },
          "node_modules/typescript": {
            version: "5.3.3",
            dev: true
          }
        }
      },
      null,
      2
    )}\n`,
    "build/canonical-chrome-mv3-prod/manifest.json":
      '{"manifest_version":3,"name":"Aviso"}\n',
    "build/canonical-chrome-mv3-prod.zip": "synthetic zip bytes\n",
    "store-assets/chrome-web-store/STORE_LISTING_COPY.md":
      "Synthetic public copy fixture for V013.\n",
    "public/icon-128.png": "synthetic asset bytes\n",
    "evidence/qa/loaded-extension.md":
      "Synthetic QA PASS fixture for tests only.\n",
    "evidence/reviews/spec.md":
      "Synthetic independent spec review PASS fixture for tests only.\n",
    "evidence/reviews/security-code.md":
      "Synthetic independent security/code review PASS fixture for tests only.\n",
    "evidence/external/cws.md":
      "Synthetic CWS gate PASS fixture for tests only.\n",
    "evidence/external/owner.md":
      "Synthetic owner release approval PASS fixture for tests only.\n",
    "evidence/external/supabase.md":
      "Synthetic Supabase migration gate PASS fixture for tests only.\n",
    "evidence/external/creem.md":
      "Synthetic Creem billing gate PASS fixture for tests only.\n",
    "evidence/commands/npm-test.log":
      "Synthetic command output fixture: npm test exited 0.\n",
    "evidence/commands/tsc-no-emit.log":
      "Synthetic command output fixture: npx tsc --noEmit exited 0.\n"
  })
  const backend = makeSyntheticRepo("backend", {
    "supabase/migrations/20260804000000_v013.sql":
      "-- Synthetic V013 migration fixture\n",
    "tests/fixtures/creem/subscription-active.json":
      '{"fixture":"synthetic-creem-adapter-pass"}\n'
  })

  const npmTestEvidenceRef = {
    label: "synthetic npm test output",
    repository: "frontend" as const,
    path: "evidence/commands/npm-test.log",
    sha256: hashFile(join(frontend.root, "evidence/commands/npm-test.log")),
    sourceCommit: frontend.commit
  }
  const typecheckEvidenceRef = {
    label: "synthetic typecheck output",
    repository: "frontend" as const,
    path: "evidence/commands/tsc-no-emit.log",
    sha256: hashFile(join(frontend.root, "evidence/commands/tsc-no-emit.log")),
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
        kind: "npm-script",
        script: "test",
        args: [],
        exitCode: 0,
        evidenceRefs: [npmTestEvidenceRef]
      },
      {
        label: "Synthetic local typecheck",
        kind: "npx-local-bin",
        packageName: "typescript",
        binary: "tsc",
        version: "5.3.3",
        args: ["--noEmit"],
        exitCode: 0,
        evidenceRefs: [typecheckEvidenceRef]
      }
    ]
  })

  return { backendRoot: backend.root, frontendRoot: frontend.root, pack }
}

function verify(
  pack: EvidencePack,
  frontendRoot: string,
  backendRoot?: string
): EvidencePackVerificationResult {
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
  const packageJson = JSON.parse(
    readFileSync(join(repoRoot, "package.json"), "utf8")
  )

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
  assert.match(
    joinedReasons(result),
    /supabaseMigrations must include at least one/
  )
  assert.match(
    joinedReasons(result),
    /creemAdapterFixtures must include at least one/
  )
  assert.match(
    joinedReasons(result),
    /externalGates\.independentSpecReview must be passed or waived/
  )
  assert.match(
    joinedReasons(result),
    /qaEvidence\.loadedExtensionQa must be passed or waived/
  )
})

test("MON-49 verifier passes only for a complete structured immutable fixture", () => {
  const { backendRoot, frontendRoot, pack } = completeSyntheticPack()

  try {
    const result = verify(pack, frontendRoot, backendRoot)

    assert.equal(result.status, "PASS")
    assert.deepEqual(result.reasons, [])
    assert.deepEqual(
      pack.verificationCommands.map((command) => command.kind),
      ["npm-script", "npx-local-bin"]
    )
    assert.equal(
      pack.verificationCommands[0].packageJsonRef.path,
      "package.json"
    )
    assert.equal(
      pack.verificationCommands[0].packageLockRef.path,
      "package-lock.json"
    )
    assert.equal(pack.verificationCommands[1].version, "5.3.3")
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
    assert.match(
      joinedReasons(result),
      /repositories\.frontend\.commit must be a 40-character commit SHA/
    )
    assert.match(
      joinedReasons(result),
      /mutable reference "latest" is not allowed/
    )
  } finally {
    rmSync(frontendRoot, { force: true, recursive: true })
    rmSync(backendRoot, { force: true, recursive: true })
  }
})

test("MON-49 verifier rejects historical bypass strings by structured command policy", () => {
  const { backendRoot, frontendRoot, pack } = completeSyntheticPack()
  const historicalBypasses = [
    "npx tool@latest --check",
    "npx tool@^1 --check",
    "integration/aviso-v013",
    "main",
    "git pull origin main",
    "^1",
    "1.2",
    "v1.2.3",
    "refs/tags/v1.2.3",
    "HEAD~1",
    "HEAD^",
    "0123456",
    "origin",
    "https://github.com/mongocyber/aviso/tree/main",
    'ma""in'
  ]

  try {
    for (const bypass of historicalBypasses) {
      const scriptPack = structuredClone(pack)
      scriptPack.verificationCommands[0].script = bypass

      const scriptResult = verifyEvidencePack(scriptPack)

      assert.equal(scriptResult.status, "BLOCKED", `script: ${bypass}`)
      assert.match(
        joinedReasons(scriptResult),
        /verificationCommands\[0\]\.script must be an allow-listed npm script/,
        `script: ${bypass}`
      )

      const argsPack = structuredClone(pack)
      argsPack.verificationCommands[0].args = [bypass]

      const argsResult = verifyEvidencePack(argsPack)

      assert.equal(argsResult.status, "BLOCKED", `args: ${bypass}`)
      assert.match(
        joinedReasons(argsResult),
        /verificationCommands\[0\]\.args must exactly match \[\]/,
        `args: ${bypass}`
      )

      const packageNamePack = structuredClone(pack)
      packageNamePack.verificationCommands[1].packageName = bypass

      const packageNameResult = verifyEvidencePack(packageNamePack)

      assert.equal(
        packageNameResult.status,
        "BLOCKED",
        `packageName: ${bypass}`
      )
      assert.match(
        joinedReasons(packageNameResult),
        /verificationCommands\[1\]\.packageName\/binary pair must be allow-listed/,
        `packageName: ${bypass}`
      )

      const binaryPack = structuredClone(pack)
      binaryPack.verificationCommands[1].binary = bypass

      const binaryResult = verifyEvidencePack(binaryPack)

      assert.equal(binaryResult.status, "BLOCKED", `binary: ${bypass}`)
      assert.match(
        joinedReasons(binaryResult),
        /verificationCommands\[1\]\.packageName\/binary pair must be allow-listed/,
        `binary: ${bypass}`
      )
    }
  } finally {
    rmSync(frontendRoot, { force: true, recursive: true })
    rmSync(backendRoot, { force: true, recursive: true })
  }
})

test("MON-49 verifier rejects behavior-changing args for allow-listed commands", () => {
  const { backendRoot, frontendRoot, pack } = completeSyntheticPack()

  try {
    const probes = [
      {
        name: "npx args replace typecheck with --help",
        mutate(probePack: EvidencePack) {
          probePack.verificationCommands[1].args = ["--help"]
        },
        expected:
          /verificationCommands\[1\]\.args must exactly match \["--noEmit"\]/
      },
      {
        name: "npx args point at alternate project",
        mutate(probePack: EvidencePack) {
          probePack.verificationCommands[1].args = [
            "--project",
            "tsconfig.attacker.json"
          ]
        },
        expected:
          /verificationCommands\[1\]\.args must exactly match \["--noEmit"\]/
      },
      {
        name: "npm evidence:verify args override pack",
        mutate(probePack: EvidencePack) {
          probePack.verificationCommands[0].script = "evidence:verify"
          probePack.verificationCommands[0].args = [
            "--pack",
            "attacker.json"
          ]
        },
        expected: /verificationCommands\[0\]\.args must exactly match \[\]/
      },
      {
        name: "npm test args add --eval",
        mutate(probePack: EvidencePack) {
          probePack.verificationCommands[0].args = ["--eval"]
        },
        expected: /verificationCommands\[0\]\.args must exactly match \[\]/
      }
    ]

    for (const probe of probes) {
      const probePack = structuredClone(pack)
      probe.mutate(probePack)

      const result = verify(probePack, frontendRoot, backendRoot)

      assert.equal(result.status, "BLOCKED", probe.name)
      assert.match(joinedReasons(result), probe.expected, probe.name)
    }
  } finally {
    rmSync(frontendRoot, { force: true, recursive: true })
    rmSync(backendRoot, { force: true, recursive: true })
  }
})

test("MON-49 verifier rejects historical mutable refs in evidence metadata labels", () => {
  const { backendRoot, frontendRoot, pack } = completeSyntheticPack()
  const labelBypasses = [
    "HEAD~1",
    "HEAD^",
    "0123456",
    "origin",
    "https://github.com/mongocyber/aviso/tree/main",
    "tool@latest"
  ]

  try {
    for (const bypass of labelBypasses) {
      const labelPack = structuredClone(pack)
      labelPack.verificationCommands[0].evidenceRefs[0].label = bypass

      const result = verify(labelPack, frontendRoot, backendRoot)

      assert.equal(result.status, "BLOCKED", `label: ${bypass}`)
      assert.match(
        joinedReasons(result),
        new RegExp(
          `\\$\\.verificationCommands\\[0\\]\\.evidenceRefs\\[0\\]\\.label mutable reference`
        ),
        `label: ${bypass}`
      )
    }
  } finally {
    rmSync(frontendRoot, { force: true, recursive: true })
    rmSync(backendRoot, { force: true, recursive: true })
  }
})

test("MON-49 verifier rejects legacy free-form command strings outright", () => {
  const { backendRoot, frontendRoot, pack } = completeSyntheticPack()

  try {
    const legacyPack = structuredClone(pack)
    legacyPack.verificationCommands[0] = {
      label: "Legacy command shape",
      command: "npm test",
      exitCode: 0,
      evidenceRefs: legacyPack.verificationCommands[0].evidenceRefs
    }

    const result = verify(legacyPack, frontendRoot, backendRoot)

    assert.equal(result.status, "BLOCKED")
    assert.match(
      joinedReasons(result),
      /verificationCommands\[0\]\.command is not allowed; use structured verification command fields/
    )
    assert.match(
      joinedReasons(result),
      /verificationCommands\[0\]\.kind must be npm-script or npx-local-bin/
    )
  } finally {
    rmSync(frontendRoot, { force: true, recursive: true })
    rmSync(backendRoot, { force: true, recursive: true })
  }
})

test("MON-49 verifier rejects npx-local-bin version mismatch against bound package files", () => {
  const { backendRoot, frontendRoot, pack } = completeSyntheticPack()

  try {
    const mismatchedPack = structuredClone(pack)
    mismatchedPack.verificationCommands[1].version = "5.3.2"

    const result = verify(mismatchedPack, frontendRoot, backendRoot)

    assert.equal(result.status, "BLOCKED")
    assert.match(
      joinedReasons(result),
      /verificationCommands\[1\]\.version must match package\.json devDependencies\.typescript 5\.3\.3/
    )
    assert.match(
      joinedReasons(result),
      /verificationCommands\[1\]\.version must match package-lock\.json locked typescript 5\.3\.3/
    )
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
    const copyPath = join(
      frontendRoot,
      "store-assets/chrome-web-store/STORE_LISTING_COPY.md"
    )
    writeFileSync(
      copyPath,
      "Synthetic dirty public copy fixture after commit.\n"
    )
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
