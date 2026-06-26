# Aviso Chrome Web Store Listing Copy

Updated: 2026-06-10

## Listing Basics

- Recommended category: `Productivity`
- Supported languages: `Chinese (Simplified)`, `English`
- Current release posture: public website/docs are intended as the official launch-facing product materials; Chrome Web Store listing is still in submission preparation and is not yet approved

Scope note: this file remains the v0.1 BYOK direct-provider listing copy. It is not the final v0.3 hosted-AI Chrome Web Store submission source. For v0.3 hosted-AI disclosure preparation, use `docs/planning/v0.3/cws-disclosure-draft.md` and replace any staging-only fields with final production/package evidence before submission.

## Short Description

### 中文

用你自己的 API Key，在当前网页里就地解释、翻译、润色、总结和提问。

### English

Use your own API key to explain, translate, refine, summarize, and ask AI in the page you are viewing.

## Detailed Description

### 中文

Aviso 是一个 Chrome 扩展，帮助你在当前网页里直接调用 AI，而不是在网页和聊天工具之间来回复制粘贴。

你可以在选中文字后使用轻量工具栏，也可以通过右键菜单、命令面板和页面内结果面板完成常见操作。Aviso 当前已实现：

- 划词工具栏：解释、翻译、润色、总结、发给 AI
- 右键菜单：选中文本、当前页面、链接、图片内部路径、复制当前上下文、模型切换、自定义模板
- 命令面板：搜索本地 AI 对话、Chrome 浏览历史、Chrome 书签；无结果时可直接把输入发给 AI
- 页面内结果面板：流式结果、复制、保存、继续追问
- Popup 设置页：多 AI 服务配置、API Key、默认模型、功能开关、模板、历史、界面语言
- 中文 / English 界面

Aviso 采用 BYOK direct-provider 模式：用户自己提供 API Key，扩展从浏览器直接连接到已批准的 provider host。项目方不提供托管 AI、账号登录、订阅支付、匿名额度或 provider 代理服务。

当前用户可用反馈已覆盖豆包 / 火山方舟。OpenAI 和 Anthropic 当前只描述为支持配置 API Key 和模型 ID；实际可用性取决于用户自己的 Key、模型权限和 provider 状态。

截图能力只保留在用户主动触发的右键内部路径中，不作为普通用户主入口或公开卖点。

### English

Aviso is a Chrome extension that brings AI actions into the webpage you are already reading or editing, so you do not need to keep copying content into a separate chat app.

Current features include:

- Selection toolbar for explain, translate, refine, summarize, and ask AI
- Right-click actions for selected text, current page, links, image internal path, copy current context, model switching, and custom templates
- Command palette for local AI conversation search, Chrome browsing history search, Chrome bookmarks search, and direct ask when no local result matches
- In-page result panel with streaming output, copy, save, and follow-up
- Popup settings for multiple AI service configs, API keys, default model, feature switches, templates, history, and UI language
- Chinese and English UI

Aviso uses a BYOK direct-provider model: users bring their own API keys, and the extension connects directly from the browser to approved provider hosts. There is no project-owned backend, hosted Aviso AI, login, subscription, payment, anonymous quota, or provider proxy.

Doubao / Volcengine Ark already has user-usable feedback. For OpenAI and Anthropic, the store copy should only say that users can configure their own API key and model ID; actual usability depends on the user's key, model access, and provider status.

Screenshot capability remains an internal right-click path and is not presented as a main public entry or promotional feature.

## Single Purpose Description

### 中文

Aviso 的单一用途是在用户当前浏览的网页里提供用户主动触发的 AI 阅读、翻译、总结、润色和本地检索辅助。

### English

Aviso has a single purpose: provide user-triggered AI reading, translation, summarization, refinement, and local search assistance inside the current webpage.

## Permissions Justification

| Permission | Why it is needed |
| --- | --- |
| `contextMenus` | Adds the Aviso right-click actions for selected text, current page, links, image internal path, copy current context, model switching, and templates. |
| `activeTab` | Lets the extension interact with the page the user is actively using after the user triggers an action. |
| `storage` | Saves local settings, encrypted API keys, templates, and local conversation history in Chrome extension storage. |
| `history` | Lets the command palette search the user's local Chrome browsing history on-device. These searches are local only. |
| `bookmarks` | Lets the command palette search the user's local Chrome bookmarks on-device. |
| `clipboardWrite` | Supports copy actions such as copying AI output or copying the current page context into the user's clipboard. |

## Host Permissions Justification

| Host permission | Why it is needed |
| --- | --- |
| `https://api.openai.com/*` | Allows direct browser-to-provider API requests when the user configures an OpenAI-compatible service with their own API key. |
| `https://api.anthropic.com/*` | Allows direct browser-to-provider API requests when the user configures Anthropic with their own API key. |
| `https://ark.cn-beijing.volces.com/*` | Allows direct browser-to-provider API requests for Doubao / Volcengine Ark when the user configures their own key and endpoint. |

These host permissions are limited to approved provider API domains. They are not used for remote webpage scraping, project-owned servers, analytics, or remote logging.

## Remote Code Declaration Suggestion

- Suggested answer: `No remote code`
- Rationale: the current packaged extension ships its executable logic inside the extension bundle and manifest. Approved network access is limited to provider API requests for user-triggered AI calls, not to remotely hosted executable code.
- Final submission note: re-confirm this answer against the exact package uploaded to Chrome Web Store.

## Data Use And Chrome Limited Use Alignment

- Aviso does not sell user data.
- Aviso does not use user data for advertising.
- Aviso does not use user data for credit, lending, or similar eligibility decisions.
- Aviso does not send user content to an Aviso-owned backend, because there is no project-owned backend in the current product scope.
- API keys are not stored in plaintext; they remain in `chrome.storage.local/contextai_api_keys` with local encryption / obfuscation-level protection.
- Non-secret settings are stored in `chrome.storage.sync/contextai_settings`.
- Local history is stored in `chrome.storage.local/contextai_history`.
- When the user actively triggers an AI action, required content is sent directly from the browser extension to the user-selected provider.
- Provider handling of request content depends on the user's relationship with that provider, its service terms, and its privacy policy.

This wording should stay aligned with `website/docs/privacy-policy.md` and `website/docs/data-permissions.md`.

## Reviewer Test Notes

### With no provider key

Reviewers can still verify these non-provider flows without any external API key:

- Open the Popup and inspect UI language, theme, model/provider settings, feature switches, templates, and history surfaces
- Verify right-click menu presence on normal webpages
- Verify selection toolbar appearance on selected text
- Verify command palette open shortcut and local search surfaces
- Verify bookmarks/history search UI if local browser data exists
- Verify local-only flows such as copy current context, saved local history, and settings persistence

### With a provider key

- Aviso is BYOK: the reviewer must use their own valid provider key
- Doubao / Volcengine Ark has existing user-usable feedback
- OpenAI / Anthropic should be reviewed as configurable provider paths, not as previously live-certified providers
- If a reviewer chooses to test a provider call, they should supply their own key and model access

## Store Asset Checklist And Current Gaps

### Available now

- Store icon: `store-assets/chrome-web-store/output/icon-128.png`
- Small promo tile: `store-assets/chrome-web-store/output/promo-small-440x280.png`
- Marquee promo tile: `store-assets/chrome-web-store/output/promo-marquee-1400x560.png`

### Still missing

- 1280x800 localized screenshot set for Chrome Web Store listing
- Chinese screenshots: pending
- English screenshots: pending

Per `store-assets/chrome-web-store/GENERATION_REPORT.md`, screenshot generation is still blocked and should be replaced with real runtime capture or another reference-preserving process.

## Website / Store Switches Needed Before And After Approval

- Before Chrome Web Store submission, deploy the current website docs and verify the final homepage, support, and privacy URLs.
- Replace the website `Add to Chrome` CTA target with the real Chrome Web Store listing URL
- Replace the placeholder text in `website/docs/install.md` with the real Chrome Web Store listing URL and store-install steps
- Confirm the support URL used in the store listing points to the hosted support page. If the current Vercel domain remains the production homepage, the target URL is:
  - `https://aviso-nine.vercel.app/docs/support-feedback/`
- Confirm the privacy policy URL used in the store listing points to the hosted privacy page. If the current Vercel domain remains the production homepage, the target URL is:
  - `https://aviso-nine.vercel.app/docs/privacy-policy/`
- Re-check that website wording still says store availability only after approval, not before
