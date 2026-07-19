import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  symlinkSync,
  writeFileSync
} from "node:fs"
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
const historicalPlasmoRiskId =
  "historic-plasmo-parcel-build-chain-high-2026-06-10"

test("tracked supply-chain baseline validates current package files", () => {
  const evidence = buildSupplyChainEvidence({
    rootDir: repoRoot,
    gitCommit: "test-git-commit",
    packageBaselineDiff: buildAllowedPackageBaselineDiff()
  })

  validateSupplyChainEvidence(evidence, { now: "2026-07-17T23:59:59Z" })

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
  assert.equal(evidence.unresolvedHighCritical.length, 1)
  assert.equal(evidence.unresolvedHighCritical[0].packageName, "plasmo")
  assert.match(evidence.unresolvedHighCritical[0].source, /49ef781/)
})

test("CI and submit workflows run baseline immediately after checkout with system Node", () => {
  for (const workflowPath of [
    "../.github/workflows/ci.yml",
    "../.github/workflows/submit.yml"
  ]) {
    const workflowSource = readFileSync(
      new URL(workflowPath, import.meta.url),
      "utf8"
    )
    const steps = parseWorkflowSteps(workflowSource)
    const checkoutIndex = steps.findIndex(
      (step) => step.uses === "actions/checkout@v4"
    )
    const baselineIndex = steps.findIndex(
      (step) => step.run === "node scripts/check-supply-chain-baseline.mjs"
    )

    assert.notEqual(checkoutIndex, -1, `${workflowPath} missing checkout step`)
    assert.equal(
      baselineIndex,
      checkoutIndex + 1,
      `${workflowPath} must run the supply-chain baseline directly after checkout`
    )

    for (const [index, step] of steps.entries()) {
      if (index <= checkoutIndex || index >= baselineIndex) {
        continue
      }
      assert.equal(
        isInstallOrBuildStep(step),
        false,
        `${workflowPath} runs ${JSON.stringify(step)} before baseline`
      )
    }
  }
})

test("release verifier runs supply-chain baseline before install-dependent child commands", () => {
  const verifierSource = readFileSync(
    new URL("../scripts/verify-release-candidate.mjs", import.meta.url),
    "utf8"
  )
  const commandStepsBlock =
    verifierSource.match(/const commandSteps = \[[\s\S]*?\n\]/)?.[0] ?? ""

  assert.match(
    commandStepsBlock,
    /nodeStep\("supply-chain baseline", \["scripts\/check-supply-chain-baseline\.mjs"\]\)/
  )

  const baselineIndex = commandStepsBlock.indexOf("supply-chain baseline")
  assert.notEqual(baselineIndex, -1)

  for (const laterStep of [
    "unit tests",
    "typecheck",
    "WXT production build",
    "Plasmo production build",
    "canonical production package",
    "manifest boundary check"
  ]) {
    const laterIndex = commandStepsBlock.indexOf(laterStep)
    assert.notEqual(laterIndex, -1, `missing ${laterStep}`)
    assert.ok(
      baselineIndex < laterIndex,
      `supply-chain baseline must run before ${laterStep}`
    )
  }
})

test("default CLI validates against a current UTC instant", () => {
  const checkerSource = readFileSync(
    new URL("../scripts/check-supply-chain-baseline.mjs", import.meta.url),
    "utf8"
  )

  assert.match(
    checkerSource,
    /validateSupplyChainEvidence\(evidence,\s*\{\s*now:\s*currentUtcInstant\(\)\s*\}\s*\)/
  )
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
    () => validateSupplyChainEvidence(driftedEvidence, { now: "2026-07-17T23:59:59Z" }),
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
        now: "2026-07-17T23:59:59Z"
      }),
    /Plasmo must be classified as a direct dev dependency/
  )

  const incompleteEvidence = structuredClone(evidence)
  incompleteEvidence.directDependencies.runtime.pop()

  assert.throws(
    () =>
      validateSupplyChainEvidence(incompleteEvidence, {
        now: "2026-07-17T23:59:59Z"
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
            riskId: "example-high-risk",
            affectedPackage: {
              packageName: "example-package",
              resolvedVersion: "1.0.0"
            },
            owner: "Security",
            impact: "Build-chain only in local packaging.",
            reviewDeadline: "2026-08-17",
            source: "npm-audit",
            advisory: ""
          }
        ],
        { now: "2026-07-17T23:59:59Z" }
      ),
    /advisory/
  )

  assert.throws(
    () =>
      validateUnresolvedHighCriticalLedger(
        [
          {
            riskId: "example-high-risk",
            severity: "high",
            affectedPackage: {
              packageName: "example-package",
              resolvedVersion: "1.0.0"
            },
            owner: "Security",
            impact: "Build-chain only in local packaging.",
            reviewDeadline: "2026-08-17",
            source: "npm-audit",
            advisory: "GHSA-test"
          }
        ],
        { now: "2026-07-17T23:59:59Z" }
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
            riskId: "example-high-risk",
            affectedPackage: {
              packageName: "example-package",
              resolvedVersion: "1.0.0"
            },
            owner: "Security",
            impact: "Build-chain only in local packaging.",
            reviewDeadline: "2026-08-17",
            source: "npm-audit",
            advisory: "GHSA-test",
            extra: "not allowed"
          }
        ],
        { now: "2026-07-17T23:59:59Z" }
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
            riskId: "example-critical-risk",
            affectedPackage: {
              packageName: "example-package",
              resolvedVersion: "1.0.0"
            },
            owner: "Security",
            impact: "Runtime execution risk.",
            reviewDeadline: "2026-07-16",
            source: "vendor-advisory",
            advisory: "CVE-2099-0001"
          }
        ],
        { now: "2026-07-17T23:59:59Z" }
      ),
    /expired/
  )
})

test("unresolved High/Critical ledger rejects invalid dates and honors UTC boundaries", () => {
  for (const reviewDeadline of [
    "9999-99-99",
    "2026-13-01",
    "2026-04-31",
    "2025-02-29"
  ]) {
    assert.throws(
      () =>
        validateUnresolvedHighCriticalLedger([ledgerRecord({ reviewDeadline })], {
          now: "2026-02-01T23:59:59Z"
        }),
      /valid UTC calendar date/
    )
  }

  assert.doesNotThrow(() =>
    validateUnresolvedHighCriticalLedger(
      [ledgerRecord({ reviewDeadline: "2024-02-29" })],
      { now: "2024-02-29T23:59:59Z" }
    )
  )

  assert.doesNotThrow(() =>
    validateUnresolvedHighCriticalLedger(
      [ledgerRecord({ reviewDeadline: "2026-07-19" })],
      { now: "2026-07-19T23:59:59Z" }
    )
  )

  assert.throws(
    () =>
      validateUnresolvedHighCriticalLedger(
        [ledgerRecord({ reviewDeadline: "2026-07-18" })],
        { now: "2026-07-19T23:59:59Z" }
      ),
    /expired/
  )
})

test("historical High/Critical risks cannot be silently cleared while audit is pending", () => {
  const baseline = readTrackedBaseline()
  baseline.unresolvedHighCritical = []

  assert.throws(
    () => validateTrackedBaseline(baseline),
    /historical unresolved High\/Critical/
  )

  const evidence = buildSupplyChainEvidence({
    rootDir: repoRoot,
    gitCommit: "test-git-commit",
    packageBaselineDiff: buildAllowedPackageBaselineDiff()
  })
  evidence.unresolvedHighCritical = []

  assert.throws(
    () => validateSupplyChainEvidence(evidence, { now: "2026-07-19T23:59:59Z" }),
    /historical unresolved High\/Critical/
  )
})

test("historical continuity follows risk identity when lockfile raw hash changes without semantic package drift", () => {
  const tempRoot = createSupplyChainTempRoot()
  const packageJson = readCurrentPackageJson()
  const packageLock = readCurrentPackageLock()

  writeJson(join(tempRoot, "package.json"), packageJson)
  writeFileSync(
    join(tempRoot, "package-lock.json"),
    `${JSON.stringify(packageLock, null, 4)}\n`
  )

  const baseline = readTrackedBaseline()
  baseline.files["package.json"].sha256 = sha256File(join(tempRoot, "package.json"))
  baseline.files["package-lock.json"].sha256 = sha256File(
    join(tempRoot, "package-lock.json")
  )
  baseline.unresolvedHighCritical = []
  writeJson(join(tempRoot, "docs/security/supply-chain-baseline.json"), baseline)

  assert.throws(
    () => {
      const evidence = buildSupplyChainEvidence({
        rootDir: tempRoot,
        gitCommit: "test-git-commit",
        packageBaselineDiff: buildAllowedPackageBaselineDiff()
      })
      validateSupplyChainEvidence(evidence, { now: "2026-07-19T23:59:59Z" })
    },
    /historical unresolved High\/Critical.*plasmo/
  )
})

test("historical continuity accepts mutable owner impact and review deadline fields", () => {
  const baseline = readTrackedBaseline()
  baseline.unresolvedHighCritical = [
    plasmoRiskRecord({
      owner: "Rotating security owner",
      impact: "Owner review remains required for the Plasmo/Parcel build chain.",
      reviewDeadline: "2026-09-01"
    })
  ]

  assert.doesNotThrow(() => validateTrackedBaseline(baseline))

  const evidence = buildSupplyChainEvidence({
    rootDir: repoRoot,
    gitCommit: "test-git-commit",
    packageBaselineDiff: buildAllowedPackageBaselineDiff()
  })
  evidence.unresolvedHighCritical = baseline.unresolvedHighCritical

  assert.doesNotThrow(() =>
    validateSupplyChainEvidence(evidence, { now: "2026-07-19T23:59:59Z" })
  )
})

test("historical continuity rejects dependency_changed closure self-certified only by baseline", () => {
  const baseline = readTrackedBaseline()
  baseline.unresolvedHighCritical = []
  replaceDirectDependencyVersion(baseline, "plasmo", "0.91.0")

  assert.throws(
    () => validateTrackedBaseline(baseline),
    /historical unresolved High\/Critical.*plasmo/
  )

  baseline.closedHighCritical = [
    {
      riskId: "historic-plasmo-parcel-build-chain-high-2026-06-10",
      closedOn: "2026-07-19",
      closureType: "dependency_changed",
      evidence: ["package-lock node_modules/plasmo resolvedVersion 0.91.0"]
    }
  ]

  assert.throws(
    () => validateTrackedBaseline(baseline, { now: "2026-07-19T23:59:59Z" }),
    /dependency_changed closure.*plasmo.*still matches/
  )
})

test("historical continuity accepts dependency_changed closure bound to current root package identity", () => {
  const fixture = createDependencyChangedClosureFixture()

  assert.doesNotThrow(() =>
    validateTrackedBaseline(fixture.baseline, {
      rootDir: fixture.tempRoot,
      now: "2026-07-19T23:59:59Z"
    })
  )
})

test("dependency_changed closure fails closed when current package identity is incomplete", () => {
  for (const { options, missingField } of [
    { options: { omitPlasmoResolved: true }, missingField: "resolved" },
    { options: { omitPlasmoIntegrity: true }, missingField: "integrity" }
  ]) {
    const fixture = createDependencyChangedClosureFixture(options)

    assert.throws(
      () =>
        validateTrackedBaseline(fixture.baseline, {
          rootDir: fixture.tempRoot,
          now: "2026-07-19T23:59:59Z"
        }),
      new RegExp(
        `current package identity is incomplete.*${missingField}`
      )
    )
  }
})

test("closed High/Critical schema fails closed and verifies closure facts", () => {
  const dependencyClosure = {
    riskId: "historic-plasmo-parcel-build-chain-high-2026-06-10",
    closedOn: "2026-07-19",
    closureType: "dependency_changed",
    evidence: ["package-lock node_modules/plasmo resolvedVersion changed"]
  }

  const unchangedPackageBaseline = readTrackedBaseline()
  unchangedPackageBaseline.unresolvedHighCritical = []
  unchangedPackageBaseline.closedHighCritical = [dependencyClosure]
  assert.throws(
    () => validateTrackedBaseline(unchangedPackageBaseline),
    /dependency_changed closure.*plasmo.*still matches/
  )

  const extraClosure = readTrackedBaseline()
  extraClosure.closedHighCritical = [{ ...dependencyClosure, note: "string-only" }]
  assert.throws(
    () => validateTrackedBaseline(extraClosure),
    /unexpected closedHighCritical\[0\]\.note/
  )

  const badDateClosure = readTrackedBaseline()
  badDateClosure.closedHighCritical = [
    { ...dependencyClosure, closedOn: "2026-02-30" }
  ]
  assert.throws(
    () => validateTrackedBaseline(badDateClosure),
    /closedHighCritical\[0\]\.closedOn must be a valid UTC calendar date/
  )

  const pendingAuditClosure = readTrackedBaseline()
  pendingAuditClosure.unresolvedHighCritical = []
  pendingAuditClosure.closedHighCritical = [
    {
      riskId: "historic-plasmo-parcel-build-chain-high-2026-06-10",
      closedOn: "2026-07-19",
      closureType: "fresh_registry_audit",
      evidence: ["owner external audit evidence"]
    }
  ]
  assert.throws(
    () => validateTrackedBaseline(pendingAuditClosure),
    /fresh_registry_audit closure.*pending-external/
  )

  const verifiedAuditClosure = readTrackedBaseline()
  verifiedAuditClosure.policy.freshRegistryAudit = {
    status: "verified",
    auditDate: "2026-07-19",
    evidence: ["external owner audit record 2026-07-19"]
  }
  verifiedAuditClosure.unresolvedHighCritical = []
  verifiedAuditClosure.closedHighCritical =
    pendingAuditClosure.closedHighCritical

  assert.throws(
    () => validateTrackedBaseline(verifiedAuditClosure),
    /fresh registry audit evidence artifact/i
  )
})

test("fresh registry audit closure rejects baseline self-attestation strings", () => {
  const baseline = readTrackedBaseline()
  baseline.policy.freshRegistryAudit = {
    status: "verified",
    auditDate: "2026-07-19",
    evidence: ["not-an-audit-artifact"]
  }
  baseline.unresolvedHighCritical = []
  baseline.closedHighCritical = [
    {
      riskId: historicalPlasmoRiskId,
      closedOn: "2026-07-19",
      closureType: "fresh_registry_audit",
      evidence: ["made-up closure text"]
    }
  ]

  assert.throws(
    () => validateTrackedBaseline(baseline, { now: "2026-07-19T23:59:59Z" }),
    /fresh registry audit evidence artifact/i
  )
})

test("fresh registry audit closure validates repository artifact binding", () => {
  const validFixture = createFreshAuditFixtureRepo()

  assert.doesNotThrow(() =>
    validateTrackedBaseline(validFixture.baseline, {
      rootDir: validFixture.tempRoot,
      now: "2026-07-19T23:59:59Z"
    })
  )

  const evidence = buildSupplyChainEvidence({
    rootDir: validFixture.tempRoot,
    gitCommit: "test-git-commit",
    packageBaselineDiff: buildAllowedPackageBaselineDiff()
  })
  assert.doesNotThrow(() =>
    validateSupplyChainEvidence(evidence, {
      rootDir: validFixture.tempRoot,
      now: "2026-07-19T23:59:59Z"
    })
  )
  assert.equal(evidence.externalAudit.freshRegistryAudit, "verified")
  assert.deepEqual(evidence.externalAudit.evidence, [
    {
      path: validFixture.artifactPath,
      sha256: validFixture.artifactSha256
    }
  ])

  const nonexistent = createFreshAuditFixtureRepo({
    policyEvidence: [
      {
        path: "docs/security/audit-evidence/missing.json",
        sha256: "0".repeat(64)
      }
    ]
  })
  assert.throws(
    () =>
      validateTrackedBaseline(nonexistent.baseline, {
        rootDir: nonexistent.tempRoot,
        now: "2026-07-19T23:59:59Z"
      }),
    /fresh registry audit evidence artifact.*does not exist/i
  )

  const traversal = createFreshAuditFixtureRepo({
    policyEvidence: [
      {
        path: "docs/security/audit-evidence/../audit.json",
        sha256: "0".repeat(64)
      }
    ]
  })
  assert.throws(
    () =>
      validateTrackedBaseline(traversal.baseline, {
        rootDir: traversal.tempRoot,
        now: "2026-07-19T23:59:59Z"
      }),
    /fresh registry audit evidence artifact.*controlled directory/i
  )

  const symlinkFixture = createFreshAuditFixtureRepo()
  const symlinkPath = "docs/security/audit-evidence/symlink.json"
  symlinkSync(
    "../audit-evidence/fresh-registry-audit-fixture.json",
    join(symlinkFixture.tempRoot, symlinkPath)
  )
  symlinkFixture.baseline.policy.freshRegistryAudit.evidence = [
    {
      path: symlinkPath,
      sha256: symlinkFixture.artifactSha256
    }
  ]
  symlinkFixture.baseline.closedHighCritical[0].evidence[0].path = symlinkPath
  assert.throws(
    () =>
      validateTrackedBaseline(symlinkFixture.baseline, {
        rootDir: symlinkFixture.tempRoot,
        now: "2026-07-19T23:59:59Z"
      }),
    /fresh registry audit evidence artifact.*symlink/i
  )

  const textFixture = createFreshAuditFixtureRepo({
    artifactText: "not json\n"
  })
  assert.throws(
    () =>
      validateTrackedBaseline(textFixture.baseline, {
        rootDir: textFixture.tempRoot,
        now: "2026-07-19T23:59:59Z"
      }),
    /fresh registry audit evidence artifact.*JSON object/i
  )

  const artifactShaMismatch = createFreshAuditFixtureRepo({
    policyEvidence: [
      {
        path: "docs/security/audit-evidence/fresh-registry-audit-fixture.json",
        sha256: "1".repeat(64)
      }
    ]
  })
  assert.throws(
    () =>
      validateTrackedBaseline(artifactShaMismatch.baseline, {
        rootDir: artifactShaMismatch.tempRoot,
        now: "2026-07-19T23:59:59Z"
      }),
    /fresh registry audit evidence artifact.*sha256 mismatch/i
  )

  const packageHashMismatch = createFreshAuditFixtureRepo({
    artifactOverrides: {
      packageFiles: {
        "package.json": {
          sha256: "2".repeat(64)
        },
        "package-lock.json": {
          sha256: "3".repeat(64)
        }
      }
    }
  })
  assert.throws(
    () =>
      validateTrackedBaseline(packageHashMismatch.baseline, {
        rootDir: packageHashMismatch.tempRoot,
        now: "2026-07-19T23:59:59Z"
      }),
    /fresh registry audit evidence artifact.*package\.json sha256.*current package/i
  )

  const forgedClosure = createFreshAuditFixtureRepo()
  forgedClosure.baseline.closedHighCritical[0].evidence[0].riskId =
    "made-up-risk"
  assert.throws(
    () =>
      validateTrackedBaseline(forgedClosure.baseline, {
        rootDir: forgedClosure.tempRoot,
        now: "2026-07-19T23:59:59Z"
      }),
    /fresh_registry_audit closure.*riskId.*match/i
  )
})

test("fresh registry audit dates reject future and inconsistent ordering", () => {
  const futureAudit = createFreshAuditFixtureRepo({
    auditDate: "9999-12-31",
    closedOn: "9999-12-31",
    artifactOverrides: {
      runAt: "9999-12-31T10:00:00Z",
      generatedAt: "9999-12-31T10:00:05Z"
    }
  })
  assert.throws(
    () =>
      validateTrackedBaseline(futureAudit.baseline, {
        rootDir: futureAudit.tempRoot,
        now: "2026-07-19T23:59:59Z"
      }),
    /policy\.freshRegistryAudit\.auditDate.*<= now/
  )

  const closureBeforeAudit = createFreshAuditFixtureRepo({
    auditDate: "2026-07-19",
    closedOn: "2026-07-18"
  })
  assert.throws(
    () =>
      validateTrackedBaseline(closureBeforeAudit.baseline, {
        rootDir: closureBeforeAudit.tempRoot,
        now: "2026-07-19T23:59:59Z"
      }),
    /closedHighCritical\[0\]\.closedOn.*on or after policy\.freshRegistryAudit\.auditDate/
  )

  const futureArtifactGenerated = createFreshAuditFixtureRepo({
    auditDate: "2026-07-19",
    closedOn: "2026-07-19",
    artifactOverrides: {
      generatedAt: "2026-07-20T10:00:05Z"
    }
  })
  assert.throws(
    () =>
      validateTrackedBaseline(futureArtifactGenerated.baseline, {
        rootDir: futureArtifactGenerated.tempRoot,
        now: "2026-07-19T23:59:59Z"
      }),
    /fresh registry audit evidence artifact .*generatedAt.*<= now/
  )

  const artifactGeneratedAfterClosure = createFreshAuditFixtureRepo({
    auditDate: "2026-07-19",
    closedOn: "2026-07-19",
    artifactOverrides: {
      generatedAt: "2026-07-20T10:00:05Z"
    }
  })
  assert.throws(
    () =>
      validateTrackedBaseline(artifactGeneratedAfterClosure.baseline, {
        rootDir: artifactGeneratedAfterClosure.tempRoot,
        now: "2026-07-20T23:59:59Z"
      }),
    /fresh registry audit evidence artifact .*generatedAt.*on or before closedOn/
  )
})

test("fresh registry audit artifact timestamps must not be after the validator instant", () => {
  const now = "2026-07-19T19:59:39Z"
  const currentArtifact = createFreshAuditFixtureRepo({
    artifactOverrides: {
      runAt: "2026-07-19T19:59:38Z",
      generatedAt: now
    }
  })
  assert.doesNotThrow(() =>
    validateTrackedBaseline(currentArtifact.baseline, {
      rootDir: currentArtifact.tempRoot,
      now
    })
  )

  const futureRunAt = createFreshAuditFixtureRepo({
    artifactOverrides: {
      runAt: "2026-07-19T23:59:00Z",
      generatedAt: "2026-07-19T23:59:01Z"
    }
  })
  assert.throws(
    () =>
      validateTrackedBaseline(futureRunAt.baseline, {
        rootDir: futureRunAt.tempRoot,
        now
      }),
    /fresh registry audit evidence artifact .*runAt.*<= now/
  )

  const futureGeneratedAt = createFreshAuditFixtureRepo({
    artifactOverrides: {
      runAt: "2026-07-19T19:59:38Z",
      generatedAt: "2026-07-19T23:59:01Z"
    }
  })
  assert.throws(
    () =>
      validateTrackedBaseline(futureGeneratedAt.baseline, {
        rootDir: futureGeneratedAt.tempRoot,
        now
      }),
    /fresh registry audit evidence artifact .*generatedAt.*<= now/
  )

  const dateOnlyCompatFuture = createFreshAuditFixtureRepo({
    artifactOverrides: {
      runAt: "2026-07-19T00:00:01Z",
      generatedAt: "2026-07-19T00:00:02Z"
    }
  })
  assert.throws(
    () =>
      validateTrackedBaseline(dateOnlyCompatFuture.baseline, {
        rootDir: dateOnlyCompatFuture.tempRoot,
        now: "2026-07-19"
      }),
    /fresh registry audit evidence artifact .*runAt.*<= now/
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
  validateSupplyChainEvidence(evidence, { now: "2026-07-17T23:59:59Z" })

  const output = JSON.stringify(evidence)

  assert.equal(output.includes(process.env.AVISO_SUPPLY_CHAIN_TEST_SECRET), false)
  assert.equal(/rawHttp|httpOutput|prompt|pageContent|credential|secret/i.test(output), false)
  assert.equal(/resolvedUrl|registry\.npmjs\.org/i.test(output), false)

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
      riskId: "example-high-risk",
      packageName: "example-package",
      affectedPackage: {
        packageName: "example-package",
        resolvedVersion: "1.0.0"
      },
      owner: "Security",
      impact: "Build-chain only in local packaging.",
      reviewDeadline: "20260817",
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
      riskId: "example-high-risk",
      owner: "Security",
      impact: "Build-chain only in local packaging.",
      reviewDeadline: "2026-08-17",
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

function createFreshAuditFixtureRepo({
  artifactOverrides = {},
  artifactText,
  auditDate = "2026-07-19",
  closedOn = "2026-07-19",
  policyEvidence
} = {}) {
  const tempRoot = createSupplyChainTempRoot()
  mkdirSync(join(tempRoot, "docs/security/audit-evidence"), { recursive: true })
  writeFileSync(
    join(tempRoot, "package.json"),
    readFileSync(new URL("../package.json", import.meta.url))
  )
  writeFileSync(
    join(tempRoot, "package-lock.json"),
    readFileSync(new URL("../package-lock.json", import.meta.url))
  )

  const artifactPath =
    "docs/security/audit-evidence/fresh-registry-audit-fixture.json"
  const artifact = freshAuditArtifact(tempRoot, artifactOverrides)
  const artifactBody =
    artifactText ?? `${JSON.stringify(artifact, null, 2)}\n`
  writeFileSync(join(tempRoot, artifactPath), artifactBody)
  const artifactSha256 = sha256File(join(tempRoot, artifactPath))

  const baseline = readTrackedBaseline()
  baseline.files["package.json"].sha256 = sha256File(join(tempRoot, "package.json"))
  baseline.files["package-lock.json"].sha256 = sha256File(
    join(tempRoot, "package-lock.json")
  )
  baseline.policy.freshRegistryAudit = {
    status: "verified",
    auditDate,
    evidence: policyEvidence ?? [
      {
        path: artifactPath,
        sha256: artifactSha256
      }
    ]
  }
  baseline.unresolvedHighCritical = []
  baseline.closedHighCritical = [
    {
      riskId: historicalPlasmoRiskId,
      closedOn,
      closureType: "fresh_registry_audit",
      evidence: [
        {
          path: artifactPath,
          sha256: artifactSha256,
          riskId: historicalPlasmoRiskId
        }
      ]
    }
  ]
  writeJson(join(tempRoot, "docs/security/supply-chain-baseline.json"), baseline)

  return { tempRoot, baseline, artifactPath, artifactSha256 }
}

function createDependencyChangedClosureFixture({
  resolvedVersion = "0.91.0",
  omitPlasmoIntegrity = false,
  omitPlasmoResolved = false
} = {}) {
  const tempRoot = createSupplyChainTempRoot()
  const packageJson = readCurrentPackageJson()
  const packageLock = readCurrentPackageLock()
  const plasmoEntry = packageLock.packages["node_modules/plasmo"]

  packageJson.devDependencies.plasmo = resolvedVersion
  packageLock.packages[""].devDependencies.plasmo = resolvedVersion
  plasmoEntry.version = resolvedVersion
  if (omitPlasmoResolved) {
    delete plasmoEntry.resolved
  } else {
    plasmoEntry.resolved =
      "https://registry.npmmirror.com/plasmo/-/plasmo-0.91.0.tgz"
  }
  if (omitPlasmoIntegrity) {
    delete plasmoEntry.integrity
  } else {
    plasmoEntry.integrity =
      "sha512-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=="
  }

  writeJson(join(tempRoot, "package.json"), packageJson)
  writeJson(join(tempRoot, "package-lock.json"), packageLock)

  const baseline = readTrackedBaseline()
  baseline.files["package.json"].sha256 = sha256File(join(tempRoot, "package.json"))
  baseline.files["package-lock.json"].sha256 = sha256File(
    join(tempRoot, "package-lock.json")
  )
  replaceDirectDependencyVersion(baseline, "plasmo", resolvedVersion)
  baseline.unresolvedHighCritical = []
  baseline.closedHighCritical = [
    {
      riskId: historicalPlasmoRiskId,
      closedOn: "2026-07-19",
      closureType: "dependency_changed",
      evidence: [
        "temp package.json and package-lock bind Plasmo current identity 0.91.0"
      ]
    }
  ]
  writeJson(join(tempRoot, "docs/security/supply-chain-baseline.json"), baseline)

  return { tempRoot, baseline }
}

function freshAuditArtifact(rootDir, overrides = {}) {
  return {
    schemaVersion: 1,
    artifactType: "fresh_registry_audit",
    auditTool: "npm",
    auditCommand: "npm audit --json --package-lock-only",
    runAt: "2026-07-19T10:00:00Z",
    generatedAt: "2026-07-19T10:00:05Z",
    packageFiles: {
      "package.json": {
        sha256: sha256File(join(rootDir, "package.json"))
      },
      "package-lock.json": {
        sha256: sha256File(join(rootDir, "package-lock.json"))
      }
    },
    resultSummary: {
      highCount: 0,
      criticalCount: 0,
      summary:
        "Fixture registry audit artifact for tests; no High/Critical findings for bound package files."
    },
    riskIds: [historicalPlasmoRiskId],
    ...overrides
  }
}

function readCurrentPackageJson() {
  return JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"))
}

function readCurrentPackageLock() {
  return JSON.parse(
    readFileSync(new URL("../package-lock.json", import.meta.url), "utf8")
  )
}

function createSupplyChainTempRoot() {
  const tempRoot = mkdtempSync(join(tmpdir(), "aviso-supply-chain-"))
  mkdirSync(join(tempRoot, "docs/security"), { recursive: true })
  return tempRoot
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
}

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex")
}

function plasmoRiskRecord(overrides = {}) {
  const currentPlasmo = readCurrentPackageLock().packages["node_modules/plasmo"]
  return {
    riskId: "historic-plasmo-parcel-build-chain-high-2026-06-10",
    severity: "high",
    packageName: "plasmo",
    affectedPackage: {
      packageName: "plasmo",
      resolvedVersion: "0.90.5",
      resolved: currentPlasmo.resolved,
      integrity: currentPlasmo.integrity
    },
    owner: "Aviso owner",
    impact:
      "Plasmo 0.90.5 keeps a Parcel build-chain high audit finding in the local build/package toolchain.",
    reviewDeadline: "2026-08-16",
    source: "git 49ef781 RELEASE_CHECKLIST.md and STATUS.md",
    advisory:
      "2026-06-10 audit-level high finding for the Plasmo/Parcel build chain; exact GHSA/CVE id was not preserved in repo history",
    ...overrides
  }
}

function replaceDirectDependencyVersion(baseline, packageName, resolvedVersion) {
  for (const dependency of baseline.directDependencies.dev) {
    if (dependency.name === packageName) {
      dependency.declaredVersion = resolvedVersion
      dependency.resolvedVersion = resolvedVersion
    }
  }
}

function ledgerRecord(overrides = {}) {
  return {
    riskId: "example-high-risk",
    severity: "high",
    packageName: "example-package",
    affectedPackage: {
      packageName: "example-package",
      resolvedVersion: "1.0.0"
    },
    owner: "Security",
    impact: "Build-chain only in local packaging.",
    reviewDeadline: "2026-08-17",
    source: "npm-audit",
    advisory: "GHSA-test",
    ...overrides
  }
}

function parseWorkflowSteps(source) {
  const steps = []
  let current = null

  for (const line of source.split(/\r?\n/)) {
    const stepStart = line.match(/^\s+-\s+(uses|name|run):\s*(.+?)\s*$/)
    if (stepStart) {
      current = { [stepStart[1]]: unquoteYamlScalar(stepStart[2]) }
      steps.push(current)
      continue
    }

    const field = line.match(/^\s+(uses|name|run|working-directory):\s*(.+?)\s*$/)
    if (field && current) {
      current[field[1]] = unquoteYamlScalar(field[2])
    }
  }

  return steps
}

function unquoteYamlScalar(value) {
  return value.replace(/^["']|["']$/g, "")
}

function isInstallOrBuildStep(step) {
  return (
    step.uses?.startsWith("actions/setup-node@") ||
    /^(npm ci|npm test|npm run (?:build|package)|npx tsc\b)/.test(step.run ?? "")
  )
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
