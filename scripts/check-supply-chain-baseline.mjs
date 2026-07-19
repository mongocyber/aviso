#!/usr/bin/env node

import { spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import { existsSync, lstatSync, readFileSync, statSync } from "node:fs"
import { isAbsolute, join, normalize, relative, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const schemaVersion = 1
const defaultRootDir = fileURLToPath(new URL("..", import.meta.url))
const defaultBaselinePath = "docs/security/supply-chain-baseline.json"
const trackedPackageFiles = ["package.json", "package-lock.json"]
const hexSha256Pattern = /^[a-f0-9]{64}$/
const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/
const strictUtcInstantPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/
const expectedBaselineSchemaPath = "./supply-chain-baseline.schema.json"
const expectedPlasmoVersion = "0.90.5"
const pendingFreshRegistryAuditStatus = "pending-external"
const completedFreshRegistryAuditStatuses = new Set(["verified", "completed"])
const controlledFreshRegistryAuditEvidenceDir = "docs/security/audit-evidence"
const directDependencySections = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies"
]
const lockIdentityFields = ["version", "resolved", "integrity"]
const lockClassificationFields = new Set(["dev", "devOptional"])

const allowedBaselineTopLevelKeys = [
  "$schema",
  "schemaVersion",
  "updated",
  "policy",
  "files",
  "directDependencies",
  "unresolvedHighCritical",
  "closedHighCritical"
]

const allowedBaselinePolicyKeys = [
  "freshRegistryAudit",
  "runtimeBuildSeparation"
]

const allowedFreshRegistryAuditPolicyKeys = [
  "status",
  "auditDate",
  "evidence"
]
const allowedFreshRegistryAuditEvidenceReferenceKeys = ["path", "sha256"]

const allowedBaselineRuntimeBuildSeparationKeys = [
  "plasmoMustBeDevDependency"
]

const allowedTrackedFileKeys = ["sha256"]
const allowedUnresolvedHighCriticalKeys = [
  "riskId",
  "severity",
  "packageName",
  "affectedPackage",
  "owner",
  "impact",
  "reviewDeadline",
  "source",
  "advisory"
]
const allowedAffectedPackageKeys = [
  "packageName",
  "resolvedVersion",
  "resolved",
  "integrity"
]
const allowedClosedHighCriticalKeys = [
  "riskId",
  "closedOn",
  "closureType",
  "evidence"
]
const allowedFreshRegistryAuditClosureEvidenceKeys = [
  "path",
  "sha256",
  "riskId"
]
const allowedClosureTypes = ["dependency_changed", "fresh_registry_audit"]
const allowedFreshRegistryAuditArtifactKeys = [
  "schemaVersion",
  "artifactType",
  "auditTool",
  "auditCommand",
  "runAt",
  "generatedAt",
  "packageFiles",
  "resultSummary",
  "riskIds"
]
const allowedFreshRegistryAuditResultSummaryKeys = [
  "highCount",
  "criticalCount",
  "summary"
]

const allowedTopLevelKeys = [
  "schemaVersion",
  "gitCommit",
  "baselinePath",
  "packageManager",
  "files",
  "packageLockConsistency",
  "runtimeBuildSeparation",
  "directDependencies",
  "expectedDirectDependencies",
  "packageBaselineDiff",
  "unresolvedHighCritical",
  "closedHighCritical",
  "externalAudit"
]

const allowedDependencyKeys = ["name", "declaredVersion", "resolvedVersion"]
const allowedPackageBaselineDiffKeys = [
  "baseRef",
  "mergeBase",
  "directDependencyChange",
  "packageEntrySetUnchanged",
  "lockPackageIdentityUnchanged",
  "lockNonClassificationMetadataUnchanged"
]

const requiredHistoricalHighCriticalRecords = [
  {
    riskId: "historic-plasmo-parcel-build-chain-high-2026-06-10",
    severity: "high",
    packageName: "plasmo",
    affectedPackage: {
      packageName: "plasmo",
      resolvedVersion: "0.90.5",
      resolved: "https://registry.npmmirror.com/plasmo/-/plasmo-0.90.5.tgz",
      integrity:
        "sha512-VRFsRCHTKCDSRz7ZGmN4hCFqrHE8z7vDYqJK63v5gjRs+EUFdfEciQyGhPmG5NkT+yPvmMZO+R/j1HU/pg2BKA=="
    },
    source:
      "git 49ef781 RELEASE_CHECKLIST.md:97 and STATUS.md:69; 1392a83 later removed this without fresh audit closure",
    advisory:
      "2026-06-10 audit-level high finding for Plasmo 0.90.5 Parcel build chain; exact GHSA/CVE id was not preserved in repo history"
  }
]

export function buildSupplyChainEvidence({
  rootDir = process.cwd(),
  baselinePath = defaultBaselinePath,
  gitCommit,
  baseRef,
  packageBaselineDiff
} = {}) {
  const root = normalizeRootDir(rootDir)
  const packageJson = readJson(join(root, "package.json"))
  const packageLock = readJson(join(root, "package-lock.json"))
  const baseline = readJson(join(root, baselinePath))

  const directDependencies = collectDirectDependencies(packageJson, packageLock)
  validateTrackedBaseline(baseline, {
    rootDir: root,
    currentDirectDependencies: directDependencies,
    currentPackageLock: packageLock
  })
  const expectedDirectDependencies = normalizeDependencyGroups(
    baseline.directDependencies ?? {}
  )
  const effectivePackageBaselineDiff =
    packageBaselineDiff ?? buildPackageBaselineDiff({ rootDir: root, baseRef })
  const freshRegistryAuditPolicy = normalizeFreshRegistryAuditPolicy(
    baseline.policy?.freshRegistryAudit
  )

  const externalAudit = {
    freshRegistryAudit: freshRegistryAuditPolicy.status,
    npmAuditCommandRun: false,
    vulnerabilityClaim: "not-asserted"
  }
  if (completedFreshRegistryAuditStatuses.has(freshRegistryAuditPolicy.status)) {
    externalAudit.auditDate = freshRegistryAuditPolicy.auditDate
    externalAudit.evidence = freshRegistryAuditPolicy.evidence
  }

  return {
    schemaVersion,
    gitCommit: gitCommit ?? readGitCommit(root),
    baselinePath,
    packageManager: {
      name: "npm",
      lockfileVersion: packageLock.lockfileVersion
    },
    files: buildFileEvidence(root, baseline),
    packageLockConsistency: buildPackageLockConsistency(
      packageJson,
      packageLock,
      directDependencies
    ),
    runtimeBuildSeparation: {
      plasmoMustBeDevDependency:
        baseline.policy?.runtimeBuildSeparation?.plasmoMustBeDevDependency ===
        true
    },
    directDependencies,
    expectedDirectDependencies,
    packageBaselineDiff: effectivePackageBaselineDiff,
    unresolvedHighCritical: baseline.unresolvedHighCritical ?? [],
    closedHighCritical: baseline.closedHighCritical ?? [],
    externalAudit
  }
}

export function validateSupplyChainEvidence(
  evidence,
  { now = currentUtcInstant(), rootDir = process.cwd() } = {}
) {
  validateEvidenceSchema(evidence, { now })

  for (const fileName of trackedPackageFiles) {
    const fileEvidence = evidence.files[fileName]
    if (fileEvidence.actualSha256 !== fileEvidence.expectedSha256) {
      throw new Error(
        `${fileName} hash drift: expected ${fileEvidence.expectedSha256}, got ${fileEvidence.actualSha256}`
      )
    }
  }

  for (const [checkName, passed] of Object.entries(
    evidence.packageLockConsistency
  )) {
    if (passed !== true) {
      throw new Error(`package.json/package-lock consistency failed: ${checkName}`)
    }
  }

  if (evidence.runtimeBuildSeparation.plasmoMustBeDevDependency !== true) {
    throw new Error("baseline policy must require Plasmo as a dev dependency")
  }

  validatePlasmoClassification(evidence.directDependencies)
  validateDirectDependencyInventory(evidence)
  validatePackageBaselineDiffEvidence(evidence.packageBaselineDiff)
  validateUnresolvedHighCriticalLedger(evidence.unresolvedHighCritical, { now })
  const evidenceFreshRegistryAuditPolicy = normalizeFreshRegistryAuditPolicy(
    buildFreshRegistryAuditPolicyFromEvidence(evidence.externalAudit),
    { schemaLabel: "evidence schema invalid", now }
  )
  const freshRegistryAuditArtifacts = validateFreshRegistryAuditArtifacts(
    evidenceFreshRegistryAuditPolicy,
    {
      rootDir,
      currentPackageHashes: Object.fromEntries(
        trackedPackageFiles.map((fileName) => [
          fileName,
          evidence.files[fileName].actualSha256
        ])
      ),
      now,
      schemaLabel: "evidence schema invalid"
    }
  )
  const currentPackageFacts = resolveCurrentPackageFacts({
    rootDir: normalizeRootDir(rootDir),
    currentDirectDependencies: evidence.directDependencies,
    schemaLabel: "evidence schema invalid"
  })
  validateClosedHighCriticalLedger(evidence.closedHighCritical, {
    currentDirectDependencies: currentPackageFacts.directDependencies,
    currentPackageLock: currentPackageFacts.packageLock,
    freshRegistryAuditPolicy: evidenceFreshRegistryAuditPolicy,
    freshRegistryAuditArtifacts,
    now
  })
  validateHistoricalHighCriticalContinuity({
    records: evidence.unresolvedHighCritical,
    closedRecords: evidence.closedHighCritical,
    contextLabel: "evidence",
    currentDirectDependencies: currentPackageFacts.directDependencies,
    currentPackageLock: currentPackageFacts.packageLock,
    freshRegistryAuditPolicy: evidenceFreshRegistryAuditPolicy
  })

  if (evidence.externalAudit.npmAuditCommandRun !== false) {
    throw new Error("local baseline evidence must not claim npm audit execution")
  }

  validateSanitizedEvidence(evidence)

  return true
}

export function validateTrackedBaseline(
  baseline,
  {
    rootDir = defaultRootDir,
    currentDirectDependencies,
    currentPackageLock,
    now = currentUtcInstant()
  } = {}
) {
  if (!isPlainObject(baseline)) {
    throw new Error("baseline schema invalid: expected object")
  }

  expectOnlyKeys("baseline", baseline, allowedBaselineTopLevelKeys)

  if (baseline.$schema !== expectedBaselineSchemaPath) {
    throw new Error(
      `baseline schema invalid: $schema must be ${expectedBaselineSchemaPath}`
    )
  }
  if (baseline.schemaVersion !== schemaVersion) {
    throw new Error(
      `baseline schema invalid: schemaVersion must be ${schemaVersion}`
    )
  }
  if (typeof baseline.updated !== "string") {
    throw new Error("baseline schema invalid: updated must be YYYY-MM-DD")
  }
  parseIsoCalendarDate(baseline.updated, "baseline.updated", {
    schemaLabel: "baseline schema invalid"
  })

  const freshRegistryAuditPolicy = validateBaselinePolicy(baseline.policy, {
    now
  })
  validateBaselineFiles(baseline.files)
  const normalizedRootDir = normalizeRootDir(rootDir)
  const freshRegistryAuditArtifacts = validateFreshRegistryAuditArtifacts(
    freshRegistryAuditPolicy,
    {
      rootDir: normalizedRootDir,
      currentPackageHashes: currentPackageHashesFromRoot(normalizedRootDir),
      now,
      schemaLabel: "baseline schema invalid"
    }
  )
  validateDependencyGroups("directDependencies", baseline.directDependencies, {
    schemaLabel: "baseline schema invalid"
  })
  const currentPackageFacts = resolveCurrentPackageFacts({
    rootDir: normalizedRootDir,
    currentDirectDependencies,
    currentPackageLock,
    schemaLabel: "baseline schema invalid"
  })
  validateUnresolvedHighCriticalLedger(baseline.unresolvedHighCritical, {
    enforceExpiration: false,
    schemaLabel: "baseline schema invalid"
  })
  validateClosedHighCriticalLedger(baseline.closedHighCritical ?? [], {
    schemaLabel: "baseline schema invalid",
    currentDirectDependencies: currentPackageFacts.directDependencies,
    currentPackageLock: currentPackageFacts.packageLock,
    freshRegistryAuditPolicy,
    freshRegistryAuditArtifacts,
    now
  })
  validateHistoricalHighCriticalContinuity({
    records: baseline.unresolvedHighCritical,
    closedRecords: baseline.closedHighCritical ?? [],
    contextLabel: "baseline",
    currentDirectDependencies: currentPackageFacts.directDependencies,
    currentPackageLock: currentPackageFacts.packageLock,
    freshRegistryAuditPolicy
  })

  return true
}

export function buildPackageBaselineDiff({ rootDir = process.cwd(), baseRef } = {}) {
  const root = normalizeRootDir(rootDir)
  const { baseRef: resolvedBaseRef, mergeBase } = resolvePackageBaseRef(
    root,
    baseRef
  )

  return validateAllowedPackageBaselineDiff({
    baseRef: resolvedBaseRef,
    mergeBase,
    basePackageJson: readGitJson(root, mergeBase, "package.json"),
    currentPackageJson: readJson(join(root, "package.json")),
    basePackageLock: readGitJson(root, mergeBase, "package-lock.json"),
    currentPackageLock: readJson(join(root, "package-lock.json"))
  })
}

export function validateAllowedPackageBaselineDiff({
  baseRef = "",
  mergeBase = "",
  basePackageJson,
  currentPackageJson,
  basePackageLock,
  currentPackageLock
}) {
  for (const [label, value] of Object.entries({
    basePackageJson,
    currentPackageJson,
    basePackageLock,
    currentPackageLock
  })) {
    if (!isPlainObject(value)) {
      throw new Error(`package base diff invalid: ${label} must be an object`)
    }
  }

  const directDependencyChange = classifyDirectDependencyChange(
    basePackageJson,
    currentPackageJson
  )
  validateRootLockDirectDependencyChange(
    basePackageLock,
    currentPackageLock,
    directDependencyChange
  )
  validatePackageLockEntrySet(basePackageLock, currentPackageLock)
  validatePackageLockIdentityFields(basePackageLock, currentPackageLock)
  validatePackageLockNonClassificationMetadata(
    basePackageLock,
    currentPackageLock,
    directDependencyChange
  )

  return {
    baseRef: baseRef || "resolved-base",
    mergeBase: mergeBase || "resolved-merge-base",
    directDependencyChange,
    packageEntrySetUnchanged: true,
    lockPackageIdentityUnchanged: true,
    lockNonClassificationMetadataUnchanged: true
  }
}

export function validateUnresolvedHighCriticalLedger(
  records,
  {
    now = currentUtcInstant(),
    enforceExpiration = true,
    schemaLabel = "evidence schema invalid"
  } = {}
) {
  if (!Array.isArray(records)) {
    throw new Error("unresolvedHighCritical ledger must be an array")
  }

  const nowUtc = parseValidatorNow(now, { schemaLabel }).calendarDateUtc
  for (const [index, record] of records.entries()) {
    if (!isPlainObject(record)) {
      throw new Error(`unresolvedHighCritical[${index}] must be an object`)
    }
    expectOnlyKeys(
      `unresolvedHighCritical[${index}]`,
      record,
      allowedUnresolvedHighCriticalKeys,
      { schemaLabel }
    )
    if (!["high", "critical"].includes(record.severity)) {
      throw new Error(
        `unresolvedHighCritical[${index}].severity must be high or critical`
      )
    }

    for (const field of allowedUnresolvedHighCriticalKeys.filter(
      (key) => key !== "severity" && key !== "affectedPackage"
    )) {
      if (typeof record[field] !== "string" || record[field].trim() === "") {
        throw new Error(`unresolvedHighCritical[${index}] missing ${field}`)
      }
    }
    validateAffectedPackage(
      record.affectedPackage,
      `unresolvedHighCritical[${index}].affectedPackage`,
      { schemaLabel }
    )
    if (record.packageName !== record.affectedPackage.packageName) {
      throw new Error(
        `unresolvedHighCritical[${index}].affectedPackage.packageName must match packageName`
      )
    }

    const reviewDeadlineUtc = parseIsoCalendarDate(
      record.reviewDeadline,
      `unresolvedHighCritical[${index}].reviewDeadline`,
      { schemaLabel }
    )
    if (enforceExpiration && reviewDeadlineUtc < nowUtc) {
      throw new Error(
        `unresolvedHighCritical[${index}] expired on ${record.reviewDeadline}`
      )
    }
  }

  return true
}

function validateClosedHighCriticalLedger(
  records,
  {
    schemaLabel = "evidence schema invalid",
    currentDirectDependencies,
    currentPackageLock,
    freshRegistryAuditPolicy = { status: pendingFreshRegistryAuditStatus },
    freshRegistryAuditArtifacts = new Map(),
    now = currentUtcInstant()
  } = {}
) {
  if (!Array.isArray(records)) {
    throw new Error(`${schemaLabel}: closedHighCritical must be an array`)
  }

  const seenRiskIds = new Set()
  for (const [index, record] of records.entries()) {
    if (!isPlainObject(record)) {
      throw new Error(`closedHighCritical[${index}] must be an object`)
    }
    expectOnlyKeys(`closedHighCritical[${index}]`, record, allowedClosedHighCriticalKeys, {
      schemaLabel
    })

    for (const field of ["riskId", "closedOn", "closureType"]) {
      if (typeof record[field] !== "string" || record[field].trim() === "") {
        throw new Error(`${schemaLabel}: closedHighCritical[${index}].${field}`)
      }
    }
    if (seenRiskIds.has(record.riskId)) {
      throw new Error(`${schemaLabel}: duplicate closedHighCritical riskId`)
    }
    seenRiskIds.add(record.riskId)

    const closedOnUtc = parseIsoCalendarDate(
      record.closedOn,
      `closedHighCritical[${index}].closedOn`,
      { schemaLabel }
    )
    const nowUtc = parseValidatorNow(now, { schemaLabel }).calendarDateUtc
    if (closedOnUtc > nowUtc) {
      throw new Error(
        `${schemaLabel}: closedHighCritical[${index}].closedOn must be <= now`
      )
    }
    if (!allowedClosureTypes.includes(record.closureType)) {
      throw new Error(
        `${schemaLabel}: closedHighCritical[${index}].closureType must be dependency_changed or fresh_registry_audit`
      )
    }

    const historicalRisk = requiredHistoricalHighCriticalRecords.find(
      (risk) => risk.riskId === record.riskId
    )
    if (!historicalRisk) {
      throw new Error(
        `${schemaLabel}: closedHighCritical[${index}].riskId is not a tracked historical risk`
      )
    }

    if (record.closureType === "dependency_changed") {
      validateStringArray(
        record.evidence,
        `closedHighCritical[${index}].evidence`,
        { schemaLabel }
      )
      const currentFingerprint = collectCurrentAffectedPackageFingerprint(
        historicalRisk.packageName,
        { currentDirectDependencies, currentPackageLock }
      )
      if (packageFingerprintMatchesRisk(currentFingerprint, historicalRisk)) {
        throw new Error(
          `dependency_changed closure for ${historicalRisk.packageName} is invalid: current parsed package still matches historical risk`
        )
      }
    }

    if (record.closureType === "fresh_registry_audit") {
      if (!completedFreshRegistryAuditStatuses.has(freshRegistryAuditPolicy.status)) {
        throw new Error(
          `fresh_registry_audit closure for ${historicalRisk.packageName} requires verified/completed policy, got ${freshRegistryAuditPolicy.status}`
        )
      }
      const auditDateUtc = parseIsoCalendarDate(
        freshRegistryAuditPolicy.auditDate,
        "policy.freshRegistryAudit.auditDate",
        { schemaLabel }
      )
      if (closedOnUtc < auditDateUtc) {
        throw new Error(
          `${schemaLabel}: closedHighCritical[${index}].closedOn must be on or after policy.freshRegistryAudit.auditDate`
        )
      }
      const closureEvidence = validateFreshRegistryAuditEvidenceReferences(
        record.evidence,
        `closedHighCritical[${index}].evidence`,
        { schemaLabel, includeRiskId: true }
      )
      for (const evidenceReference of closureEvidence) {
        if (evidenceReference.riskId !== record.riskId) {
          throw new Error(
            `${schemaLabel}: fresh_registry_audit closure evidence riskId must match closedHighCritical[${index}].riskId`
          )
        }
        const artifact = freshRegistryAuditArtifacts?.get(
          freshRegistryAuditArtifactKey(evidenceReference)
        )
        if (!artifact) {
          throw new Error(
            `${schemaLabel}: fresh_registry_audit closure must reference a policy fresh registry audit evidence artifact`
          )
        }
        if (!artifact.riskIds.includes(record.riskId)) {
          throw new Error(
            `${schemaLabel}: fresh_registry_audit closure artifact must bind riskId ${record.riskId}`
          )
        }
        validateFreshRegistryAuditArtifactClosureOrder(artifact, {
          artifactPath: evidenceReference.path,
          closedOn: record.closedOn,
          schemaLabel
        })
        if (
          artifact.resultSummary.highCount !== 0 ||
          artifact.resultSummary.criticalCount !== 0
        ) {
          throw new Error(
            `${schemaLabel}: fresh_registry_audit closure requires zero High/Critical findings in the artifact result summary`
          )
        }
      }
    }
  }

  return true
}

function validateHistoricalHighCriticalContinuity({
  records,
  closedRecords = [],
  contextLabel,
  currentDirectDependencies,
  currentPackageLock,
  freshRegistryAuditPolicy = { status: pendingFreshRegistryAuditStatus }
} = {}) {
  const closedRiskIds = new Set(closedRecords.map((record) => record.riskId))

  for (const historicalRisk of requiredHistoricalHighCriticalRecords) {
    const unresolvedRecord = records.find(
      (record) => record?.riskId === historicalRisk.riskId
    )
    if (unresolvedRecord) {
      validateHistoricalRiskRecordIdentity(unresolvedRecord, historicalRisk, {
        contextLabel
      })
      continue
    }

    const hasStructuredClosure = closedRiskIds.has(historicalRisk.riskId)
    if (!hasStructuredClosure) {
      throw new Error(
        `${contextLabel} historical unresolved High/Critical record for ${historicalRisk.packageName} was removed without structured closure evidence`
      )
    }
    if (completedFreshRegistryAuditStatuses.has(freshRegistryAuditPolicy.status)) {
      continue
    }

    const currentFingerprint = collectCurrentAffectedPackageFingerprint(
      historicalRisk.packageName,
      { currentDirectDependencies, currentPackageLock }
    )
    const packageStillMatches = packageFingerprintMatchesRisk(
      currentFingerprint,
      historicalRisk
    )
    if (
      packageStillMatches &&
      !completedFreshRegistryAuditStatuses.has(freshRegistryAuditPolicy.status)
    ) {
      throw new Error(
        `${contextLabel} historical unresolved High/Critical record for ${historicalRisk.packageName} is still applicable and fresh registry audit is ${freshRegistryAuditPolicy.status}`
      )
    }
  }
}

function validateHistoricalRiskRecordIdentity(actual, expected, { contextLabel }) {
  for (const field of ["riskId", "severity", "packageName"]) {
    if (actual[field] !== expected[field]) {
      throw new Error(
        `${contextLabel} historical unresolved High/Critical ${expected.riskId} changed stable ${field}`
      )
    }
  }
  if (!packageFingerprintContainsRisk(actual.affectedPackage, expected)) {
    throw new Error(
      `${contextLabel} historical unresolved High/Critical ${expected.riskId} changed affected package fingerprint`
    )
  }
}

function validateAffectedPackage(
  affectedPackage,
  label,
  { schemaLabel = "evidence schema invalid" } = {}
) {
  if (!isPlainObject(affectedPackage)) {
    throw new Error(`${schemaLabel}: ${label} must be an object`)
  }
  expectOnlyKeys(label, affectedPackage, allowedAffectedPackageKeys, {
    schemaLabel,
    optionalKeys: ["resolved", "integrity"]
  })

  for (const field of ["packageName", "resolvedVersion"]) {
    if (
      typeof affectedPackage[field] !== "string" ||
      affectedPackage[field].trim() === ""
    ) {
      throw new Error(`${schemaLabel}: ${label}.${field}`)
    }
  }
  for (const field of ["resolved", "integrity"]) {
    if (
      field in affectedPackage &&
      (typeof affectedPackage[field] !== "string" ||
        affectedPackage[field].trim() === "")
    ) {
      throw new Error(`${schemaLabel}: ${label}.${field}`)
    }
  }
}

function validateStringArray(value, label, { schemaLabel = "evidence schema invalid" } = {}) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${schemaLabel}: ${label} must be a non-empty string array`)
  }
  for (const [index, entry] of value.entries()) {
    if (typeof entry !== "string" || entry.trim() === "") {
      throw new Error(`${schemaLabel}: ${label}[${index}] must be a string`)
    }
  }
}

function validateFreshRegistryAuditEvidenceReferences(
  value,
  label,
  { schemaLabel = "evidence schema invalid", includeRiskId = false } = {}
) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(
      `${schemaLabel}: ${label} must be a non-empty fresh registry audit evidence artifact reference array`
    )
  }

  const allowedKeys = includeRiskId
    ? allowedFreshRegistryAuditClosureEvidenceKeys
    : allowedFreshRegistryAuditEvidenceReferenceKeys
  const references = []
  for (const [index, entry] of value.entries()) {
    if (!isPlainObject(entry)) {
      throw new Error(
        `${schemaLabel}: ${label}[${index}] must be a fresh registry audit evidence artifact reference`
      )
    }
    expectOnlyKeys(`${label}[${index}]`, entry, allowedKeys, { schemaLabel })
    for (const field of ["path", "sha256"]) {
      if (typeof entry[field] !== "string" || entry[field].trim() === "") {
        throw new Error(`${schemaLabel}: ${label}[${index}].${field}`)
      }
    }
    if (!hexSha256Pattern.test(entry.sha256)) {
      throw new Error(`${schemaLabel}: ${label}[${index}].sha256`)
    }
    if (includeRiskId) {
      if (typeof entry.riskId !== "string" || entry.riskId.trim() === "") {
        throw new Error(`${schemaLabel}: ${label}[${index}].riskId`)
      }
      references.push({
        path: entry.path,
        sha256: entry.sha256,
        riskId: entry.riskId
      })
      continue
    }
    references.push({ path: entry.path, sha256: entry.sha256 })
  }

  return references
}

function validateFreshRegistryAuditArtifacts(
  freshRegistryAuditPolicy,
  {
    rootDir,
    currentPackageHashes,
    now = currentUtcInstant(),
    schemaLabel = "evidence schema invalid"
  } = {}
) {
  const artifacts = new Map()
  if (
    !freshRegistryAuditPolicy ||
    freshRegistryAuditPolicy.status === pendingFreshRegistryAuditStatus
  ) {
    return artifacts
  }

  for (const reference of freshRegistryAuditPolicy.evidence) {
    const artifact = readFreshRegistryAuditArtifact(reference, {
      rootDir,
      currentPackageHashes,
      auditDate: freshRegistryAuditPolicy.auditDate,
      now,
      schemaLabel
    })
    artifacts.set(freshRegistryAuditArtifactKey(reference), artifact)
  }
  return artifacts
}

function readFreshRegistryAuditArtifact(
  reference,
  { rootDir, currentPackageHashes, auditDate, now, schemaLabel }
) {
  const artifactPath = resolveFreshRegistryAuditArtifactPath(
    rootDir,
    reference.path,
    { schemaLabel }
  )
  const actualSha256 = sha256File(artifactPath)
  if (actualSha256 !== reference.sha256) {
    throw new Error(
      `${schemaLabel}: fresh registry audit evidence artifact ${reference.path} sha256 mismatch`
    )
  }

  let artifact
  try {
    artifact = JSON.parse(readFileSync(artifactPath, "utf8"))
  } catch {
    throw new Error(
      `${schemaLabel}: fresh registry audit evidence artifact ${reference.path} must be a JSON object`
    )
  }
  validateFreshRegistryAuditArtifact(artifact, {
    artifactPath: reference.path,
    currentPackageHashes,
    auditDate,
    now,
    schemaLabel
  })
  return artifact
}

function resolveFreshRegistryAuditArtifactPath(
  rootDir,
  evidencePath,
  { schemaLabel = "evidence schema invalid" } = {}
) {
  if (
    typeof evidencePath !== "string" ||
    evidencePath.trim() === "" ||
    evidencePath.includes("\\") ||
    isAbsolute(evidencePath)
  ) {
    throw new Error(
      `${schemaLabel}: fresh registry audit evidence artifact path must be relative and stay in the controlled directory`
    )
  }

  const normalizedPath = normalize(evidencePath)
  const controlledPrefix = `${controlledFreshRegistryAuditEvidenceDir}/`
  if (
    normalizedPath !== evidencePath ||
    normalizedPath === controlledFreshRegistryAuditEvidenceDir ||
    !normalizedPath.startsWith(controlledPrefix)
  ) {
    throw new Error(
      `${schemaLabel}: fresh registry audit evidence artifact path must stay in the controlled directory ${controlledFreshRegistryAuditEvidenceDir}`
    )
  }

  const normalizedRootDir = normalizeRootDir(rootDir)
  const resolvedPath = resolve(normalizedRootDir, normalizedPath)
  const relativePath = relative(normalizedRootDir, resolvedPath)
  if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
    throw new Error(
      `${schemaLabel}: fresh registry audit evidence artifact path must stay in the repository`
    )
  }
  assertNoSymlinkPath(normalizedRootDir, normalizedPath, { schemaLabel })

  const stats = statSync(resolvedPath)
  if (!stats.isFile()) {
    throw new Error(
      `${schemaLabel}: fresh registry audit evidence artifact ${evidencePath} must be a file`
    )
  }
  return resolvedPath
}

function assertNoSymlinkPath(
  rootDir,
  evidencePath,
  { schemaLabel = "evidence schema invalid" } = {}
) {
  let currentPath = rootDir
  const parts = evidencePath.split("/")
  for (const [index, part] of parts.entries()) {
    currentPath = join(currentPath, part)
    if (!existsSync(currentPath)) {
      throw new Error(
        `${schemaLabel}: fresh registry audit evidence artifact ${evidencePath} does not exist`
      )
    }
    const stats = lstatSync(currentPath)
    if (stats.isSymbolicLink()) {
      throw new Error(
        `${schemaLabel}: fresh registry audit evidence artifact ${evidencePath} must not use a symlink path`
      )
    }
    if (index < parts.length - 1 && !stats.isDirectory()) {
      throw new Error(
        `${schemaLabel}: fresh registry audit evidence artifact ${evidencePath} parent must be a directory`
      )
    }
  }
}

function validateFreshRegistryAuditArtifact(
  artifact,
  { artifactPath, currentPackageHashes, auditDate, now, schemaLabel }
) {
  if (!isPlainObject(artifact)) {
    throw new Error(
      `${schemaLabel}: fresh registry audit evidence artifact ${artifactPath} must be a JSON object`
    )
  }
  expectOnlyKeys(
    `fresh registry audit evidence artifact ${artifactPath}`,
    artifact,
    allowedFreshRegistryAuditArtifactKeys,
    { schemaLabel }
  )
  if (artifact.schemaVersion !== schemaVersion) {
    throw new Error(
      `${schemaLabel}: fresh registry audit evidence artifact ${artifactPath}.schemaVersion must be ${schemaVersion}`
    )
  }
  if (artifact.artifactType !== "fresh_registry_audit") {
    throw new Error(
      `${schemaLabel}: fresh registry audit evidence artifact ${artifactPath}.artifactType must be fresh_registry_audit`
    )
  }
  for (const field of ["auditTool", "auditCommand", "runAt", "generatedAt"]) {
    if (typeof artifact[field] !== "string" || artifact[field].trim() === "") {
      throw new Error(
        `${schemaLabel}: fresh registry audit evidence artifact ${artifactPath}.${field}`
      )
    }
  }
  if (!/\baudit\b/i.test(artifact.auditCommand)) {
    throw new Error(
      `${schemaLabel}: fresh registry audit evidence artifact ${artifactPath}.auditCommand must identify an audit command`
    )
  }

  const runAt = parseStrictUtcInstant(
    artifact.runAt,
    `fresh registry audit evidence artifact ${artifactPath}.runAt`,
    { schemaLabel }
  )
  const generatedAt = parseStrictUtcInstant(
    artifact.generatedAt,
    `fresh registry audit evidence artifact ${artifactPath}.generatedAt`,
    { schemaLabel }
  )
  const nowUtc = parseValidatorNow(now, { schemaLabel }).instantUtc
  for (const [field, timestamp] of [
    ["runAt", runAt],
    ["generatedAt", generatedAt]
  ]) {
    if (timestamp > nowUtc) {
      throw new Error(
        `${schemaLabel}: fresh registry audit evidence artifact ${artifactPath}.${field} must be <= now`
      )
    }
  }
  if (generatedAt < runAt) {
    throw new Error(
      `${schemaLabel}: fresh registry audit evidence artifact ${artifactPath}.generatedAt must be on or after runAt`
    )
  }
  if (utcInstantDate(runAt) !== auditDate) {
    throw new Error(
      `${schemaLabel}: fresh registry audit evidence artifact ${artifactPath}.runAt must match policy.freshRegistryAudit.auditDate`
    )
  }

  validateAuditArtifactPackageFiles(artifact.packageFiles, {
    artifactPath,
    currentPackageHashes,
    schemaLabel
  })
  validateAuditArtifactResultSummary(artifact.resultSummary, {
    artifactPath,
    schemaLabel
  })
  validateStringArray(artifact.riskIds, `fresh registry audit evidence artifact ${artifactPath}.riskIds`, {
    schemaLabel
  })
}

function validateFreshRegistryAuditArtifactClosureOrder(
  artifact,
  { artifactPath, closedOn, schemaLabel }
) {
  const closedOnUtc = parseIsoCalendarDate(closedOn, "closedOn", {
    schemaLabel
  })
  for (const field of ["runAt", "generatedAt"]) {
    const timestamp = parseStrictUtcInstant(
      artifact[field],
      `fresh registry audit evidence artifact ${artifactPath}.${field}`,
      { schemaLabel }
    )
    const artifactDate = utcInstantDate(timestamp)
    const artifactDateUtc = parseIsoCalendarDate(artifactDate, `${field} date`, {
      schemaLabel
    })
    if (artifactDateUtc > closedOnUtc) {
      throw new Error(
        `${schemaLabel}: fresh registry audit evidence artifact ${artifactPath}.${field} must be on or before closedOn`
      )
    }
  }
}

function validateAuditArtifactPackageFiles(
  packageFiles,
  { artifactPath, currentPackageHashes, schemaLabel }
) {
  if (!isPlainObject(packageFiles)) {
    throw new Error(
      `${schemaLabel}: fresh registry audit evidence artifact ${artifactPath}.packageFiles must be an object`
    )
  }
  expectOnlyKeys(
    `fresh registry audit evidence artifact ${artifactPath}.packageFiles`,
    packageFiles,
    trackedPackageFiles,
    { schemaLabel }
  )

  for (const fileName of trackedPackageFiles) {
    const fileBinding = packageFiles[fileName]
    if (!isPlainObject(fileBinding)) {
      throw new Error(
        `${schemaLabel}: fresh registry audit evidence artifact ${artifactPath}.${fileName} binding must be an object`
      )
    }
    expectOnlyKeys(
      `fresh registry audit evidence artifact ${artifactPath}.packageFiles.${fileName}`,
      fileBinding,
      allowedTrackedFileKeys,
      { schemaLabel }
    )
    if (!hexSha256Pattern.test(fileBinding.sha256)) {
      throw new Error(
        `${schemaLabel}: fresh registry audit evidence artifact ${artifactPath}.${fileName} sha256`
      )
    }
    if (fileBinding.sha256 !== currentPackageHashes[fileName]) {
      throw new Error(
        `${schemaLabel}: fresh registry audit evidence artifact ${artifactPath} ${fileName} sha256 must match current package files`
      )
    }
  }
}

function validateAuditArtifactResultSummary(
  resultSummary,
  { artifactPath, schemaLabel }
) {
  if (!isPlainObject(resultSummary)) {
    throw new Error(
      `${schemaLabel}: fresh registry audit evidence artifact ${artifactPath}.resultSummary must be an object`
    )
  }
  expectOnlyKeys(
    `fresh registry audit evidence artifact ${artifactPath}.resultSummary`,
    resultSummary,
    allowedFreshRegistryAuditResultSummaryKeys,
    { schemaLabel }
  )
  for (const field of ["highCount", "criticalCount"]) {
    if (
      !Number.isInteger(resultSummary[field]) ||
      resultSummary[field] < 0
    ) {
      throw new Error(
        `${schemaLabel}: fresh registry audit evidence artifact ${artifactPath}.resultSummary.${field} must be a non-negative integer`
      )
    }
  }
  if (
    typeof resultSummary.summary !== "string" ||
    resultSummary.summary.trim() === ""
  ) {
    throw new Error(
      `${schemaLabel}: fresh registry audit evidence artifact ${artifactPath}.resultSummary.summary`
    )
  }
}

function freshRegistryAuditArtifactKey(reference) {
  return `${reference.path}\0${reference.sha256}`
}

function currentPackageHashesFromRoot(rootDir) {
  return Object.fromEntries(
    trackedPackageFiles.map((fileName) => [
      fileName,
      sha256File(join(rootDir, fileName))
    ])
  )
}

function resolveCurrentPackageFacts({
  rootDir,
  currentDirectDependencies,
  currentPackageLock,
  schemaLabel = "evidence schema invalid"
} = {}) {
  let directDependencies = currentDirectDependencies
  let packageLock = currentPackageLock

  try {
    if (!packageLock) {
      packageLock = readJson(join(rootDir, "package-lock.json"))
    }
    if (!directDependencies) {
      const packageJson = readJson(join(rootDir, "package.json"))
      directDependencies = collectDirectDependencies(packageJson, packageLock)
    }
  } catch (error) {
    throw new Error(
      `${schemaLabel}: unable to read current package.json/package-lock.json from rootDir for dependency_changed closure validation: ${error.message}`
    )
  }

  return {
    directDependencies: normalizeDependencyGroups(directDependencies),
    packageLock
  }
}

function collectCurrentAffectedPackageFingerprint(
  packageName,
  { currentDirectDependencies, currentPackageLock } = {}
) {
  const directDependency = findDirectDependency(currentDirectDependencies, packageName)
  if (!directDependency) {
    throw new Error(
      `dependency_changed closure for ${packageName} is invalid: current direct dependency facts are missing ${packageName}`
    )
  }

  const lockEntry = currentPackageLock?.packages?.[`node_modules/${packageName}`]
  if (!isPlainObject(lockEntry)) {
    throw new Error(
      `dependency_changed closure for ${packageName} is invalid: current package identity is incomplete (lock entry)`
    )
  }
  const fingerprint = {
    packageName,
    resolvedVersion: directDependency.resolvedVersion,
    resolved: lockEntry.resolved,
    integrity: lockEntry.integrity
  }
  validateCompleteCurrentPackageFingerprint(fingerprint, packageName)
  return fingerprint
}

function validateCompleteCurrentPackageFingerprint(fingerprint, packageName) {
  for (const field of ["packageName", "resolvedVersion", "resolved", "integrity"]) {
    if (
      typeof fingerprint[field] !== "string" ||
      fingerprint[field].trim() === ""
    ) {
      throw new Error(
        `dependency_changed closure for ${packageName} is invalid: current package identity is incomplete (${field})`
      )
    }
  }
}

function findDirectDependency(groups, packageName) {
  for (const groupName of ["runtime", "dev"]) {
    for (const dependency of groups?.[groupName] ?? []) {
      if (dependency.name === packageName) {
        return dependency
      }
    }
  }
  return null
}

function packageFingerprintMatchesRisk(currentFingerprint, historicalRisk) {
  return packageFingerprintContainsRisk(currentFingerprint, historicalRisk)
}

function packageFingerprintContainsRisk(
  actualFingerprint,
  historicalRisk
) {
  const expectedFingerprint = historicalRisk.affectedPackage
  for (const field of ["packageName", "resolvedVersion", "resolved", "integrity"]) {
    if (actualFingerprint?.[field] !== expectedFingerprint[field]) {
      return false
    }
  }
  return true
}

function parseIsoCalendarDate(
  value,
  fieldLabel,
  { schemaLabel = "evidence schema invalid" } = {}
) {
  if (typeof value !== "string" || !isoDatePattern.test(value)) {
    throw new Error(
      `${schemaLabel}: ${fieldLabel} must be a valid UTC calendar date YYYY-MM-DD`
    )
  }

  const [year, month, day] = value.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  if (year >= 0 && year <= 99) {
    date.setUTCFullYear(year)
  }

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(
      `${schemaLabel}: ${fieldLabel} must be a valid UTC calendar date YYYY-MM-DD`
    )
  }

  return date.getTime()
}

function parseStrictUtcInstant(
  value,
  fieldLabel,
  { schemaLabel = "evidence schema invalid" } = {}
) {
  if (typeof value !== "string" || !strictUtcInstantPattern.test(value)) {
    throw new Error(
      `${schemaLabel}: ${fieldLabel} must be a strict UTC timestamp YYYY-MM-DDTHH:mm:ss[.sss]Z`
    )
  }

  const timestamp = Date.parse(value)
  const normalized = normalizeUtcInstant(timestamp, value)
  if (normalized !== value) {
    throw new Error(
      `${schemaLabel}: ${fieldLabel} must be a strict UTC timestamp YYYY-MM-DDTHH:mm:ss[.sss]Z`
    )
  }
  return timestamp
}

function normalizeUtcInstant(timestamp, originalValue) {
  if (!Number.isFinite(timestamp)) {
    return ""
  }
  const normalized = new Date(timestamp).toISOString()
  return originalValue.includes(".")
    ? normalized
    : normalized.replace(".000Z", "Z")
}

function utcInstantDate(timestamp) {
  return new Date(timestamp).toISOString().slice(0, 10)
}

function parseValidatorNow(
  value,
  { schemaLabel = "evidence schema invalid" } = {}
) {
  if (typeof value === "string" && isoDatePattern.test(value)) {
    const calendarDateUtc = parseIsoCalendarDate(value, "now", { schemaLabel })
    return {
      calendarDate: value,
      calendarDateUtc,
      instantUtc: parseStrictUtcInstant(`${value}T00:00:00Z`, "now", {
        schemaLabel
      })
    }
  }

  if (typeof value === "string" && strictUtcInstantPattern.test(value)) {
    const instantUtc = parseStrictUtcInstant(value, "now", { schemaLabel })
    const calendarDate = utcInstantDate(instantUtc)
    return {
      calendarDate,
      calendarDateUtc: parseIsoCalendarDate(calendarDate, "now date", {
        schemaLabel
      }),
      instantUtc
    }
  }

  throw new Error(
    `${schemaLabel}: now must be a strict UTC timestamp YYYY-MM-DDTHH:mm:ss[.sss]Z or UTC calendar date YYYY-MM-DD`
  )
}

function validateEvidenceSchema(evidence, { now = currentUtcInstant() } = {}) {
  if (!isPlainObject(evidence)) {
    throw new Error("evidence schema invalid: expected object")
  }
  expectOnlyKeys("evidence", evidence, allowedTopLevelKeys)

  if (evidence.schemaVersion !== schemaVersion) {
    throw new Error(`evidence schema invalid: schemaVersion must be ${schemaVersion}`)
  }
  for (const field of ["gitCommit", "baselinePath"]) {
    if (typeof evidence[field] !== "string" || evidence[field].trim() === "") {
      throw new Error(`evidence schema invalid: ${field} must be a string`)
    }
  }

  if (!isPlainObject(evidence.packageManager)) {
    throw new Error("evidence schema invalid: packageManager must be an object")
  }
  expectOnlyKeys("packageManager", evidence.packageManager, [
    "name",
    "lockfileVersion"
  ])
  if (
    evidence.packageManager.name !== "npm" ||
    evidence.packageManager.lockfileVersion !== 3
  ) {
    throw new Error("evidence schema invalid: expected npm lockfileVersion 3")
  }

  validateFileEvidenceSchema(evidence.files)
  validateBooleanMap("packageLockConsistency", evidence.packageLockConsistency)
  validateBooleanMap("runtimeBuildSeparation", evidence.runtimeBuildSeparation)
  validateDependencyGroups("directDependencies", evidence.directDependencies)
  validateDependencyGroups(
    "expectedDirectDependencies",
    evidence.expectedDirectDependencies
  )
  validatePackageBaselineDiffEvidence(evidence.packageBaselineDiff)

  if (!Array.isArray(evidence.unresolvedHighCritical)) {
    throw new Error("evidence schema invalid: unresolvedHighCritical must be an array")
  }
  if (!Array.isArray(evidence.closedHighCritical)) {
    throw new Error("evidence schema invalid: closedHighCritical must be an array")
  }

  if (!isPlainObject(evidence.externalAudit)) {
    throw new Error("evidence schema invalid: externalAudit must be an object")
  }
  expectOnlyKeys("externalAudit", evidence.externalAudit, [
    "freshRegistryAudit",
    "npmAuditCommandRun",
    "vulnerabilityClaim",
    "auditDate",
    "evidence"
  ], {
    optionalKeys: ["auditDate", "evidence"]
  })
  if (
    evidence.externalAudit.npmAuditCommandRun !== false ||
    evidence.externalAudit.vulnerabilityClaim !== "not-asserted"
  ) {
    throw new Error("evidence schema invalid: externalAudit values are invalid")
  }
  normalizeFreshRegistryAuditPolicy(
    buildFreshRegistryAuditPolicyFromEvidence(evidence.externalAudit),
    { schemaLabel: "evidence schema invalid", now }
  )
}

function validateBaselinePolicy(policy, { now = currentUtcInstant() } = {}) {
  if (!isPlainObject(policy)) {
    throw new Error("baseline schema invalid: policy must be an object")
  }
  expectOnlyKeys("policy", policy, allowedBaselinePolicyKeys)
  const freshRegistryAuditPolicy = normalizeFreshRegistryAuditPolicy(
    policy.freshRegistryAudit,
    { schemaLabel: "baseline schema invalid", now }
  )

  const runtimeBuildSeparation = policy.runtimeBuildSeparation
  if (!isPlainObject(runtimeBuildSeparation)) {
    throw new Error(
      "baseline schema invalid: policy.runtimeBuildSeparation must be an object"
    )
  }
  expectOnlyKeys(
    "policy.runtimeBuildSeparation",
    runtimeBuildSeparation,
    allowedBaselineRuntimeBuildSeparationKeys
  )
  if (runtimeBuildSeparation.plasmoMustBeDevDependency !== true) {
    throw new Error(
      "baseline schema invalid: policy.runtimeBuildSeparation.plasmoMustBeDevDependency must be true"
    )
  }
  return freshRegistryAuditPolicy
}

function normalizeFreshRegistryAuditPolicy(
  value,
  {
    schemaLabel = "baseline schema invalid",
    allowAuditEvidence = true,
    now = currentUtcInstant()
  } = {}
) {
  if (typeof value === "string") {
    if (value !== pendingFreshRegistryAuditStatus) {
      throw new Error(
        `${schemaLabel}: policy.freshRegistryAudit must be pending-external or structured audit status`
      )
    }
    return { status: value }
  }

  if (!isPlainObject(value)) {
    throw new Error(
      `${schemaLabel}: policy.freshRegistryAudit must be pending-external or structured audit status`
    )
  }
  expectOnlyKeys(
    "policy.freshRegistryAudit",
    value,
    value.status === pendingFreshRegistryAuditStatus
      ? ["status"]
      : allowedFreshRegistryAuditPolicyKeys,
    { schemaLabel }
  )
  if (
    value.status !== pendingFreshRegistryAuditStatus &&
    !completedFreshRegistryAuditStatuses.has(value.status)
  ) {
    throw new Error(
      `${schemaLabel}: policy.freshRegistryAudit.status must be pending-external, verified, or completed`
    )
  }

  if (value.status === pendingFreshRegistryAuditStatus) {
    return { status: pendingFreshRegistryAuditStatus }
  }
  if (!allowAuditEvidence) {
    return { status: value.status }
  }

  const auditDateUtc = parseIsoCalendarDate(
    value.auditDate,
    "policy.freshRegistryAudit.auditDate",
    {
      schemaLabel
    }
  )
  const nowUtc = parseValidatorNow(now, { schemaLabel }).calendarDateUtc
  if (auditDateUtc > nowUtc) {
    throw new Error(
      `${schemaLabel}: policy.freshRegistryAudit.auditDate must be <= now`
    )
  }
  const evidence = validateFreshRegistryAuditEvidenceReferences(
    value.evidence,
    "policy.freshRegistryAudit.evidence",
    { schemaLabel }
  )
  return {
    status: value.status,
    auditDate: value.auditDate,
    evidence
  }
}

function buildFreshRegistryAuditPolicyFromEvidence(externalAudit) {
  if (
    !externalAudit ||
    externalAudit.freshRegistryAudit === pendingFreshRegistryAuditStatus
  ) {
    return pendingFreshRegistryAuditStatus
  }
  return {
    status: externalAudit.freshRegistryAudit,
    auditDate: externalAudit.auditDate,
    evidence: externalAudit.evidence
  }
}

function validateBaselineFiles(files) {
  if (!isPlainObject(files)) {
    throw new Error("baseline schema invalid: files must be an object")
  }
  expectOnlyKeys("files", files, trackedPackageFiles)

  for (const fileName of trackedPackageFiles) {
    const entry = files[fileName]
    if (!isPlainObject(entry)) {
      throw new Error(`baseline schema invalid: files.${fileName} must be an object`)
    }
    expectOnlyKeys(`files.${fileName}`, entry, allowedTrackedFileKeys)
    if (!hexSha256Pattern.test(entry.sha256)) {
      throw new Error(`baseline schema invalid: files.${fileName}.sha256`)
    }
  }
}

function validateFileEvidenceSchema(files) {
  if (!isPlainObject(files)) {
    throw new Error("evidence schema invalid: files must be an object")
  }
  expectOnlyKeys("files", files, trackedPackageFiles)

  for (const fileName of trackedPackageFiles) {
    const entry = files[fileName]
    if (!isPlainObject(entry)) {
      throw new Error(`evidence schema invalid: files.${fileName} must be an object`)
    }
    expectOnlyKeys(`files.${fileName}`, entry, [
      "actualSha256",
      "expectedSha256"
    ])
    for (const field of ["actualSha256", "expectedSha256"]) {
      if (!hexSha256Pattern.test(entry[field])) {
        throw new Error(`evidence schema invalid: files.${fileName}.${field}`)
      }
    }
  }
}

function validateBooleanMap(label, value) {
  if (!isPlainObject(value)) {
    throw new Error(`evidence schema invalid: ${label} must be an object`)
  }
  for (const [key, fieldValue] of Object.entries(value)) {
    if (typeof key !== "string" || typeof fieldValue !== "boolean") {
      throw new Error(`evidence schema invalid: ${label}.${key} must be boolean`)
    }
  }
}

function validatePackageBaselineDiffEvidence(diff) {
  if (!isPlainObject(diff)) {
    throw new Error("evidence schema invalid: packageBaselineDiff must be an object")
  }
  expectOnlyKeys("packageBaselineDiff", diff, allowedPackageBaselineDiffKeys)

  for (const field of ["baseRef", "mergeBase", "directDependencyChange"]) {
    if (typeof diff[field] !== "string" || diff[field].trim() === "") {
      throw new Error(`evidence schema invalid: packageBaselineDiff.${field}`)
    }
  }
  if (
    !["none", "plasmo-runtime-to-dev-only"].includes(
      diff.directDependencyChange
    )
  ) {
    throw new Error(
      "evidence schema invalid: packageBaselineDiff.directDependencyChange"
    )
  }
  for (const field of [
    "packageEntrySetUnchanged",
    "lockPackageIdentityUnchanged",
    "lockNonClassificationMetadataUnchanged"
  ]) {
    if (diff[field] !== true) {
      throw new Error(`package base diff failed: ${field}`)
    }
  }
}

function validateDependencyGroups(
  label,
  groups,
  { schemaLabel = "evidence schema invalid" } = {}
) {
  if (!isPlainObject(groups)) {
    throw new Error(`${schemaLabel}: ${label} must be an object`)
  }
  expectOnlyKeys(label, groups, ["runtime", "dev"])

  for (const groupName of ["runtime", "dev"]) {
    const dependencies = groups[groupName]
    if (!Array.isArray(dependencies)) {
      throw new Error(`${schemaLabel}: ${label}.${groupName} must be an array`)
    }

    let previousName = ""
    for (const [index, dependency] of dependencies.entries()) {
      if (!isPlainObject(dependency)) {
        throw new Error(
          `${schemaLabel}: ${label}.${groupName}[${index}] must be an object`
        )
      }
      expectOnlyKeys(
        `${label}.${groupName}[${index}]`,
        dependency,
        allowedDependencyKeys
      )
      for (const field of allowedDependencyKeys) {
        if (
          typeof dependency[field] !== "string" ||
          dependency[field].trim() === ""
        ) {
          throw new Error(
            `${schemaLabel}: ${label}.${groupName}[${index}].${field}`
          )
        }
      }
      if (dependency.name <= previousName) {
        throw new Error(
          `${schemaLabel}: ${label}.${groupName} must be sorted by name`
        )
      }
      previousName = dependency.name
    }
  }
}

function validatePlasmoClassification(directDependencies) {
  const runtimeNames = new Set(directDependencies.runtime.map((dep) => dep.name))
  const devPlasmo = directDependencies.dev.find((dep) => dep.name === "plasmo")

  if (runtimeNames.has("plasmo") || !devPlasmo) {
    throw new Error(
      "Plasmo must be classified as a direct dev dependency, not a runtime dependency"
    )
  }
  if (
    devPlasmo.declaredVersion !== expectedPlasmoVersion ||
    devPlasmo.resolvedVersion !== expectedPlasmoVersion
  ) {
    throw new Error(
      `Plasmo version drift: expected declared/resolved ${expectedPlasmoVersion}`
    )
  }
}

function validateDirectDependencyInventory(evidence) {
  const actual = normalizeDependencyGroups(evidence.directDependencies)
  const expected = normalizeDependencyGroups(evidence.expectedDirectDependencies)

  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error("direct dependency inventory drift or misclassification")
  }
}

function classifyDirectDependencyChange(basePackageJson, currentPackageJson) {
  const baseSections = collectDirectDependencySections(basePackageJson)
  const currentSections = collectDirectDependencySections(currentPackageJson)

  if (stableJson(baseSections) === stableJson(currentSections)) {
    return "none"
  }

  const baseRuntimePlasmo = baseSections.dependencies.plasmo
  const currentDevPlasmo = currentSections.devDependencies.plasmo
  if (
    baseRuntimePlasmo !== expectedPlasmoVersion ||
    currentDevPlasmo !== expectedPlasmoVersion ||
    currentSections.dependencies.plasmo !== undefined ||
    baseSections.devDependencies.plasmo !== undefined
  ) {
    throw new Error(
      "only allowed direct dependency change is Plasmo moving runtime -> dev at declared 0.90.5"
    )
  }

  const normalizedBase = removeDirectDependency(baseSections, "plasmo")
  const normalizedCurrent = removeDirectDependency(currentSections, "plasmo")
  if (stableJson(normalizedBase) !== stableJson(normalizedCurrent)) {
    throw new Error(
      "only allowed direct dependency change is Plasmo moving runtime -> dev at declared 0.90.5"
    )
  }

  return "plasmo-runtime-to-dev-only"
}

function validateRootLockDirectDependencyChange(
  basePackageLock,
  currentPackageLock,
  directDependencyChange
) {
  const baseRoot = packageLockRoot(basePackageLock)
  const currentRoot = packageLockRoot(currentPackageLock)
  const baseSections = collectDirectDependencySections(baseRoot)
  const currentSections = collectDirectDependencySections(currentRoot)

  if (directDependencyChange === "none") {
    if (stableJson(baseSections) !== stableJson(currentSections)) {
      throw new Error("package-lock root direct dependency metadata changed")
    }
    return
  }

  const baseRuntimePlasmo = baseSections.dependencies.plasmo
  const currentDevPlasmo = currentSections.devDependencies.plasmo
  if (
    baseRuntimePlasmo !== expectedPlasmoVersion ||
    currentDevPlasmo !== expectedPlasmoVersion ||
    currentSections.dependencies.plasmo !== undefined ||
    baseSections.devDependencies.plasmo !== undefined
  ) {
    throw new Error(
      "package-lock root direct dependency change must be only Plasmo runtime -> dev at 0.90.5"
    )
  }

  const normalizedBase = removeDirectDependency(baseSections, "plasmo")
  const normalizedCurrent = removeDirectDependency(currentSections, "plasmo")
  if (stableJson(normalizedBase) !== stableJson(normalizedCurrent)) {
    throw new Error(
      "package-lock root direct dependency change must be only Plasmo runtime -> dev at 0.90.5"
    )
  }
}

function validatePackageLockEntrySet(basePackageLock, currentPackageLock) {
  const baseKeys = packageLockPackageKeys(basePackageLock)
  const currentKeys = packageLockPackageKeys(currentPackageLock)
  if (stableJson(baseKeys) !== stableJson(currentKeys)) {
    throw new Error("package-lock package entry set changed")
  }
}

function validatePackageLockIdentityFields(basePackageLock, currentPackageLock) {
  for (const packagePath of packageLockPackageKeys(basePackageLock)) {
    const baseEntry = basePackageLock.packages[packagePath]
    const currentEntry = currentPackageLock.packages[packagePath]
    for (const field of lockIdentityFields) {
      if (baseEntry?.[field] !== currentEntry?.[field]) {
        throw new Error(
          `package-lock ${packagePath || "<root>"} version/resolved/integrity changed`
        )
      }
    }
  }
}

function validatePackageLockNonClassificationMetadata(
  basePackageLock,
  currentPackageLock,
  directDependencyChange
) {
  const baseNormalized = normalizePackageLockForMetadataCompare(
    basePackageLock,
    directDependencyChange
  )
  const currentNormalized = normalizePackageLockForMetadataCompare(
    currentPackageLock,
    directDependencyChange
  )

  if (stableJson(baseNormalized) !== stableJson(currentNormalized)) {
    throw new Error(
      "non-classification package-lock metadata changed; only dev classification metadata may change"
    )
  }
}

function normalizePackageLockForMetadataCompare(packageLock, directDependencyChange) {
  const normalized = structuredClone(packageLock)
  if (directDependencyChange === "plasmo-runtime-to-dev-only") {
    for (const entry of Object.values(normalized.packages ?? {})) {
      if (!isPlainObject(entry)) {
        continue
      }
      for (const field of lockClassificationFields) {
        delete entry[field]
      }
    }

    for (const entry of [normalized.packages?.[""]].filter(Boolean)) {
      for (const section of ["dependencies", "devDependencies"]) {
        if (isPlainObject(entry[section])) {
          delete entry[section].plasmo
        }
      }
    }
  }

  return normalized
}

function collectDirectDependencySections(packageLike) {
  const sections = {}
  for (const section of directDependencySections) {
    sections[section] = sortObject(packageLike?.[section] ?? {})
  }
  return sections
}

function removeDirectDependency(sections, dependencyName) {
  const normalized = structuredClone(sections)
  for (const section of directDependencySections) {
    delete normalized[section][dependencyName]
  }
  return normalized
}

function validateSanitizedEvidence(evidence) {
  const serialized = JSON.stringify(evidence)
  const forbiddenPatterns = [
    /rawHttp/i,
    /httpOutput/i,
    /prompt/i,
    /pageContent/i,
    /credential/i,
    /secret/i,
    /resolvedUrl/i,
    /registry\.npmjs\.org/i
  ]

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(serialized)) {
      throw new Error(`evidence contains forbidden field or value: ${pattern}`)
    }
  }
}

function buildFileEvidence(root, baseline) {
  const files = {}
  for (const fileName of trackedPackageFiles) {
    files[fileName] = {
      actualSha256: sha256File(join(root, fileName)),
      expectedSha256: baseline.files?.[fileName]?.sha256 ?? ""
    }
  }
  return files
}

function buildPackageLockConsistency(
  packageJson,
  packageLock,
  directDependencies
) {
  const lockRoot = packageLock.packages?.[""] ?? {}
  const directEntriesPresent = [
    ...directDependencies.runtime,
    ...directDependencies.dev
  ].every((dependency) => typeof dependency.resolvedVersion === "string")

  return {
    rootNameMatchesPackageJson: lockRoot.name === packageJson.name,
    rootVersionMatchesPackageJson: lockRoot.version === packageJson.version,
    rootDependenciesMatchPackageJson:
      stableJson(lockRoot.dependencies ?? {}) ===
      stableJson(packageJson.dependencies ?? {}),
    rootDevDependenciesMatchPackageJson:
      stableJson(lockRoot.devDependencies ?? {}) ===
      stableJson(packageJson.devDependencies ?? {}),
    directPackageEntriesPresent: directEntriesPresent
  }
}

function collectDirectDependencies(packageJson, packageLock) {
  return normalizeDependencyGroups({
    runtime: collectDependencyGroup(
      packageJson.dependencies ?? {},
      packageLock
    ),
    dev: collectDependencyGroup(packageJson.devDependencies ?? {}, packageLock)
  })
}

function collectDependencyGroup(dependencies, packageLock) {
  return Object.entries(dependencies).map(([name, declaredVersion]) => ({
    name,
    declaredVersion,
    resolvedVersion: packageLock.packages?.[`node_modules/${name}`]?.version ?? ""
  }))
}

function normalizeDependencyGroups(groups) {
  return {
    runtime: normalizeDependencyList(groups.runtime ?? []),
    dev: normalizeDependencyList(groups.dev ?? [])
  }
}

function normalizeDependencyList(dependencies) {
  return dependencies
    .map((dependency) => ({
      name: dependency.name,
      declaredVersion: dependency.declaredVersion,
      resolvedVersion: dependency.resolvedVersion
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

function resolvePackageBaseRef(root, requestedBaseRef) {
  const candidates = buildPackageBaseRefCandidates(requestedBaseRef)
  for (const candidate of candidates) {
    const mergeBase = tryRunGit(root, ["merge-base", "HEAD", candidate])
    if (mergeBase) {
      return {
        baseRef: candidate,
        mergeBase
      }
    }
  }

  throw new Error(
    `unable to resolve package baseline ref from ${candidates.join(
      ", "
    )}; fetch enough main history or pass --base-ref`
  )
}

function buildPackageBaseRefCandidates(requestedBaseRef) {
  const candidates = []
  addCandidate(candidates, requestedBaseRef)
  addCandidate(candidates, process.env.AVISO_SUPPLY_CHAIN_BASE_REF)
  if (process.env.GITHUB_BASE_REF) {
    addCandidate(candidates, `origin/${process.env.GITHUB_BASE_REF}`)
    addCandidate(candidates, process.env.GITHUB_BASE_REF)
  }
  addCandidate(candidates, "origin/main")
  addCandidate(candidates, "main")
  return candidates
}

function addCandidate(candidates, candidate) {
  if (typeof candidate !== "string" || candidate.trim() === "") {
    return
  }
  const normalized = candidate.trim()
  if (!candidates.includes(normalized)) {
    candidates.push(normalized)
  }
}

function readGitJson(root, ref, path) {
  return JSON.parse(runGit(root, ["show", `${ref}:${path}`]))
}

function tryRunGit(root, args) {
  const result = runGitResult(root, args)
  if (result.status === 0 && result.stdout.trim() !== "") {
    return result.stdout.trim()
  }
  return ""
}

function runGit(root, args) {
  const result = runGitResult(root, args)
  if (result.status === 0) {
    return result.stdout
  }
  if (result.error) {
    throw new Error(`git ${args.join(" ")} failed: ${result.error.message}`)
  }
  throw new Error(
    `git ${args.join(" ")} failed with exit code ${result.status}: ${result.stderr}`
  )
}

function runGitResult(root, args) {
  return spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 100 * 1024 * 1024
  })
}

function packageLockRoot(packageLock) {
  const root = packageLock.packages?.[""]
  if (!isPlainObject(root)) {
    throw new Error("package-lock root package entry is missing")
  }
  return root
}

function packageLockPackageKeys(packageLock) {
  if (!isPlainObject(packageLock.packages)) {
    throw new Error("package-lock packages must be an object")
  }
  return Object.keys(packageLock.packages).sort()
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"))
}

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex")
}

function readGitCommit(root) {
  const gitDir = resolveGitDir(root)
  const commonGitDir = resolveCommonGitDir(gitDir)
  const head = readFileTrimmed(join(gitDir, "HEAD"))

  if (/^[a-f0-9]{40,64}$/.test(head)) {
    return head
  }

  const refMatch = head.match(/^ref:\s+(.+)$/)
  if (!refMatch) {
    throw new Error("unable to parse .git HEAD")
  }

  const refName = refMatch[1]
  const looseRefPath = join(commonGitDir, refName)
  if (existsSync(looseRefPath)) {
    return readFileTrimmed(looseRefPath)
  }

  const packedRefsPath = join(commonGitDir, "packed-refs")
  if (existsSync(packedRefsPath)) {
    const packedRef = readPackedRef(packedRefsPath, refName)
    if (packedRef) {
      return packedRef
    }
  }

  throw new Error(`unable to resolve git ref ${refName}`)
}

function normalizeRootDir(rootDir) {
  if (rootDir instanceof URL) {
    return fileURLToPath(rootDir)
  }
  return resolve(String(rootDir))
}

function resolveGitDir(root) {
  const dotGitPath = join(root, ".git")
  const stats = statSync(dotGitPath)

  if (stats.isDirectory()) {
    return dotGitPath
  }

  const gitDirMatch = readFileTrimmed(dotGitPath).match(/^gitdir:\s+(.+)$/)
  if (!gitDirMatch) {
    throw new Error("unable to parse .git file")
  }

  const gitDir = gitDirMatch[1]
  return isAbsolute(gitDir) ? gitDir : resolve(root, gitDir)
}

function resolveCommonGitDir(gitDir) {
  const commonDirPath = join(gitDir, "commondir")
  if (!existsSync(commonDirPath)) {
    return gitDir
  }

  const commonDir = readFileTrimmed(commonDirPath)
  return isAbsolute(commonDir) ? commonDir : resolve(gitDir, commonDir)
}

function readPackedRef(packedRefsPath, refName) {
  const lines = readFileSync(packedRefsPath, "utf8").split(/\r?\n/)
  for (const line of lines) {
    if (!line || line.startsWith("#") || line.startsWith("^")) {
      continue
    }
    const [hash, name] = line.split(" ")
    if (name === refName && /^[a-f0-9]{40,64}$/.test(hash)) {
      return hash
    }
  }
  return ""
}

function readFileTrimmed(path) {
  return readFileSync(path, "utf8").trim()
}

function stableJson(value) {
  return JSON.stringify(sortObject(value))
}

function sortObject(value) {
  if (Array.isArray(value)) {
    return value.map(sortObject)
  }
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, entry]) => [key, sortObject(entry)])
    )
  }
  return value
}

function expectOnlyKeys(
  label,
  value,
  allowedKeys,
  { schemaLabel = "evidence schema invalid", optionalKeys = [] } = {}
) {
  const allowed = new Set(allowedKeys)
  const optional = new Set(optionalKeys)
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      throw new Error(`${schemaLabel}: unexpected ${label}.${key}`)
    }
  }
  for (const key of allowedKeys) {
    if (optional.has(key)) {
      continue
    }
    if (!(key in value)) {
      throw new Error(`${schemaLabel}: missing ${label}.${key}`)
    }
  }
}

function isPlainObject(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  )
}

function currentUtcInstant() {
  return new Date().toISOString()
}

function main() {
  try {
    const options = parseCliArgs(process.argv.slice(2))
    const evidence = buildSupplyChainEvidence(options)
    validateSupplyChainEvidence(evidence, { now: currentUtcInstant() })
    process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`)
  } catch (error) {
    console.error(`Supply-chain baseline check failed: ${error.message}`)
    process.exit(1)
  }
}

function parseCliArgs(args) {
  const options = {}
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === "--base-ref") {
      const value = args[index + 1]
      if (!value) {
        throw new Error("--base-ref requires a value")
      }
      options.baseRef = value
      index += 1
      continue
    }
    if (arg.startsWith("--base-ref=")) {
      options.baseRef = arg.slice("--base-ref=".length)
      continue
    }
    if (arg === "--baseline") {
      const value = args[index + 1]
      if (!value) {
        throw new Error("--baseline requires a value")
      }
      options.baselinePath = value
      index += 1
      continue
    }
    if (arg.startsWith("--baseline=")) {
      options.baselinePath = arg.slice("--baseline=".length)
      continue
    }
    throw new Error(`unknown argument: ${arg}`)
  }
  return options
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}
