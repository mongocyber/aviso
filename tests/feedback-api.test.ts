import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { Buffer } from "node:buffer"
import { test } from "node:test"

const require = createRequire(import.meta.url)
const feedbackHandler = require("../website/api/feedback.js")

const {
  buildResendBody,
  normalizeAttachments,
  normalizeFeedbackPayload
} = feedbackHandler.__test

test("feedback API rejects likely credentials and raw prompt or response dumps before email forwarding", () => {
  for (const message of [
    "The provider failed. API key: sk-proj-" + "a".repeat(48),
    "Raw prompt: summarize this private customer contract",
    "raw response: {\"customer\":\"secret\"}",
    "Authorization: Bearer " + "b".repeat(48),
    "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----"
  ]) {
    const result = normalizeFeedbackPayload({
      category: "bug",
      email: "reviewer@example.com",
      locale: "en",
      message
    })

    assert.deepEqual(result, {
      ok: false,
      reason: "sensitive_content"
    })
  }
})

test("feedback API rejects English private-content markers before email forwarding", () => {
  for (const message of [
    "Private page body: customer contract terms and pricing",
    "private webpage body: customer contract terms and pricing",
    "Customer data: alice@example.com account notes",
    "Unpublished document: roadmap draft"
  ]) {
    const result = normalizeFeedbackPayload({
      category: "privacy",
      email: "reviewer@example.com",
      locale: "en",
      message
    })

    assert.deepEqual(result, {
      ok: false,
      reason: "sensitive_content"
    })
  }
})

test("feedback email subject does not echo user issue text or private page details", () => {
  const normalized = normalizeFeedbackPayload({
    category: "bug",
    categoryLabel: "Private customer contract page",
    email: "reviewer@example.com",
    locale: "en",
    message: "Private customer contract page failed on admin.example/private"
  })

  assert.equal(normalized.ok, true)
  const body = buildResendBody(normalized.payload, {
    from: "Aviso Feedback <feedback@example.com>",
    to: "maintainer@example.com"
  })

  assert.equal(body.subject, "[Aviso feedback] Bug")
  assert.doesNotMatch(body.subject, /Private customer|admin\.example|contract/i)
  assert.equal(body.text.startsWith("Category: Bug"), true)
  assert.match(body.text, /Private customer contract page failed/)
})

test("feedback image normalization strips PNG metadata before forwarding attachments", () => {
  const metadataText = "private unpublished roadmap"
  const png = Buffer.concat([
    Buffer.from("89504e470d0a1a0a", "hex"),
    pngChunk("IHDR", Buffer.concat([
      Buffer.from([0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0])
    ])),
    pngChunk("tEXt", Buffer.from(`Comment\0${metadataText}`, "utf8")),
    pngChunk("IDAT", Buffer.from([0])),
    pngChunk("IEND", Buffer.alloc(0))
  ])

  const attachments = normalizeAttachments([
    {
      data: png.toString("base64"),
      name: "redacted-screenshot.png",
      size: png.byteLength,
      type: "image/png"
    }
  ])

  assert.equal(attachments.length, 1)
  const forwarded = Buffer.from(attachments[0].content, "base64")
  assert.equal(forwarded.includes(Buffer.from(metadataText, "utf8")), false)
  assert.equal(attachments[0].content_type, "image/png")
})

function pngChunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length)
  out.writeUInt32BE(data.length, 0)
  out.write(type, 4, 4, "ascii")
  data.copy(out, 8)
  out.writeUInt32BE(0, 8 + data.length)
  return out
}
