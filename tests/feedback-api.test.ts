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
    "The provider failed. API key: sk - proj - " + "a ".repeat(48),
    "The provider failed. token is " + "b".repeat(24),
    "The provider failed. secret：" + "c".repeat(24),
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
    "Private page body - copied internal document text",
    "private webpage body: customer contract terms and pricing",
    "Customer data: alice@example.com account notes",
    "Customer data - alice@example.com account notes",
    "Raw prompt - summarize this private customer contract",
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

test("feedback API accepts normal feedback with sensitive-sounding words", () => {
  for (const message of [
    "The token counter is hard to read when the sidebar is narrow.",
    "The onboarding copy has a nice secret sauce but the install button wraps."
  ]) {
    const result = normalizeFeedbackPayload({
      category: "idea",
      email: "reviewer@example.com",
      locale: "en",
      message
    })

    assert.equal(result.ok, true)
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

test("feedback image normalization strips JPEG APP and COM metadata while preserving structure", () => {
  const app1 = Buffer.from("Exif\0private exif metadata", "utf8")
  const app2 = Buffer.from("ICC_PROFILE\0private app2 metadata", "utf8")
  const app13 = Buffer.from("Photoshop 3.0\0private iptc metadata", "utf8")
  const comment = Buffer.from("private jpeg comment", "utf8")
  const jpeg = Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    jpegSegment(0xe1, app1),
    jpegSegment(0xe2, app2),
    jpegSegment(0xed, app13),
    jpegSegment(0xfe, comment),
    jpegSegment(0xc0, Buffer.from([8, 0, 1, 0, 1, 1, 1, 0])),
    jpegSegment(0xda, Buffer.from([1, 1, 0, 0, 63, 0])),
    Buffer.from([0x11, 0x22, 0xff, 0xd9])
  ])

  const attachments = normalizeAttachments([
    {
      data: jpeg.toString("base64"),
      name: "redacted-screenshot.jpg",
      size: jpeg.byteLength,
      type: "image/jpeg"
    }
  ])

  assert.equal(attachments.length, 1)
  const forwarded = Buffer.from(attachments[0].content, "base64")
  assert.deepEqual([...forwarded.subarray(0, 2)], [0xff, 0xd8])
  assert.equal(forwarded.includes(Buffer.from("private exif metadata", "utf8")), false)
  assert.equal(forwarded.includes(Buffer.from("private app2 metadata", "utf8")), false)
  assert.equal(forwarded.includes(Buffer.from("private iptc metadata", "utf8")), false)
  assert.equal(forwarded.includes(Buffer.from("private jpeg comment", "utf8")), false)
  assert.equal(forwarded.includes(Buffer.from([0xff, 0xe1])), false)
  assert.equal(forwarded.includes(Buffer.from([0xff, 0xe2])), false)
  assert.equal(forwarded.includes(Buffer.from([0xff, 0xed])), false)
  assert.equal(forwarded.includes(Buffer.from([0xff, 0xfe])), false)
  assert.equal(forwarded.includes(Buffer.from([0xff, 0xc0])), true)
  assert.equal(forwarded.includes(Buffer.from([0xff, 0xda])), true)
  assert.deepEqual([...forwarded.subarray(-2)], [0xff, 0xd9])
  assert.equal(attachments[0].content_type, "image/jpeg")
})

function pngChunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length)
  out.writeUInt32BE(data.length, 0)
  out.write(type, 4, 4, "ascii")
  data.copy(out, 8)
  out.writeUInt32BE(0, 8 + data.length)
  return out
}

function jpegSegment(marker: number, data: Buffer): Buffer {
  const out = Buffer.alloc(4 + data.length)
  out[0] = 0xff
  out[1] = marker
  out.writeUInt16BE(data.length + 2, 2)
  data.copy(out, 4)
  return out
}
