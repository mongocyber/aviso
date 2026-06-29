import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import useBaseUrl from "@docusaurus/useBaseUrl";
import Layout from "@theme/Layout";
import {useEffect, useMemo, useState} from "react";

type Lang = "zh" | "en";

type IconName =
  | "explain"
  | "translate"
  | "refine"
  | "summarize"
  | "send"
  | "command"
  | "copy"
  | "save"
  | "close"
  | "settings"
  | "model"
  | "key"
  | "network"
  | "shield"
  | "more"
  | "bookmark"
  | "sliders"
  | "check"
  | "camera"
  | "history"
  | "continue";

type ProviderLogoName = "anthropic" | "deepseek" | "doubao" | "gemini" | "hunyuan" | "kimi" | "openai" | "openrouter";

const iconPaths: Record<IconName, string> = {
  explain:
    '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5"/><circle cx="12" cy="7.8" r=".9" fill="currentColor" stroke="none"/>',
  translate:
    '<text x="3.5" y="11" font-family="Hanken Grotesk,sans-serif" font-size="9.5" font-weight="700" fill="currentColor" stroke="none">A</text><text x="11" y="20.5" font-family="sans-serif" font-size="10" font-weight="600" fill="currentColor" stroke="none">文</text><path d="M3.5 14.5h6"/>',
  refine: '<path d="M4 20l1-4L16 5l3 3L8 19l-4 1z"/><path d="M14 7l3 3"/>',
  summarize: '<path d="M5 7h14M5 12h10M5 17h6"/>',
  send: '<path d="M21 3 3 10.5l7 2.6L12.5 20 21 3z"/><path d="M21 3 10 13.1"/>',
  command:
    '<text x="12" y="17" text-anchor="middle" font-family="sans-serif" font-size="15" fill="currentColor" stroke="none">⌘</text>',
  copy:
    '<rect x="8" y="8" width="12" height="12" rx="2.4"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  save: '<path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z"/>',
  close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  settings:
    '<path d="M4 7.5h10M4 12h13M4 16.5h7"/><circle cx="17" cy="7.5" r="2.4" fill="currentColor" stroke="none"/><circle cx="9" cy="16.5" r="2.4" fill="currentColor" stroke="none"/>',
  model:
    '<path d="M12 3l7.5 4.3v8.6L12 21l-7.5-5.1V7.3L12 3z"/><circle cx="12" cy="11.6" r="2.6" fill="currentColor" stroke="none"/>',
  key: '<circle cx="8" cy="8" r="4.2"/><path d="M11 11l8.5 8.5M16.5 16.5l2-2M19.5 19.5l1.6-1.6"/>',
  network:
    '<path d="M4.5 11.5a11 11 0 0 1 15 0M7.8 15a6.5 6.5 0 0 1 8.4 0"/><circle cx="12" cy="18.6" r="1.1" fill="currentColor" stroke="none"/><path d="M3 3l18 18" stroke-width="1.6"/>',
  shield: '<path d="M12 3.2l7 2.8v5.2c0 4.2-3 7.3-7 8.6-4-1.3-7-4.4-7-8.6V6l7-2.8z"/><path d="M9 11.6l2.1 2.1L15.5 9.5"/>',
  more:
    '<circle cx="6" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="18" cy="12" r="1.3" fill="currentColor" stroke="none"/>',
  bookmark: '<rect x="4" y="5" width="14" height="14" rx="2"/><path d="M8 5v6l2.5-1.8L13 11V5"/>',
  sliders:
    '<path d="M4 7.5h10M4 16.5h7"/><circle cx="17" cy="7.5" r="2.4" fill="currentColor" stroke="none"/><circle cx="11" cy="16.5" r="2.4" fill="currentColor" stroke="none"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  camera:
    '<path d="M4 8.5h3l1.5-2.2h7L17 8.5h3a1 1 0 0 1 1 1v8.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.1"/>',
  history: '<path d="M3.6 9.5A8.5 8.5 0 1 1 4 14"/><path d="M3 5v4.5h4.5"/><path d="M12 8v4.2l3 1.8"/>',
  continue: '<path d="M5 12h13M13 6.5l6 5.5-6 5.5"/>'
};

function Mark({className = ""}: {className?: string}): JSX.Element {
  return <img className={`mk ${className}`.trim()} src={useBaseUrl("/img/aviso-mark-sage.svg")} alt="" aria-hidden="true" />;
}

function ProviderLogo({name}: {name: ProviderLogoName}): JSX.Element {
  return <img className="provider-logo" src={useBaseUrl(`/img/provider-logos/color/${name}.svg?v=2`)} alt="" aria-hidden="true" />;
}

function Icon({name, className = ""}: {name: IconName; className?: string}): JSX.Element {
  return (
    <span className={`ic ${className}`.trim()} aria-hidden="true">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        dangerouslySetInnerHTML={{__html: iconPaths[name]}}
      />
    </span>
  );
}

function ShortcutIcon({type}: {type: "command" | "shift"}): JSX.Element {
  return (
    <span className={`shortcut-icon shortcut-icon-${type}`} aria-hidden="true">
      {type === "command" ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 9H6.8A2.8 2.8 0 1 1 9.6 6.2V17.8A2.8 2.8 0 1 1 6.8 15H18A2.8 2.8 0 1 1 15.2 17.8V6.2A2.8 2.8 0 1 1 18 9H6" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5 5.6 12.1h3.2V19h6.4v-6.9h3.2L12 5Z" />
        </svg>
      )}
    </span>
  );
}

const anthropicLines = [0, 36, 72, 108, 144, 180, 216, 252, 288, 324];

function GlyphOpenAI(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <ellipse cx="12" cy="12" rx="4.1" ry="8.6" />
      <ellipse cx="12" cy="12" rx="4.1" ry="8.6" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="4.1" ry="8.6" transform="rotate(120 12 12)" />
    </svg>
  );
}

function GlyphAnthropic(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" fill="none">
      {anthropicLines.map((deg) => (
        <line key={deg} x1="12" y1="3" x2="12" y2="9" transform={`rotate(${deg} 12 12)`} />
      ))}
    </svg>
  );
}

function GlyphDoubao(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round">
      <path d="M12 3.2c2 3 .6 4.9 2.4 6.6 1.6 1.5 3.1 2.8 3.1 5.4a5.5 5.5 0 0 1-11 0c0-1.9.9-3 2-3.9.8 1.6 2 1.9 2 1.9-1-2.3-.4-5.4 1.5-9z" />
    </svg>
  );
}

function GlyphProvider(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round">
      <path d="M12 3.5 19 7.5v8.9l-7 4.1-7-4.1V7.5l7-4z" />
      <path d="M8 9.2h8M8 14.8h8M12 7v10" />
    </svg>
  );
}

const copy = {
  zh: {
    pageDescription: "Aviso 是一个在当前网页就地调用 AI 的 Chrome 扩展。BYOK 是当前默认可用路径；v0.3 Aviso AI / 托管 AI 仍是候选路径，release gate 完成后才会公开。",
    badge: "内部试用 · Chrome 扩展",
    heroLine1: "在你正看的网页里,",
    heroLine2Pre: "就地调用 ",
    heroEm: "AI",
    sub: "一个快捷键唤起命令面板,搜本地历史与书签,或把问题直接交给 AI。解释、翻译、润色、总结,结果就浮在原文旁边 —— 不跳转、不复制粘贴。BYOK 路径默认直连模型厂商；v0.3 Aviso AI 是可选托管候选路径,只有 release gate 完成后才会公开。",
    install: "查看安装指南",
    readDocs: "产品文档",
    viewDocs: "查看文档",
    micro: "BYOK 无需登录 · Aviso AI production candidate · Chrome 桌面版",
    statusNote: "0.1.0 正在 Chrome Web Store 审核中,目前没有正式商店链接；v0.3 Aviso AI 已通过 production backend smoke 并完成候选包构建,但还没有公开、部署网站或提交新版商店披露。",
    shortcutPre: "在任意网页按下",
    cmdPlaceholder: "搜索浏览历史、书签、AI 对话…",
    cmdStatus: "AI 可用",
    cmdNav: "导航",
    cmdSelect: "选择",
    cmdHint: "无结果时可发给 AI",
    cmdNoMatch: "无匹配结果 — 回车把输入交给",
    cmdNoMatchTail: "按意图处理",
    providerLab: "使用自己的 Key,浏览器直连已批准的模型厂商",
    doubao: "豆包",
    ark: "Volcengine Ark",
    entriesTag: "01 — 触发入口",
    entriesTitle: "需要的那一刻,从哪都能叫出它",
    entriesLede: "Aviso 不强迫你换一种用浏览器的方式。它接进你已有的习惯 —— 右键、划词、快捷键,你顺手怎么用都行。",
    resultTag: "02 — 结果留在页面",
    resultTitlePre: "答案浮在原文旁,",
    resultTitleEm: "不必",
    resultTitlePost: "离开这一页",
    resultLede: "页面内浮窗是 Aviso 的主结果位。内容流式输出,可以复制、保存、继续追问。保存的对话进入本地历史,之后能在命令面板里复用。",
    winModel: "解释",
    winUser: "清理函数会在组件卸载前…",
    winAnswerStrong: "清理函数",
    winAnswer1: "用来撤销上一次 effect 的副作用 —— 取消监听、清掉定时器、断开连接,避免内存泄漏。",
    winAnswer2: "它在两个时机执行:组件卸载前,以及下一次 effect 运行前。",
    copyLabel: "复制",
    saveLabel: "保存",
    followup: "继续追问…",
    sendLabel: "发送",
    byokTag: "03 — BYOK 默认直连",
    byokTitlePre: "你的 Key,直连厂商。",
    byokTitleMid: "托管 AI 可选,",
    byokTitleEm: "不挡 BYOK",
    byokLede: "BYOK 路径使用你自己的 API Key,浏览器直连你选的模型厂商,不要求 Aviso 账号。v0.3 Aviso AI / 托管 AI 仍是候选路径；只有你选择托管并登录时,请求才会经过 Aviso production 后端和上游模型服务,公开前还需要完成剩余 release gate。",
    provCardTitle: "AI 服务",
    provCardTag: "本地保护",
    provDaily: "Volcengine Ark",
    provDoubao: "豆包接入点",
    provDefault: "可配置",
    provConnected: "已配置",
    provUnset: "支持配置 · 待测试",
    provNotSet: "未配置",
    privacyTag: "04 — 隐私边界",
    privacyTitlePre: "别让扩展悄悄收走你的对话。",
    privacyTitleEm: "每条路径都说清楚",
    privacyLede: "Aviso 把 BYOK 直连和 v0.3 候选托管路径分开披露。BYOK 请求不经过 Aviso 后端；托管 AI 只在你主动选择并登录后使用,请求会经过 Aviso production 后端和上游模型服务。",
    compareThem: "多数 AI 助手扩展",
    compareUs: "Aviso",
    privacyNote:
      "这不是空话:Aviso 的隐私边界写进了实现本身。API Key 不明文保存,对话历史只存在你的浏览器里,命令面板搜历史和书签都在本地完成。BYOK 只由浏览器直连你选择的 provider；v0.3 候选托管后端不持久化 raw prompt、raw response、页面正文、截图/base64、剪贴板、API Key 或完整 URL。",
    metricBackendNum: "BYOK",
    metricBackend: "直连路径不经过 Aviso 后端",
    metricTelemetryNum: "0",
    metricTelemetry: "个遥测或第三方分析 SDK",
    metricTriggerNum: "主动触发",
    metricTrigger: "才发送 —— 托管路径不持久化正文",
    docsTag: "产品文档",
    docsTitle: "几分钟上手,数据流向写在明面上",
    docsLede: "文档帮你两件事:把 Aviso 顺手装好用起来,以及看清每个操作会把哪些内容发给哪个 provider。读完,你能放心地决定怎么用它。",
    docRead: "阅读 →",
    faqTag: "常见问题",
    faqTitle: "还有疑问?",
    finalTitle: "把 AI 留在你需要它的那一刻",
    finalLede: "BYOK 无需登录。v0.3 Aviso AI 仍是候选路径,release gate 完成后才会公开。按指南装好后,按 ⌘⇧Space,就能开始。",
    badgeKey: "自备 API Key",
    badgeNoData: "不持久化正文",
    badgeNoAccount: "BYOK 无需登录",
    cmdReady: "AI 可用"
  },
  en: {
    pageDescription:
      "Aviso is a Chrome extension for calling AI inside the current page. BYOK is the current available path; v0.3 Aviso AI / hosted AI is still a candidate path and will be public only after the release gates are complete.",
    badge: "Internal trial · Chrome extension",
    heroLine1: "Call AI right",
    heroLine2Pre: "inside the page ",
    heroEm: "you're on",
    sub: "One shortcut opens the command palette — search your history and bookmarks, or hand a question straight to the AI. Explain, translate, refine, summarize; the answer floats right beside the text. BYOK stays browser-direct by default; v0.3 Aviso AI is an optional hosted candidate path and will be public only after the release gates are complete.",
    install: "View install guide",
    readDocs: "Read the docs",
    viewDocs: "View docs",
    micro: "BYOK no login · Aviso AI production candidate · Chrome desktop",
    statusNote:
      "0.1.0 is under Chrome Web Store review, with no official store link yet; v0.3 Aviso AI has passed production backend smoke and candidate packaging, but it is not public, website-deployed, or submitted as a new store disclosure yet.",
    shortcutPre: "On any page, press",
    cmdPlaceholder: "Search browser history, bookmarks, AI chats…",
    cmdStatus: "AI ready",
    cmdNav: "Navigate",
    cmdSelect: "Select",
    cmdHint: "Send to AI when no results",
    cmdNoMatch: "No match — press Enter to hand it to",
    cmdNoMatchTail: "",
    providerLab: "Bring your key — your browser connects directly to approved providers",
    doubao: "Doubao",
    ark: "Volcengine Ark",
    entriesTag: "01 — Entry points",
    entriesTitle: "Reach it from wherever you already are",
    entriesLede:
      "Aviso doesn't make you learn a new way to browse. It plugs into the habits you already have — right-click, select, a keystroke. Whatever's nearest.",
    resultTag: "02 — Results stay in place",
    resultTitlePre: "The answer floats by the text —",
    resultTitleEm: "you never",
    resultTitlePost: "leave the page",
    resultLede:
      "The in-page panel is where Aviso puts results. Output streams in; copy it, save it, or keep asking. Saved chats go to local history and can be reused later from the command palette.",
    winModel: "Explain",
    winUser: "The cleanup function runs before…",
    winAnswerStrong: "The cleanup function",
    winAnswer1: " undoes the previous effect's side-effects — unsubscribing, clearing timers, closing connections — to avoid leaks.",
    winAnswer2: "It runs at two moments: before unmount, and before the effect re-runs.",
    copyLabel: "Copy",
    saveLabel: "Save",
    followup: "Ask a follow-up…",
    sendLabel: "Send",
    byokTag: "03 — BYOK stays direct",
    byokTitlePre: "Your key, straight to the provider.",
    byokTitleMid: "Hosted AI is optional, ",
    byokTitleEm: "BYOK remains open",
    byokLede:
      "The BYOK path uses your own API key and connects your browser straight to the provider you choose, with no Aviso account required. v0.3 Aviso AI / hosted AI is still a candidate path; only when you choose hosted AI and sign in does the request pass through the Aviso production backend and upstream model services, and remaining release gates must pass before it is public.",
    provCardTitle: "AI services",
    provCardTag: "local protection",
    provDaily: "Volcengine Ark",
    provDoubao: "Doubao endpoint",
    provDefault: "configurable",
    provConnected: "configured",
    provUnset: "configurable · test needed",
    provNotSet: "not set",
    privacyTag: "04 — Privacy boundary",
    privacyTitlePre: "Don't let extensions quietly take your chats.",
    privacyTitleEm: "Every path is explicit",
    privacyLede:
      "Aviso discloses BYOK and the v0.3 hosted candidate path separately. BYOK requests do not pass through the Aviso backend; hosted AI is used only after you choose it and sign in, and requests pass through the Aviso production backend and upstream model services.",
    compareThem: "Most AI assistant extensions",
    compareUs: "Aviso",
    privacyNote:
      "This isn't a slogan — Aviso's privacy boundary is built into the implementation. API keys are not stored in plaintext, chat history stays in your browser, and command-palette searches over history and bookmarks run locally. BYOK goes browser-direct to your selected provider; the v0.3 hosted candidate backend does not persist raw prompts, raw responses, page bodies, screenshots/base64, clipboard content, API keys, or full URLs.",
    metricBackendNum: "BYOK",
    metricBackend: "direct path does not pass through the Aviso backend",
    metricTelemetryNum: "0",
    metricTelemetry: "telemetry or third-party analytics SDKs",
    metricTriggerNum: "On trigger",
    metricTrigger: "only — hosted path does not persist raw content",
    docsTag: "Documentation",
    docsTitle: "Set up in minutes — every data path in plain sight",
    docsLede:
      "The docs do two things: get Aviso running smoothly, and show you exactly which content each action sends to which provider. Read them and you'll know precisely how to trust it.",
    docRead: "Read →",
    faqTag: "FAQ",
    faqTitle: "Still wondering?",
    finalTitle: "Keep AI for the moment you need it",
    finalLede: "BYOK needs no login. v0.3 Aviso AI is still a candidate path and will be public only after the release gates are complete. Follow the install guide, press ⌘⇧Space, and go.",
    badgeKey: "Bring your own key",
    badgeNoData: "No raw content persisted",
    badgeNoAccount: "BYOK no login",
    cmdReady: "AI ready"
  }
} as const;

type Entry = {
  no: string;
  icon: IconName;
  kbd?: string;
  kbdZh?: string;
  kbdEn?: string;
  zhTitle: string;
  enTitle: string;
  zhText?: string;
  enText?: string;
  code?: string;
  zhTextPre?: string;
  zhTextPost?: string;
  enTextPre?: string;
  enTextPost?: string;
};

const entries: Entry[] = [
  {
    no: "01",
    icon: "command",
    kbd: "⌘⇧Space",
    zhTitle: "命令面板",
    enTitle: "Command palette",
    zhText:
      "一个快捷键随处唤起。搜本地历史、书签、浏览记录和过往 AI 对话;没有结果时,回车把输入直接交给 AI 按意图处理。",
    enText:
      "One shortcut, anywhere. Search local history, bookmarks, browsing history, and past AI chats — and when nothing matches, Enter hands your input straight to the AI."
  },
  {
    no: "02",
    icon: "send",
    zhTitle: "划词工具栏",
    enTitle: "Selection toolbar",
    zhText: "选中网页文字,轻量工具栏就地浮出。解释、翻译、润色、总结一键直达,或整段发给 AI 自由提问。",
    enText:
      "Select text and a light toolbar appears in place. Explain, translate, refine, summarize in one tap — or send the whole passage to the AI."
  },
  {
    no: "03",
    icon: "more",
    zhTitle: "右键菜单",
    enTitle: "Right-click menu",
    zhText: "融入原生右键菜单,条目随选区、页面、链接、图片自动变化。还能复制当前上下文,或切换模型。",
    enText:
      "Woven into the native context menu, with entries that adapt to selection, page, link, or image — plus copy-context and model switching."
  },
  {
    no: "04",
    icon: "copy",
    zhTitle: "剪贴板感知",
    enTitle: "Clipboard-aware",
    zhText: "复制普通文字后,轻轻提示一下,要不要交给 AI。复制密码、密钥、支付等敏感内容时,绝不触发。",
    enText:
      "After you copy plain text, a gentle nudge offers to hand it to the AI. On passwords, keys, or payment fields, it never fires."
  },
  {
    no: "05",
    icon: "explain",
    kbdZh: "可选",
    kbdEn: "optional",
    zhTitle: "双击快捷菜单",
    enTitle: "Double-click menu",
    zhText: "可选开启。在安全网页区域双击,弹出紧凑入口;自动避开输入框、可编辑区和常见代码编辑器。",
    enText:
      "Optional. Double-click in a safe area of the page for a compact entry — automatically steering clear of inputs, editable regions, and code editors."
  },
  {
    no: "06",
    icon: "refine",
    zhTitle: "自定义指令",
    enTitle: "Custom prompts",
    zhTextPre: "把你常用的 Prompt 存成模板,出现在右键菜单里。支持 ",
    zhTextPost: " 等占位符,随取随用。",
    enTextPre: "Save your go-to prompts as templates that surface in the right-click menu. Placeholders like ",
    enTextPost: " fill themselves in.",
    code: "{{selection}}"
  }
];

const caps = [
  {icon: "explain", zh: "解释", en: "Explain"},
  {icon: "translate", zh: "翻译", en: "Translate"},
  {icon: "refine", zh: "润色", en: "Refine"},
  {icon: "summarize", zh: "总结", en: "Summarize"},
  {icon: "continue", zh: "继续追问", en: "Follow-up"},
  {icon: "refine", zh: "自定义指令", en: "Custom prompt"}
] as const;

const byokPoints = [
  {
    icon: "sliders",
    zhTitle: "多套配置,随时切换",
    enTitle: "Multiple configs, switch anytime",
    zhText: "同一厂商可存多套配置,设默认服务,右键菜单里也能换模型。",
    enText: "Keep several configs per provider, set a default, and swap models from the right-click menu."
  },
  {
    icon: "model",
    zhTitle: "模型 ID 手动可填",
    enTitle: "Model IDs are editable",
    zhText: "OpenAI、Anthropic、DeepSeek、Kimi / Moonshot、OpenRouter、Gemini、Tencent Hunyuan 的模型 ID,以及豆包 / Volcengine Ark 的接入点,都能自己填。",
    enText: "Type in model IDs for OpenAI, Anthropic, DeepSeek, Kimi / Moonshot, OpenRouter, Gemini, and Tencent Hunyuan, plus endpoints for Doubao / Volcengine Ark."
  },
  {
    icon: "check",
    zhTitle: "手动连接测试",
    enTitle: "Manual connection test",
    zhText: "想确认能用,手动测一下单个 provider;结果只显示脱敏摘要。",
    enText: "Verify a single provider on demand; the test shows only a redacted summary."
  }
] as const;

const compareRows = [
  {
    zhCrit: "你的内容去哪",
    enCrit: "Where your content goes",
    zhThem: "可能被收集、画像,甚至转卖给数据经纪商",
    enThem: "May be collected, profiled, even sold to data brokers",
    zhUs: "BYOK 直连 provider;托管 AI 仅主动触发并且不持久化正文",
    enUs: "BYOK goes direct; hosted AI is user-triggered and does not persist raw content"
  },
  {
    zhCrit: "怎么计费",
    enCrit: "How it's billed",
    zhThem: "在模型费之外再收月费,按信用点限额,成本难预估",
    enThem: "A monthly fee on top of model cost, credit caps, unpredictable spend",
    zhUs: "BYOK 按厂商规则结算;v0.3 托管计费不在首轮公开范围",
    enUs: "BYOK is billed by your provider; hosted billing is out of the first v0.3 public scope"
  },
  {
    zhCrit: "要不要账号",
    enCrit: "Account required?",
    zhThem: "常需注册登录才能用",
    enThem: "Often sign-up and login required",
    zhUs: "BYOK 不强制登录;只有托管 AI 需要登录",
    enUs: "BYOK does not require login; hosted AI requires sign-in"
  },
  {
    zhCrit: "索取什么权限",
    enCrit: "What it asks for",
    zhThem: "常索取“读取并更改所有网站数据”",
    enThem: 'Often wants "read and change all your data on all sites"',
    zhUs: "host 权限限于已批准 provider 和托管后端域名",
    enUs: "Host permissions are limited to approved provider and hosted backend origins"
  },
  {
    zhCrit: "什么时候在工作",
    enCrit: "When it runs",
    zhThem: "后台常驻,持续监听页面",
    enThem: "Runs in the background, watching pages",
    zhUs: "只在你主动触发的那一刻工作",
    enUs: "Only the moment you trigger it"
  }
] as const;

const docsCards = [
  {
    no: "01",
    icon: "settings",
    href: "/docs/install/",
    zhTitle: "安装与首次使用",
    enTitle: "Install & first use",
    zhText: "加载扩展、填入 API Key、跑通第一个动作。",
    enText: "Load the extension, add a key, run your first action."
  },
  {
    no: "02",
    icon: "command",
    href: "/docs/core-features/",
    zhTitle: "核心功能",
    enTitle: "Core features",
    zhText: "五个入口、结果面板、翻译、命令面板的用法。",
    enText: "The five entries, result panel, translation, palette."
  },
  {
    no: "03",
    icon: "shield",
    href: "/docs/data-permissions/",
    zhTitle: "数据 · 权限 · 隐私",
    enTitle: "Data · permissions · privacy",
    zhText: "哪些数据本地保存、哪些会发给 provider。",
    enText: "What stays local, what goes to the provider."
  }
] as const;

const faqs = [
  {
    zhQ: "Aviso 收费吗?",
    enQ: "Does Aviso cost money?",
    zhA: "扩展本身当前不收费。BYOK 路径使用你自己的 provider Key,费用按厂商规则结算。v0.3 Aviso AI / 托管 AI 仍是候选路径；任何额度、价格或付费方案都不会在发布前作为公开承诺。",
    enA: "The extension itself currently does not charge. The BYOK path uses your own provider key and is billed by that provider. v0.3 Aviso AI / hosted AI is still a candidate path; any quota, pricing, or paid-plan detail is not a public promise before release approval."
  },
  {
    zhQ: "必须自己准备 API Key 吗?",
    enQ: "Do I need my own API key?",
    zhA: "BYOK 路径需要你自己的模型 API Key,并且浏览器直接连接你选择的厂商。v0.3 同时准备可选托管 AI：只有你选择托管路径时才需要登录,不影响 BYOK。内部测试和用户反馈确认豆包 / Volcengine Ark 路径可用；其他 provider 的 BYOK 可用性仍取决于你的 Key、模型权限和 provider 状态。",
    enA: "The BYOK path needs your own model API key and connects your browser directly to the provider you choose. v0.3 also prepares optional hosted AI: sign-in is needed only when you choose the hosted path, and BYOK remains available. Internal testing and user feedback confirm the Doubao / Volcengine Ark path works; other BYOK provider availability still depends on your key, model access, and provider status."
  },
  {
    zhQ: "Aviso 会收集我的浏览数据吗?",
    enQ: "Does Aviso collect my browsing data?",
    zhA: "Aviso 不做被动浏览数据收集,没有遥测或第三方分析 SDK。BYOK 路径不经过 Aviso 后端；托管 AI 只在你主动选择并登录后使用,请求会经过 Aviso 后端和上游模型服务。托管后端不持久化 raw prompt、raw response、页面正文、截图/base64、剪贴板、API Key 或完整 URL。",
    enA: "Aviso does not passively collect browsing data, and it has no telemetry or third-party analytics SDK. BYOK requests do not pass through the Aviso backend; hosted AI is used only after you choose it and sign in, and requests pass through the Aviso backend and upstream model services. The hosted backend does not persist raw prompts, raw responses, page bodies, screenshots/base64, clipboard content, API keys, or full URLs."
  },
  {
    zhQ: "它在每个网站都能用吗?",
    enQ: "Does it work on every site?",
    zhA: "绝大多数网站都能用:右键菜单、划词工具栏和命令面板覆盖面很广。少数自定义右键菜单的站点(如某些在线编辑器)上,划词工具栏和快捷键仍然好用。更复杂或跨域的嵌入页面,目前仍在持续打磨。",
    enA: "On the vast majority of sites: the right-click menu, selection toolbar, and command palette have broad coverage. On a few sites with custom right-click menus (like some online editors), the selection toolbar and shortcut still work. More complex or cross-origin embeds are still being refined."
  },
  {
    zhQ: "当前版本的边界是什么?",
    enQ: "What are the current limits?",
    zhA: "核心功能已经实现、可以日常使用,并经过内部手动验收;同时我们对当前的可用边界保持坦白 —— 比如内部测试和用户反馈确认豆包 / Volcengine Ark 路径可用,OpenAI/Anthropic/DeepSeek/Kimi-Moonshot/OpenRouter/Gemini/Tencent Hunyuan 支持配置但仍取决于你的 Key 和模型权限。OpenRouter、Gemini 和 Tencent Hunyuan 模型 ID 需要手动填写,Aviso 不自动读取模型列表。首段返回速度会受网络、模型、输入长度和 provider 状态影响,当前不宣称 p50/p95 已达标。",
    enA: "The core features are built, usable day-to-day, and internally manually verified — while we stay candid about the current edges, like internal testing and user feedback confirming the Doubao / Volcengine Ark path works, and OpenAI / Anthropic / DeepSeek / Kimi-Moonshot / OpenRouter / Gemini / Tencent Hunyuan being configurable depending on your key and model access. OpenRouter, Gemini, and Tencent Hunyuan model IDs must be entered manually; Aviso does not automatically read model lists. First-token latency depends on network, model, input length, and provider status; we do not claim p50/p95 targets have been met."
  }
] as const;

const paletteData = [
  {ic: "bookmark", zhBadge: "书签", enBadge: "Bookmark", zhT1: "季度复盘 · 协作文档", enT1: "Quarterly review · shared doc", t2: "docs.internal.example/q3-review"},
  {ic: "history", zhBadge: "AI 对话", enBadge: "AI chat", zhT1: "解释:这段授权流程的时序", enT1: "Explain: this authorization sequence", zhT2: "3 小时前 · 解释", enT2: "3h ago · Explain"},
  {ic: "history", zhBadge: "浏览历史", enBadge: "History", zhT1: "后端接口设计规范 v2", enT1: "Backend API design spec v2", t2: "wiki.internal.example/api-spec"},
  {ic: "history", zhBadge: "AI 对话", enBadge: "AI chat", zhT1: "总结:这篇架构拆分实践", enT1: "Summarize: this architecture breakdown", zhT2: "昨天 · 总结", enT2: "Yesterday · Summarize"},
  {ic: "bookmark", zhBadge: "书签", enBadge: "Bookmark", zhT1: "团队周报模板", enT1: "Team weekly report template", t2: "notes.internal.example/weekly"}
] as const;

type Copy = (typeof copy)[Lang];

function HeroPalette({lang, t}: {lang: Lang; t: Copy}): JSX.Element {
  const [query, setQuery] = useState("");
  const [sel, setSel] = useState(0);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return paletteData
      .map((d) => ({
        ic: d.ic as IconName,
        badge: lang === "zh" ? d.zhBadge : d.enBadge,
        t1: lang === "zh" ? d.zhT1 : d.enT1,
        t2: lang === "zh" ? ("zhT2" in d ? d.zhT2 : d.t2) : "enT2" in d ? d.enT2 : d.t2
      }))
      .filter((d) => !q || d.t1.toLowerCase().includes(q));
  }, [query, lang]);

  const noMatch = items.length === 0 && query.trim().length > 0;

  return (
    <div className="cmdp" role="group" aria-label="Aviso command palette">
      <div className="cmdp-input">
        <Mark />
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSel(0);
          }}
          placeholder={t.cmdPlaceholder}
          aria-label={t.cmdPlaceholder}
        />
        <span className="cmdp-status">
          <Icon name="shield" />
          <span>{t.cmdStatus}</span>
        </span>
      </div>
      {noMatch ? (
        <div className="cmdp-intent">
          <span>{t.cmdNoMatch}</span>
          <span className="pill">
            <Icon name="model" />
            Aviso
          </span>
          {t.cmdNoMatchTail ? <span>{t.cmdNoMatchTail}</span> : null}
        </div>
      ) : (
        <div className="cmdp-list">
          {items.map((item, index) => (
            <div
              key={item.t1}
              className={`cmdp-row${index === sel ? " sel" : ""}`}
              onMouseEnter={() => setSel(index)}
            >
              <Icon name={item.ic} />
              <span className="txt">
                <div className="t1">{item.t1}</div>
                <div className="t2">{item.t2}</div>
              </span>
              <span className="badge">{item.badge}</span>
            </div>
          ))}
        </div>
      )}
      <div className="cmdp-foot">
        <span>
          <span className="kbd">↑↓</span> {t.cmdNav} · <span className="kbd">Enter</span> {t.cmdSelect}
        </span>
        <span className="r">{t.cmdHint}</span>
      </div>
    </div>
  );
}

export default function Home(): JSX.Element {
  const {
    i18n: {currentLocale}
  } = useDocusaurusContext();
  const lang: Lang = currentLocale === "en" ? "en" : "zh";
  const [openFaq, setOpenFaq] = useState(0);
  const t = copy[lang];
  const providerStrip: Array<{logo: ProviderLogoName; name: string}> = [
    {logo: "openai", name: "OpenAI"},
    {logo: "anthropic", name: "Anthropic"},
    {logo: "deepseek", name: "DeepSeek"},
    {logo: "gemini", name: "Gemini"},
    {logo: "doubao", name: t.doubao},
    {logo: "kimi", name: "Kimi"},
    {logo: "openrouter", name: "OpenRouter"},
    {logo: "hunyuan", name: lang === "zh" ? "腾讯混元" : "Tencent Hunyuan"}
  ];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("section") !== "features") {
      return;
    }
    window.requestAnimationFrame(() => {
      document.getElementById("features")?.scrollIntoView({block: "start"});
    });
  }, []);

  return (
    <Layout title="Aviso" description={t.pageDescription}>
      <main className="avLanding" lang={lang}>
        {/* HERO */}
        <header className="shero" id="top">
          <div className="swrap">
            <span className="badge">
              <span className="dot" />
              {t.badge}
            </span>
            <h1>
              {t.heroLine1}
              <br />
              {t.heroLine2Pre}
              <em>{t.heroEm}</em>
            </h1>
            <p className="sub">{t.sub}</p>
            <div className="cta-row">
              <Link className="sbtn sbtn-primary sbtn-lg" to="/docs/install/">
                <Mark />
                {t.install}
              </Link>
              <Link className="sbtn sbtn-ghost sbtn-lg" to="/docs/intro/">
                {t.readDocs}
              </Link>
            </div>
            <p className="micro">
              <Icon name="key" />
              {t.micro}
            </p>
            <p className="micro">
              <Icon name="shield" />
              {t.statusNote}
            </p>

            <div className="palette-stage">
              <div className="shortcut-hint">
                <span>{t.shortcutPre}</span>
                <kbd aria-label="Command Shift Space">
                  <ShortcutIcon type="command" />
                  <ShortcutIcon type="shift" />
                  <span>Space</span>
                </kbd>
              </div>
              <HeroPalette lang={lang} t={t} />
            </div>
          </div>
        </header>

        {/* PROVIDER STRIP */}
        <section className="providers" aria-label={t.providerLab}>
          <div className="swrap">
            <p className="lab">{t.providerLab}</p>
            <div className="row">
              {providerStrip.map((provider) => (
                <span className="p" key={provider.logo}>
                  <span className="glyph logo-glyph">
                    <ProviderLogo name={provider.logo} />
                  </span>
                  <span>
                    {provider.name}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* 01 ENTRIES */}
        <section className="sblock" id="features">
          <div className="swrap">
            <div className="shead">
              <p className="eyebrow">
                <span>{t.entriesTag}</span>
              </p>
              <h2>{t.entriesTitle}</h2>
              <p className="lede">{t.entriesLede}</p>
            </div>
            <div className="entries">
              {entries.map((entry) => (
                <div className="entry" key={entry.no}>
                  <span className="no">{entry.no}</span>
                  <div>
                    <h3>
                      <Icon name={entry.icon as IconName} />
                      <span>{lang === "zh" ? entry.zhTitle : entry.enTitle}</span>
                      {entry.kbd ? <span className="kbd">{entry.kbd}</span> : null}
                      {entry.kbdZh ? <span className="kbd">{lang === "zh" ? entry.kbdZh : entry.kbdEn}</span> : null}
                    </h3>
                    {entry.code ? (
                      <p>
                        {lang === "zh" ? entry.zhTextPre : entry.enTextPre}
                        <code>{entry.code}</code>
                        {lang === "zh" ? entry.zhTextPost : entry.enTextPost}
                      </p>
                    ) : (
                      <p>{lang === "zh" ? entry.zhText : entry.enText}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 02 RESULT */}
        <section className="sblock tint" id="result">
          <div className="swrap">
            <div className="split">
              <div>
                <p className="eyebrow">
                  <span>{t.resultTag}</span>
                </p>
                <h2>
                  {t.resultTitlePre}
                  <br />
                  <em>{t.resultTitleEm}</em>
                  {lang === "zh" ? "" : " "}
                  {t.resultTitlePost}
                </h2>
                <p className="lede">{t.resultLede}</p>
                <div className="caps">
                  {caps.map((cap, index) => (
                    <span className="cap-chip" key={index}>
                      <Icon name={cap.icon as IconName} />
                      {lang === "zh" ? cap.zh : cap.en}
                    </span>
                  ))}
                </div>
              </div>
              <div className="split-media">
                <div className="win">
                  <div className="win-head">
                    <Mark />
                    <span className="win-title">Aviso</span>
                    <span className="win-model">{t.winModel}</span>
                    <span className="spacer" />
                    <button className="iconbtn" type="button" aria-label={lang === "zh" ? "关闭" : "Close"}>
                      <Icon name="close" />
                    </button>
                  </div>
                  <div className="win-body">
                    <div className="user-bubble">{t.winUser}</div>
                    <div className="ai-msg">
                      <p>
                        <strong>{t.winAnswerStrong}</strong>
                        {lang === "zh" ? "" : ""}
                        {t.winAnswer1}
                      </p>
                      <p>{t.winAnswer2}</p>
                    </div>
                  </div>
                  <div className="win-actions">
                    <button className="act" type="button">
                      <Icon name="copy" />
                      <span className="lab">{t.copyLabel}</span>
                    </button>
                    <button className="act" type="button">
                      <Icon name="save" />
                      <span className="lab">{t.saveLabel}</span>
                    </button>
                  </div>
                  <div className="win-followup">
                    <input className="fi" placeholder={t.followup} aria-label={t.followup} />
                    <button className="send" type="button">
                      <Icon name="send" />
                      {t.sendLabel}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 03 BYOK */}
        <section className="sblock" id="byok">
          <div className="swrap">
            <div className="byok">
              <div>
                <p className="eyebrow">
                  <span>{t.byokTag}</span>
                </p>
                <h2>
                  {t.byokTitlePre}
                  <br />
                  {t.byokTitleMid}
                  <em>{t.byokTitleEm}</em>
                </h2>
                <p className="lede">{t.byokLede}</p>
                <ul className="byok-points">
                  {byokPoints.map((point) => (
                    <li key={point.icon + point.zhTitle}>
                      <span className="pic">
                        <Icon name={point.icon as IconName} />
                      </span>
                      <div>
                        <b>{lang === "zh" ? point.zhTitle : point.enTitle}</b>
                        <span>{lang === "zh" ? point.zhText : point.enText}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="split-media">
                <div className="provcard">
                  <div className="ph">
                    <Icon name="key" />
                    <span>{t.provCardTitle}</span>
                    <span className="tag">
                      <Icon name="shield" />
                      {t.provCardTag}
                    </span>
                  </div>
                  <div className="provrow">
                    <span className="glyph provider-card-logo">
                      <ProviderLogo name="doubao" />
                    </span>
                    <span className="nm">
                      <b>{t.provDaily}</b>
                      <small>{lang === "zh" ? "豆包 · 接入点可填" : "Doubao · custom endpoint"}</small>
                    </span>
                    <span className="st def">{t.provDefault}</span>
                  </div>
                  <div className="provrow">
                    <span className="glyph provider-card-logo">
                      <ProviderLogo name="openai" />
                    </span>
                    <span className="nm">
                      <b>OpenAI</b>
                      <small>{lang === "zh" ? "模型 ID 可填 · 待测试" : "Custom model ID · untested"}</small>
                    </span>
                    <span className="st idle">{t.provNotSet}</span>
                  </div>
                  <div className="provrow">
                    <span className="glyph provider-card-logo">
                      <ProviderLogo name="deepseek" />
                    </span>
                    <span className="nm">
                      <b>DeepSeek</b>
                      <small>{lang === "zh" ? "模型 ID 可填 · 待测试" : "Custom model ID · untested"}</small>
                    </span>
                    <span className="st idle">{t.provNotSet}</span>
                  </div>
                  <div className="provrow">
                    <span className="glyph provider-card-logo">
                      <ProviderLogo name="kimi" />
                    </span>
                    <span className="nm">
                      <b>Kimi</b>
                      <small>{lang === "zh" ? "Moonshot · 模型 ID 可填" : "Moonshot · custom model ID"}</small>
                    </span>
                    <span className="st idle">{t.provNotSet}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 04 PRIVACY */}
        <section className="sblock tint" id="privacy">
          <div className="swrap">
            <div className="shead">
              <p className="eyebrow">
                <span>{t.privacyTag}</span>
              </p>
              <h2>
                {t.privacyTitlePre}
                <br />
                <em>{t.privacyTitleEm}</em>
              </h2>
              <p className="lede">{t.privacyLede}</p>
            </div>

            <div className="compare-tbl">
              <div className="crow head">
                <span className="cc" />
                <span className="cc them">{t.compareThem}</span>
                <span className="cc us">{t.compareUs}</span>
              </div>
              {compareRows.map((row) => (
                <div className="crow" key={row.zhCrit}>
                  <span className="cc">
                    <span className="crit">{lang === "zh" ? row.zhCrit : row.enCrit}</span>
                  </span>
                  <span className="cc dim">
                    <span className="rl">{t.compareThem}</span>
                    {lang === "zh" ? row.zhThem : row.enThem}
                  </span>
                  <span className="cc us">
                    <span className="rl">Aviso</span>
                    <Icon name="check" className="mark" />
                    {lang === "zh" ? row.zhUs : row.enUs}
                  </span>
                </div>
              ))}
            </div>

            <p className="privacy-note">{t.privacyNote}</p>

            <div className="metrics">
              <div className="metric">
                <div className="num">{t.metricBackendNum}</div>
                <div className="desc">{t.metricBackend}</div>
              </div>
              <div className="metric">
                <div className="num">{t.metricTelemetryNum}</div>
                <div className="desc">{t.metricTelemetry}</div>
              </div>
              <div className="metric">
                <div className="num">{t.metricTriggerNum}</div>
                <div className="desc">{t.metricTrigger}</div>
              </div>
            </div>
          </div>
        </section>

        {/* DOCS ENTRY */}
        <section className="sblock" id="docs">
          <div className="swrap">
            <div className="shead">
              <p className="eyebrow">
                <span>{t.docsTag}</span>
              </p>
              <h2>{t.docsTitle}</h2>
              <p className="lede">{t.docsLede}</p>
            </div>
            <div className="docs-grid">
              {docsCards.map((card) => (
                <Link className="doc-card" to={card.href} key={card.no}>
                  <span className="no">{card.no}</span>
                  <h3>
                    <Icon name={card.icon as IconName} />
                    <span>{lang === "zh" ? card.zhTitle : card.enTitle}</span>
                  </h3>
                  <p>{lang === "zh" ? card.zhText : card.enText}</p>
                  <span className="arrow">{t.docRead}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="sblock tint" id="faq">
          <div className="swrap">
            <div className="shead center">
              <p className="eyebrow center">
                <span>{t.faqTag}</span>
              </p>
              <h2>{t.faqTitle}</h2>
            </div>
            <div className="faq">
              {faqs.map((faq, index) => (
                <div className={`faq-item${openFaq === index ? " open" : ""}`} key={faq.zhQ}>
                  <button className="faq-q" type="button" onClick={() => setOpenFaq(openFaq === index ? -1 : index)}>
                    <span>{lang === "zh" ? faq.zhQ : faq.enQ}</span>
                    <span className="pm" />
                  </button>
                  <div className="faq-a">
                    <p>{lang === "zh" ? faq.zhA : faq.enA}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="final" id="install">
          <div className="swrap">
            <Mark className="mk-big" />
            <h2>{t.finalTitle}</h2>
            <p>{t.finalLede}</p>
            <div className="cta-row">
              <Link className="sbtn sbtn-primary sbtn-lg" to="/docs/install/">
                <Mark />
                {t.install}
              </Link>
              <Link className="sbtn sbtn-ghost sbtn-lg" to="/docs/intro/">
                {t.viewDocs}
              </Link>
            </div>
            <div className="badges">
              <span className="b">
                <Icon name="key" />
                {t.badgeKey}
              </span>
              <span className="b">
                <Icon name="shield" />
                {t.badgeNoData}
              </span>
              <span className="b">
                <Icon name="check" />
                {t.badgeNoAccount}
              </span>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
