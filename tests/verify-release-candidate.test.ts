import assert from "node:assert/strict"
import { test } from "node:test"

test("release verifier accepts sandbox spawn metadata when the command completed", async () => {
  const mod = await import("../scripts/verify-release-candidate.mjs")

  assert.equal(typeof mod.didSpawnFailBeforeCompletion, "function")
  assert.equal(
    mod.didSpawnFailBeforeCompletion({
      error: { code: "EPERM", message: "spawnSync npm EPERM" },
      status: 0
    }),
    false
  )
  assert.equal(
    mod.didSpawnFailBeforeCompletion({
      error: { code: "ENOENT", message: "spawnSync missing ENOENT" },
      status: null
    }),
    true
  )
})
