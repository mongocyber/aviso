import assert from "node:assert/strict"
import { Buffer } from "node:buffer"
import { createRequire } from "node:module"
import { test } from "node:test"

const require = createRequire(import.meta.url)
const feedbackHandler = require("../website/api/feedback.js")

const {
  buildResendBody,
  normalizeAttachments,
  normalizeFeedbackPayload
} = feedbackHandler.__test

const baseStructuredPayload = {
  category: "bug",
  chromeVersion: "Chrome 126.0",
  email: "reviewer@example.com",
  locale: "en",
  os: "macOS 15",
  providerModel: "OpenAI / gpt-4o-mini",
  providerPath: "byok",
  triggerMethod: "right_click",
  avisoVersion: "0.1.1"
}

test("feedback API accepts structured submissions and builds maintainer email from structured fields only", () => {
  const normalized = normalizeFeedbackPayload({
    ...baseStructuredPayload,
    actualResult: "The panel showed a private customer contract from admin.example.",
    details: "Raw provider response: {\"secret\":\"do not forward\"}",
    expectedResult: "The result should stay private.",
    reproSteps: "Open the unpublished document and use the right-click action."
  })

  assert.equal(normalized.ok, true)
  assert.equal(normalized.payload.detailsForwarded, false)
  assert.equal(normalized.payload.needsRedaction, true)

  const body = buildResendBody(normalized.payload, {
    from: "Aviso Feedback <feedback@example.com>",
    to: "maintainer@example.com"
  })
  const serialized = JSON.stringify(body)

  assert.equal(body.subject, "[Aviso feedback] Bug / Right-click menu")
  assert.match(body.text, /Category: Bug/)
  assert.match(body.text, /Trigger method: Right-click menu/)
  assert.match(body.text, /Chrome version: Chrome 126\.0/)
  assert.match(body.text, /Provider path: BYOK direct-provider/)
  assert.match(body.text, /Provider\/model: OpenAI \/ gpt-4o-mini/)
  assert.match(body.text, /Optional narrative fields: Omitted by policy/)
  assert.doesNotMatch(serialized, /private customer contract/i)
  assert.doesNotMatch(serialized, /Raw provider response/i)
  assert.doesNotMatch(serialized, /unpublished document/i)
  assert.deepEqual(body.attachments, [])
})

test("feedback API preserves legacy message and description as omitted details", () => {
  for (const legacyField of ["message", "description"]) {
    const normalized = normalizeFeedbackPayload({
      ...baseStructuredPayload,
      [legacyField]: `Legacy ${legacyField} field with token -> ${"a".repeat(24)}`
    })

    assert.equal(normalized.ok, true)
    assert.equal(normalized.payload.detailsForwarded, false)
    assert.equal(normalized.payload.needsRedaction, true)

    const body = buildResendBody(normalized.payload, {
      from: "Aviso Feedback <feedback@example.com>",
      to: "maintainer@example.com"
    })

    assert.doesNotMatch(JSON.stringify(body), new RegExp(`Legacy ${legacyField} field`))
  }
})

test("feedback email property: generated raw detail variants never reach Resend body", () => {
  for (const rawDetails of generatedSensitiveDetailCorpus()) {
    const normalized = normalizeFeedbackPayload({
      ...baseStructuredPayload,
      actualResult: rawDetails,
      details: rawDetails,
      expectedResult: rawDetails,
      reproSteps: rawDetails
    })

    assert.equal(normalized.ok, true)
    const body = buildResendBody(normalized.payload, {
      from: "Aviso Feedback <feedback@example.com>",
      to: "maintainer@example.com"
    })
    const serialized = JSON.stringify(body)

    assert.doesNotMatch(serialized, literalPattern(rawDetails))
    assert.doesNotMatch(serialized, /sk-proj-|Bearer|PRIVATE KEY|customer-secret-value/i)
    assert.deepEqual(body.attachments, [])
  }
})

test("feedback email property: raw attachment bytes are omitted from Resend body by policy", () => {
  const rawAttachmentBytes = Buffer.from("RAW_ATTACHMENT_BYTES_DO_NOT_FORWARD customer-secret-value", "utf8")
  const attachment = minimalPng(rawAttachmentBytes)
  const normalized = normalizeFeedbackPayload({
    ...baseStructuredPayload,
    attachments: [
      {
        data: attachment.toString("base64"),
        name: "redacted-screenshot.png",
        size: attachment.byteLength,
        type: "image/png"
      }
    ],
    details: "Screenshot attached after redaction."
  })

  assert.equal(normalized.ok, true)
  assert.equal(normalized.payload.attachmentCount, 1)
  assert.equal(normalized.payload.attachmentsForwarded, false)

  const body = buildResendBody(normalized.payload, {
    from: "Aviso Feedback <feedback@example.com>",
    to: "maintainer@example.com"
  })
  const serialized = JSON.stringify(body)

  assert.deepEqual(body.attachments, [])
  assert.doesNotMatch(serialized, /RAW_ATTACHMENT_BYTES_DO_NOT_FORWARD/)
  assert.doesNotMatch(serialized, new RegExp(attachment.toString("base64").slice(0, 24)))
})

test("feedback API validates structured enums and email without requiring free-text details", () => {
  assert.equal(normalizeFeedbackPayload(baseStructuredPayload).ok, true)

  for (const patch of [
    {category: "billing"},
    {triggerMethod: "toolbar"},
    {providerPath: "hosted-live"},
    {email: "not-an-email"}
  ]) {
    const normalized = normalizeFeedbackPayload({
      ...baseStructuredPayload,
      ...patch
    })

    assert.deepEqual(normalized, {
      ok: false,
      reason: "invalid_input"
    })
  }
})

test("feedback API redacts combining-mark sensitive content from every forwarded short field", () => {
  const forwardedFields = [
    "chromeVersion",
    "os",
    "avisoVersion",
    "providerModel",
    "providerName",
    "modelName"
  ]
  const combiningMarkBypasses = [
    `t\u0332o\u0332k\u0332e\u0332n\u0332: ${"a".repeat(24)}1234`,
    `a\u0301p\u0301i\u0301 \u0301k\u0301e\u0301y\u0301 = sk-proj-${"b".repeat(32)}`,
    `s\u034fe\u034fc\u034fr\u034fe\u034ft\u034f -> customer-secret-value-1234567890`
  ]

  for (const field of forwardedFields) {
    for (const bypass of combiningMarkBypasses) {
      const input = {
        ...baseStructuredPayload,
        [field]: bypass
      }
      if (field === "providerName" || field === "modelName") {
        delete (input as Record<string, unknown>).providerModel
      }

      const normalized = normalizeFeedbackPayload(input)
      const outputField =
        field === "os" || field === "avisoVersion" || field === "chromeVersion"
          ? field
          : "providerModel"

      assert.equal(normalized.ok, true, field)
      assert.equal(normalized.payload.needsRedaction, true, field)
      assert.equal(normalized.payload[outputField], "")

      const body = buildResendBody(normalized.payload, {
        from: "Aviso Feedback <feedback@example.com>",
        to: "maintainer@example.com"
      })
      const serialized = JSON.stringify(body)

      assert.doesNotMatch(serialized, /customer-secret-value|sk-proj-|a{24}1234/i, field)
    }
  }
})

test("feedback API redacts bidi-control sensitive labels from unshaped provider and model fields", () => {
  const bidiFormatControls = [
    "\u202a",
    "\u202b",
    "\u202c",
    "\u202d",
    "\u202e",
    "\u2066",
    "\u2067",
    "\u2068",
    "\u2069"
  ]
  const unshapedFields = ["providerModel", "providerName", "modelName"]
  const sensitiveLabels = ["token", "secret", "authorization"]

  for (const control of bidiFormatControls) {
    for (const field of unshapedFields) {
      for (const label of sensitiveLabels) {
        const input = {
          ...baseStructuredPayload,
          [field]: `${label.split("").join(control)}: ${"c".repeat(24)}1234`
        }
        if (field === "providerName" || field === "modelName") {
          delete (input as Record<string, unknown>).providerModel
        }

        const normalized = normalizeFeedbackPayload(input)

        assert.equal(normalized.ok, true, `${field} ${label}`)
        assert.equal(normalized.payload.needsRedaction, true, `${field} ${label}`)
        assert.equal(normalized.payload.providerModel, "", `${field} ${label}`)
      }
    }
  }
})

test("feedback API redacts default-ignorable format characters from every forwarded short field", () => {
  const forwardedFields = [
    "chromeVersion",
    "os",
    "avisoVersion",
    "providerModel",
    "providerName",
    "modelName"
  ]
  const formatCharacterBypasses = [
    `t\u00ado\u00adk\u00ade\u00adn\u00ad: ${"d".repeat(24)}1234`,
    `s\u180ee\u180ec\u180er\u180ee\u180et\u180e = customer-secret-value-1234567890`
  ]

  for (const field of forwardedFields) {
    for (const bypass of formatCharacterBypasses) {
      const input = {
        ...baseStructuredPayload,
        [field]: bypass
      }
      if (field === "providerName" || field === "modelName") {
        delete (input as Record<string, unknown>).providerModel
      }

      const normalized = normalizeFeedbackPayload(input)
      const outputField =
        field === "os" || field === "avisoVersion" || field === "chromeVersion"
          ? field
          : "providerModel"

      assert.equal(normalized.ok, true, field)
      assert.equal(normalized.payload.needsRedaction, true, field)
      assert.equal(normalized.payload[outputField], "", field)
    }
  }
})

test("feedback API keeps normal short structured field values", () => {
  for (const payload of [
    baseStructuredPayload,
    {
      ...baseStructuredPayload,
      chromeVersion: "Chrome 126.0.6478.127",
      os: "Windows 11",
      avisoVersion: "0.1.1-beta.2",
      providerModel: "Anthropic / claude-3-5-sonnet"
    },
    {
      ...baseStructuredPayload,
      chromeVersion: "Edge 126.0.2592.87",
      os: "Ubuntu 24.04",
      avisoVersion: "0.1.1",
      providerModel: "OpenRouter / meta-llama/llama-3.1-70b"
    }
  ]) {
    const normalized = normalizeFeedbackPayload(payload)

    assert.equal(normalized.ok, true)
    assert.equal(normalized.payload.needsRedaction, false)
    assert.equal(normalized.payload.chromeVersion, payload.chromeVersion)
    assert.equal(normalized.payload.os, payload.os)
    assert.equal(normalized.payload.avisoVersion, payload.avisoVersion)
    assert.equal(normalized.payload.providerModel, payload.providerModel)
  }
})

test("feedback API returns success with detailsForwarded false when risky details are omitted", async () => {
  const previousFetch = global.fetch
  const previousEnv = {
    FEEDBACK_FROM_EMAIL: process.env.FEEDBACK_FROM_EMAIL,
    FEEDBACK_TO_EMAIL: process.env.FEEDBACK_TO_EMAIL,
    RESEND_API_KEY: process.env.RESEND_API_KEY
  }
  let resendRequestBody = ""

  process.env.FEEDBACK_FROM_EMAIL = "Aviso Feedback <feedback@example.com>"
  process.env.FEEDBACK_TO_EMAIL = "maintainer@example.com"
  process.env.RESEND_API_KEY = "test_resend_key"
  global.fetch = async (_url, init) => {
    resendRequestBody = String(init?.body ?? "")
    return new Response("{}", {status: 200})
  }

  try {
    const res = createJsonResponse()
    await feedbackHandler(
      {
        body: {
          ...baseStructuredPayload,
          attachments: [
            {
              data: minimalPng(Buffer.from("RAW_ATTACHMENT_BYTES_DO_NOT_FORWARD", "utf8")).toString("base64"),
              name: "redacted-screenshot.png",
              size: 128,
              type: "image/png"
            }
          ],
          details: `authorization equals Bearer ${"b".repeat(48)}`
        },
        method: "POST"
      },
      res
    )

    assert.equal(res.statusCode, 200)
    assert.deepEqual(JSON.parse(res.body), {
      ok: true,
      detailsForwarded: false,
      attachmentsForwarded: false,
      needs_redaction: true
    })
    assert.doesNotMatch(resendRequestBody, /authorization equals|Bearer|RAW_ATTACHMENT_BYTES_DO_NOT_FORWARD/i)
    assert.deepEqual(JSON.parse(resendRequestBody).attachments, [])
  } finally {
    global.fetch = previousFetch
    restoreEnv(previousEnv)
  }
})

test("feedback image normalization strips PNG metadata before forwarding attachments when called directly", () => {
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

test("feedback image normalization strips JPEG APP and COM metadata while preserving structure when called directly", () => {
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

function generatedSensitiveDetailCorpus(): string[] {
  const values = new Set<string>()
  const labels = [
    "API key",
    "api_key",
    "a p i key",
    "token",
    "tοken",
    "ｔｏｋｅｎ",
    "to\u0301ken",
    "t\u200bo\u2060k\u200de\ufeffn",
    "secret",
    "authorization"
  ]
  const connectors = [":", "：", " - ", " — ", " -> ", " = ", " equals ", " ≔ "]
  const candidates = [
    `sk-proj-${"a".repeat(48)}`,
    `Bearer ${"b".repeat(48)}`,
    "customer-secret-value-1234567890",
    "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----"
  ]

  for (const label of labels) {
    for (const connector of connectors) {
      for (const candidate of candidates) {
        values.add(`${label}${connector}${candidate}`)
        values.add(`${label.toUpperCase()}${connector}${candidate}`)
      }
    }
  }
  values.add("Private page body: copied internal document text")
  values.add("Customer data - alice@example.com account notes")
  values.add("Raw prompt - summarize this private customer contract")
  values.add("Unpublished document: roadmap draft")

  return [...values]
}

function literalPattern(value: string): RegExp {
  return new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
}

function createJsonResponse(): {body: string; statusCode: number; setHeader(name: string, value: string): void; end(chunk: string): void} {
  return {
    body: "",
    statusCode: 0,
    setHeader() {},
    end(chunk: string) {
      this.body = chunk
    }
  }
}

function restoreEnv(previous: Record<string, string | undefined>): void {
  for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
}

function minimalPng(idat: Buffer): Buffer {
  return Buffer.concat([
    Buffer.from("89504e470d0a1a0a", "hex"),
    pngChunk("IHDR", Buffer.from([0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0])),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0))
  ])
}

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
