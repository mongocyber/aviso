import assert from "node:assert/strict"
import { test } from "node:test"
import {
  classifyCommandFailure,
  runCommandStep
} from "../scripts/verify-release-candidate.mjs"

test("release verifier classifies captured child stderr", () => {
  assert.equal(
    classifyCommandFailure('Error [ERR_MODULE_NOT_FOUND]: Cannot find package "plasmo"'),
    "missing local dependency install; restore dependencies from the lockfile before treating this as a code regression"
  )
})

test("release verifier mirrors and classifies child output from failed steps", () => {
  const stdoutChunks: string[] = []
  const stderrChunks: string[] = []

  assert.throws(
    () =>
      runCommandStep(
        {
          label: "test missing dependency",
          command: "node",
          args: ["missing.js"]
        },
        {
          spawnSync: () => ({
            status: 1,
            stdout: "build preface\n",
            stderr: 'Error [ERR_MODULE_NOT_FOUND]: Cannot find package "plasmo"\n'
          }),
          stdout: { write: (chunk: string) => stdoutChunks.push(chunk) },
          stderr: { write: (chunk: string) => stderrChunks.push(chunk) },
          exit: (code: number) => {
            throw new Error(`exit ${code}`)
          }
        }
      ),
    /exit 1/
  )

  assert.equal(stdoutChunks.includes("build preface\n"), true)
  assert.equal(
    stderrChunks.includes(
      'Error [ERR_MODULE_NOT_FOUND]: Cannot find package "plasmo"\n'
    ),
    true
  )
  assert.equal(
    stderrChunks.some((chunk) =>
      chunk.includes("Classification: missing local dependency install")
    ),
    true
  )
})
