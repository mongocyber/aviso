import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import {useEffect, useState, type FormEvent} from "react";

type Lang = "zh" | "en";
type Status = "idle" | "success" | "error";

type FormState = {
  email: string;
  category: string;
  triggerMethod: string;
  chromeVersion: string;
  os: string;
  avisoVersion: string;
  providerPath: string;
  providerModel: string;
  expectedResult: string;
  actualResult: string;
  reproSteps: string;
  details: string;
  website: string;
  startedAt: string;
};

const initialForm: FormState = {
  email: "",
  category: "",
  triggerMethod: "",
  chromeVersion: "",
  os: "",
  avisoVersion: "",
  providerPath: "unknown",
  providerModel: "",
  expectedResult: "",
  actualResult: "",
  reproSteps: "",
  details: "",
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

const triggerMethodOptions = {
  zh: [
    {value: "right_click", label: "右键菜单"},
    {value: "selection_toolbar", label: "划词工具栏"},
    {value: "selection_translation_card", label: "划词翻译卡"},
    {value: "double_click_quick_menu", label: "双击快捷菜单"},
    {value: "command_palette", label: "命令面板"},
    {value: "clipboard_prompt", label: "剪贴板提示"},
    {value: "in_page_result_panel", label: "页面内结果面板"},
    {value: "popup", label: "Popup"},
    {value: "install_setup", label: "安装 / 设置"},
    {value: "website_docs", label: "官网 / 文档"},
    {value: "other", label: "其他"}
  ],
  en: [
    {value: "right_click", label: "Right-click menu"},
    {value: "selection_toolbar", label: "Selection toolbar"},
    {value: "selection_translation_card", label: "Selection translation card"},
    {value: "double_click_quick_menu", label: "Double-click quick menu"},
    {value: "command_palette", label: "Command palette"},
    {value: "clipboard_prompt", label: "Clipboard prompt"},
    {value: "in_page_result_panel", label: "In-page result panel"},
    {value: "popup", label: "Popup"},
    {value: "install_setup", label: "Install / setup"},
    {value: "website_docs", label: "Website / docs"},
    {value: "other", label: "Other"}
  ]
} as const;

const providerPathOptions = {
  zh: [
    {value: "unknown", label: "未知 / 不相关"},
    {value: "byok", label: "BYOK"},
    {value: "hosted_candidate", label: "托管候选路径"}
  ],
  en: [
    {value: "unknown", label: "Unknown / not relevant"},
    {value: "byok", label: "BYOK"},
    {value: "hosted_candidate", label: "Hosted candidate"}
  ]
} as const;

const copy = {
  zh: {
    title: "反馈 Aviso",
    description: "提交 Aviso 的问题、建议或安装反馈。",
    eyebrow: "支持反馈",
    heading: "告诉我们哪里需要改进",
    lede: "表单默认只把结构化字段发送到维护者邮箱。可选描述和截图不会默认转发；如果内容看起来有风险，提交仍会成功，但会提示需要脱敏。",
    safetyTitle: "发送前请注意",
    safetyText: "不要提交 API Key、token、私人网页正文、客户资料、未公开文档或未脱敏截图。",
    docsLink: "查看安全反馈说明",
    category: "问题类型",
    triggerMethod: "触发方式",
    choose: "请选择",
    chromeVersion: "Chrome 版本",
    chromeVersionPlaceholder: "例如 126.0.6478.127",
    os: "操作系统",
    osPlaceholder: "例如 macOS 15 / Windows 11",
    avisoVersion: "Aviso 版本",
    avisoVersionPlaceholder: "例如 0.1.1",
    providerPath: "使用路径",
    providerModel: "Provider / 模型",
    providerModelPlaceholder: "可选；不要填写 API Key",
    expectedResult: "预期结果",
    actualResult: "实际结果",
    reproSteps: "复现步骤",
    details: "补充说明",
    narrativeHelp: "可选；如果看起来有风险，当前策略可能不会转发到邮件。",
    detailsPlaceholder: "可选补充背景。请先删除密钥、私人正文和客户资料。",
    attachmentsLabel: "截图附件",
    attachmentsDisabled: "截图上传暂时关闭；当前邮件默认不转发附件内容。",
    email: "联系邮箱",
    emailPlaceholder: "可选；填写后便于回复",
    submit: "提交反馈",
    submitting: "正在发送...",
    success: "已发送结构化反馈。谢谢你的反馈。",
    successOmitted: "已发送结构化反馈。按当前策略，可选描述和附件未进入维护者邮件。",
    successNeedsRedaction: "已发送结构化反馈。可选描述或附件可能包含敏感内容，已从维护者邮件中省略。",
    error: "发送失败。请稍后重试，或使用支持页里的备用渠道。",
    required: "请先选择问题类型和触发方式。"
  },
  en: {
    title: "Send Aviso Feedback",
    description: "Send Aviso bug reports, product feedback, or install issues.",
    eyebrow: "Support feedback",
    heading: "Tell us what needs attention",
    lede: "The form emails server-controlled structured fields by default. Optional notes and screenshots are not forwarded by default; if optional content looks risky, the submission can still succeed with a redaction notice.",
    safetyTitle: "Before sending",
    safetyText: "Do not submit API keys, tokens, private page bodies, customer data, unpublished documents, or unredacted screenshots.",
    docsLink: "Read safe feedback guidance",
    category: "Issue type",
    triggerMethod: "Trigger method",
    choose: "Choose",
    chromeVersion: "Chrome version",
    chromeVersionPlaceholder: "For example 126.0.6478.127",
    os: "Operating system",
    osPlaceholder: "For example macOS 15 / Windows 11",
    avisoVersion: "Aviso version",
    avisoVersionPlaceholder: "For example 0.1.1",
    providerPath: "Provider path",
    providerModel: "Provider / model",
    providerModelPlaceholder: "Optional; do not enter an API key",
    expectedResult: "Expected result",
    actualResult: "Actual result",
    reproSteps: "Reproduction steps",
    details: "Additional details",
    narrativeHelp: "Optional; if it looks risky, current policy may keep it out of the maintainer email.",
    detailsPlaceholder: "Optional background. Remove secrets, private page bodies, and customer data first.",
    attachmentsLabel: "Screenshot attachments",
    attachmentsDisabled: "Screenshot upload is temporarily disabled; current email policy does not forward attachment content by default.",
    email: "Contact email",
    emailPlaceholder: "Optional; used only if a reply is needed",
    submit: "Send feedback",
    submitting: "Sending...",
    success: "Structured feedback sent. Thanks for the feedback.",
    successOmitted: "Structured feedback sent. Optional notes and attachments were not included in the maintainer email under current policy.",
    successNeedsRedaction: "Structured feedback sent. Optional notes or attachments may contain sensitive content, so they were omitted from the maintainer email.",
    error: "Could not send. Please try again later or use the fallback channel on the support page.",
    required: "Choose an issue type and trigger method first."
  }
} as const;

function getLang(locale: string): Lang {
  return locale.startsWith("en") ? "en" : "zh";
}

export default function FeedbackPage(): JSX.Element {
  const {i18n} = useDocusaurusContext();
  const lang = getLang(i18n.currentLocale);
  const t = copy[lang];
  const categories = categoryOptions[lang];
  const triggerMethods = triggerMethodOptions[lang];
  const providerPaths = providerPathOptions[lang];
  const [form, setForm] = useState<FormState>(initialForm);
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

  function statusMessage(data: unknown): string {
    if (!data || typeof data !== "object") {
      return t.success;
    }

    const payload = data as {detailsForwarded?: boolean; needs_redaction?: boolean};
    if (payload.needs_redaction) {
      return t.successNeedsRedaction;
    }
    if (payload.detailsForwarded === false) {
      return t.successOmitted;
    }
    return t.success;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setStatus({type: "idle", message: ""});

    if (!form.category || !form.triggerMethod) {
      setStatus({type: "error", message: t.required});
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...form,
          locale: lang
        })
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error("Feedback request failed");
      }

      setForm({
        ...initialForm,
        startedAt: String(Date.now())
      });
      setStatus({type: "success", message: statusMessage(data)});
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

            <div className="feedback-grid feedback-grid-two">
              <label>
                <span>{t.category}</span>
                <select
                  required
                  value={form.category}
                  onChange={(event) => updateField("category", event.target.value)}
                >
                  <option value="">{t.choose}</option>
                  {categories.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>{t.triggerMethod}</span>
                <select
                  required
                  value={form.triggerMethod}
                  onChange={(event) => updateField("triggerMethod", event.target.value)}
                >
                  <option value="">{t.choose}</option>
                  {triggerMethods.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="feedback-grid feedback-grid-three">
              <label>
                <span>{t.chromeVersion}</span>
                <input
                  autoComplete="off"
                  maxLength={80}
                  placeholder={t.chromeVersionPlaceholder}
                  value={form.chromeVersion}
                  onChange={(event) => updateField("chromeVersion", event.target.value)}
                />
              </label>

              <label>
                <span>{t.os}</span>
                <input
                  autoComplete="off"
                  maxLength={80}
                  placeholder={t.osPlaceholder}
                  value={form.os}
                  onChange={(event) => updateField("os", event.target.value)}
                />
              </label>

              <label>
                <span>{t.avisoVersion}</span>
                <input
                  autoComplete="off"
                  maxLength={80}
                  placeholder={t.avisoVersionPlaceholder}
                  value={form.avisoVersion}
                  onChange={(event) => updateField("avisoVersion", event.target.value)}
                />
              </label>
            </div>

            <div className="feedback-grid feedback-grid-two">
              <label>
                <span>{t.providerPath}</span>
                <select
                  value={form.providerPath}
                  onChange={(event) => updateField("providerPath", event.target.value)}
                >
                  {providerPaths.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>{t.providerModel}</span>
                <input
                  autoComplete="off"
                  maxLength={120}
                  placeholder={t.providerModelPlaceholder}
                  value={form.providerModel}
                  onChange={(event) => updateField("providerModel", event.target.value)}
                />
              </label>
            </div>

            <label>
              <span>{t.expectedResult}</span>
              <textarea
                maxLength={1500}
                rows={3}
                value={form.expectedResult}
                onChange={(event) => updateField("expectedResult", event.target.value)}
              />
              <small className="feedback-field-help">{t.narrativeHelp}</small>
            </label>

            <label>
              <span>{t.actualResult}</span>
              <textarea
                maxLength={1500}
                rows={3}
                value={form.actualResult}
                onChange={(event) => updateField("actualResult", event.target.value)}
              />
              <small className="feedback-field-help">{t.narrativeHelp}</small>
            </label>

            <label>
              <span>{t.reproSteps}</span>
              <textarea
                maxLength={2500}
                rows={4}
                value={form.reproSteps}
                onChange={(event) => updateField("reproSteps", event.target.value)}
              />
              <small className="feedback-field-help">{t.narrativeHelp}</small>
            </label>

            <label className="feedback-editor">
              <span>{t.details}</span>
              <textarea
                maxLength={5000}
                placeholder={t.detailsPlaceholder}
                rows={5}
                value={form.details}
                onChange={(event) => updateField("details", event.target.value)}
              />
              <small className="feedback-field-help">{t.narrativeHelp}</small>
            </label>

            <div className="feedback-images feedback-attachments-disabled">
              <span>{t.attachmentsLabel}</span>
              <small>{t.attachmentsDisabled}</small>
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
