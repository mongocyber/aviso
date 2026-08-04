import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

const publicCopyFiles = [
  "website/src/pages/index.tsx",
  "website/docs/intro.md",
  "website/docs/install.md",
  "website/docs/first-use.md",
  "website/docs/api-keys.md",
  "website/docs/core-features.md",
  "website/docs/data-permissions.md",
  "website/docs/privacy-policy.md",
  "website/docs/known-limitations.md",
  "website/docs/support-feedback.md",
  "website/i18n/en/docusaurus-plugin-content-docs/current/intro.md",
  "website/i18n/en/docusaurus-plugin-content-docs/current/install.md",
  "website/i18n/en/docusaurus-plugin-content-docs/current/first-use.md",
  "website/i18n/en/docusaurus-plugin-content-docs/current/api-keys.md",
  "website/i18n/en/docusaurus-plugin-content-docs/current/core-features.md",
  "website/i18n/en/docusaurus-plugin-content-docs/current/data-permissions.md",
  "website/i18n/en/docusaurus-plugin-content-docs/current/privacy-policy.md",
  "website/i18n/en/docusaurus-plugin-content-docs/current/known-limitations.md",
  "website/i18n/en/docusaurus-plugin-content-docs/current/support-feedback.md",
  "store-assets/chrome-web-store/STORE_LISTING_COPY.md"
] as const

const staleHostedAvailabilityPatterns = [
  /Sign in to Aviso AI for free quota/i,
  /Sign in for free quota/i,
  /free quota (?:is available|after sign-in|can be used)/i,
  /use free quota/i,
  /登录 Aviso AI 可使用免费额度/,
  /登录后可使用免费额度/,
  /免费额度需要登录后使用/,
  /使用免费额度/,
  /免费额度显示正常/
]

test("public website and store copy do not overclaim hosted quota availability on the V013 candidate", () => {
  for (const file of publicCopyFiles) {
    const content = readFileSync(new URL(`../${file}`, import.meta.url), "utf8")
    for (const pattern of staleHostedAvailabilityPatterns) {
      assert.doesNotMatch(content, pattern, `${file} contains stale hosted availability wording`)
    }
  }
})

test("V013 reviewer notes deterministically cover BYOK, Supabase, Creem, candidate refs, and safe evidence", () => {
  const notes = readFileSync(
    new URL("../store-assets/chrome-web-store/REVIEWER_NOTES.md", import.meta.url),
    "utf8"
  )
  const listing = readFileSync(
    new URL("../store-assets/chrome-web-store/STORE_LISTING_COPY.md", import.meta.url),
    "utf8"
  )

  assert.match(notes, /450351ba171db753b508089c485c0db2283a859e/)
  assert.match(notes, /f30f6cccb1f7805d8ef95975a425c0c97c26379c/)
  assert.match(notes, /fe7417804e2cbea8edfcb72dcae0cea060d2d6975041eaf74d74627d5ecebfad/)
  assert.match(notes, /BYOK[^\n]+contextai_api_keys/)
  assert.match(notes, /Supabase[^\n]+default-disabled/)
  assert.match(notes, /Creem[^\n]+test-mode\/local-fixture-gated/)
  assert.match(notes, /No deployment or Chrome Web Store submission/)
  assert.doesNotMatch(notes, /sk-[A-Za-z0-9_-]{12,}|Bearer\s+[A-Za-z0-9._-]{20,}|raw prompt|raw response/i)
  assert.match(listing, /REVIEWER_NOTES\.md/)
})
