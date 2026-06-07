# Chrome Web Store Submission Draft

Date: 2026-06-03

Status: Draft for review. Not submitted to Chrome Web Store.

Scope: Aviso `0.1.0` internal dogfood / BYOK basic-launch preparation.

## Source References

- Chrome listing fields: https://developer.chrome.com/docs/webstore/cws-dashboard-listing
- Chrome privacy fields: https://developer.chrome.com/docs/webstore/cws-dashboard-privacy
- Chrome Web Store program policies: https://developer.chrome.com/docs/webstore/program-policies/policies
- Chrome user-data FAQ: https://developer.chrome.com/docs/webstore/program-policies/user-data-faq
- Chrome permission declaration concepts: https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions

## Submission Boundary

Do not submit this draft until the remaining release gates are closed or explicitly accepted by the owner.

2026-06-05 scope update: v1.0 basic launch is BYOK direct-provider only. Login, subscription, payment, anonymous quota, hosted Aviso AI, provider proxy, remote link-body fetching, and web search are future-state only. Screenshot ordinary-user promotion is paused. Current screenshot and promo images are placeholder drafts and must not be used as final Chrome Web Store assets.

Public copy must not claim:

- OpenAI has been live-validated.
- Anthropic has been live-validated.
- Screenshot understanding has been live-validated with a real vision provider.
- Screenshot is a final ordinary-user store selling point.
- Aviso fetches arbitrary remote link bodies.
- Aviso performs full-page DOM translation.
- Aviso is a free AI provider or includes free model credits.
- Aviso includes login, subscription, payment, anonymous free quota, hosted Aviso AI, provider proxy, or web search.
- No data ever leaves the browser. User-triggered AI requests go directly from the browser extension to the selected model provider.

Public copy may claim:

- Aviso has no project-owned backend.
- Aviso does not add telemetry, analytics SDKs, ads, affiliate tracking, or project-owned remote logging.
- User-triggered AI requests are sent directly from the browser extension to the user-selected provider.
- API Keys are encrypted before local extension storage.
- 豆包 / 火山方舟 has passed a user-triggered single-provider connectivity test.

## Store Listing

### Item Name

```text
Aviso
```

### Short Description

```text
在当前网页就地解释、翻译、润色和总结内容的 AI 浏览器助手。
```

### Category

```text
Productivity
```

### Language

```text
Chinese (Simplified)
```

Add English localization later only if screenshots and detailed copy are also localized consistently.

### Detailed Description

```text
Aviso 是一个面向网页阅读和写作场景的 AI 浏览器助手。

它把右键菜单、划词工具栏、命令面板和页面内结果面板连接起来，让你在当前网页中处理选中文本、页面正文片段、链接上下文、图片上下文和自定义提示词。

主要功能：

- 选中文字后解释、翻译、润色或总结。
- 通过右键菜单处理选区、链接、当前页面、图片和自定义模板。
- 用命令面板搜索本地历史、搜索书签，或直接向 AI 提问。
- 在页面内结果面板中查看流式输出，复制、保存和继续追问。
- 复制当前页面上下文到剪贴板，便于粘贴到其他工具。
- 通过 Popup 管理模型、API Key、功能开关、自定义模板和历史记录。

隐私与数据边界：

- Aviso 没有项目方服务器，不提供项目方账号系统。
- Aviso 不添加遥测、分析 SDK、广告、联盟跟踪或项目方远端日志。
- API Key 加密后保存在 Chrome 本地扩展存储中。
- 当你主动发起 AI 请求时，请求会由浏览器扩展直接发送到你选择的模型 provider，不经过 Aviso 中间服务器。
- 连接测试只能由用户手动触发，一次只测试一个 provider，并只显示脱敏摘要。

当前限制：

- 你需要使用自己的模型 provider API Key。
- 模型响应速度取决于 provider、网络、API Key 状态、模型和输入长度。
- 链接处理当前不会抓取任意远端链接正文。
- OpenAI 和 Anthropic 原生 Key 的真实最小验证仍是公开发布前门禁；公开材料只应宣称已经验证的 provider。
```

### Homepage URL

```text
https://aviso-nine.vercel.app/
```

### Privacy Policy URL

```text
https://aviso-nine.vercel.app/docs/privacy-policy/
```

### Support URL

```text
https://aviso-nine.vercel.app/docs/support-feedback/
```

### Mature Content

```text
No
```

### Payment

```text
No payment collected by Aviso. Users provide and manage their own model provider API Keys. Provider billing, if any, is between the user and the selected provider.
```

### Ads / Affiliate / Tracking

```text
No ads, no affiliate links, no tracking pixels, no analytics SDK, no project-owned telemetry.
```

## Privacy Practices Tab

### Single Purpose Description

```text
Aviso helps users manually call their configured AI provider from the current webpage context, then shows the result in an in-page panel for reading, writing, translation, summarization, and follow-up questions.
```

Chinese working translation:

```text
Aviso 的单一用途是在当前网页上下文中，由用户手动触发自己配置的 AI provider，处理选区、页面片段、链接、图片上下文或自定义提示词，并在页面内面板展示结果。
```

### Remote Code

Recommended answer:

```text
No, Aviso does not execute remotely hosted code.
```

Reviewer note:

```text
Aviso bundles its extension code in the MV3 package. Network calls are made only to configured AI provider APIs for user-triggered model requests; provider text responses are displayed as content and are not executed as code.
```

### Data Usage Disclosure

Dashboard labels can change, so fill this section from the current dashboard wording. Recommended conservative stance:

| Data area | Recommended disclosure stance | Reason |
| --- | --- | --- |
| Authentication information | Disclose if the dashboard includes API Keys or access tokens in this category. | User API Keys are entered and encrypted in local extension storage. They are used only for direct provider requests. |
| Website content | Disclose. | User-triggered operations may process selected text, page text snippets, link URLs, image URLs/base64, screenshot regions, or custom prompts. |
| Web browsing activity / history | Disclose if the dashboard treats page URL/title or extension history as browsing activity. | Aviso may use current page URL/title and keeps local extension interaction history. It does not send browsing history to Aviso servers. |
| User activity | Disclose if the dashboard treats commands, saved outputs, settings, or feature toggles as user activity. | Settings, templates, history and saved results are stored in extension storage. |
| Personally identifiable information | Do not claim general collection by Aviso project servers. Disclose only if the selected page/user input can contain PII and the dashboard asks about data processed by the extension/provider. | Aviso does not ask for profile identity, but user-provided page/input content may include personal data. |
| Financial/payment/health/location/personal communications | Do not disclose as product-intended categories unless the user intentionally sends such page content. | Aviso does not target these categories and filters sensitive clipboard scenarios, but cannot control all user-provided page text. |

Do not choose a blanket "does not collect or use user data" option unless the dashboard explicitly excludes local-only processing and direct user-selected provider transfer from that definition. Aviso handles user data locally and may transfer user-triggered request content directly to providers.

### Limited Use Certification Draft

```text
Aviso uses user data only to provide the extension's current-page AI assistant features requested by the user. Aviso does not sell user data, does not use user data for advertising, does not use user data for creditworthiness or lending purposes, and does not allow humans at the Aviso project to read user content. User-triggered AI request content is sent directly from the browser extension to the selected model provider only when needed to provide the requested feature. Provider handling is governed by the user's account relationship with that provider.
```

### Privacy Policy Summary

```text
Aviso has no project-owned backend and does not add telemetry or analytics. API Keys are encrypted before local extension storage. Settings, templates and history stay in browser extension storage. When users manually trigger AI features, the extension sends only the needed request content directly to the selected model provider. The privacy policy explains local storage, provider data flows, site access, screenshot handling, connection tests, and current public-release gaps.
```

## Permissions Justification

### `contextMenus`

```text
Used to show Aviso actions in the right-click menu for selected text, links, pages, images, custom templates, model switching, internal-only screenshot questions, and copying current context.
```

### `activeTab`

```text
Used after a user action to interact with the active tab, read the current page context when needed, and show the in-page Aviso panel.
```

### `storage`

```text
Used to store encrypted API Keys, non-secret settings, feature toggles, custom templates, and local history in Chrome extension storage.
```

### `bookmarks`

```text
Used only in the command palette so users can search their Chrome bookmarks locally.
```

### `clipboardWrite`

```text
Used for user-triggered copy actions, including copying AI results and copying the current page context to the user's clipboard.
```

### Content Script Site Access: `<all_urls>`

```text
Aviso injects content scripts on webpages so the user can access the selection toolbar, command palette, in-page result panel, clipboard prompt, iframe bridge, and internal-only screenshot selection UI on the pages they are using. The extension does not use this site access to fetch arbitrary remote link bodies, run telemetry, inject ads, or send page content to Aviso servers. Page content is sent to a model provider only when the user manually triggers an AI action that needs that content.
```

### Host Permission: `https://api.openai.com/*`

```text
Used only for direct OpenAI API requests when the user selects/configures OpenAI and provides their own API Key.
```

Public-release note:

```text
OpenAI host permission is implemented, but native OpenAI live validation is still a release gate before public provider claims.
```

### Host Permission: `https://api.anthropic.com/*`

```text
Used only for direct Anthropic API requests when the user selects/configures Anthropic and provides their own API Key.
```

Public-release note:

```text
Anthropic host permission is implemented, but native Anthropic live validation is still a release gate before public provider claims.
```

### Host Permission: `https://ark.cn-beijing.volces.com/*`

```text
Used only for direct 豆包 / 火山方舟 OpenAI-compatible API requests when the user selects/configures 豆包 and provides their own API Key.
```

Public-release note:

```text
豆包 / 火山方舟 has passed the current user-triggered single-provider connectivity test.
```

## Graphic Assets

Official listing requirements include a 128x128 store icon, at least one 1280x800 screenshot, a 440x280 small promo tile, and an optional 1400x560 marquee tile. Dashboard wording should be rechecked at submission time.

Current local asset state:

| Asset | Status | Notes |
| --- | --- | --- |
| 128x128 icon | Available in extension package | Must confirm final PNG is the intended brand icon. |
| 1280x800 screenshots | Placeholder drafts only | `docs/store/assets/store-screenshot-01-context-actions.png`, `docs/store/assets/store-screenshot-02-result-panel-history.png`, and `docs/store/assets/store-screenshot-03-ai-settings-boundary.png` are not final-quality assets. Redo for BYOK basic launch before submission. |
| 440x280 small promo tile | Placeholder draft only | `docs/store/assets/aviso-small-promo-tile.png` is not final-quality. Redo before submission. |
| 1400x560 marquee promo tile | Optional placeholder draft only | `docs/store/assets/aviso-marquee-promo-tile.png` is not final-quality. Redo only if the dashboard/use case requires it. |
| YouTube promo video | Missing | Do not add unless required by dashboard or product owner chooses to create one. |
| `aviso-social-card.png` | Placeholder draft only | `website/static/img/aviso-social-card.png`, 1200x630 PNG. Uses conservative current-capability copy and avoids secrets, private pages, real accounts, login, quota, subscription, payment, or hosted-AI claims. Recheck after BYOK basic-launch store direction is finalized. |

### Screenshot Plan

Use only synthetic or public-safe pages. Do not show real API Keys, private webpages, private account pages, customer data, provider raw errors, raw prompts, raw responses, or private screenshots.

Recommended screenshots:

1. Popup settings with API Key fields masked and privacy说明 visible.
2. Selection toolbar on a local/public test page.
3. In-page result panel showing a sanitized AI response from a public demo page.
4. Command palette searching history/bookmarks or asking a short public question.
5. Copy current context confirmation UI. Do not use screenshot UI in public store assets unless the owner later reopens it beyond internal-only review.

## Release Notes Draft

```text
Aviso 0.1.0 prepares the first internal dogfood release for a current-page AI assistant in Chrome.

Included:
- Right-click AI actions for selected text, links, pages, images, and custom templates.
- Selection toolbar for explain, translate, refine, summarize, and ask AI.
- Command palette for local history, bookmarks, and direct questions.
- In-page result panel with streaming output, copy, save, and follow-up.
- Manual single-provider connectivity test with redacted summary.
- Copy current context, translation MVP, and UI polish for internal dogfood.

Known limitations:
- Users need their own provider API Key.
- Provider first-token latency can vary.
- Remote link body fetching is not implemented.
- OpenAI / Anthropic native live validation remain public-release gates.
- Screenshot understanding remains internal-only unless the owner later reopens it for public positioning and validation.
```

## Final Pre-Submission Checklist

- [ ] Owner confirms Chrome Web Store developer account and publisher identity.
- [ ] Owner confirms whether public release can proceed with provider-limited claims.
- [ ] Chrome Web Store privacy declaration is filled from the latest dashboard wording.
- [ ] Privacy policy URL is live and matches the final dashboard declaration.
- [x] Store screenshot drafts are created locally in `docs/store/assets/` using synthetic or masked content.
- [ ] Final store screenshots are selected by the owner, sanitized against final copy / manifest / privacy declarations, and scanned before submission.
- [x] Small promo tile is created locally at `docs/store/assets/aviso-small-promo-tile.png`; scan again with final screenshot/promo package before submission.
- [x] Optional marquee tile draft is created locally at `docs/store/assets/aviso-marquee-promo-tile.png`.
- [ ] Optional marquee tile final-use decision is made by the owner.
- [x] `aviso-social-card.png` is created locally at `website/static/img/aviso-social-card.png`; verify after website deployment.
- [ ] OpenAI native validation is either completed or explicitly excluded from public claims.
- [ ] Anthropic native validation is either completed or explicitly excluded from public claims.
- [ ] Real vision-provider validation is either completed or screenshot understanding is kept as internal dogfood / limited claim.
- [ ] Final `npm test`, `npx tsc --noEmit`, `npm run build`, and `npm run package` pass.
- [ ] Final package manifest permissions and content script matches are reviewed.
- [ ] Final source, build, package, screenshots, promo assets, and store copy pass secret/leakage scan.
- [ ] Release tag and rollback point are created before submission.
