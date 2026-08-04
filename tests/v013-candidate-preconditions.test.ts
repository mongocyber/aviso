import assert from "node:assert/strict"
import { test } from "node:test"

import {
  EXPECTED_V013_CANDIDATE,
  buildPackageHashEvidence,
  validateV013CandidatePreconditionEvidence
} from "../scripts/check-v013-candidate-preconditions.mjs"

const repoRoot = new URL("..", import.meta.url)

test("V013 precondition constants bind the exact frontend/backend candidate and package hashes", () => {
  assert.equal(
    EXPECTED_V013_CANDIDATE.frontendCommit,
    "450351ba171db753b508089c485c0db2283a859e"
  )
  assert.equal(
    EXPECTED_V013_CANDIDATE.backendCommit,
    "f30f6cccb1f7805d8ef95975a425c0c97c26379c"
  )
  assert.deepEqual(buildPackageHashEvidence({ rootDir: repoRoot }), {
    "package.json": {
      sha256: "f64943fcbc69534ab5eeb237e1674f9ea49c846a279322377c480e7e7ad38277"
    },
    "package-lock.json": {
      sha256: "fe7417804e2cbea8edfcb72dcae0cea060d2d6975041eaf74d74627d5ecebfad"
    }
  })
})

test("V013 precondition evidence requires frontend/backend ancestry and package hash parity", () => {
  const evidence = {
    frontend: {
      head: "fm-branch-head",
      containsExpectedCommit: true
    },
    backend: {
      ref: "origin/integration/aviso-v013",
      head: EXPECTED_V013_CANDIDATE.backendCommit,
      containsExpectedCommit: true
    },
    packageFiles: buildPackageHashEvidence({ rootDir: repoRoot })
  }

  assert.doesNotThrow(() => validateV013CandidatePreconditionEvidence(evidence))

  const drifted = structuredClone(evidence)
  drifted.backend.containsExpectedCommit = false
  assert.throws(
    () => validateV013CandidatePreconditionEvidence(drifted),
    /backend.*does not contain/
  )

  const hashDrift = structuredClone(evidence)
  hashDrift.packageFiles["package-lock.json"].sha256 =
    "0".repeat(64)
  assert.throws(
    () => validateV013CandidatePreconditionEvidence(hashDrift),
    /package-lock\.json hash drift/
  )
})
