import assert from "node:assert/strict"
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"
import {
  buildSupplyChainEvidence,
  validateAllowedPackageBaselineDiff,
  validateSupplyChainEvidence,
  validateTrackedBaseline,
  validateUnresolvedHighCriticalLedger
} from "../scripts/check-supply-chain-baseline.mjs"

const repoRoot = new URL("..", import.meta.url)
const baselineUrl = new URL(
  "../docs/security/supply-chain-baseline.json",
  import.meta.url
)

test("tracked supply-chain baseline validates current package files", () => {
  const evidence = buildSupplyChainEvidence({
    rootDir: repoRoot,
    gitCommit: "test-git-commit",
    packageBaselineDiff: buildAllowedPackageBaselineDiff()
  })

  validateSupplyChainEvidence(evidence, { now: "2026-07-17" })

  assert.equal(evidence.gitCommit, "test-git-commit")
  assert.equal(
    evidence.directDependencies.dev.some((dep) => dep.name === "plasmo"),
    true
  )
  assert.equal(
    evidence.directDependencies.runtime.some((dep) => dep.name === "plasmo"),
    false
  )
  assert.equal(evidence.externalAudit.freshRegistryAudit, "pending-external")
  assert.deepEqual(evidence.unresolvedHighCritical, [])
})

test("supply-chain baseline rejects package hash drift", () => {
  const evidence = buildSupplyChainEvidence({
    rootDir: repoRoot,
    gitCommit: "test-git-commit",
    packageBaselineDiff: buildAllowedPackageBaselineDiff()
  })

  const driftedEvidence = structuredClone(evidence)
  driftedEvidence.files["package.json"].actualSha256 =
    "0000000000000000000000000000000000000000000000000000000000000000"

  assert.throws(
    () => validateSupplyChainEvidence(driftedEvidence, { now: "2026-07-17" }),
    /package\.json hash drift/
  )
})

test("supply-chain baseline rejects Plasmo runtime or inventory drift", () => {
  const evidence = buildSupplyChainEvidence({
    rootDir: repoRoot,
    gitCommit: "test-git-commit",
    packageBaselineDiff: buildAllowedPackageBaselineDiff()
  })

  const plasmo = evidence.directDependencies.dev.find(
    (dep) => dep.name === "plasmo"
  )
  assert.ok(plasmo)

  const misclassifiedEvidence = structuredClone(evidence)
  misclassifiedEvidence.directDependencies.dev =
    misclassifiedEvidence.directDependencies.dev.filter(
      (dep) => dep.name !== "plasmo"
    )
  misclassifiedEvidence.directDependencies.runtime.push(plasmo)
  misclassifiedEvidence.directDependencies.runtime.sort((a, b) =>
    a.name.localeCompare(b.name)
  )

  assert.throws(
    () =>
      validateSupplyChainEvidence(misclassifiedEvidence, {
        now: "2026-07-17"
      }),
    /Plasmo must be classified as a direct dev dependency/
  )

  const incompleteEvidence = structuredClone(evidence)
  incompleteEvidence.directDependencies.runtime.pop()

  assert.throws(
    () =>
      validateSupplyChainEvidence(incompleteEvidence, {
        now: "2026-07-17"
      }),
    /direct dependency inventory drift/
  )
})

test("unresolved High/Critical ledger rejects malformed or expired records", () => {
  assert.throws(
    () =>
      validateUnresolvedHighCriticalLedger(
        [
          {
            severity: "high",
            packageName: "example-package",
            owner: "Security",
            impact: "Build-chain only in local packaging.",
            expiresOn: "2026-08-17",
            source: "npm-audit",
            advisory: ""
          }
        ],
        { now: "2026-07-17" }
      ),
    /advisory/
  )

  assert.throws(
    () =>
      validateUnresolvedHighCriticalLedger(
        [
          {
            severity: "high",
            owner: "Security",
            impact: "Build-chain only in local packaging.",
            expiresOn: "2026-08-17",
            source: "npm-audit",
            advisory: "GHSA-test"
          }
        ],
        { now: "2026-07-17" }
      ),
    /packageName/
  )

  assert.throws(
    () =>
      validateUnresolvedHighCriticalLedger(
        [
          {
            severity: "high",
            packageName: "example-package",
            owner: "Security",
            impact: "Build-chain only in local packaging.",
            expiresOn: "2026-08-17",
            source: "npm-audit",
            advisory: "GHSA-test",
            extra: "not allowed"
          }
        ],
        { now: "2026-07-17" }
      ),
    /unexpected unresolvedHighCritical\[0\]\.extra/
  )

  assert.throws(
    () =>
      validateUnresolvedHighCriticalLedger(
        [
          {
            severity: "critical",
            packageName: "example-package",
            owner: "Security",
            impact: "Runtime execution risk.",
            expiresOn: "2026-07-16",
            source: "vendor-advisory",
            advisory: "CVE-2099-0001"
          }
        ],
        { now: "2026-07-17" }
      ),
    /expired/
  )
})

test("supply-chain evidence output stays sanitized", () => {
  process.env.AVISO_SUPPLY_CHAIN_TEST_SECRET =
    "sk-test-should-not-appear-in-evidence"

  const evidence = buildSupplyChainEvidence({
    rootDir: repoRoot,
    gitCommit: "test-git-commit",
    packageBaselineDiff: buildAllowedPackageBaselineDiff()
  })
  validateSupplyChainEvidence(evidence, { now: "2026-07-17" })

  const output = JSON.stringify(evidence)

  assert.equal(output.includes(process.env.AVISO_SUPPLY_CHAIN_TEST_SECRET), false)
  assert.equal(/rawHttp|httpOutput|prompt|pageContent|credential|secret/i.test(output), false)
  assert.equal(/integrity|resolvedUrl|registry\.npmjs\.org/i.test(output), false)

  delete process.env.AVISO_SUPPLY_CHAIN_TEST_SECRET
})

test("tracked baseline schema rejects extra fields and malformed policy", () => {
  const baseline = readTrackedBaseline()
  baseline.extra = true
  assert.throws(() => validateTrackedBaseline(baseline), /unexpected baseline.extra/)

  const badPolicy = readTrackedBaseline()
  badPolicy.policy.freshRegistryAudit = "passed"
  assert.throws(
    () => validateTrackedBaseline(badPolicy),
    /policy\.freshRegistryAudit/
  )

  const extraNestedPolicy = readTrackedBaseline()
  extraNestedPolicy.policy.runtimeBuildSeparation.extra = true
  assert.throws(
    () => validateTrackedBaseline(extraNestedPolicy),
    /unexpected policy\.runtimeBuildSeparation\.extra/
  )
})

test("tracked baseline schema rejects bad version, hash, dependencies, and ledger", () => {
  const badVersion = readTrackedBaseline()
  badVersion.schemaVersion = 2
  assert.throws(() => validateTrackedBaseline(badVersion), /schemaVersion/)

  const badHash = readTrackedBaseline()
  badHash.files["package.json"].sha256 = "abc"
  assert.throws(() => validateTrackedBaseline(badHash), /files\.package\.json\.sha256/)

  const badDependency = readTrackedBaseline()
  badDependency.directDependencies.runtime[0].extra = true
  assert.throws(
    () => validateTrackedBaseline(badDependency),
    /unexpected directDependencies\.runtime\[0\]\.extra/
  )

  const badLedger = readTrackedBaseline()
  badLedger.unresolvedHighCritical = [
    {
      severity: "medium",
      packageName: "example-package",
      owner: "Security",
      impact: "Build-chain only in local packaging.",
      expiresOn: "20260817",
      source: "npm-audit",
      advisory: "GHSA-test"
    }
  ]
  assert.throws(() => validateTrackedBaseline(badLedger), /severity/)
})

test("evidence building validates tracked baseline before using it", () => {
  const tempRoot = mkdtempSync(join(tmpdir(), "aviso-supply-chain-"))
  mkdirSync(join(tempRoot, "docs/security"), { recursive: true })
  writeFileSync(
    join(tempRoot, "package.json"),
    readFileSync(new URL("../package.json", import.meta.url))
  )
  writeFileSync(
    join(tempRoot, "package-lock.json"),
    readFileSync(new URL("../package-lock.json", import.meta.url))
  )

  const invalidBaseline = readTrackedBaseline()
  invalidBaseline.unresolvedHighCritical = [
    {
      severity: "high",
      owner: "Security",
      impact: "Build-chain only in local packaging.",
      expiresOn: "2026-08-17",
      source: "npm-audit",
      advisory: "GHSA-test"
    }
  ]
  writeFileSync(
    join(tempRoot, "docs/security/supply-chain-baseline.json"),
    JSON.stringify(invalidBaseline, null, 2)
  )

  assert.throws(
    () =>
      buildSupplyChainEvidence({
        rootDir: tempRoot,
        gitCommit: "test-git-commit",
        packageBaselineDiff: buildAllowedPackageBaselineDiff()
      }),
    /baseline schema invalid: missing unresolvedHighCritical\[0\]\.packageName/
  )
})

test("package base diff allows only Plasmo runtime to dev move", () => {
  const diff = buildAllowedPackageBaselineDiff()

  assert.equal(diff.baseRef, "test-base")
  assert.equal(diff.directDependencyChange, "plasmo-runtime-to-dev-only")
  assert.equal(diff.packageEntrySetUnchanged, true)
  assert.equal(diff.lockPackageIdentityUnchanged, true)
  assert.equal(diff.lockNonClassificationMetadataUnchanged, true)
})

test("package base diff rejects direct dependency and lock identity drift", () => {
  const fixture = buildPackageDiffFixture()
  fixture.currentPackageJson.dependencies.lodash = "^4.17.21"
  assert.throws(
    () => validateAllowedPackageBaselineDiff(fixture),
    /only allowed direct dependency change/
  )

  const versionDrift = buildPackageDiffFixture()
  versionDrift.currentPackageLock.packages["node_modules/react"].version = "18.3.0"
  assert.throws(
    () => validateAllowedPackageBaselineDiff(versionDrift),
    /version\/resolved\/integrity/
  )

  const entryDrift = buildPackageDiffFixture()
  delete entryDrift.currentPackageLock.packages["node_modules/typescript"]
  assert.throws(
    () => validateAllowedPackageBaselineDiff(entryDrift),
    /package-lock package entry set/
  )

  const metadataDrift = buildPackageDiffFixture()
  metadataDrift.currentPackageLock.packages["node_modules/react"].license = "BSD-3-Clause"
  assert.throws(
    () => validateAllowedPackageBaselineDiff(metadataDrift),
    /non-classification package-lock metadata/
  )
})

test("package base diff rejects classification drift without Plasmo move", () => {
  const fixture = buildPackageDiffFixture()
  fixture.basePackageJson = structuredClone(fixture.currentPackageJson)
  fixture.basePackageLock = structuredClone(fixture.currentPackageLock)
  delete fixture.basePackageLock.packages["node_modules/react"].dev
  fixture.currentPackageLock.packages["node_modules/react"].dev = true

  assert.throws(
    () => validateAllowedPackageBaselineDiff(fixture),
    /non-classification package-lock metadata/
  )
})

function readTrackedBaseline() {
  return JSON.parse(readFileSync(baselineUrl, "utf8"))
}

function buildAllowedPackageBaselineDiff() {
  return validateAllowedPackageBaselineDiff(buildPackageDiffFixture())
}

function buildPackageDiffFixture() {
  const basePackageJson = {
    name: "aviso",
    version: "0.1.1",
    dependencies: {
      plasmo: "0.90.5",
      react: "18.2.0"
    },
    devDependencies: {
      typescript: "5.3.3"
    }
  }
  const currentPackageJson = {
    name: "aviso",
    version: "0.1.1",
    dependencies: {
      react: "18.2.0"
    },
    devDependencies: {
      plasmo: "0.90.5",
      typescript: "5.3.3"
    }
  }
  const basePackageLock = {
    lockfileVersion: 3,
    packages: {
      "": {
        name: "aviso",
        version: "0.1.1",
        dependencies: {
          plasmo: "0.90.5",
          react: "18.2.0"
        },
        devDependencies: {
          typescript: "5.3.3"
        }
      },
      "node_modules/plasmo": {
        version: "0.90.5",
        resolved: "https://registry.example.invalid/plasmo-0.90.5.tgz",
        integrity: "sha512-plasmo"
      },
      "node_modules/react": {
        version: "18.2.0",
        resolved: "https://registry.example.invalid/react-18.2.0.tgz",
        integrity: "sha512-react"
      },
      "node_modules/typescript": {
        version: "5.3.3",
        resolved: "https://registry.example.invalid/typescript-5.3.3.tgz",
        integrity: "sha512-typescript",
        devOptional: true
      }
    }
  }
  const currentPackageLock = structuredClone(basePackageLock)
  delete currentPackageLock.packages[""].dependencies.plasmo
  currentPackageLock.packages[""].devDependencies.plasmo = "0.90.5"
  currentPackageLock.packages["node_modules/plasmo"].dev = true
  currentPackageLock.packages["node_modules/typescript"].dev = true
  delete currentPackageLock.packages["node_modules/typescript"].devOptional

  return {
    baseRef: "test-base",
    mergeBase: "test-merge-base",
    basePackageJson,
    currentPackageJson,
    basePackageLock,
    currentPackageLock
  }
}
