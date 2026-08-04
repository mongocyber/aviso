#!/usr/bin/env node

import { createHash } from "node:crypto"
import { existsSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { join } from "node:path"
import { spawnSync } from "node:child_process"

export const EXPECTED_V013_CANDIDATE = {
  frontendCommit: "450351ba171db753b508089c485c0db2283a859e",
  backendCommit: "f30f6cccb1f7805d8ef95975a425c0c97c26379c",
  packageFiles: {
    "package.json": "f64943fcbc69534ab5eeb237e1674f9ea49c846a279322377c480e7e7ad38277",
    "package-lock.json": "fe7417804e2cbea8edfcb72dcae0cea060d2d6975041eaf74d74627d5ecebfad"
  }
}

if (isDirectRun()) {
  try {
    const options = parseArgs(process.argv.slice(2))
    const evidence = buildV013CandidatePreconditionEvidence(options)
    validateV013CandidatePreconditionEvidence(evidence)
    console.log(JSON.stringify(evidence, null, 2))
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

function isDirectRun() {
  return process.argv[1] === fileURLToPath(import.meta.url)
}

function parseArgs(args) {
  const options = {}
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === "--backend-repo") {
      options.backendRepoDir = args[index + 1]
      index += 1
    } else if (arg === "--backend-ref") {
      options.backendRef = args[index + 1]
      index += 1
    } else if (arg === "--root") {
      options.rootDir = args[index + 1]
      index += 1
    } else {
      throw new Error(`unknown argument ${arg}`)
    }
  }
  return options
}

export function buildV013CandidatePreconditionEvidence({
  rootDir = process.cwd(),
  backendRepoDir = process.env.AVISO_BACKEND_REPO,
  backendRef = "origin/integration/aviso-v013"
} = {}) {
  const root = normalizeRoot(rootDir)
  if (!backendRepoDir) {
    throw new Error("backend repo path is required; pass --backend-repo or AVISO_BACKEND_REPO")
  }
  if (!existsSync(backendRepoDir)) {
    throw new Error(`backend repo path does not exist: ${backendRepoDir}`)
  }

  const frontendHead = git(root, ["rev-parse", "HEAD"])
  const backendHead = git(backendRepoDir, ["rev-parse", backendRef])

  return {
    frontend: {
      head: frontendHead,
      containsExpectedCommit: gitIsAncestor(
        root,
        EXPECTED_V013_CANDIDATE.frontendCommit,
        "HEAD"
      )
    },
    backend: {
      ref: backendRef,
      head: backendHead,
      containsExpectedCommit: gitIsAncestor(
        backendRepoDir,
        EXPECTED_V013_CANDIDATE.backendCommit,
        backendRef
      )
    },
    packageFiles: buildPackageHashEvidence({ rootDir: root })
  }
}

export function buildPackageHashEvidence({ rootDir = process.cwd() } = {}) {
  const root = normalizeRoot(rootDir)
  return Object.fromEntries(
    Object.keys(EXPECTED_V013_CANDIDATE.packageFiles).map((fileName) => [
      fileName,
      {
        sha256: sha256File(join(root, fileName))
      }
    ])
  )
}

export function validateV013CandidatePreconditionEvidence(evidence) {
  const errors = []
  if (evidence?.frontend?.containsExpectedCommit !== true) {
    errors.push(
      `frontend head ${evidence?.frontend?.head ?? "unknown"} does not contain ${EXPECTED_V013_CANDIDATE.frontendCommit}`
    )
  }
  if (evidence?.backend?.containsExpectedCommit !== true) {
    errors.push(
      `backend ref ${evidence?.backend?.ref ?? "unknown"} does not contain ${EXPECTED_V013_CANDIDATE.backendCommit}`
    )
  }

  for (const [fileName, expectedSha256] of Object.entries(
    EXPECTED_V013_CANDIDATE.packageFiles
  )) {
    const actual = evidence?.packageFiles?.[fileName]?.sha256
    if (actual !== expectedSha256) {
      errors.push(`${fileName} hash drift: expected ${expectedSha256}, got ${actual ?? "missing"}`)
    }
  }

  if (errors.length) {
    throw new Error(errors.join("; "))
  }
}

function gitIsAncestor(repo, ancestor, descendant) {
  const result = spawnSync("git", ["merge-base", "--is-ancestor", ancestor, descendant], {
    cwd: repo,
    encoding: "utf8"
  })
  return result.status === 0
}

function git(repo, args) {
  const result = spawnSync("git", args, {
    cwd: repo,
    encoding: "utf8"
  })
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || `git ${args.join(" ")} failed`).trim())
  }
  return result.stdout.trim()
}

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex")
}

function normalizeRoot(rootDir) {
  return rootDir instanceof URL ? fileURLToPath(rootDir) : rootDir
}
