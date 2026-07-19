# Aviso Chrome Web Store Listing Copy

Updated: 2026-07-07

## Listing Basics

- Recommended category: `Productivity`
- Supported languages: `Chinese (Simplified)`, `English`
- Current release posture: resubmission listing source after Chrome Web Store rejected the prior product description for excessive or unrelated keyword-style provider names; not approved by Chrome Web Store, and not public live

Scope note: this file is the Chrome Web Store listing copy source for owner final validation. It describes the current package boundary: BYOK direct-provider remains the default path, while optional Aviso AI / hosted AI uses Google sign-in and the approved production-candidate backend only when the user chooses it. This file does not upload the listing, prove Chrome Web Store approval, or mark hosted AI live. Do not paste provider-name lists into the public product description; keep provider-specific wording only where it is needed for permission or reviewer explanations.

## Short Description

### 中文

在当前网页里解释、翻译、润色、总结和提问。支持自备 API Key，也可选择登录 Aviso AI。

### English

Explain, translate, refine, summarize, and ask AI in the current page. Use your own API key or sign in to Aviso AI.

## Detailed Description

### 中文

Aviso 是一个 Chrome 扩展，帮助你在当前网页里直接调用 AI，而不是在网页和聊天工具之间来回复制粘贴。

你可以在选中文字后使用轻量工具栏，也可以通过右键菜单、命令面板和页面内结果面板完成常见操作。Aviso 当前支持：

- 划词工具栏：解释、翻译、润色、总结、发给 AI
- 右键菜单：选中文本、当前页面、链接、图片内部路径、复制当前上下文、模型切换、自定义模板
- 命令面板：搜索本地 AI 对话、Chrome 浏览历史、Chrome 书签；无结果时可直接把输入发给 AI
- 页面内结果面板：流式结果、复制、保存、继续追问
- Popup 设置页：多 AI 服务配置、API Key、Aviso AI 登录、默认模型、功能开关、模板、历史、界面语言
- 中文 / English 界面

Aviso 保留 BYOK direct-provider 作为默认路径：用户自己提供 API Key，扩展从浏览器直接连接到已批准的 provider host。用户也可以主动选择 Aviso AI / hosted AI 路径并使用 Google 登录；只有选择该路径时，请求才会经过 Aviso 后端和上游模型 provider。BYOK 不需要登录，也不会被 Aviso AI 登录状态拦住。

如果你选择自备 API Key，可以在设置中添加模型服务配置，并填写需要的 API Key、模型 ID 或接入点。实际可用性取决于你自己的账号权限、模型权限和服务状态。Aviso 不自动读取模型列表。

截图能力只保留在用户主动触发的右键内部路径中，不作为普通用户主入口或公开卖点。

当前不包含订阅支付、公开匿名额度、联网搜索、远端链接正文抓取、广告、遥测或分析 SDK。

### English

Aviso is a Chrome extension that brings AI actions into the webpage you are already reading or editing, so you do not need to keep copying content into a separate chat app.

Current features include:

- Selection toolbar for explain, translate, refine, summarize, and ask AI
- Right-click actions for selected text, current page, links, image internal path, copy current context, model switching, and custom templates
- Command palette for local AI conversation search, Chrome browsing history search, Chrome bookmarks search, and direct ask when no local result matches
- In-page result panel with streaming output, copy, save, and follow-up
- Popup settings for multiple AI service configs, API keys, Aviso AI sign-in, default model, feature switches, templates, history, and UI language
- Chinese and English UI

Aviso keeps BYOK direct-provider as the default path: users bring their own API keys, and the extension connects directly from the browser to approved provider hosts. Users may also choose Aviso AI / hosted AI and sign in with Google; only that optional path sends requests through the Aviso backend and upstream model providers. BYOK does not require sign-in and is not blocked by Aviso AI account state.

If you bring your own API key, you can add model service configs in Settings and enter the required API key, model ID, or endpoint. Actual usability depends on your own account access, model access, and service status. Aviso does not automatically read model lists.

Screenshot capability remains an internal right-click path and is not presented as a main public entry or promotional feature.

This release does not include subscription payment, public anonymous quota, web search, remote link-body fetching, advertising, telemetry, or analytics SDKs.

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
| `storage` | Saves local settings, not-plaintext BYOK API keys, templates, hosted session state, and local conversation history in Chrome extension storage. |
| `history` | Lets the command palette search the user's local Chrome browsing history on-device. These searches are local only. |
| `bookmarks` | Lets the command palette search the user's local Chrome bookmarks on-device. |
| `identity` | Opens the Google authorization window only when the user chooses Aviso AI / hosted AI sign-in. BYOK use does not require this permission. |
| `clipboardWrite` | Supports copy actions such as copying AI output or copying the current page context into the user's clipboard. |

## Host Permissions Justification

| Host permission | Why it is needed |
| --- | --- |
| `https://api.openai.com/*` | Allows direct browser-to-provider API requests to this declared API domain when the user configures their own key and model access. |
| `https://api.anthropic.com/*` | Allows direct browser-to-provider API requests to this declared API domain when the user configures their own key and model access. |
| `https://ark.cn-beijing.volces.com/*` | Allows direct browser-to-provider API requests to this declared API domain when the user configures their own key and endpoint. |
| `https://api.deepseek.com/*` | Allows direct browser-to-provider API requests to this declared API domain when the user configures their own key and model access. |
| `https://api.moonshot.cn/*` | Allows direct browser-to-provider API requests to this declared API domain when the user configures their own key and model access. |
| `https://openrouter.ai/*` | Allows direct browser-to-provider API requests to this declared API domain when the user configures their own key and model access. |
| `https://generativelanguage.googleapis.com/*` | Allows direct browser-to-provider API requests to this declared API domain when the user configures their own key and model access. |
| `https://api.hunyuan.cloud.tencent.com/*` | Allows direct browser-to-provider API requests to this declared API domain when the user configures their own key and model access. |
| `https://aviso-backend-production.vercel.app/*` | Allows the optional Aviso AI / hosted AI path to reach the approved production-candidate backend after the user signs in. BYOK requests do not use this backend. |

These host permissions are limited to approved provider API domains and the exact Aviso hosted AI backend origin. They are not used for remote webpage scraping, analytics, or remote logging.

## Remote Code Declaration Suggestion

- Suggested answer: `No remote code`
- Rationale: the current packaged extension ships its executable logic inside the extension bundle and manifest. Approved network access is limited to provider API requests for user-triggered AI calls, not to remotely hosted executable code.
- Final submission note: re-confirm this answer against the exact package uploaded to Chrome Web Store.

## Data Use And Chrome Limited Use Alignment

- Aviso does not sell user data.
- Aviso does not use user data for advertising.
- Aviso does not use user data for credit, lending, or similar eligibility decisions.
- BYOK user content is not sent to an Aviso-owned backend.
- Optional Aviso AI / hosted AI requests pass through the Aviso backend only after the user chooses hosted AI and signs in.
- BYOK API keys are not stored in plaintext; they remain in `chrome.storage.local/contextai_api_keys` inside the current browser profile with local encryption / obfuscation-level protection.
- This API-key protection is only a browser-profile convenience boundary. It does not defend against a readable browser profile, a compromised device, or a malicious extension, and it is not keychain storage, hardware-backed protection, end-to-end encryption, or zero-knowledge protection.
- Non-secret settings are stored in `chrome.storage.sync/contextai_settings`.
- Local history is stored in `chrome.storage.local/contextai_history`.
- For BYOK, when the user actively triggers an AI action, required content is sent directly from the browser extension to the user-selected provider.
- For Aviso AI / hosted AI, required content passes through the Aviso backend and upstream model providers only after the user chooses Aviso AI and signs in.
- Provider handling of request content depends on the user's relationship with that provider, its service terms, and its privacy policy. For Aviso AI / hosted AI, upstream provider handling depends on the provider account and policy used by the Aviso backend.

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

- For BYOK review, the reviewer must use their own valid provider key
- For Aviso AI review, the reviewer signs in only through the user-initiated Google sign-in flow
- If a reviewer chooses to test a BYOK provider call, they should supply their own key, model ID, and model access; BYOK keys are not sent to the Aviso backend

## Store Asset Checklist And Current Gaps

### Available now

- Store icon: `store-assets/chrome-web-store/output/icon-128.png`
- Small promo tile: `store-assets/chrome-web-store/output/promo-small-440x280.png`
- Marquee promo tile: `store-assets/chrome-web-store/output/promo-marquee-1400x560.png`

### Still needs owner final validation before upload

- Confirm the exact package uploaded to Chrome Web Store is the final package produced by the release gate.
- Confirm the final manifest permission list matches this file.
- Confirm the final privacy/support URLs after website deployment.
- Confirm localized screenshot set and promotional assets are the owner-approved assets for upload.
- Confirm no public copy claims Chrome Web Store approval, hosted AI live, subscription payment, or anonymous public quota before those gates are actually complete.

## Website / Store Switches Needed Before And After Approval

- Before Chrome Web Store submission, deploy the current website docs and verify the final homepage, support, and privacy URLs.
- Replace the website `Add to Chrome` CTA target with the real Chrome Web Store listing URL
- Replace the placeholder text in `website/docs/install.md` with the real Chrome Web Store listing URL and store-install steps
- Confirm the support URL used in the store listing points to the deployed support page.
- Confirm the privacy policy URL used in the store listing points to the deployed privacy page.
- Re-check that website wording still says store availability only after approval, not before
