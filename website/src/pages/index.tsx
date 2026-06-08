import Link from "@docusaurus/Link";
import useBaseUrl from "@docusaurus/useBaseUrl";
import Layout from "@theme/Layout";
import {useEffect, useState} from "react";
import {createPortal} from "react-dom";

type Lang = "zh" | "en";
type IconName =
  | "bookmark"
  | "check"
  | "close"
  | "command"
  | "copy"
  | "history"
  | "key"
  | "model"
  | "more"
  | "refine"
  | "save"
  | "send"
  | "shield"
  | "spark"
  | "summary";

const copy = {
  zh: {
    pageDescription:
      "Aviso 是一个在当前网页就地调用 AI 的 Chrome 扩展，当前处于 v0.1 internal dogfood。",
    eyebrow: "Chrome 扩展 · v0.1 internal dogfood",
    titlePrefix: "会留意的",
    titleEmphasis: "AI",
    subtitle:
      "把 AI 操作带到浏览器的每一个角落，需要时随手即得。选中或右键任何内容，就地解释、翻译、润色和总结。",
    install: "添加到浏览器",
    docs: "产品文档",
    docsCta: "查看文档",
    demo: "看看演示",
    privacyPolicy: "隐私政策",
    micro: "当前安装入口会进入内部试用加载说明。",
    langLabel: "语言",
    mockDocLabel: "文档 · EFFECT",
    mockDocTitle: "与外部系统同步",
    mockDocP1:
      "有些组件需要与外部系统保持同步。例如，根据页面状态控制非 React 组件、建立连接或更新页面内容。",
    mockHighlight:
      "清理函数会在组件卸载前，以及下一次 effect 重新运行前执行，用来撤销上一次的副作用。",
    mockDocP3: "依赖发生变化时，React 会先清理旧的 effect，再执行新的。",
    mockMode: "用户选择 provider",
    mockAction: "解释",
    mockQuestion: "清理函数会在组件卸载前…",
    mockAnswer1:
      "清理函数用于撤销上一次 effect 带来的副作用，例如取消订阅、清除定时器或断开连接。",
    mockAnswer2:
      "它在组件卸载前，以及下一次 effect 运行前执行，帮助页面保持稳定。",
    copied: "复制",
    saved: "保存",
    close: "关闭",
    trustLabel: "自带 API Key，直连你信任的模型",
    whyTag: "为什么是 Aviso",
    whyTitle: "别再每次都这样了。",
    without: "没有 Aviso",
    with: "有了 Aviso",
    badSteps: ["在页面上选中文字", "复制内容", "切换到新标签页", "打开聊天工具", "粘贴文字", "等待回复", "再切回来"],
    goodSteps: ["选中文字", "右键或工具栏问 AI"],
    badFoot: "多次切换。每一次都打断上下文。",
    goodFoot: "留在当前页面，就地处理。",
    featureTag: "能做什么",
    featureTitle: "阅读、写作、查证，都不必离开当前页面",
    featureLead:
      "Aviso 把 AI 叠加在你正在看的网页之上。轻量、克制，只在你主动触发的那一刻出现。",
    howTag: "三步上手",
    howTitle: "从选中，到答案，保持在同一个上下文里",
    privacyTag: "隐私边界",
    privacyTitlePrefix: "你的 Key、设置和历史，",
    privacyTitleEmphasis: "先留在本地浏览器",
    privacyLead:
      "API Key、设置和历史先保存在本地浏览器。用户主动触发 AI 操作时，请求会直接发送给所选 provider。",
    privacyResearch:
      "provider 的计费、日志、滞留和数据处理规则，以用户选择的 provider 条款为准。",
    privacyCta: "阅读完整隐私政策",
    modelTag: "你的模型",
    modelTitle: "用你信任的模型，随时切换",
    modelLead: "自带 API Key 直连。在设置或右键菜单里切换已配置的 provider。",
    faqTag: "常见问题",
    faqTitle: "还有疑问？",
    finalTitle: "把 AI 留在你需要的那一刻",
    finalLead:
      "Aviso v0.1 继续保持 internal dogfood 口径。产品文档保留安装、隐私、权限和已知限制说明。"
  },
  en: {
    pageDescription:
      "Aviso is a Chrome extension for asking AI inside the current page. It is currently v0.1 internal dogfood.",
    eyebrow: "Chrome extension · v0.1 internal dogfood",
    titlePrefix: "AI that",
    titleEmphasis: "notices",
    subtitle:
      "Bring AI actions to every corner of the browser, right when you need them. Select or right-click anything to explain, translate, refine, or summarize in place.",
    install: "Add to browser",
    docs: "Product docs",
    docsCta: "View docs",
    demo: "Watch demo",
    privacyPolicy: "Privacy policy",
    micro:
      "The install entry opens the internal dogfood loading guide.",
    langLabel: "Language",
    mockDocLabel: "DOCS · EFFECT",
    mockDocTitle: "Synchronizing with Effects",
    mockDocP1:
      "Some components need to stay connected to external systems, such as controlling non-React widgets or updating page state.",
    mockHighlight:
      "The cleanup function runs before unmount and before the next effect run, undoing the previous side effect.",
    mockDocP3: "When dependencies change, React cleans up the old effect before running the new one.",
    mockMode: "User-selected provider",
    mockAction: "Explain",
    mockQuestion: "The cleanup function runs before…",
    mockAnswer1:
      "A cleanup function undoes the previous effect, such as unsubscribing, clearing timers, or closing a connection.",
    mockAnswer2:
      "It runs before unmount and before the next effect run, helping the page stay consistent.",
    copied: "Copy",
    saved: "Save",
    close: "Close",
    trustLabel: "Bring your own API key — connect the model you trust",
    whyTag: "Why Aviso",
    whyTitle: "Stop doing this every time.",
    without: "Without Aviso",
    with: "With Aviso",
    badSteps: ["Select text on a page", "Copy content", "Switch to a new tab", "Open a chat tool", "Paste the text", "Wait for a response", "Switch back"],
    goodSteps: ["Select text", "Ask AI from the menu or toolbar"],
    badFoot: "Repeated context switches. Every time.",
    goodFoot: "Stay on the current page and keep working.",
    featureTag: "What it does",
    featureTitle: "Read, write, and check without leaving the page",
    featureLead:
      "Aviso layers AI over the page you are already viewing. Light, restrained, and visible only when you trigger it.",
    howTag: "Three steps",
    howTitle: "From selection to answer in the same context",
    privacyTag: "Privacy boundary",
    privacyTitlePrefix: "Your keys, settings, and history ",
    privacyTitleEmphasis: "start in local browser storage",
    privacyLead:
      "API keys, settings, and history start in local browser storage. When you trigger an AI action, the request goes directly to the provider you choose.",
    privacyResearch:
      "Provider billing, logging, retention, and data handling follow the terms of the provider selected by the user.",
    privacyCta: "Read the full privacy policy",
    modelTag: "Your models",
    modelTitle: "Bring the model you trust and switch anytime",
    modelLead: "Connected with your own API key. Switch configured providers from settings or the right-click menu.",
    faqTag: "FAQ",
    faqTitle: "Questions?",
    finalTitle: "Keep AI for the moment you need it",
    finalLead:
      "Aviso v0.1 remains internal dogfood. Product docs keep the install, privacy, permissions, and known limitations explicit."
  }
} as const;

const trustItems = [
  {
    zh: "OpenAI API",
    en: "OpenAI API"
  },
  {
    zh: "Anthropic API",
    en: "Anthropic API"
  },
  {
    zh: "豆包 / 火山方舟",
    en: "Volcengine Ark"
  }
] as const;

const navLabels = {
  zh: {
    features: "功能",
    privacy: "隐私",
    docs: "文档",
    install: "添加到浏览器"
  },
  en: {
    features: "Features",
    privacy: "Privacy",
    docs: "Docs",
    install: "Add to browser"
  }
} as const;

const features = [
  {
    icon: "send",
    wide: true,
    zhTitle: "划词工具栏",
    enTitle: "Selection toolbar",
    zhText: "选中网页文字后，工具栏就地浮出。解释、翻译、润色、总结一键直达，或直接发给 AI 自由提问。",
    enText:
      "Select page text and the toolbar appears in place. Explain, translate, refine, summarize, or ask AI directly.",
    visual: "toolbar"
  },
  {
    icon: "command",
    wide: true,
    zhTitle: "命令面板",
    enTitle: "Command palette",
    zhText: "一个快捷键，随处唤起。搜索浏览历史、书签和 AI 对话，或直接把问题交给 AI 按意图处理。",
    enText: "One shortcut, anywhere. Search browsing history, bookmarks, and AI conversations, or hand a question to AI with intent.",
    visual: "command"
  },
  {
    icon: "more",
    zhTitle: "右键菜单",
    enTitle: "Right-click menu",
    zhText: "融入原生右键菜单，条目随选区、图片、链接等上下文自动变化。",
    enText: "Woven into the native context menu, with entries that adapt to selected text, images, or links.",
    visual: "context"
  },
  {
    icon: "copy",
    zhTitle: "剪贴板感知",
    enTitle: "Clipboard-aware",
    zhText: "复制普通文字后轻量提示；敏感页面和敏感内容会被跳过。",
    enText: "A lightweight nudge after copying ordinary text; sensitive pages and sensitive content are skipped.",
    visual: "nudge"
  },
  {
    icon: "refine",
    zhTitle: "自定义模板",
    enTitle: "Prompt templates",
    zhText: "把常用 Prompt 放进右键菜单，支持选区等占位符，适合重复工作流。",
    enText: "Put repeated prompts into the right-click menu, with placeholders for selected text and similar workflows.",
    visual: "templates"
  }
] as const;

const howSteps = [
  {
    zhTitle: "选中文字",
    enTitle: "Select text",
    zhText: "在任意网页上划选你想处理的内容，工具栏立即就地浮出。",
    enText: "Highlight text on a page. The toolbar appears near the selection."
  },
  {
    zhTitle: "选个动作",
    enTitle: "Pick an action",
    zhText: "解释、翻译、润色、总结，或直接发给 AI 自由提问。",
    enText: "Explain, translate, refine, summarize, or ask AI directly."
  },
  {
    zhTitle: "就地拿到答案",
    enTitle: "Answer in place",
    zhText: "结果浮在原文旁，支持复制、保存或继续追问，不必离开当前页面。",
    enText: "The answer appears beside the source, with copy, save, and follow-up controls."
  }
] as const;

const privacyItems = [
  {
    icon: "key",
    zhTitle: "API Key 保存在本地浏览器",
    enTitle: "API keys are stored in the local browser",
    zhText: "用于直连用户选择的 provider；模型账号由用户自己的 provider 账户提供。",
    enText: "Used to connect directly to the provider you choose, using your own provider account."
  },
  {
    icon: "shield",
    zhTitle: "当前无自建后端、无遥测、无分析 SDK",
    enTitle: "No first-party backend, telemetry, or analytics SDK",
    zhText: "官网文案只说明当前内部试用版的实现边界，不承诺项目方中转或远端记录。",
    enText: "The site states the current internal dogfood boundary, with no project relay or remote logging promised."
  },
  {
    icon: "model",
    zhTitle: "provider 条款决定远端处理规则",
    enTitle: "Provider terms decide remote data handling",
    zhText: "用户主动触发 AI 操作时，请求内容会发送给用户选择的 provider。",
    enText: "When you trigger an AI action, request content is sent to the provider you selected."
  }
] as const;

const modelItems = [
  {
    badge: "C",
    tone: "sage",
    zhTitle: "Claude",
    enTitle: "Claude",
    zhText: "Sonnet · Opus",
    enText: "Sonnet · Opus"
  },
  {
    badge: "G",
    tone: "ink",
    zhTitle: "ChatGPT",
    enTitle: "ChatGPT",
    zhText: "4o · o-series",
    enText: "4o · o-series"
  },
  {
    badge: "豆",
    tone: "warm",
    zhTitle: "豆包",
    enTitle: "Doubao",
    zhText: "火山方舟 ARK",
    enText: "Volcengine Ark"
  }
] as const;

const faqs = [
  {
    zhQ: "当前怎么安装？",
    enQ: "How do I install it now?",
    zhA: "Aviso 当前是 v0.1 internal dogfood，安装入口会进入内部试用加载说明。",
    enA:
      "Aviso is currently v0.1 internal dogfood. The install entry opens the internal loading guide."
  },
  {
    zhQ: "使用前需要准备什么？",
    enQ: "What do I need before using it?",
    zhA: "内部试用需要可加载的扩展构建目录，以及你自己选择的 provider API Key。",
    enA:
      "Internal dogfood requires a loadable extension build and your own provider API key."
  },
  {
    zhQ: "请求会经过 Aviso 服务器吗？",
    enQ: "Do requests go through an Aviso server?",
    zhA: "用户主动触发 AI 操作时，请求会从浏览器扩展直接发送给所选 provider。",
    enA:
      "When you trigger an AI action, the request goes directly from the browser extension to the selected provider."
  },
  {
    zhQ: "哪些 provider 已经完成验证？",
    enQ: "Which providers have completed validation?",
    zhA: "豆包 / 火山方舟路径已有用户可用反馈；OpenAI / Anthropic 因当前没有可用 API Key，真实最小调用暂缓验收。",
    enA:
      "The Doubao / Volcengine Ark path has user feedback. OpenAI / Anthropic minimum live validation is deferred because no usable API key is currently available."
  },
  {
    zhQ: "网页内容如何处理？",
    enQ: "How does it handle page content?",
    zhA: "当前产品只在用户主动触发时处理必要上下文，并使用已批准的 provider host permissions。",
    enA:
      "The current product processes the needed context only when the user triggers an action and uses the approved provider host permissions."
  }
] as const;

function Mark({className = ""}: {className?: string}): JSX.Element {
  return <img className={className} src={useBaseUrl("/img/aviso-mark-sage.svg")} alt="" aria-hidden="true" />;
}

function Icon({name, className = ""}: {name: IconName; className?: string}): JSX.Element {
  const common = {
    className: `avIcon ${className}`.trim(),
    viewBox: "0 0 24 24",
    fill: "none",
    "aria-hidden": true
  } as const;

  const strokeProps = {
    stroke: "currentColor",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 1.8
  } as const;

  switch (name) {
    case "bookmark":
      return (
        <svg {...common}>
          <path {...strokeProps} d="M7 4.5h10a1.5 1.5 0 0 1 1.5 1.5v15l-6.5-3.4L5.5 21V6A1.5 1.5 0 0 1 7 4.5Z" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <path {...strokeProps} d="m5 12.5 4 4L19 7" />
        </svg>
      );
    case "close":
      return (
        <svg {...common}>
          <path {...strokeProps} d="m7 7 10 10M17 7 7 17" />
        </svg>
      );
    case "command":
      return (
        <svg {...common}>
          <path {...strokeProps} d="M9 9H6.5A2.5 2.5 0 1 1 9 6.5V9Zm0 0h6m0 0h2.5A2.5 2.5 0 1 0 15 6.5V9Zm0 0v6m0 0v2.5A2.5 2.5 0 1 0 17.5 15H15Zm0 0H9m0 0H6.5A2.5 2.5 0 1 1 9 17.5V15Zm0 0V9" />
        </svg>
      );
    case "copy":
      return (
        <svg {...common}>
          <rect {...strokeProps} x="8" y="8" width="11" height="11" rx="2" />
          <path {...strokeProps} d="M5 15V6.8C5 5.8 5.8 5 6.8 5H15" />
        </svg>
      );
    case "history":
      return (
        <svg {...common}>
          <path {...strokeProps} d="M5 6v5h5" />
          <path {...strokeProps} d="M5.8 11A7 7 0 1 0 8 6.1" />
          <path {...strokeProps} d="M12 8v4l3 2" />
        </svg>
      );
    case "key":
      return (
        <svg {...common}>
          <circle {...strokeProps} cx="8" cy="14" r="3.3" />
          <path {...strokeProps} d="M11 12.5 20 3.5m-4 4 2.4 2.4M14 9.5l2 2" />
        </svg>
      );
    case "model":
      return (
        <svg {...common}>
          <rect {...strokeProps} x="5" y="5" width="14" height="14" rx="3" />
          <path {...strokeProps} d="M9 9h6v6H9zM9 2v3m6-3v3M9 19v3m6-3v3M2 9h3m-3 6h3m14-6h3m-3 6h3" />
        </svg>
      );
    case "more":
      return (
        <svg {...common}>
          <circle cx="6" cy="12" r="1.6" fill="currentColor" />
          <circle cx="12" cy="12" r="1.6" fill="currentColor" />
          <circle cx="18" cy="12" r="1.6" fill="currentColor" />
        </svg>
      );
    case "refine":
      return (
        <svg {...common}>
          <path {...strokeProps} d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z" />
          <path {...strokeProps} d="m14.5 6.5 3 3" />
        </svg>
      );
    case "save":
      return (
        <svg {...common}>
          <path {...strokeProps} d="M6 4.5h12l1.5 1.7v13.3h-15v-15Z" />
          <path {...strokeProps} d="M8 4.5v6h8v-6M8 19v-5h8v5" />
        </svg>
      );
    case "send":
      return (
        <svg {...common}>
          <path {...strokeProps} d="M4 12 20 4l-5.2 16-3-6.8L4 12Z" />
          <path {...strokeProps} d="m11.8 13.2 4.8-4.8" />
        </svg>
      );
    case "shield":
      return (
        <svg {...common}>
          <path {...strokeProps} d="M12 3.5 19 6v5.4c0 4.1-2.5 6.9-7 8.6-4.5-1.7-7-4.5-7-8.6V6l7-2.5Z" />
          <path {...strokeProps} d="m8.8 12.2 2.2 2.2 5-5.2" />
        </svg>
      );
    case "spark":
      return (
        <svg {...common}>
          <path {...strokeProps} d="M12 3.5 14 9l5.5 2-5.5 2-2 5.5-2-5.5-5.5-2L10 9l2-5.5Z" />
        </svg>
      );
    case "summary":
      return (
        <svg {...common}>
          <path {...strokeProps} d="M6 6h12M6 10h12M6 14h8M6 18h5" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle {...strokeProps} cx="12" cy="12" r="7" />
        </svg>
      );
  }
}

function FeatureVisual({kind, lang}: {kind: string; lang: Lang}): JSX.Element {
  if (kind === "toolbar") {
    return (
      <div className="miniToolbar" aria-hidden="true">
        <span className="miniToolbarBrand">
          <Mark />
        </span>
        <span className="miniSep" />
        <span className="miniTool"><Icon name="spark" />{lang === "zh" ? "解释" : "Explain"}</span>
        <span className="miniTool"><Icon name="refine" />{lang === "zh" ? "润色" : "Refine"}</span>
        <span className="miniSep" />
        <span className="miniTool primary"><Icon name="send" />{lang === "zh" ? "发给 AI" : "Ask AI"}</span>
      </div>
    );
  }

  if (kind === "command") {
    return (
      <div className="miniCommand" aria-hidden="true">
        <div className="miniCommandInput"><Mark />{lang === "zh" ? "搜索浏览历史、书签，或发问 AI…" : "Search browsing history, bookmarks, or ask AI…"}</div>
        <div className="miniCommandRow selected"><Icon name="history" />{lang === "zh" ? "总结：产品试用反馈" : "Summary: product dogfood notes"}<span>{lang === "zh" ? "历史" : "History"}</span></div>
        <div className="miniCommandRow"><Icon name="bookmark" />{lang === "zh" ? "隐私政策" : "Privacy policy"}<span>{lang === "zh" ? "书签" : "Mark"}</span></div>
      </div>
    );
  }

  if (kind === "context") {
    return (
      <div className="miniContext" aria-hidden="true">
        <span><Icon name="copy" />{lang === "zh" ? "复制" : "Copy"}</span>
        <i />
        <span className="aviso"><Mark />{lang === "zh" ? "解释所选" : "Explain selection"}</span>
        <span className="aviso"><Icon name="send" />{lang === "zh" ? "发给 Aviso" : "Send to Aviso"}</span>
      </div>
    );
  }

  if (kind === "nudge") {
    return (
      <div className="miniNudge" aria-hidden="true">
        <Mark />
        <span><b>{lang === "zh" ? "已复制一段文字" : "Text copied"}</b><small>{lang === "zh" ? "需要翻译吗？" : "Translate it?"}</small></span>
        <em>{lang === "zh" ? "翻译" : "Translate"}</em>
      </div>
    );
  }

  return (
    <div className="miniTemplates" aria-hidden="true">
      <span><Icon name="refine" />{lang === "zh" ? "改写得更专业" : "Rewrite professionally"}</span>
      <span><Icon name="summary" />{lang === "zh" ? "三句话总结本页" : "Summarize page in three lines"}</span>
    </div>
  );
}

export default function Home(): JSX.Element {
  const [lang, setLang] = useState<Lang>("zh");
  const [openFaq, setOpenFaq] = useState(0);
  const [navbarTools, setNavbarTools] = useState<HTMLElement | null>(null);
  const t = copy[lang];
  const scrollToDemo = () => {
    document.getElementById("demo")?.scrollIntoView({behavior: "smooth", block: "center"});
  };

  useEffect(() => {
    const syncNavbarTools = () => {
      setNavbarTools(document.querySelector(".navbar__items--right"));
    };

    syncNavbarTools();

    const root = document.getElementById("__docusaurus");
    if (!root) {
      return;
    }

    const observer = new MutationObserver(syncNavbarTools);
    observer.observe(root, {childList: true, subtree: true});
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("section") !== "features") {
      return;
    }
    window.requestAnimationFrame(() => {
      document.getElementById("features")?.scrollIntoView({block: "start"});
    });
  }, []);

  useEffect(() => {
    const labels = navLabels[lang];
    const htmlLang = lang === "zh" ? "zh-Hans" : "en";
    const setNavText = (selector: string, label: string) => {
      document.querySelectorAll<HTMLAnchorElement>(selector).forEach((link) => {
        if (link.textContent !== label) {
          link.textContent = label;
        }
      });
    };

    const applyNavbarLanguage = () => {
      if (document.documentElement.getAttribute("lang") !== htmlLang) {
        document.documentElement.setAttribute("lang", htmlLang);
      }
      setNavText(".navbar a[href='/?section=features'], .navbar-sidebar a[href='/?section=features']", labels.features);
      setNavText(".navbar a[href='/docs/privacy-policy/'], .navbar-sidebar a[href='/docs/privacy-policy/']", labels.privacy);
      setNavText(".navbar a[href='/docs/intro/'], .navbar-sidebar a[href='/docs/intro/']", labels.docs);
      setNavText(".navbar a[href='/docs/install/'].navbar-cta, .navbar-sidebar a[href='/docs/install/'].navbar-cta", labels.install);
    };

    applyNavbarLanguage();

    const root = document.getElementById("__docusaurus");
    if (!root) {
      return;
    }

    const observer = new MutationObserver(applyNavbarLanguage);
    observer.observe(root, {childList: true, subtree: true});
    const langObserver = new MutationObserver(applyNavbarLanguage);
    langObserver.observe(document.documentElement, {attributeFilter: ["lang"], attributes: true});
    return () => {
      observer.disconnect();
      langObserver.disconnect();
    };
  }, [lang]);

  const languageToggle = (
    <div className="avNavbarLangSlot navbar__item" aria-label={t.langLabel}>
      <div className="avLangToggle">
        <button
          type="button"
          aria-pressed={lang === "zh"}
          className={lang === "zh" ? "active" : ""}
          onClick={() => setLang("zh")}
        >
          中
        </button>
        <button
          type="button"
          aria-pressed={lang === "en"}
          className={lang === "en" ? "active" : ""}
          onClick={() => setLang("en")}
        >
          EN
        </button>
      </div>
    </div>
  );

  return (
    <Layout title="Aviso" description={t.pageDescription}>
      {navbarTools ? createPortal(languageToggle, navbarTools) : null}
      <main className="avLanding" lang={lang}>
        <section className="avHero" id="top">
          <div className="avWrap">
            <span className="avEyebrow">
              <Mark />
              {t.eyebrow}
            </span>
            <h1>
              {t.titlePrefix} <em>{t.titleEmphasis}</em>
            </h1>
            <p className="avHeroSub">{t.subtitle}</p>
            <div className="avCtaRow" aria-label={lang === "zh" ? "首页主要操作" : "Primary actions"}>
              <Link className="avBtn avBtnPrimary avBtnLarge" to="/docs/install/">
                <Mark />
                {t.install}
              </Link>
              <button type="button" className="avBtn avBtnGhost avBtnLarge" onClick={scrollToDemo}>
                {t.demo}
              </button>
            </div>
            <p className="avMicro">
              <Icon name="shield" />
              {t.micro}
            </p>

            <div className="avBrowserScale" id="demo">
              <div className="avBrowser" aria-label={lang === "zh" ? "Aviso 页面内浮窗效果示意" : "Aviso in-page floating window mockup"}>
                <div className="avBrowserBar">
                  <span className="avBrowserDots" aria-hidden="true"><i /><i /><i /></span>
                  <span className="avBrowserUrl"><Icon name="shield" />react.dev/learn/synchronizing-with-effects</span>
                  <span className="avBrowserExt"><Mark /></span>
                </div>
                <div className="avBrowserPage">
                  <article className="avMockDoc">
                    <p className="avMockKick">{t.mockDocLabel}</p>
                    <h2>{t.mockDocTitle}</h2>
                    <p>{t.mockDocP1}</p>
                    <p><span>{t.mockHighlight}</span></p>
                    <p>{t.mockDocP3}</p>
                  </article>
                  <aside className="avResultWindow">
                    <div className="avWinHead">
                      <Mark />
                      <strong>Aviso</strong>
                      <span>{t.mockMode}</span>
                      <button type="button" aria-label={t.close}><Icon name="close" /></button>
                    </div>
                    <div className="avWinBody">
                      <div className="avUserLine">
                        <Icon name="spark" />
                        <span>{t.mockAction}</span>
                        <b>{t.mockQuestion}</b>
                      </div>
                      <p><strong>{lang === "zh" ? "清理函数" : "Cleanup function"}</strong>{lang === "zh" ? "：" : ": "}{t.mockAnswer1}</p>
                      <p>{t.mockAnswer2}</p>
                    </div>
                    <div className="avWinActions">
                      <span><Icon name="copy" />{t.copied}</span>
                      <span><Icon name="save" />{t.saved}</span>
                      <i />
                      <span className="muted"><Icon name="close" />{t.close}</span>
                    </div>
                  </aside>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="avTrust" aria-label={t.trustLabel}>
          <div className="avWrap">
            <p>{t.trustLabel}</p>
            <div>
              {trustItems.map((item) => (
                <span key={item.zh}>{item[lang]}</span>
              ))}
            </div>
          </div>
        </section>

        <section className="avBlock" id="why">
          <div className="avWrap">
            <p className="avSectionTag">{t.whyTag}</p>
            <h2 className="avSectionTitle">{t.whyTitle}</h2>
            <div className="avProblemGrid">
              <article className="avProblemCard bad">
                <h3><Icon name="close" />{t.without}</h3>
                <ol>
                  {t.badSteps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
                <p>{t.badFoot}</p>
              </article>
              <article className="avProblemCard good">
                <h3><Icon name="check" />{t.with}</h3>
                <ol>
                  {t.goodSteps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
                <p>{t.goodFoot}</p>
              </article>
            </div>
          </div>
        </section>

        <section className="avBlock" id="features">
          <div className="avWrap">
            <p className="avSectionTag">{t.featureTag}</p>
            <h2 className="avSectionTitle">{t.featureTitle}</h2>
            <p className="avSectionLead">{t.featureLead}</p>
            <div className="avFeatureGrid">
              {features.map((feature) => (
                <article className={`avFeature ${feature.wide ? "wide" : ""}`} key={feature.zhTitle}>
                  <span className="avFeatureIcon"><Icon name={feature.icon} /></span>
                  <h3>{lang === "zh" ? feature.zhTitle : feature.enTitle}</h3>
                  <p>{lang === "zh" ? feature.zhText : feature.enText}</p>
                  <FeatureVisual kind={feature.visual} lang={lang} />
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="avBlock avHow" id="how">
          <div className="avWrap">
            <p className="avSectionTag">{t.howTag}</p>
            <h2 className="avSectionTitle">{t.howTitle}</h2>
            <div className="avSteps">
              {howSteps.map((step) => (
                <article key={step.zhTitle}>
                  <div className="avStepBar" />
                  <h3>{lang === "zh" ? step.zhTitle : step.enTitle}</h3>
                  <p>{lang === "zh" ? step.zhText : step.enText}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="avPrivacy" id="privacy">
          <Mark className="avPrivacyWatermark" />
          <div className="avWrap avPrivacyInner">
            <div>
              <p className="avSectionTag">{t.privacyTag}</p>
              <h2>
                {t.privacyTitlePrefix}
                <em>{t.privacyTitleEmphasis}</em>
              </h2>
              <p className="avPrivacyLead">{t.privacyLead}</p>
              <ul className="avPrivacyList">
                {privacyItems.map((item) => (
                  <li key={item.zhTitle}>
                    <span><Icon name={item.icon} /></span>
                    <div>
                      <b>{lang === "zh" ? item.zhTitle : item.enTitle}</b>
                      <p>{lang === "zh" ? item.zhText : item.enText}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <aside className="avPrivacyCard">
              <div className="avPrivacyCardHead">
                <Icon name="key" />
                <span>{lang === "zh" ? "API Key · 本地浏览器" : "API keys · local browser"}</span>
                <b>{lang === "zh" ? "直连 provider" : "Direct provider"}</b>
              </div>
              <div className="avKeyRow"><Icon name="model" /><span>{lang === "zh" ? "用户选择 provider" : "User-selected provider"}</span><i /></div>
              <div className="avKeyRow"><Icon name="shield" /><span>{lang === "zh" ? "无 Aviso 自建后端" : "No Aviso-operated backend"}</span><i /></div>
              <div className="avKeyRow"><Icon name="key" /><code>sk-••••••••••••</code></div>
              <p><Icon name="shield" />{lang === "zh" ? "本地保存 · 主动触发后直连所选 provider" : "Local storage · direct request to selected provider after user action"}</p>
            </aside>
          </div>
          <div className="avWrap">
            <p className="avPrivacyResearch">{t.privacyResearch}</p>
            <div className="avMetrics">
              <div><b>{lang === "zh" ? "无" : "No"}</b><span>{lang === "zh" ? "自建后端" : "first-party backend"}</span></div>
              <div><b>{lang === "zh" ? "无" : "No"}</b><span>{lang === "zh" ? "遥测与分析 SDK" : "telemetry or analytics SDK"}</span></div>
              <div><b>{lang === "zh" ? "以条款为准" : "Terms apply"}</b><span>{lang === "zh" ? "provider 远端处理" : "provider-side handling"}</span></div>
            </div>
            <Link className="avPrivacyLink" to="/docs/privacy-policy/">{t.privacyCta}</Link>
          </div>
        </section>

        <section className="avBlock" id="models">
          <div className="avWrap">
            <p className="avSectionTag">{t.modelTag}</p>
            <h2 className="avSectionTitle">{t.modelTitle}</h2>
            <p className="avSectionLead">{t.modelLead}</p>
            <div className="avModels">
              {modelItems.map((item) => (
                <article key={item.zhTitle} className={`tone-${item.tone}`}>
                  <span>{item.badge}</span>
                  <div>
                    <h3>{lang === "zh" ? item.zhTitle : item.enTitle}</h3>
                    <p>{lang === "zh" ? item.zhText : item.enText}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="avBlock" id="faq">
          <div className="avWrap">
            <p className="avSectionTag">{t.faqTag}</p>
            <h2 className="avSectionTitle">{t.faqTitle}</h2>
            <div className="avFaq">
              {faqs.map((faq, index) => (
                <article className={openFaq === index ? "open" : ""} key={faq.zhQ}>
                  <button type="button" onClick={() => setOpenFaq(openFaq === index ? -1 : index)}>
                    <span>{lang === "zh" ? faq.zhQ : faq.enQ}</span>
                    <i />
                  </button>
                  <div>
                    <p>{lang === "zh" ? faq.zhA : faq.enA}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="avFinal" id="install">
          <div className="avWrap">
            <Mark className="avFinalMark" />
            <h2>{t.finalTitle}</h2>
            <p>{t.finalLead}</p>
            <div className="avCtaRow">
              <Link className="avBtn avBtnPrimary avBtnLarge" to="/docs/install/">
                <Mark />
                {t.install}
              </Link>
              <Link className="avBtn avBtnGhost avBtnLarge" to="/docs/intro/">
                {t.docsCta}
              </Link>
            </div>
            <div className="avFinalBadges">
              <span><Icon name="shield" />internal dogfood</span>
              <span><Icon name="check" />{lang === "zh" ? "无自建后端" : "No first-party backend"}</span>
              <span><Icon name="key" />{lang === "zh" ? "API Key 本地保存" : "Local API key storage"}</span>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
