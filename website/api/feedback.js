const MAX_BODY_BYTES = 6 * 1024 * 1024;
const MAX_ATTACHMENTS = 3;
const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;
const VALID_CATEGORIES = new Set(["bug", "idea", "install", "privacy"]);
const VALID_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

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

function normalizeAttachments(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.slice(0, MAX_ATTACHMENTS).flatMap((item, index) => {
    const type = normalize(item?.type, 40);
    const data = normalize(item?.data, MAX_ATTACHMENT_BYTES * 2);
    const size = Number(item?.size) || 0;

    if (!VALID_IMAGE_TYPES.has(type) || !data || size <= 0 || size > MAX_ATTACHMENT_BYTES) {
      return [];
    }

    const fallbackName = `aviso-feedback-${index + 1}.${type.split("/")[1] || "png"}`;
    const name = normalize(item?.name, 120).replace(/[^\w.\-()\u4e00-\u9fa5 ]/g, "") || fallbackName;

    return [
      {
        filename: name,
        content: data,
        content_type: type
      }
    ];
  });
}

function subjectFromMessage(message) {
  const firstLine = message
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  return `[Aviso feedback] ${(firstLine || "New feedback").replace(/[\r\n]+/g, " ").slice(0, 96)}`;
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

module.exports = async function handler(req, res) {
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

  const message = normalize(body.message || body.description, 5000);
  const email = normalize(body.email, 160);
  const locale = normalize(body.locale, 20);
  const category = VALID_CATEGORIES.has(body.category) ? body.category : "";
  const categoryLabel = normalize(body.categoryLabel, 80);
  const attachments = normalizeAttachments(body.attachments);

  if (message.length < 5 || !isValidEmail(email)) {
    sendJson(res, 400, {ok: false});
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.FEEDBACK_TO_EMAIL;
  const from = process.env.FEEDBACK_FROM_EMAIL;

  if (!apiKey || !to || !from) {
    sendJson(res, 503, {ok: false});
    return;
  }

  const payload = {
    message,
    email,
    locale,
    category,
    categoryLabel,
    attachmentCount: attachments.length
  };
  const renderedMessage = buildMessage(payload);
  const resendBody = {
    from,
    to: [to],
    subject: subjectFromMessage(message),
    text: renderedMessage.text,
    html: renderedMessage.html,
    attachments
  };

  if (email) {
    resendBody.reply_to = email;
  }

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
};
