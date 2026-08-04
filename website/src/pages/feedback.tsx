import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import {useEffect, useState, type ChangeEvent, type FormEvent, type ClipboardEvent} from "react";

type Lang = "zh" | "en";
type Status = "idle" | "success" | "error";

type FormState = {
  email: string;
  message: string;
  category: string;
  website: string;
  startedAt: string;
};

type Attachment = {
  id: string;
  name: string;
  type: string;
  size: number;
  data: string;
  previewUrl: string;
};

const MAX_ATTACHMENTS = 3;
const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(["image/png", "image/jpeg"]);

const initialForm: FormState = {
  email: "",
  message: "",
  category: "",
  website: "",
  startedAt: ""
};

const categoryOptions = {
  zh: [
    {value: "bug", label: "功能问题"},
    {value: "idea", label: "使用建议"},
    {value: "install", label: "安装问题"},
    {value: "privacy", label: "隐私权限"}
  ],
  en: [
    {value: "bug", label: "Bug"},
    {value: "idea", label: "Suggestion"},
    {value: "install", label: "Install"},
    {value: "privacy", label: "Privacy"}
  ]
} as const;

const copy = {
  zh: {
    title: "反馈 Aviso",
    description: "提交 Aviso 的问题、建议或安装反馈。",
    eyebrow: "支持反馈",
    heading: "告诉我们哪里需要改进",
    lede: "写下问题描述，可以附上脱敏截图。反馈会先拦截高置信度密钥、token、私人正文和 raw prompt/response，再发送到维护者邮箱用于定位问题和后续回复。",
    safetyTitle: "发送前请注意",
    safetyText: "不要提交 API Key、token、私人网页正文、客户资料、未公开文档或未脱敏截图。",
    docsLink: "查看安全反馈说明",
    message: "问题描述",
    messagePlaceholder: "请写清楚你做了什么、预期是什么、实际发生了什么。也可以直接粘贴截图。",
    imageHelp: "可选，最多 3 张；支持 PNG 或 JPG，每张不超过 2 MB。上传前请先脱敏。",
    addImage: "上传图片",
    removeImage: "移除",
    tagsLabel: "问题类型（可选）",
    email: "联系邮箱",
    emailPlaceholder: "可选；填写后便于回复",
    submit: "提交反馈",
    submitting: "正在发送…",
    success: "已发送。谢谢你的反馈。",
    error: "发送失败。请稍后重试，或使用支持页里的备用渠道。",
    required: "请先填写问题描述。",
    invalidImage: "只能上传 PNG 或 JPG 图片。",
    imageTooLarge: "单张图片不能超过 2 MB。",
    tooManyImages: "最多上传 3 张插图。"
  },
  en: {
    title: "Send Aviso Feedback",
    description: "Send Aviso bug reports, product feedback, or install issues.",
    eyebrow: "Support feedback",
    heading: "Tell us what needs attention",
    lede: "Describe the issue and attach redacted screenshots if helpful. The form blocks high-confidence keys, tokens, private page bodies, and raw prompt/response dumps before emailing the maintainer for triage and replies.",
    safetyTitle: "Before sending",
    safetyText: "Do not submit API keys, tokens, private page bodies, customer data, unpublished documents, or unredacted screenshots.",
    docsLink: "Read safe feedback guidance",
    message: "Issue description",
    messagePlaceholder: "Describe what you did, what you expected, and what happened. You can also paste a screenshot here.",
    imageHelp: "Optional, up to 3 images. PNG or JPG only; each image must be under 2 MB. Redact before uploading.",
    addImage: "Upload image",
    removeImage: "Remove",
    tagsLabel: "Issue type (optional)",
    email: "Contact email",
    emailPlaceholder: "Optional; used only if a reply is needed",
    submit: "Send feedback",
    submitting: "Sending…",
    success: "Sent. Thanks for the feedback.",
    error: "Could not send. Please try again later or use the fallback channel on the support page.",
    required: "Please describe the issue first.",
    invalidImage: "Only PNG or JPG images are supported.",
    imageTooLarge: "Each image must be under 2 MB.",
    tooManyImages: "You can attach up to 3 images."
  }
} as const;

function getLang(locale: string): Lang {
  return locale.startsWith("en") ? "en" : "zh";
}

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function readImage(file: File, messages: (typeof copy)[Lang]): Promise<Attachment> {
  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
    return Promise.reject(new Error(messages.invalidImage));
  }

  if (file.size > MAX_ATTACHMENT_BYTES) {
    return Promise.reject(new Error(messages.imageTooLarge));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const [, data = ""] = result.split(",");

      if (!data) {
        reject(new Error(messages.invalidImage));
        return;
      }

      resolve({
        id: makeId(),
        name: file.name,
        type: file.type,
        size: file.size,
        data,
        previewUrl: result
      });
    };

    reader.onerror = () => reject(new Error(messages.invalidImage));
    reader.readAsDataURL(file);
  });
}

export default function FeedbackPage(): JSX.Element {
  const {i18n} = useDocusaurusContext();
  const lang = getLang(i18n.currentLocale);
  const t = copy[lang];
  const options = categoryOptions[lang];
  const [form, setForm] = useState<FormState>(initialForm);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [status, setStatus] = useState<{type: Status; message: string}>({
    type: "idle",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      startedAt: String(Date.now())
    }));
  }, []);

  function updateField(field: keyof FormState, value: string): void {
    setForm((current) => ({...current, [field]: value}));
  }

  async function addImages(files: Iterable<File>): Promise<void> {
    setStatus({type: "idle", message: ""});

    const incoming = Array.from(files).filter((file) => file.type.startsWith("image/"));
    const availableSlots = MAX_ATTACHMENTS - attachments.length;

    if (incoming.length > availableSlots) {
      setStatus({type: "error", message: t.tooManyImages});
    }

    const selected = incoming.slice(0, Math.max(availableSlots, 0));

    try {
      const loaded = await Promise.all(selected.map((file) => readImage(file, t)));
      if (loaded.length > 0) {
        setAttachments((current) => [...current, ...loaded]);
      }
    } catch (error) {
      setStatus({type: "error", message: error instanceof Error ? error.message : t.invalidImage});
    }
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>): void {
    void addImages(event.target.files ?? []);
    event.target.value = "";
  }

  function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>): void {
    const imageFiles = Array.from(event.clipboardData.files).filter((file) => file.type.startsWith("image/"));

    if (imageFiles.length === 0) {
      return;
    }

    event.preventDefault();
    void addImages(imageFiles);
  }

  function removeImage(id: string): void {
    setAttachments((current) => current.filter((item) => item.id !== id));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setStatus({type: "idle", message: ""});

    if (!form.message.trim()) {
      setStatus({type: "error", message: t.required});
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedCategory = options.find((option) => option.value === form.category);
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...form,
          categoryLabel: selectedCategory?.label ?? "",
          attachments: attachments.map(({name, type, size, data}) => ({name, type, size, data})),
          locale: lang
        })
      });

      if (!response.ok) {
        throw new Error("Feedback request failed");
      }

      setForm({
        ...initialForm,
        startedAt: String(Date.now())
      });
      setAttachments([]);
      setStatus({type: "success", message: t.success});
    } catch {
      setStatus({type: "error", message: t.error});
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Layout title={t.title} description={t.description}>
      <main className="feedback-page">
        <section className="feedback-shell">
          <div className="feedback-copy">
            <span className="feedback-eyebrow">{t.eyebrow}</span>
            <h1>{t.heading}</h1>
            <p>{t.lede}</p>
            <div className="feedback-note feedback-note-warning">
              <strong>{t.safetyTitle}</strong>
              <span>{t.safetyText}</span>
              <Link to="/docs/support-feedback/">{t.docsLink}</Link>
            </div>
          </div>

          <form className="feedback-form" onSubmit={handleSubmit}>
            <input
              aria-hidden="true"
              autoComplete="off"
              className="feedback-honeypot"
              name="website"
              tabIndex={-1}
              value={form.website}
              onChange={(event) => updateField("website", event.target.value)}
            />

            <label className="feedback-editor">
              <span>{t.message}</span>
              <textarea
                maxLength={5000}
                placeholder={t.messagePlaceholder}
                required
                rows={10}
                value={form.message}
                onChange={(event) => updateField("message", event.target.value)}
                onPaste={handlePaste}
              />
            </label>

            <div className="feedback-images">
              <div className="feedback-images-head">
                <label className={`feedback-upload-button${attachments.length >= MAX_ATTACHMENTS ? " disabled" : ""}`}>
                  <input
                    accept="image/png,image/jpeg"
                    disabled={attachments.length >= MAX_ATTACHMENTS}
                    multiple
                    type="file"
                    onChange={handleFileInput}
                  />
                  <svg aria-hidden="true" viewBox="0 0 24 24">
                    <path d="M12 16V4m0 0 4.5 4.5M12 4 7.5 8.5" />
                    <path d="M5 15.5V18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2.5" />
                  </svg>
                  <span>{t.addImage}</span>
                </label>
                <small>{t.imageHelp}</small>
              </div>
              {attachments.length > 0 ? (
                <div className="feedback-image-list">
                  {attachments.map((item) => (
                    <div className="feedback-image" key={item.id}>
                      <img src={item.previewUrl} alt="" />
                      <button type="button" onClick={() => removeImage(item.id)}>
                        {t.removeImage}
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="feedback-tags" aria-label={t.tagsLabel}>
              <span>{t.tagsLabel}</span>
              <div className="feedback-tag-list">
                {options.map((option) => {
                  const active = form.category === option.value;

                  return (
                    <button
                      aria-pressed={active}
                      className={`feedback-tag${active ? " active" : ""}`}
                      key={option.value}
                      type="button"
                      onClick={() => updateField("category", active ? "" : option.value)}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <label>
              <span>{t.email}</span>
              <input
                autoComplete="email"
                inputMode="email"
                maxLength={160}
                placeholder={t.emailPlaceholder}
                type="email"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
              />
            </label>

            {status.type !== "idle" ? <div className={`feedback-status feedback-status-${status.type}`}>{status.message}</div> : null}

            <button className="feedback-submit" disabled={isSubmitting} type="submit">
              {isSubmitting ? t.submitting : t.submit}
            </button>
          </form>
        </section>
      </main>
    </Layout>
  );
}
