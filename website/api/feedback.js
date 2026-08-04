const MAX_BODY_BYTES = 6 * 1024 * 1024;
const MAX_ATTACHMENTS = 3;
const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;
const VALID_CATEGORIES = new Set(["bug", "idea", "install", "privacy"]);
const CATEGORY_LABELS = {
  bug: "Bug",
  idea: "Idea",
  install: "Install help",
  privacy: "Privacy"
};
const VALID_IMAGE_TYPES = new Set(["image/png", "image/jpeg"]);
const PNG_SIGNATURE = Buffer.from("89504e470d0a1a0a", "hex");
const ZERO_WIDTH_CHARS = /[\u200B-\u200D\uFEFF]/g;
const SENSITIVE_LABEL_CONNECTOR = String.raw`(?:\s*(?::|=|：|-|–|—)\s*|\s+is\s+)`;
const GENERIC_SECRET_LABEL_PATTERN = new RegExp(
  String.raw`\b(?:api[_\s-]?key|secret|token|authorization)\b${SENSITIVE_LABEL_CONNECTOR}(?:bearer\s+)?([A-Za-z0-9._~+/=\-\s\u200B-\u200D\uFEFF]{16,})`,
  "gi"
);
const SENSITIVE_FEEDBACK_PATTERNS = [
  /\bBearer\s+[A-Za-z0-9._~+/=-]{24,}/i,
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{24,}/i,
  /\bsk-ant-[A-Za-z0-9_-]{24,}/i,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  new RegExp(String.raw`\bprivate\s+(?:(?:web\s*)?page|webpage)\s+bod(?:y|ies)\b${SENSITIVE_LABEL_CONNECTOR}`, "i"),
  new RegExp(String.raw`\bcustomer\s+data\b${SENSITIVE_LABEL_CONNECTOR}`, "i"),
  new RegExp(String.raw`\bunpublished\s+document\b${SENSITIVE_LABEL_CONNECTOR}`, "i"),
  new RegExp(String.raw`\braw\s+(?:prompt|response)\b${SENSITIVE_LABEL_CONNECTOR}`, "i"),
  new RegExp(String.raw`\bprovider\s+(?:request|response)\b${SENSITIVE_LABEL_CONNECTOR}`, "i"),
  /(?:私人网页正文|客户资料|未公开文档|原始\s*(?:prompt|response)|原始请求|原始响应)/
];

function sendJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Robots-Tag", "noindex");
  res.end(JSON.stringify(body));
}

function normalize(value, maxLength) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
}

function isValidEmail(value) {
  if (!value) {
    return true;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function containsSensitiveFeedbackContent(value) {
  if (typeof value !== "string" || !value.trim()) {
    return false;
  }

  const normalized = value.replace(ZERO_WIDTH_CHARS, "");
  GENERIC_SECRET_LABEL_PATTERN.lastIndex = 0;
  for (const match of normalized.matchAll(GENERIC_SECRET_LABEL_PATTERN)) {
    const candidate = (match[1] || "").replace(/\s+/g, "");
    if (candidate.length >= 16 && /^[A-Za-z0-9._~+/=-]+$/.test(candidate)) {
      return true;
    }
  }

  return SENSITIVE_FEEDBACK_PATTERNS.some((pattern) => pattern.test(normalized));
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return char;
    }
  });
}

async function readBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  if (typeof req.body === "string") {
    return JSON.parse(req.body || "{}");
  }

  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) {
      throw new Error("Request body is too large");
    }
  }

  return JSON.parse(raw || "{}");
}

function decodeBase64Image(data) {
  const compact = normalize(data, MAX_ATTACHMENT_BYTES * 2).replace(/\s+/g, "");
  if (!compact || compact.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(compact)) {
    return null;
  }

  const decoded = Buffer.from(compact, "base64");
  if (!decoded.length || decoded.toString("base64").replace(/=+$/, "") !== compact.replace(/=+$/, "")) {
    return null;
  }
  return decoded;
}

function stripPngMetadata(buffer) {
  if (buffer.length < PNG_SIGNATURE.length + 12 || !buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    return null;
  }

  const chunks = [PNG_SIGNATURE];
  let offset = PNG_SIGNATURE.length;
  let sawIhdr = false;
  let sawIdat = false;
  let sawIend = false;

  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const typeStart = offset + 4;
    const dataStart = offset + 8;
    const chunkEnd = dataStart + length + 4;
    if (chunkEnd > buffer.length) {
      return null;
    }

    const type = buffer.toString("ascii", typeStart, typeStart + 4);
    const isCritical = /^[A-Z]/.test(type);
    if (isCritical) {
      chunks.push(buffer.subarray(offset, chunkEnd));
    }
    if (type === "IHDR") sawIhdr = true;
    if (type === "IDAT") sawIdat = true;
    if (type === "IEND") {
      sawIend = true;
      break;
    }
    offset = chunkEnd;
  }

  if (!sawIhdr || !sawIdat || !sawIend) {
    return null;
  }
  return Buffer.concat(chunks);
}

function stripJpegMetadata(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return null;
  }

  const chunks = [buffer.subarray(0, 2)];
  let offset = 2;

  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      chunks.push(buffer.subarray(offset));
      break;
    }

    let markerOffset = offset;
    while (buffer[markerOffset] === 0xff && markerOffset < buffer.length) {
      markerOffset += 1;
    }
    if (markerOffset >= buffer.length) {
      break;
    }

    const marker = buffer[markerOffset];
    const segmentStart = offset;
    offset = markerOffset + 1;

    if (marker === 0xd9 || marker === 0xda) {
      chunks.push(buffer.subarray(segmentStart));
      break;
    }
    if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      chunks.push(buffer.subarray(segmentStart, offset));
      continue;
    }
    if (offset + 2 > buffer.length) {
      return null;
    }

    const length = buffer.readUInt16BE(offset);
    const segmentEnd = offset + length;
    if (length < 2 || segmentEnd > buffer.length) {
      return null;
    }

    const isMetadataSegment = (marker >= 0xe0 && marker <= 0xef) || marker === 0xfe;
    if (!isMetadataSegment) {
      chunks.push(buffer.subarray(segmentStart, segmentEnd));
    }
    offset = segmentEnd;
  }

  return Buffer.concat(chunks);
}

function stripImageMetadata(buffer, type) {
  if (type === "image/png") {
    return stripPngMetadata(buffer);
  }
  if (type === "image/jpeg") {
    return stripJpegMetadata(buffer);
  }
  return null;
}

function normalizeAttachments(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.slice(0, MAX_ATTACHMENTS).flatMap((item, index) => {
    const type = normalize(item?.type, 40);
    const raw = decodeBase64Image(item?.data);
    const size = raw?.byteLength ?? 0;

    if (!VALID_IMAGE_TYPES.has(type) || !raw || size <= 0 || size > MAX_ATTACHMENT_BYTES) {
      return [];
    }

    const sanitized = stripImageMetadata(raw, type);
    if (!sanitized) {
      return [];
    }

    const fallbackName = `aviso-feedback-${index + 1}.${type.split("/")[1] || "png"}`;
    const name = normalize(item?.name, 120).replace(/[^\w.\-()\u4e00-\u9fa5 ]/g, "") || fallbackName;
    if (containsSensitiveFeedbackContent(name)) {
      return [];
    }

    return [
      {
        filename: name,
        content: sanitized.toString("base64"),
        content_type: type
      }
    ];
  });
}

function subjectFromPayload(payload) {
  const label = CATEGORY_LABELS[payload.category] || "General";
  return `[Aviso feedback] ${label || "New feedback"}`;
}

function buildMessage(payload) {
  const rows = [
    ["Category", payload.categoryLabel || payload.category || "Not selected"],
    ["Email", payload.email || "Not provided"],
    ["Locale", payload.locale || "Not provided"],
    ["Images", payload.attachmentCount ? `${payload.attachmentCount} attached` : "None"],
    ["Description", payload.message]
  ];

  const text = rows.map(([label, value]) => `${label}: ${value}`).join("\n\n");
  const htmlRows = rows
    .map(([label, value]) => {
      const safeLabel = escapeHtml(label);
      const safeValue = escapeHtml(value).replace(/\n/g, "<br>");
      return `<p><strong>${safeLabel}</strong><br>${safeValue}</p>`;
    })
    .join("");

  return {
    text,
    html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.5;color:#1f2a24">${htmlRows}</div>`
  };
}

function normalizeFeedbackPayload(body) {
  const message = normalize(body.message || body.description, 5000);
  const email = normalize(body.email, 160);
  const locale = normalize(body.locale, 20);
  const category = VALID_CATEGORIES.has(body.category) ? body.category : "";
  const categoryLabel = CATEGORY_LABELS[category] || "General";
  const attachments = normalizeAttachments(body.attachments);

  if (message.length < 5 || !isValidEmail(email)) {
    return {ok: false, reason: "invalid_input"};
  }
  if (containsSensitiveFeedbackContent(message) || containsSensitiveFeedbackContent(email)) {
    return {ok: false, reason: "sensitive_content"};
  }

  return {
    ok: true,
    payload: {
      message,
      email,
      locale,
      category,
      categoryLabel,
      attachmentCount: attachments.length,
      attachments
    }
  };
}

function buildResendBody(payload, {from, to}) {
  const renderedMessage = buildMessage(payload);
  const resendBody = {
    from,
    to: [to],
    subject: subjectFromPayload(payload),
    text: renderedMessage.text,
    html: renderedMessage.html,
    attachments: payload.attachments
  };

  if (payload.email) {
    resendBody.reply_to = payload.email;
  }

  return resendBody;
}

async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    sendJson(res, 405, {ok: false});
    return;
  }

  let body;
  try {
    body = await readBody(req);
  } catch {
    sendJson(res, 400, {ok: false});
    return;
  }

  if (normalize(body.website, 200)) {
    sendJson(res, 200, {ok: true});
    return;
  }

  const normalized = normalizeFeedbackPayload(body);
  if (!normalized.ok) {
    sendJson(res, 400, {ok: false, reason: normalized.reason});
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.FEEDBACK_TO_EMAIL;
  const from = process.env.FEEDBACK_FROM_EMAIL;

  if (!apiKey || !to || !from) {
    sendJson(res, 503, {ok: false});
    return;
  }

  const resendBody = buildResendBody(normalized.payload, {from, to});

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(resendBody)
    });

    if (!response.ok) {
      sendJson(res, 502, {ok: false});
      return;
    }

    sendJson(res, 200, {ok: true});
  } catch {
    sendJson(res, 502, {ok: false});
  }
}

module.exports = handler;
module.exports.__test = {
  buildResendBody,
  containsSensitiveFeedbackContent,
  normalizeAttachments,
  normalizeFeedbackPayload,
  stripImageMetadata
};
