import { useEffect, useMemo, useState } from "react"

import type { Settings } from "~types/history"

export type UiLanguageSetting = "auto" | "zh-CN" | "en"
export type ResolvedUiLanguage = Exclude<UiLanguageSetting, "auto">

export const DEFAULT_UI_LANGUAGE: UiLanguageSetting = "auto"

export function normalizeUiLanguageSetting(value: unknown): UiLanguageSetting {
  return value === "zh-CN" || value === "en" || value === "auto"
    ? value
    : DEFAULT_UI_LANGUAGE
}

export function resolveUiLanguage(
  setting: unknown,
  chromeUiLanguage = getChromeUiLanguage()
): ResolvedUiLanguage {
  const normalized = normalizeUiLanguageSetting(setting)
  if (normalized === "zh-CN" || normalized === "en") return normalized

  return /^zh\b|^zh[-_]/i.test(chromeUiLanguage) ? "zh-CN" : "en"
}

export function getChromeUiLanguage(): string {
  try {
    const chromeLanguage = chrome?.i18n?.getUILanguage?.()
    if (chromeLanguage) return chromeLanguage
  } catch {
    // Fall back to navigator below when Chrome i18n is unavailable in tests.
  }

  if (typeof navigator !== "undefined") {
    return navigator.language || navigator.languages?.[0] || "en"
  }

  return "en"
}

export function resolveSettingsUiLanguage(
  settings?: Partial<Settings> | null
): ResolvedUiLanguage {
  return resolveUiLanguage(settings?.uiLanguage)
}

const MESSAGES = {
  "app.name": {
    "zh-CN": "Aviso",
    en: "Aviso"
  },
  "app.description": {
    "zh-CN": "智能浏览器助手，感知操作对象，就地调用 AI，浮窗展示结果。",
    en: "An AI browser assistant for explaining, translating, polishing, and summarizing content in place."
  },
  "command.openPalette": {
    "zh-CN": "打开命令面板",
    en: "Open command palette"
  },
  "settings.language.auto": {
    "zh-CN": "自动",
    en: "Auto"
  },
  "settings.language.zh": {
    "zh-CN": "中文",
    en: "中文"
  },
  "settings.language.en": {
    "zh-CN": "English",
    en: "English"
  },
  "popup.tabs.general": {
    "zh-CN": "设置",
    en: "Settings"
  },
  "popup.tabs.api": {
    "zh-CN": "AI 服务",
    en: "AI services"
  },
  "popup.tabs.history": {
    "zh-CN": "记录",
    en: "History"
  },
  "popup.tabs.templates": {
    "zh-CN": "指令",
    en: "Prompts"
  },
  "popup.language.title": {
    "zh-CN": "界面语言",
    en: "Interface language"
  },
  "popup.language.helper": {
    "zh-CN": "只改变 Aviso 界面，不影响翻译目标语言",
    en: "Changes Aviso UI only, not translation output"
  },
  "popup.theme.light": {
    "zh-CN": "浅色模式",
    en: "Light"
  },
  "popup.theme.dark": {
    "zh-CN": "深色模式",
    en: "Dark"
  },
  "popup.theme.system": {
    "zh-CN": "跟随系统",
    en: "System"
  },
  "popup.theme.aria": {
    "zh-CN": "Popup 主题",
    en: "Popup theme"
  },
  "popup.currentModel": {
    "zh-CN": "当前模型",
    en: "Current model"
  },
  "popup.status.ready": {
    "zh-CN": "可用",
    en: "Ready"
  },
  "popup.status.check": {
    "zh-CN": "检查",
    en: "Check"
  },
  "popup.status.unconfigured": {
    "zh-CN": "未配置",
    en: "Not set"
  },
  "popup.testCurrentModel": {
    "zh-CN": "测试当前模型",
    en: "Test current model"
  },
  "popup.defaultModelAria": {
    "zh-CN": "默认 AI 模型选择",
    en: "Default AI model"
  },
  "popup.noAiService": {
    "zh-CN": "尚未配置 AI 服务",
    en: "No AI service configured"
  },
  "popup.addAiService": {
    "zh-CN": "添加 AI 服务",
    en: "Add AI service"
  },
  "popup.providerList": {
    "zh-CN": "OpenAI、Anthropic、豆包",
    en: "OpenAI, Anthropic, Doubao"
  },
  "popup.configure": {
    "zh-CN": "配置",
    en: "Configure"
  },
  "popup.currentModelHelp": {
    "zh-CN":
      "AI 动作用当前模型；复制上下文、搜索记录、恢复对话等本地动作不受影响。",
    en: "AI actions use this model. Local actions such as copy context, search, and restore are not affected."
  },
  "popup.commonFeatures": {
    "zh-CN": "常用功能",
    en: "Common features"
  },
  "popup.translationTargetPrefix": {
    "zh-CN": "选中文字译为 ",
    en: "Translate selection to "
  },
  "popup.translationTargetAria": {
    "zh-CN": "划词翻译目标语言",
    en: "Selection translation target language"
  },
  "popup.localAvailable": {
    "zh-CN": "本地可用",
    en: "Local actions"
  },
  "popup.restoreHint": {
    "zh-CN": "点击任一记录可恢复到当前网页。",
    en: "Click any record to restore it on the current page."
  },
  "popup.features.selection": {
    "zh-CN": "划词工具栏",
    en: "Selection toolbar"
  },
  "popup.features.selectionHelper": {
    "zh-CN": "选中后显示解释、翻译、润色",
    en: "Show actions after selecting text"
  },
  "popup.features.translation": {
    "zh-CN": "划词翻译",
    en: "Selection translation"
  },
  "popup.features.translationHelper": {
    "zh-CN": "选中文字后自动显示短翻译",
    en: "Show short translations after selecting text"
  },
  "popup.features.command": {
    "zh-CN": "命令面板",
    en: "Command palette"
  },
  "popup.features.commandHelper": {
    "zh-CN": "搜索记录、复制上下文、直接发问",
    en: "Search history and ask AI directly"
  },
  "popup.features.clipboard": {
    "zh-CN": "剪贴板提示",
    en: "Clipboard prompt"
  },
  "popup.features.clipboardHelper": {
    "zh-CN": "复制内容后提醒可用操作",
    en: "Offer actions after copying text"
  },
  "popup.features.doubleClick": {
    "zh-CN": "双击入口",
    en: "Double-click menu"
  },
  "popup.features.doubleClickHelper": {
    "zh-CN": "在安全文本区域双击打开快捷菜单",
    en: "Open quick actions from safe text areas"
  },
  "popup.local.copy": {
    "zh-CN": "复制上下文",
    en: "Copy context"
  },
  "popup.local.copyHelper": {
    "zh-CN": "复制当前页",
    en: "Copy current page"
  },
  "popup.local.search": {
    "zh-CN": "搜索记录",
    en: "Search records"
  },
  "popup.local.searchHelper": {
    "zh-CN": "打开命令面板",
    en: "Open command palette"
  },
  "popup.local.restore": {
    "zh-CN": "恢复对话",
    en: "Restore chats"
  },
  "popup.local.restoreHelper": {
    "zh-CN": "打开记录",
    en: "Open history"
  },
  "popup.model.gpt4oMini": {
    "zh-CN": "GPT-4o mini（推荐，速度快）",
    en: "GPT-4o mini (recommended, fast)"
  },
  "popup.model.gpt4o": {
    "zh-CN": "GPT-4o（更强）",
    en: "GPT-4o (more capable)"
  },
  "popup.model.claudeHaiku": {
    "zh-CN": "Claude Haiku（轻量）",
    en: "Claude Haiku (lightweight)"
  },
  "popup.model.claudeSonnet": {
    "zh-CN": "Claude Sonnet（更强）",
    en: "Claude Sonnet (more capable)"
  },
  "popup.model.doubao": {
    "zh-CN": "豆包（火山方舟）",
    en: "Doubao (Volcano Ark)"
  },
  "popup.provider.openai": {
    "zh-CN": "OpenAI",
    en: "OpenAI"
  },
  "popup.provider.anthropic": {
    "zh-CN": "Anthropic",
    en: "Anthropic"
  },
  "popup.provider.doubao": {
    "zh-CN": "豆包 / 火山引擎",
    en: "Doubao / Volcano Engine"
  },
  "popup.provider.deepseek": {
    "zh-CN": "DeepSeek",
    en: "DeepSeek"
  },
  "popup.provider.moonshot": {
    "zh-CN": "Kimi / Moonshot",
    en: "Kimi / Moonshot"
  },
  "popup.provider.openrouter": {
    "zh-CN": "OpenRouter",
    en: "OpenRouter"
  },
  "popup.provider.gemini": {
    "zh-CN": "Gemini",
    en: "Gemini"
  },
  "popup.provider.hunyuan": {
    "zh-CN": "腾讯混元",
    en: "Tencent Hunyuan"
  },
  "popup.provider.openaiKey": {
    "zh-CN": "OpenAI API Key",
    en: "OpenAI API key"
  },
  "popup.provider.anthropicKey": {
    "zh-CN": "Anthropic API Key",
    en: "Anthropic API key"
  },
  "popup.provider.doubaoKey": {
    "zh-CN": "豆包 / 火山引擎 API Key",
    en: "Doubao / Volcano Engine API key"
  },
  "popup.provider.deepseekKey": {
    "zh-CN": "DeepSeek API Key",
    en: "DeepSeek API key"
  },
  "popup.provider.moonshotKey": {
    "zh-CN": "Moonshot API Key",
    en: "Moonshot API key"
  },
  "popup.provider.openrouterKey": {
    "zh-CN": "OpenRouter API Key",
    en: "OpenRouter API key"
  },
  "popup.provider.geminiKey": {
    "zh-CN": "Gemini API Key",
    en: "Gemini API key"
  },
  "popup.provider.hunyuanKey": {
    "zh-CN": "腾讯混元 API Key",
    en: "Tencent Hunyuan API key"
  },
  "popup.provider.openaiKeyPlaceholder": {
    "zh-CN": "sk-...",
    en: "sk-..."
  },
  "popup.provider.anthropicKeyPlaceholder": {
    "zh-CN": "sk-ant-...",
    en: "sk-ant-..."
  },
  "popup.provider.doubaoKeyPlaceholder": {
    "zh-CN": "火山方舟控制台获取",
    en: "From the Volcano Ark console"
  },
  "popup.provider.deepseekKeyPlaceholder": {
    "zh-CN": "DeepSeek 控制台获取",
    en: "From the DeepSeek console"
  },
  "popup.provider.moonshotKeyPlaceholder": {
    "zh-CN": "Moonshot 控制台获取",
    en: "From the Moonshot console"
  },
  "popup.provider.openrouterKeyPlaceholder": {
    "zh-CN": "OpenRouter 控制台获取",
    en: "From the OpenRouter console"
  },
  "popup.provider.geminiKeyPlaceholder": {
    "zh-CN": "Google AI Studio 获取",
    en: "From Google AI Studio"
  },
  "popup.provider.hunyuanKeyPlaceholder": {
    "zh-CN": "腾讯混元控制台获取",
    en: "From the Tencent Hunyuan console"
  },
  "popup.provider.modelLabel": {
    "zh-CN": "模型名称",
    en: "Model name"
  },
  "popup.provider.openaiModelPlaceholder": {
    "zh-CN": "gpt-4o-mini",
    en: "gpt-4o-mini"
  },
  "popup.provider.anthropicModelPlaceholder": {
    "zh-CN": "claude-haiku-4-5-20251001",
    en: "claude-haiku-4-5-20251001"
  },
  "popup.provider.doubaoEndpointLabel": {
    "zh-CN": "方舟接入点 ID",
    en: "Ark endpoint ID"
  },
  "popup.provider.doubaoEndpointPlaceholder": {
    "zh-CN": "ep-... 或 doubao-seed-2-0-lite",
    en: "ep-... or doubao-seed-2-0-lite"
  },
  "popup.provider.deepseekModelPlaceholder": {
    "zh-CN": "如：deepseek-chat",
    en: "e.g. deepseek-chat"
  },
  "popup.provider.moonshotModelPlaceholder": {
    "zh-CN": "如：moonshot-v1-8k",
    en: "e.g. moonshot-v1-8k"
  },
  "popup.provider.openrouterModelPlaceholder": {
    "zh-CN": "如：openai/gpt-4o-mini",
    en: "e.g. openai/gpt-4o-mini"
  },
  "popup.provider.geminiModelPlaceholder": {
    "zh-CN": "如：gemini-2.5-flash",
    en: "e.g. gemini-2.5-flash"
  },
  "popup.provider.hunyuanModelPlaceholder": {
    "zh-CN": "如：hunyuan-lite",
    en: "e.g. hunyuan-lite"
  },
  "popup.hint.historyRestricted": {
    "zh-CN": "请切换到普通网页后再打开历史",
    en: "Switch to a normal webpage before opening history."
  },
  "popup.hint.pageUnavailable": {
    "zh-CN": "当前页面无法打开，请刷新后再试",
    en: "This page cannot open Aviso. Refresh the page and try again."
  },
  "popup.hint.copyRestricted": {
    "zh-CN": "请切换到普通网页后再复制上下文",
    en: "Switch to a normal webpage before copying context."
  },
  "popup.hint.copySuccess": {
    "zh-CN": "已复制当前网页上下文",
    en: "Current page context copied."
  },
  "popup.hint.copyFailure": {
    "zh-CN": "当前页面无法复制，请刷新页面后再试",
    en: "This page cannot be copied. Refresh and try again."
  },
  "popup.hint.commandRestricted": {
    "zh-CN": "请切换到普通网页后再打开命令面板",
    en: "Switch to a normal webpage before opening the command palette."
  },
  "popup.hint.addingService": {
    "zh-CN": "正在新增 ",
    en: "Adding "
  },
  "popup.hint.editingService": {
    "zh-CN": "正在编辑 ",
    en: "Editing "
  },
  "popup.provider.saved": {
    "zh-CN": "配置草稿已保存，可继续编辑或测试连接。",
    en: "Configuration draft saved. You can keep editing or test the connection."
  },
  "popup.provider.restored": {
    "zh-CN": "已恢复到保存状态。",
    en: "Restored to the saved state."
  },
  "popup.provider.draftClosed": {
    "zh-CN": "已关闭新增草稿。",
    en: "New draft closed."
  },
  "popup.provider.deletedSuffix": {
    "zh-CN": " 配置已删除。",
    en: " configuration deleted."
  },
  "popup.provider.editing": {
    "zh-CN": "正在编辑，保存后生效。",
    en: "Editing. Save to apply changes."
  },
  "popup.provider.editingEndpoint": {
    "zh-CN": "正在编辑接入点，保存后生效。",
    en: "Editing endpoint. Save to apply changes."
  },
  "popup.provider.editingSavedDraft": {
    "zh-CN": "已配置，正在编辑保存前的草稿。",
    en: "Configured. Editing a draft before saving."
  },
  "popup.provider.newDraft": {
    "zh-CN": "新增配置未保存，填写后点击保存配置。",
    en: "New configuration is not saved. Fill it in, then save."
  },
  "popup.provider.apiKeyMissing": {
    "zh-CN": "请先填写并保存当前 AI 服务的 API Key。",
    en: "Enter and save the API key for this AI service first."
  },
  "popup.provider.endpointMissing": {
    "zh-CN": "请填写模型 ID 或接入点后再测试。",
    en: "Enter the model ID or endpoint before testing."
  },
  "popup.provider.testTimeout": {
    "zh-CN": "连接测试超时，请稍后重试。",
    en: "Connection test timed out. Try again later."
  },
  "popup.provider.testing": {
    "zh-CN": "正在测试连接...",
    en: "Testing connection..."
  },
  "popup.provider.testPassed": {
    "zh-CN": "连接测试通过。",
    en: "Connection test passed."
  },
  "popup.provider.testFailed": {
    "zh-CN": "连接测试未通过。",
    en: "Connection test failed."
  },
  "popup.provider.status.keyMissing": {
    "zh-CN": "未配置 Key",
    en: "Key missing"
  },
  "popup.provider.status.endpointMissing": {
    "zh-CN": "未配置接入点",
    en: "Endpoint missing"
  },
  "popup.provider.status.testing": {
    "zh-CN": "测试中",
    en: "Testing"
  },
  "popup.provider.status.lastPassed": {
    "zh-CN": "上次通过",
    en: "Last passed"
  },
  "popup.provider.status.lastFailed": {
    "zh-CN": "上次失败",
    en: "Last failed"
  },
  "popup.provider.status.untested": {
    "zh-CN": "未测试",
    en: "Untested"
  },
  "popup.provider.status.endpointRequired": {
    "zh-CN": "接入点缺失",
    en: "Endpoint required"
  },
  "popup.provider.status.recommendedTest": {
    "zh-CN": "建议测试",
    en: "Test recommended"
  },
  "popup.provider.status.default": {
    "zh-CN": "默认",
    en: "Default"
  },
  "popup.provider.status.adding": {
    "zh-CN": "新增中",
    en: "Adding"
  },
  "popup.provider.status.unsaved": {
    "zh-CN": "未保存",
    en: "Unsaved"
  },
  "popup.provider.status.editing": {
    "zh-CN": "编辑中",
    en: "Editing"
  },
  "popup.provider.config.waitingSave": {
    "zh-CN": "等待保存",
    en: "Waiting to save"
  },
  "popup.provider.config.savedReady": {
    "zh-CN": "Key 已保存 · 模型已填写",
    en: "Key saved · model filled"
  },
  "popup.provider.config.draftSaved": {
    "zh-CN": "草稿已保存 · 仍需配置",
    en: "Draft saved · configuration needed"
  },
  "popup.provider.config.savedEndpointMissing": {
    "zh-CN": "Key 已保存 · 接入点未填写",
    en: "Key saved · endpoint missing"
  },
  "popup.provider.config.unconfigured": {
    "zh-CN": "尚未配置",
    en: "Not configured"
  },
  "popup.provider.config.testingEllipsis": {
    "zh-CN": "测试中...",
    en: "Testing..."
  },
  "popup.service.title": {
    "zh-CN": "配置和连通测试",
    en: "Configuration and connection test"
  },
  "popup.service.helper": {
    "zh-CN":
      "在这里配置自己的 AI 服务。保存草稿不等于连接测试通过；API Key 只保存在本地浏览器，非密钥设置保存在同步设置中。",
    en: "Configure your own AI services here. Saving a draft does not mean the connection test passed. API keys stay in local browser storage; non-secret settings use sync storage."
  },
  "popup.account.manage": {
    "zh-CN": "在 AI 服务中管理",
    en: "Manage in AI services"
  },
  "popup.zero.title": {
    "zh-CN": "开始使用 Aviso",
    en: "Get started with Aviso"
  },
  "popup.zero.subtitle": {
    "zh-CN": "选择一种方式启用 AI",
    en: "Choose how to enable AI"
  },
  "popup.zero.recommended": {
    "zh-CN": "推荐",
    en: "Recommended"
  },
  "popup.zero.hosted.desc": {
    "zh-CN": "登录后可使用免费额度，无需自己的 Key",
    en: "Sign in to use free quota — no key of your own needed"
  },
  "popup.zero.hosted.cta": {
    "zh-CN": "登录 / 注册",
    en: "Sign in / sign up"
  },
  "popup.zero.byok.title": {
    "zh-CN": "我自己的 API Key",
    en: "Your own API key"
  },
  "popup.zero.byok.badge": {
    "zh-CN": "BYOK",
    en: "BYOK"
  },
  "popup.zero.byok.desc": {
    "zh-CN": "连接 OpenAI · Claude · 豆包 等",
    en: "Connect OpenAI, Claude, Doubao, and more"
  },
  "popup.zero.byok.cta": {
    "zh-CN": "添加 AI 服务",
    en: "Add AI service"
  },
  "popup.hosted.title": {
    "zh-CN": "Aviso AI",
    en: "Aviso AI"
  },
  "popup.hosted.helper": {
    "zh-CN": "登录后可使用 Aviso 提供的 AI 能力；不影响你自己的 AI 服务配置。",
    en: "Sign in to use AI provided by Aviso. This does not affect your own AI service configuration."
  },
  "popup.hosted.optionHelper": {
    "zh-CN": "官方后端 · free-small",
    en: "Aviso backend · free-small"
  },
  "popup.hosted.localBackend": {
    "zh-CN": "后端",
    en: "Backend"
  },
  "popup.hosted.account": {
    "zh-CN": "账户",
    en: "Account"
  },
  "popup.hosted.account.none": {
    "zh-CN": "未连接",
    en: "Not connected"
  },
  "popup.hosted.tier": {
    "zh-CN": "账户层级",
    en: "Tier"
  },
  "popup.hosted.tier.free": {
    "zh-CN": "免费",
    en: "Free"
  },
  "popup.hosted.tier.paid": {
    "zh-CN": "付费",
    en: "Paid"
  },
  "popup.hosted.monthlyQuota": {
    "zh-CN": "月度额度",
    en: "Monthly quota"
  },
  "popup.hosted.dailyQuota": {
    "zh-CN": "每日额度",
    en: "Daily quota"
  },
  "popup.hosted.resetTiming": {
    "zh-CN": "重置时间",
    en: "Reset"
  },
  "popup.hosted.quota.tokens": {
    "zh-CN": "tokens",
    en: "tokens"
  },
  "popup.hosted.quota.unknown": {
    "zh-CN": "未知",
    en: "Unknown"
  },
  "popup.hosted.quota.unavailable": {
    "zh-CN": "不可用",
    en: "Unavailable"
  },
  "popup.hosted.latestStatus": {
    "zh-CN": "状态",
    en: "Status"
  },
  "popup.hosted.signIn": {
    "zh-CN": "登录",
    en: "Sign in"
  },
  "popup.hosted.signOut": {
    "zh-CN": "退出",
    en: "Sign out"
  },
  "popup.hosted.refresh": {
    "zh-CN": "刷新",
    en: "Refresh"
  },
  "popup.hosted.statusLabel.signed_out": {
    "zh-CN": "未登录",
    en: "Signed out"
  },
  "popup.hosted.statusLabel.signing_in": {
    "zh-CN": "处理中",
    en: "Working"
  },
  "popup.hosted.statusLabel.signed_in": {
    "zh-CN": "已登录",
    en: "Signed in"
  },
  "popup.hosted.statusLabel.expired": {
    "zh-CN": "已失效",
    en: "Expired"
  },
  "popup.hosted.statusLabel.local_backend_unavailable": {
    "zh-CN": "后端不可用",
    en: "Backend unavailable"
  },
  "popup.hosted.statusLabel.quota_exhausted": {
    "zh-CN": "额度暂不可用",
    en: "Quota unavailable"
  },
  "popup.hosted.statusLabel.rate_limited": {
    "zh-CN": "请稍后重试",
    en: "Retry later"
  },
  "popup.hosted.statusLabel.hosted_route_unavailable": {
    "zh-CN": "路线不可用",
    en: "Route unavailable"
  },
  "popup.hosted.statusLabel.request_invalid": {
    "zh-CN": "请求不可用",
    en: "Request unavailable"
  },
  "popup.hosted.status.signedOut": {
    "zh-CN": "Aviso AI 未登录；你仍可使用自己的 AI 服务。",
    en: "Aviso AI is signed out; your own AI services still work."
  },
  "popup.hosted.status.signingIn": {
    "zh-CN": "正在连接后端...",
    en: "Connecting to hosted backend..."
  },
  "popup.hosted.status.oauthCanceled": {
    "zh-CN": "托管登录已取消；你仍可使用自己的 AI 服务配置。",
    en: "Hosted sign-in was cancelled; your own AI service configuration still works."
  },
  "popup.hosted.status.oauthConfigMissing": {
    "zh-CN": "托管登录配置缺失；你仍可使用自己的 AI 服务配置。",
    en: "Hosted sign-in configuration is missing; your own AI service configuration still works."
  },
  "popup.hosted.status.oauthStateMismatch": {
    "zh-CN": "托管登录校验失败，请重试；你仍可使用自己的 AI 服务配置。",
    en: "Hosted sign-in validation failed. Retry; your own AI service configuration still works."
  },
  "popup.hosted.status.oauthUnavailable": {
    "zh-CN": "托管登录暂不可用；你仍可使用自己的 AI 服务配置。",
    en: "Hosted sign-in is unavailable; your own AI service configuration still works."
  },
  "popup.hosted.status.runtimeUnavailable": {
    "zh-CN": "扩展后台未响应，请在扩展程序页面重新加载 Aviso 后重试。",
    en: "Extension background did not respond. Reload Aviso on the extensions page and retry."
  },
  "popup.hosted.status.authBackendUnavailable": {
    "zh-CN": "授权窗口已打开，但后端换取 session 未完成；请稍后重试。",
    en: "Authorization opened, but the backend did not complete session exchange. Retry later."
  },
  "popup.hosted.status.authClientUnavailable": {
    "zh-CN": "托管后端配置不可用，请重新加载 Aviso 后重试。",
    en: "Hosted backend configuration is unavailable. Reload Aviso and retry."
  },
  "popup.hosted.status.authRejected": {
    "zh-CN": "后端未接受这次 Google 登录；请重试或检查 staging OAuth 配置。",
    en: "The backend did not accept this Google sign-in. Retry or check staging OAuth configuration."
  },
  "popup.hosted.status.accountReadFailed": {
    "zh-CN": "登录后读取账户状态失败；请稍后刷新。",
    en: "Signed in, but account status could not be read. Refresh later."
  },
  "popup.hosted.status.sessionSaveFailed": {
    "zh-CN": "登录成功但本地 session 保存失败；请重新加载扩展后重试。",
    en: "Sign-in succeeded, but local session could not be saved. Reload the extension and retry."
  },
  "popup.hosted.status.signedIn": {
    "zh-CN": "Aviso AI session 已保存。",
    en: "Aviso AI session saved."
  },
  "popup.hosted.status.refreshing": {
    "zh-CN": "正在刷新账户状态...",
    en: "Refreshing account status..."
  },
  "popup.hosted.status.refreshed": {
    "zh-CN": "账户状态已刷新。",
    en: "Account status refreshed."
  },
  "popup.hosted.status.expired": {
    "zh-CN": "托管 session 已失效，请重新登录。",
    en: "Hosted session expired. Sign in again."
  },
  "popup.hosted.status.local_backend_unavailable": {
    "zh-CN": "托管后端不可用，请稍后重试。",
    en: "Hosted backend unavailable. Retry later."
  },
  "popup.hosted.status.quota_exhausted": {
    "zh-CN": "托管额度暂不可用；你仍可使用自己的 AI 服务配置。",
    en: "Hosted quota is unavailable; your own AI service configuration still works."
  },
  "popup.hosted.status.rate_limited": {
    "zh-CN": "托管请求过于频繁，请稍后重试；你仍可使用自己的 AI 服务配置。",
    en: "Hosted requests are rate limited. Retry later; your own AI service configuration still works."
  },
  "popup.hosted.status.hosted_route_unavailable": {
    "zh-CN": "托管路线暂不可用；你仍可使用自己的 AI 服务配置。",
    en: "Hosted route is unavailable; your own AI service configuration still works."
  },
  "popup.hosted.status.request_invalid": {
    "zh-CN": "托管请求格式不可用，请检查联调配置。",
    en: "Hosted request format is unavailable. Check the integration configuration."
  },
  "popup.service.fastTitle": {
    "zh-CN": "快速任务服务",
    en: "Fast task service"
  },
  "popup.service.fastAria": {
    "zh-CN": "快速任务服务选择",
    en: "Fast task service selection"
  },
  "popup.service.fastDisabled": {
    "zh-CN": "不启用",
    en: "Off"
  },
  "popup.service.fastHelper": {
    "zh-CN": "仅用于短文本的翻译、解释、润色；未选择时不会自动切换模型。",
    en: "Used only for short translate, explain, and polish tasks. When off, Aviso will not switch models automatically."
  },
  "popup.service.configs": {
    "zh-CN": "服务配置",
    en: "Service configurations"
  },
  "popup.service.add": {
    "zh-CN": "添加",
    en: "Add"
  },
  "popup.service.addAria": {
    "zh-CN": "选择要添加的 AI 服务",
    en: "Choose an AI service to add"
  },
  "popup.service.empty": {
    "zh-CN": "暂无自己的 AI 服务配置。可继续使用 Aviso AI，或点击“添加”创建 BYOK 配置。",
    en: "No personal AI service configured. You can keep using Aviso AI, or click Add to create a BYOK configuration."
  },
  "popup.service.ready": {
    "zh-CN": "AI 服务可以使用",
    en: "AI service ready"
  },
  "popup.service.failed": {
    "zh-CN": "AI 服务连接失败",
    en: "AI service connection failed"
  },
  "popup.service.disconnected": {
    "zh-CN": "未连接 AI 服务",
    en: "AI service not connected"
  },
  "popup.service.currentUsing": {
    "zh-CN": "当前使用 ",
    en: "Currently using "
  },
  "popup.service.checkKeyNetwork": {
    "zh-CN": "Key、接入点或网络需要检查。",
    en: "Check the key, endpoint, or network."
  },
  "popup.service.connectFirst": {
    "zh-CN": "先连接一个自己的 AI 服务，再选择默认模型。",
    en: "Connect your own AI service first, then choose a default model."
  },
  "popup.service.routePrefix": {
    "zh-CN": "当前 AI 请求会使用你的 ",
    en: "AI requests currently use your "
  },
  "popup.service.confirmDelete": {
    "zh-CN": "确定删除",
    en: "Confirm delete"
  },
  "popup.service.testConnection": {
    "zh-CN": "测试连接",
    en: "Test connection"
  },
  "popup.service.saveConfig": {
    "zh-CN": "保存配置",
    en: "Save configuration"
  },
  "popup.service.cancelAdd": {
    "zh-CN": "取消添加",
    en: "Cancel add"
  },
  "popup.service.cancelEdit": {
    "zh-CN": "取消编辑",
    en: "Cancel edit"
  },
  "popup.service.deleteDraft": {
    "zh-CN": "删除草稿",
    en: "Delete draft"
  },
  "popup.service.deleteConfig": {
    "zh-CN": "删除配置",
    en: "Delete configuration"
  },
  "popup.service.delete": {
    "zh-CN": "删除",
    en: "Delete"
  },
  "popup.service.setDefault": {
    "zh-CN": "设为默认",
    en: "Set as default"
  },
  "popup.service.editConfig": {
    "zh-CN": "编辑配置",
    en: "Edit configuration"
  },
  "popup.service.namePlaceholder": {
    "zh-CN": "配置名称",
    en: "Configuration name"
  },
  "popup.service.nameAriaSuffix": {
    "zh-CN": " 配置名称",
    en: " configuration name"
  },
  "popup.service.modelHint": {
    "zh-CN": "手动填写模型 ID；Aviso 不会自动读取你的账号模型列表。",
    en: "Enter a model ID manually. Aviso does not fetch your account model list."
  },
  "popup.service.configStatus": {
    "zh-CN": "配置状态",
    en: "Configuration status"
  },
  "popup.service.testStatus": {
    "zh-CN": "测试状态",
    en: "Test status"
  },
  "popup.privacyBoundary.title": {
    "zh-CN": "隐私边界",
    en: "Privacy boundary"
  },
  "popup.privacyBoundary.helper": {
    "zh-CN":
      "Aviso 没有项目方服务器。你主动发起 AI 请求时，内容会由浏览器直接发送到你选择的模型厂商。",
    en: "Aviso has no project-owned server. When you start an AI request, the browser sends content directly to the model provider you choose."
  },
  "popup.privacy.full": {
    "zh-CN":
      "Aviso 不设项目方服务器，不收集或保存你的数据。API Key 经 AES-256 加密后仅存于本机；当你主动发起 AI 请求时，内容会由浏览器直连你选择的模型厂商，不经过 Aviso 中间服务器。历史记录与设置保存在浏览器本地存储中。",
    en: "Aviso has no project-owned server and does not collect or store your data. API keys are AES-256 encrypted and stored only on this device. When you start an AI request, the browser connects directly to the provider you choose, without an Aviso middle server. History and settings are stored in your browser."
  },
  "popup.footer.saved": {
    "zh-CN": "✓ 已保存",
    en: "✓ Saved"
  },
  "popup.footer.autoSave": {
    "zh-CN": "改动自动保存",
    en: "Changes save automatically"
  },
  "popup.footer.saveError": {
    "zh-CN": "保存失败，请稍后重试",
    en: "Save failed. Try again."
  },
  "popup.footer.privacy": {
    "zh-CN": "隐私说明",
    en: "Privacy"
  },
  "popup.templates.title": {
    "zh-CN": "常用指令",
    en: "Saved prompts"
  },
  "popup.templates.helper": {
    "zh-CN":
      "把常用的翻译、总结、润色要求保存起来，之后可以从命令面板或右键菜单直接使用。",
    en: "Save common translation, summary, and polishing instructions, then reuse them from the command palette or context menu."
  },
  "popup.templates.empty": {
    "zh-CN": "暂无常用指令，请点击下方添加。",
    en: "No saved prompts yet. Add one below."
  },
  "popup.templates.namePlaceholder": {
    "zh-CN": "指令名称",
    en: "Prompt name"
  },
  "popup.templates.promptPlaceholder": {
    "zh-CN": "指令内容，用 {{selection}} 引用选中文字",
    en: "Prompt content. Use {{selection}} for selected text."
  },
  "popup.templates.done": {
    "zh-CN": "完成",
    en: "Done"
  },
  "popup.templates.edit": {
    "zh-CN": "编辑",
    en: "Edit"
  },
  "popup.templates.delete": {
    "zh-CN": "删除",
    en: "Delete"
  },
  "popup.templates.add": {
    "zh-CN": "添加常用指令",
    en: "Add saved prompt"
  },
  "popup.templates.emptySummary": {
    "zh-CN": "未填写内容",
    en: "No content yet"
  },
  "popup.templates.context.selection": {
    "zh-CN": "选中文字",
    en: "Selection"
  },
  "popup.templates.context.link": {
    "zh-CN": "链接",
    en: "Link"
  },
  "popup.templates.context.image": {
    "zh-CN": "图片",
    en: "Image"
  },
  "popup.templates.context.editable": {
    "zh-CN": "可编辑区",
    en: "Editable"
  },
  "popup.templates.context.page": {
    "zh-CN": "页面",
    en: "Page"
  },
  "popup.history.title": {
    "zh-CN": "最近对话会自动保存",
    en: "Recent chats are saved automatically"
  },
  "popup.history.helper": {
    "zh-CN":
      "不需要每次手动保存。点击记录可以恢复到结果面板；不需要的记录可以单条删除。",
    en: "No need to save every chat manually. Click a record to restore it in the result panel; delete records you no longer need."
  },
  "popup.history.empty": {
    "zh-CN": "暂无记录。",
    en: "No history yet."
  },
  "popup.history.clearAll": {
    "zh-CN": "清空全部",
    en: "Clear all"
  },
  "popup.history.restoreTitle": {
    "zh-CN": "点击在页面右下角恢复这次对话",
    en: "Click to restore this chat in the lower-right result panel"
  },
  "popup.history.delete": {
    "zh-CN": "删除",
    en: "Delete"
  },
  "popup.history.justNow": {
    "zh-CN": "刚刚",
    en: "Just now"
  },
  "popup.history.translateTitle": {
    "zh-CN": "翻译网页选中文本",
    en: "Translate selected webpage text"
  },
  "popup.history.summarizeTitle": {
    "zh-CN": "总结当前页面",
    en: "Summarize current page"
  },
  "popup.history.explainTitle": {
    "zh-CN": "解释选中内容",
    en: "Explain selected content"
  },
  "popup.history.chatTitle": {
    "zh-CN": "AI 对话",
    en: "AI chat"
  },
  "popup.history.restoreSummary": {
    "zh-CN": "点击恢复到结果面板",
    en: "Click to restore in the result panel"
  },
  "popup.connectivity.lastPassed": {
    "zh-CN": "上次连接测试通过",
    en: "Last connection test passed"
  },
  "popup.connectivity.lastFailed": {
    "zh-CN": "上次连接测试未通过",
    en: "Last connection test failed"
  },
  "popup.connectivity.passed": {
    "zh-CN": "连接测试通过",
    en: "Connection test passed"
  },
  "popup.connectivity.failed": {
    "zh-CN": "连接测试未通过",
    en: "Connection test failed"
  },
  "popup.connectivity.showDetails": {
    "zh-CN": "展开详情",
    en: "Show details"
  },
  "popup.connectivity.hideDetails": {
    "zh-CN": "收起详情",
    en: "Hide details"
  },
  "popup.connectivity.speed.untested": {
    "zh-CN": "未测速",
    en: "Not tested"
  },
  "popup.connectivity.speed.fast": {
    "zh-CN": "较快",
    en: "Fast"
  },
  "popup.connectivity.speed.moderate": {
    "zh-CN": "一般",
    en: "Moderate"
  },
  "popup.connectivity.speed.slow": {
    "zh-CN": "较慢",
    en: "Slow"
  },
  "popup.connectivity.speed.failed": {
    "zh-CN": "失败",
    en: "Failed"
  },
  "popup.connectivity.speedGrade": {
    "zh-CN": "速度等级",
    en: "Speed grade"
  },
  "popup.connectivity.firstToken": {
    "zh-CN": "首 token",
    en: "First token"
  },
  "popup.connectivity.completion": {
    "zh-CN": "完成时间",
    en: "Completion"
  },
  "popup.connectivity.localProcessing": {
    "zh-CN": "本地处理",
    en: "Local processing"
  },
  "popup.connectivity.testedAt": {
    "zh-CN": "测试时间",
    en: "Tested at"
  },
  "popup.connectivity.testModel": {
    "zh-CN": "测试模型",
    en: "Test model"
  },
  "popup.connectivity.provider": {
    "zh-CN": "服务",
    en: "Provider"
  },
  "popup.connectivity.safety": {
    "zh-CN": "说明",
    en: "Note"
  },
  "popup.connectivity.safetyNote": {
    "zh-CN": "基于本机最近一次手动连接测试；不上传测速数据。",
    en: "Based on the latest local manual connection test; speed data is not uploaded."
  },
  "popup.connectivity.noData": {
    "zh-CN": "暂无数据",
    en: "No data"
  },
  "popup.connectivity.fallbackLatency": {
    "zh-CN": "未发起或未收到 background 摘要。",
    en: "No background summary was started or received."
  },
  "popup.connectivity.fallbackWithError": {
    "zh-CN": "Popup 未收到可用的脱敏摘要；底层错误原文未展示。",
    en: "Popup did not receive a usable redacted summary. The raw underlying error is not shown."
  },
  "popup.connectivity.fallback": {
    "zh-CN": "Popup 未收到可用的脱敏摘要。",
    en: "Popup did not receive a usable redacted summary."
  },
  "command.placeholder": {
    "zh-CN": "搜索浏览历史、书签、AI 对话...",
    en: "Search browser history, bookmarks, AI chats..."
  },
  "command.empty": {
    "zh-CN": "没有找到浏览历史、书签或 AI 对话",
    en: "No browser history, bookmarks, or AI chats found"
  },
  "command.searchError": {
    "zh-CN": "浏览历史或书签搜索失败，请检查扩展权限或重新加载扩展",
    en: "History or bookmark search failed. Check extension permissions or reload Aviso."
  },
  "command.unsafeUrlBlocked": {
    "zh-CN": "链接未打开",
    en: "Link not opened"
  },
  "command.unsafeUrlBlockedDetail": {
    "zh-CN": "Aviso 只会打开 http 或 https 链接。",
    en: "Aviso only opens http or https links."
  },
  "command.openUrl": {
    "zh-CN": "打开链接",
    en: "Open URL"
  },
  "command.localAction": {
    "zh-CN": "本地动作",
    en: "Local action"
  },
  "command.pageAction": {
    "zh-CN": "当前页面",
    en: "Current page"
  },
  "command.askAi": {
    "zh-CN": "问 AI",
    en: "Ask AI"
  },
  "command.confirm": {
    "zh-CN": "确认",
    en: "Confirm"
  },
  "command.confirmOpenUrl": {
    "zh-CN": "点击后打开这个 http/https 链接",
    en: "Click to open this http/https link"
  },
  "command.confirmOpenChromePage": {
    "zh-CN": "点击后打开 Chrome 内置页面",
    en: "Click to open the Chrome page"
  },
  "command.confirmPageAction": {
    "zh-CN": "点击后读取当前页面并在结果面板处理",
    en: "Click to read the current page and handle it in the result panel"
  },
  "command.openChromeBookmarks": {
    "zh-CN": "打开 Chrome 书签",
    en: "Open Chrome bookmarks"
  },
  "command.openChromeHistory": {
    "zh-CN": "打开 Chrome 历史记录",
    en: "Open Chrome history"
  },
  "command.translateCurrentPage": {
    "zh-CN": "翻译当前页面",
    en: "Translate current page"
  },
  "command.summarizeCurrentPage": {
    "zh-CN": "总结当前页面",
    en: "Summarize current page"
  },
  "command.pageActionFailed": {
    "zh-CN": "页面动作未完成",
    en: "Page action did not finish"
  },
  "command.selectLocalCandidate": {
    "zh-CN": "请选择本地候选",
    en: "Choose a local candidate"
  },
  "command.selectLocalCandidateDetail": {
    "zh-CN": "打开链接、历史、书签和页面动作需要先在候选列表中确认。",
    en: "Opening URLs, history, bookmarks, and page actions must be confirmed from the candidate list first."
  },
  "command.selectVisibleCandidate": {
    "zh-CN": "请选择可见候选",
    en: "Choose a visible candidate"
  },
  "command.selectVisibleCandidateDetail": {
    "zh-CN":
      "如果要使用 AI，请先选择列表里的 AI 候选；普通无结果输入不会自动发送。",
    en: "To use AI, choose the AI candidate in the list first. Generic no-result input is not sent automatically."
  },
  "command.history": {
    "zh-CN": "浏览历史",
    en: "History"
  },
  "command.bookmark": {
    "zh-CN": "书签",
    en: "Bookmark"
  },
  "command.aiHistory": {
    "zh-CN": "AI 对话",
    en: "AI chat"
  },
  "command.aiConnected": {
    "zh-CN": "AI 可用",
    en: "AI ready"
  },
  "command.aiDisconnected": {
    "zh-CN": "AI 未连接",
    en: "AI not connected"
  },
  "command.aiDisconnectedDetail": {
    "zh-CN": "请先在 Popup 的 AI 服务页连接自己的 AI 服务。",
    en: "Connect your AI service in the popup first."
  },
  "command.selectionPrefix": {
    "zh-CN": "选中文字：",
    en: "Selection: "
  },
  "command.fillSelection": {
    "zh-CN": "Tab 填入",
    en: "Tab to fill"
  },
  "command.searching": {
    "zh-CN": "搜索中…",
    en: "Searching..."
  },
  "command.navigate": {
    "zh-CN": "导航",
    en: "Navigate"
  },
  "command.select": {
    "zh-CN": "选择",
    en: "Select"
  },
  "command.continue": {
    "zh-CN": "继续",
    en: "Continue"
  },
  "command.sendWhenNoResults": {
    "zh-CN": "AI 需选择候选",
    en: "AI requires a choice"
  },
  "command.searchOnly": {
    "zh-CN": "AI 未连接时仅搜索",
    en: "Search only until AI is connected"
  },
  "operation.explain": {
    "zh-CN": "解释",
    en: "Explain"
  },
  "operation.translate": {
    "zh-CN": "翻译文本",
    en: "Translate"
  },
  "operation.polish": {
    "zh-CN": "润色",
    en: "Polish"
  },
  "operation.summarize": {
    "zh-CN": "总结",
    en: "Summarize"
  },
  "operation.custom": {
    "zh-CN": "自由提问",
    en: "Ask"
  },
  "operation.imageExplain": {
    "zh-CN": "图片解释",
    en: "Image"
  },
  "operation.search": {
    "zh-CN": "搜索",
    en: "Search"
  },
  "operation.navigate": {
    "zh-CN": "导航",
    en: "Navigate"
  },
  "common.copy": {
    "zh-CN": "复制",
    en: "Copy"
  },
  "common.copied": {
    "zh-CN": "已复制",
    en: "Copied"
  },
  "common.save": {
    "zh-CN": "保存",
    en: "Save"
  },
  "common.saved": {
    "zh-CN": "已保存",
    en: "Saved"
  },
  "common.stop": {
    "zh-CN": "停止",
    en: "Stop"
  },
  "common.close": {
    "zh-CN": "关闭",
    en: "Close"
  },
  "common.retry": {
    "zh-CN": "重试",
    en: "Retry"
  },
  "common.cancel": {
    "zh-CN": "取消",
    en: "Cancel"
  },
  "common.send": {
    "zh-CN": "发送",
    en: "Send"
  },
  "common.sendToAi": {
    "zh-CN": "发给 AI",
    en: "Send to AI"
  },
  "floating.screenshotRegion": {
    "zh-CN": "🖼 [截图区域]",
    en: "🖼 [Screenshot region]"
  },
  "floating.image": {
    "zh-CN": "🖼 [图片]",
    en: "🖼 [Image]"
  },
  "floating.followUpPlaceholder": {
    "zh-CN": "继续追问…",
    en: "Ask a follow-up..."
  },
  "floating.hostedSignInRequired.title": {
    "zh-CN": "需要先登录托管服务",
    en: "Sign in to use hosted AI"
  },
  "floating.hostedSignInRequired.withByok": {
    "zh-CN":
      "这个请求选择了托管路线。你可以先在 AI 服务页完成本地登录，也可以继续使用自己的服务配置。",
    en: "This request selected the hosted route. Sign in from AI services, or continue with your own service configuration."
  },
  "floating.hostedSignInRequired.noByok": {
    "zh-CN":
      "这个请求选择了托管路线。请先在 AI 服务页完成本地登录，或配置自己的 AI 服务。",
    en: "This request selected the hosted route. Sign in from AI services, or configure your own AI service."
  },
  "floating.hostedSignInRequired.configureByok": {
    "zh-CN": "配置自己的服务",
    en: "Configure own service"
  },
  "translation.autoTitle": {
    "zh-CN": "自动翻译",
    en: "Auto translate"
  },
  "translation.toTitle": {
    "zh-CN": "翻译为",
    en: "Translate to "
  },
  "translation.cardLabel": {
    "zh-CN": "Aviso 划词翻译",
    en: "Aviso selection translation"
  },
  "translation.closeCard": {
    "zh-CN": "关闭划词翻译",
    en: "Close selection translation"
  },
  "translation.copyError": {
    "zh-CN": "复制失败，请手动选中译文复制。",
    en: "Copy failed. Select the translation and copy it manually."
  },
  "translation.longSelection": {
    "zh-CN": "选区较长，建议点发给 AI，在对话面板中翻译。",
    en: "This selection is long. Send it to AI and translate in the result panel."
  },
  "translation.manyLines": {
    "zh-CN": "选区行数较多，建议点发给 AI，在对话面板中翻译。",
    en: "This selection has many lines. Send it to AI and translate in the result panel."
  },
  "translation.waiting": {
    "zh-CN": "正在翻译…",
    en: "Translating..."
  },
  "model.waiting": {
    "zh-CN": "等待模型响应…",
    en: "Waiting for the model..."
  },
  "model.slow": {
    "zh-CN": "请求已发出，模型还在响应。可继续等待、停止，或稍后重试。",
    en: "Request sent. The model is still responding. You can wait, stop, or try again later."
  },
  "model.thinking": {
    "zh-CN": "思考中",
    en: "Thinking"
  },
  "model.thinkingDone": {
    "zh-CN": "思考完成",
    en: "Thinking done"
  },
  "model.cancelled": {
    "zh-CN": "已停止等待。",
    en: "Stopped waiting."
  },
  "translation.fallbackWaiting": {
    "zh-CN": "正在翻译...",
    en: "Translating..."
  },
  "translation.userBubblePrefix": {
    "zh-CN": "待翻译文本：",
    en: "Text to translate:"
  },
  "translation.errorPrefix": {
    "zh-CN": "翻译失败：",
    en: "Translation failed: "
  },
  "doubleClick.title": {
    "zh-CN": "Aviso 快捷操作",
    en: "Aviso quick actions"
  },
  "doubleClick.aria": {
    "zh-CN": "Aviso 双击快捷菜单",
    en: "Aviso double-click menu"
  },
  "action.copyContext": {
    "zh-CN": "复制当前上下文",
    en: "Copy current context"
  },
  "action.summarizePage": {
    "zh-CN": "总结当前页面",
    en: "Summarize page"
  },
  "action.translateSelection": {
    "zh-CN": "翻译选中文本",
    en: "Translate selection"
  },
  "action.explainSelection": {
    "zh-CN": "解释选中文本",
    en: "Explain selection"
  },
  "action.polishSelection": {
    "zh-CN": "润色选中文本",
    en: "Polish selection"
  },
  "action.summarizeSelection": {
    "zh-CN": "总结选中文本",
    en: "Summarize selection"
  },
  "action.sendToAviso": {
    "zh-CN": "发送给 Aviso",
    en: "Send to Aviso"
  },
  "action.explainImage": {
    "zh-CN": "解释这张图片",
    en: "Explain this image"
  },
  "action.polishText": {
    "zh-CN": "润色文字",
    en: "Polish text"
  },
  "action.summarizeContent": {
    "zh-CN": "总结内容",
    en: "Summarize content"
  },
  "action.summarizeLink": {
    "zh-CN": "总结这个链接",
    en: "Summarize this link"
  },
  "action.askScreenshot": {
    "zh-CN": "截图提问",
    en: "Ask about screenshot"
  },
  "action.templates": {
    "zh-CN": "自定义模板 ▸",
    en: "Custom templates ▸"
  },
  "action.templatePrefix": {
    "zh-CN": "模板：",
    en: "Template: "
  },
  "action.noTemplates": {
    "zh-CN": "自定义模板（暂无）",
    en: "Custom templates (none)"
  },
  "toast.copyContextSuccess": {
    "zh-CN": "当前上下文已复制",
    en: "Current context copied"
  },
  "toast.copyContextSuccessDetail": {
    "zh-CN": "只写入剪贴板，未发送给 AI。",
    en: "Copied to clipboard only. Not sent to AI."
  },
  "toast.copyFailure": {
    "zh-CN": "复制失败",
    en: "Copy failed"
  },
  "toast.copyFailureDetail": {
    "zh-CN": "请确认当前页面允许剪贴板写入后重试。",
    en: "Allow clipboard writes for this page, then try again."
  },
  "toast.copiedPrefix": {
    "zh-CN": "已复制 ",
    en: "Copied "
  },
  "clipboard.type.english": {
    "zh-CN": "英文文本",
    en: "English text"
  },
  "clipboard.type.code": {
    "zh-CN": "代码片段",
    en: "Code snippet"
  },
  "clipboard.type.url": {
    "zh-CN": "网页链接",
    en: "Web link"
  },
  "clipboard.type.chinese": {
    "zh-CN": "中文文本",
    en: "Chinese text"
  },
  "clipboard.type.other": {
    "zh-CN": "文本",
    en: "Text"
  },
  "screenshot.hint": {
    "zh-CN": "拖动选择截图区域，按 Esc 取消",
    en: "Drag to select a screenshot region. Press Esc to cancel."
  },
  "screenshot.copyImage": {
    "zh-CN": "复制图片",
    en: "Copy image"
  },
  "screenshot.downloadImage": {
    "zh-CN": "下载图片",
    en: "Download image"
  },
  "screenshot.reselect": {
    "zh-CN": "重选",
    en: "Reselect"
  },
  "screenshot.copying": {
    "zh-CN": "复制中…",
    en: "Copying..."
  },
  "screenshot.saving": {
    "zh-CN": "保存中…",
    en: "Saving..."
  },
  "screenshot.sending": {
    "zh-CN": "发送中…",
    en: "Sending..."
  },
  "screenshot.retryHint": {
    "zh-CN": "请重新拖动选择截图区域。",
    en: "Drag again to select a screenshot region."
  },
  "screenshot.downloadSuccess": {
    "zh-CN": "截图已交给浏览器下载。",
    en: "Screenshot sent to the browser download flow."
  },
  "screenshot.askPrompt": {
    "zh-CN": "请解释这个截图区域。",
    en: "Please explain this screenshot region."
  },
  "screenshot.sendingToModel": {
    "zh-CN": "正在发送截图给模型…",
    en: "Sending screenshot to the model..."
  },
  "screenshot.openFloatingError": {
    "zh-CN": "无法打开结果浮窗。",
    en: "Could not open the result panel."
  },
  "screenshot.captureError": {
    "zh-CN": "截图失败，请重新尝试。",
    en: "Screenshot failed. Try again."
  },
  "screenshot.formatError": {
    "zh-CN": "截图格式暂不支持，请重新尝试。",
    en: "Screenshot format is not supported. Try again."
  },
  "screenshot.pageError": {
    "zh-CN": "当前页面无法处理截图。",
    en: "This page cannot process the screenshot."
  },
  "screenshot.clipboardUnsupported": {
    "zh-CN": "当前浏览器不支持直接复制图片，请改用下载。",
    en: "This browser cannot copy images directly. Use download instead."
  },
  "screenshot.copyImageFailure": {
    "zh-CN":
      "复制图片失败：Chrome 可能限制了异步截图写入剪贴板，请改用下载图片。",
    en: "Copy image failed: Chrome may block async screenshot clipboard writes. Use download instead."
  },
  "screenshot.readFailure": {
    "zh-CN": "截图读取失败，请重新尝试。",
    en: "Could not read the screenshot. Try again."
  },
  "background.screenshotNoWindow": {
    "zh-CN": "无法截图：没有可用的当前窗口。",
    en: "Cannot capture screenshot: no current window is available."
  },
  "background.screenshotAuthEntryMessage": {
    "zh-CN": "截图需要从浏览器扩展入口启动",
    en: "Start screenshots from a browser extension entry"
  },
  "background.screenshotAuthEntryDetail": {
    "zh-CN":
      "请通过右键菜单里的“截图提问”、扩展按钮或浏览器快捷命令重新触发；页面内快捷按钮不会授予截图所需权限。",
    en: "Use the context-menu screenshot action, extension button, or browser shortcut. Page-level shortcuts do not grant screenshot permission."
  },
  "background.copyFailureDetail": {
    "zh-CN": "当前页面无法接收剪贴板写入请求。",
    en: "This page could not receive the clipboard write request."
  },
  "background.readingPage": {
    "zh-CN": "正在读取页面内容…",
    en: "Reading page content..."
  },
  "model.unconfiguredEndpoint": {
    "zh-CN": "未配置接入点",
    en: "Endpoint not configured"
  }
} as const

export type I18nKey = keyof typeof MESSAGES

export function getI18nMessage(
  key: I18nKey,
  language: ResolvedUiLanguage
): string {
  return MESSAGES[key]?.[language] ?? MESSAGES[key]?.["zh-CN"] ?? key
}

export function createI18n(language: ResolvedUiLanguage) {
  return (key: I18nKey) => getI18nMessage(key, language)
}

export function useSyncedAvisoLanguage(): {
  language: ResolvedUiLanguage
  setting: UiLanguageSetting
  t: ReturnType<typeof createI18n>
} {
  const [setting, setSetting] = useState<UiLanguageSetting>(DEFAULT_UI_LANGUAGE)

  useEffect(() => {
    chrome.storage.sync.get("contextai_settings", (result) => {
      setSetting(
        normalizeUiLanguageSetting(result.contextai_settings?.uiLanguage)
      )
    })

    const onChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string
    ) => {
      if (area !== "sync" || !changes.contextai_settings) return
      setSetting(
        normalizeUiLanguageSetting(
          changes.contextai_settings.newValue?.uiLanguage
        )
      )
    }

    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [])

  const language = resolveUiLanguage(setting)
  const t = useMemo(() => createI18n(language), [language])

  return { language, setting, t }
}
