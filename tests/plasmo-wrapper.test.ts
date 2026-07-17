import assert from "node:assert/strict"
import {
  existsSync,
  readFileSync
} from "node:fs"
import { test } from "node:test"

const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8")
)
const oldWrapperName = ["run", "plasmo", "off" + "line"].join("-")
const oldWrapperFile = `${oldWrapperName}.mjs`
const oldWrapperPattern = new RegExp(oldWrapperName)
const oldCapabilityWord = new RegExp("off" + "line", "i")
const oldFetchBlockPhrase = new RegExp(
  ["net" + "work", "fetch", "disabled"].join(" "),
  "i"
)
const oldAutoInstallPhrase = new RegExp(
  ["package", "manager"].join("-") + " auto-install",
  "i"
)

test("Plasmo wrapper scripts use no-version-check naming", () => {
  const scripts = Object.values(packageJson.scripts).join("\n")

  assert.match(scripts, /scripts\/run-plasmo-no-version-check\.mjs/)
  assert.doesNotMatch(scripts, oldWrapperPattern)
  assert.equal(
    existsSync(new URL(`../scripts/${oldWrapperFile}`, import.meta.url)),
    false
  )
})

test("Plasmo wrapper suppresses only latest-version check and requires local install", () => {
  const source = readFileSync(
    new URL("../scripts/run-plasmo-no-version-check.mjs", import.meta.url),
    "utf8"
  )

  assert.match(source, /node_modules\/plasmo\/bin\/index\.mjs/)
  assert.match(source, /isPlasmoPackageMetadataRequest/)
  assert.doesNotMatch(source, oldCapabilityWord)
  assert.doesNotMatch(source, oldFetchBlockPhrase)
  assert.doesNotMatch(source, oldAutoInstallPhrase)
})
