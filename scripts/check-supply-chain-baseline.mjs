#!/usr/bin/env node

import { spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import { existsSync, readFileSync, statSync } from "node:fs"
import { isAbsolute, join, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const schemaVersion = 1
const defaultBaselinePath = "docs/security/supply-chain-baseline.json"
const trackedPackageFiles = ["package.json", "package-lock.json"]
const hexSha256Pattern = /^[a-f0-9]{64}$/
const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/
const expectedBaselineSchemaPath = "./supply-chain-baseline.schema.json"
const expectedPlasmoVersion = "0.90.5"
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
  "unresolvedHighCritical"
]

const allowedBaselinePolicyKeys = [
  "freshRegistryAudit",
  "runtimeBuildSeparation"
]

const allowedBaselineRuntimeBuildSeparationKeys = [
  "plasmoMustBeDevDependency"
]

const allowedTrackedFileKeys = ["sha256"]
const allowedUnresolvedHighCriticalKeys = [
  "severity",
  "packageName",
  "owner",
  "impact",
  "expiresOn",
  "source",
  "advisory"
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
  validateTrackedBaseline(baseline)

  const directDependencies = collectDirectDependencies(packageJson, packageLock)
  const expectedDirectDependencies = normalizeDependencyGroups(
    baseline.directDependencies ?? {}
  )
  const effectivePackageBaselineDiff =
    packageBaselineDiff ?? buildPackageBaselineDiff({ rootDir: root, baseRef })

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
    externalAudit: {
      freshRegistryAudit: baseline.policy?.freshRegistryAudit ?? "pending-external",
      npmAuditCommandRun: false,
      vulnerabilityClaim: "not-asserted"
    }
  }
}

export function validateSupplyChainEvidence(evidence, { now = todayIsoDate() } = {}) {
  validateEvidenceSchema(evidence)

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

  if (evidence.externalAudit.freshRegistryAudit !== "pending-external") {
    throw new Error("fresh registry audit must remain marked pending-external")
  }
  if (evidence.externalAudit.npmAuditCommandRun !== false) {
    throw new Error("local baseline evidence must not claim npm audit execution")
  }

  validateSanitizedEvidence(evidence)

  return true
}

export function validateTrackedBaseline(baseline) {
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
  if (typeof baseline.updated !== "string" || !isoDatePattern.test(baseline.updated)) {
    throw new Error("baseline schema invalid: updated must be YYYY-MM-DD")
  }

  validateBaselinePolicy(baseline.policy)
  validateBaselineFiles(baseline.files)
  validateDependencyGroups("directDependencies", baseline.directDependencies, {
    schemaLabel: "baseline schema invalid"
  })
  validateUnresolvedHighCriticalLedger(baseline.unresolvedHighCritical, {
    enforceExpiration: false,
    schemaLabel: "baseline schema invalid"
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
    now = todayIsoDate(),
    enforceExpiration = true,
    schemaLabel = "evidence schema invalid"
  } = {}
) {
  if (!Array.isArray(records)) {
    throw new Error("unresolvedHighCritical ledger must be an array")
  }

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
      (key) => key !== "severity"
    )) {
      if (typeof record[field] !== "string" || record[field].trim() === "") {
        throw new Error(`unresolvedHighCritical[${index}] missing ${field}`)
      }
    }

    if (!isoDatePattern.test(record.expiresOn)) {
      throw new Error(
        `unresolvedHighCritical[${index}].expiresOn must be YYYY-MM-DD`
      )
    }
    if (enforceExpiration && record.expiresOn < now) {
      throw new Error(
        `unresolvedHighCritical[${index}] expired on ${record.expiresOn}`
      )
    }
  }

  return true
}

function validateEvidenceSchema(evidence) {
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

  if (!isPlainObject(evidence.externalAudit)) {
    throw new Error("evidence schema invalid: externalAudit must be an object")
  }
  expectOnlyKeys("externalAudit", evidence.externalAudit, [
    "freshRegistryAudit",
    "npmAuditCommandRun",
    "vulnerabilityClaim"
  ])
  if (
    evidence.externalAudit.freshRegistryAudit !== "pending-external" ||
    evidence.externalAudit.npmAuditCommandRun !== false ||
    evidence.externalAudit.vulnerabilityClaim !== "not-asserted"
  ) {
    throw new Error("evidence schema invalid: externalAudit values are invalid")
  }
}

function validateBaselinePolicy(policy) {
  if (!isPlainObject(policy)) {
    throw new Error("baseline schema invalid: policy must be an object")
  }
  expectOnlyKeys("policy", policy, allowedBaselinePolicyKeys)
  if (policy.freshRegistryAudit !== "pending-external") {
    throw new Error(
      "baseline schema invalid: policy.freshRegistryAudit must be pending-external"
    )
  }

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
    /integrity/i,
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
  { schemaLabel = "evidence schema invalid" } = {}
) {
  const allowed = new Set(allowedKeys)
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      throw new Error(`${schemaLabel}: unexpected ${label}.${key}`)
    }
  }
  for (const key of allowedKeys) {
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

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

function main() {
  try {
    const options = parseCliArgs(process.argv.slice(2))
    const evidence = buildSupplyChainEvidence(options)
    validateSupplyChainEvidence(evidence)
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
