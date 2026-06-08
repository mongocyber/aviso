# Aviso v1.0 Public Launch Requirements

Date: 2026-06-03

Status: Scope cleanup required. This file was originally written for a default-hosted public launch, but the 2026-06-05 owner decision re-scopes v1.0 to a simplified BYOK basic launch. Hosted Aviso AI, anonymous quota, login, subscription, payment, provider proxy, remote link-body fetching, and web search are future-state only and are not v1.0 basic launch acceptance items.

## 2026-06-05 Scope Override

The current v1.0 basic launch direction is:

- Keep the real BYOK direct-provider model as the current product boundary.
- Keep API Keys encrypted in `chrome.storage.local/contextai_api_keys`.
- Keep non-secret settings in `chrome.storage.sync/contextai_settings`.
- Do not implement or publicly imply login, subscription, payment, anonymous quota, hosted Aviso AI, provider proxy, backend fetch, remote link-body summarization, or web search.
- Pause ordinary-user screenshot promotion until the owner decides whether screenshot entry points should be hidden, removed, or kept internal-only.
- Add UI language localization as a public-launch requirement: default to Chrome UI language for Chinese / English, and keep a Settings override for `自动` / `中文` / `English`.
- Treat current Chrome Web Store screenshots and promo images as placeholder drafts, not final store assets.

Historical hosted-AI planning below remains useful only as future reference. It must not be used as current implementation authorization.

## Positioning

Aviso v1.0 basic launch should be a browser AI assistant that can be safely shipped from the current BYOK direct-provider foundation. The immediate priority is a clear, reliable, privacy-consistent extension experience rather than a new hosted AI business model.

The v1.0 launch direction is:

- Default path for v1.0 basic launch: users configure their own provider API Keys.
- Supported provider path: browser extension direct calls to approved provider hosts only.
- Local utility path: non-AI browser actions remain usable without login or provider configuration where possible.
- Future path: hosted Aviso AI, quota, login, subscription, and payment may be reopened later through a separate decision and implementation plan.

This overrides the earlier public-launch plan that moved Aviso from BYOK-first to default-hosted. That earlier direction is now future-state reference only.

## Launch Version Scope

### v1.0 P0 Requirements

| Area | Requirement | Notes |
|------|-------------|-------|
| BYOK provider setup | Keep user-owned API Key configuration clear and safe. | This is the current real AI path, not a fallback. |
| Default model state | Show configured / missing / failed provider state clearly. | Already partly implemented through V1-008; keep manual-only provider validation. |
| Command palette | Keep command palette useful for direct instructions, local history/bookmark search, and local quick actions. | Remove or weaken mocked quota/login/subscription presentation from v1.0 basic acceptance. |
| Screenshot workflow | Pause ordinary-user promotion while entry strategy is decided. | Existing code may remain, but do not use screenshot as a store selling point or required basic-version QA item until owner confirms. |
| Selection translation | Translate short selected text immediately in-place. | Do not force short translations into the full AI result panel. |
| Long translation routing | Route long or unsuitable translation content into the result panel. | Inline cards should stay compact and readable. |
| Double-click shortcut | Keep as default-off contextual shortcut pending manual QA. | It must not replace the selection toolbar or add provider/auth/payment behavior. |
| Result panel and history | Keep local conversation autosave usable and bounded. | Local-only `chrome.storage.local/contextai_history`; no raw provider response or screenshot/base64 persistence. |
| Template menus | Keep custom templates synchronized to context menus. | Non-secret settings only; no API Key migration. |
| UI language | Default Aviso UI to Chrome UI language and allow `自动` / `中文` / `English` override in Settings. | English Chrome users must not see a Chinese-only extension UI by default. |
| Privacy boundary | Keep public copy aligned with BYOK direct-provider and no backend. | Hosted AI/account/payment copy is not current. |

### Popup v1 Basic Settings Panel

The v1.0 basic launch Popup is a four-tab settings panel, not a developer-style API form. The tabs are `设置`, `AI 服务`, `记录`, and `指令`.

Required `设置` tab:

- Header shows the Aviso brand, Popup-only theme switcher (`浅色` / `深色` / `跟随系统`), and version number.
- Theme preference is a non-secret `appearanceTheme: "light" | "dark" | "system"` field in existing `chrome.storage.sync/contextai_settings`; default is `system`.
- Popup theme switching affects only the Popup settings panel. It must not change content scripts, result panels, command palette, or webpage styles.
- UI language preference is a non-secret setting in existing `chrome.storage.sync/contextai_settings`; default is `auto`, resolved from Chrome UI language, with explicit `中文` and `English` overrides.
- Current model area shows `当前模型`, provider state badge, manual test/refresh control, and a model dropdown.
- Model dropdown only makes configured services selectable and includes an `添加 AI 服务` entry. Unconfigured or failed providers must not look available.
- Common feature rows include `划词工具栏`, `命令面板`, `剪贴板提示`, `双击入口`, and `内联翻译`, each with title, helper copy, and a toggle. Inline translation keeps its language selector on the same row.
- Local-available cards include `复制上下文`, `搜索记录`, and `恢复对话`; these are local actions or local navigation and do not imply provider availability.
- Footer shows autosave status and `隐私说明`.

Required `AI 服务` tab:

- Top card says `配置和连通测试` and explains that configured and tested services enter the Settings model dropdown.
- `服务配置` toolbar has an `添加` dropdown with `豆包 / 火山引擎`, `OpenAI`, and `Anthropic`.
- Provider cards show title, status pill, manual test, save, cancel, and delete controls, API Key input, model/endpoint input where supported, configuration state, and test-state summary.
- Non-editing or loaded API Key values must be masked at most. The Popup must not read, print, log, or display full real keys.
- Bottom privacy boundary card states the no-project-server direct-provider model.

Required `记录` tab:

- Top card says `最近对话会自动保存`.
- The tab provides `清空全部`, row title, summary, relative time, restore-on-click, and delete controls.

Required `指令` tab:

- Top card says `常用指令`.
- Instruction cards show title, prompt summary, edit, and delete controls.
- `添加常用指令` remains the primary add path and preserves the existing template data model.

### v1.0 P1 Requirements

| Area | Requirement | Notes |
|------|-------------|-------|
| Screenshot prompt | Do not add a prompt field to the v1.0 P0 screenshot overlay. | Optional screenshot prompts require a later explicit design decision so the current overlay does not become a separate popup. |
| Screenshot overlay action toolbar | Extend the existing screenshot overlay toolbar with copy, save, cancel, and send-to-AI actions after a region is selected. | Must include retry, loading, success, and failure states without adding a separate screenshot popup. |
| Translation inline card | Provide copy, replace where safe, send to result panel, and error states. | Replacement should avoid unsafe editable or page-breaking contexts. |
| Command templates | Surface custom templates from command palette and double-click menu. | Template management can remain in settings. |
| Quota UI | Future-state only. | Do not include in v1.0 basic launch acceptance. |
| Settings IA | Keep BYOK provider settings, privacy, templates, and history understandable. | Do not show login, quota, subscription, payment, or hosted AI entry as live. |

### v1.0 P2 / Next Iteration Candidates

| Area | Candidate | Notes |
|------|-----------|-------|
| Generic API configuration | Expand BYOK into a more universal provider configuration. | Low priority for public usability. |
| Full-page translation | Replace or reduce some selection-translation use cases. | Requires separate design, privacy, and permission review. |
| Result caching | Add optional cache for repeated translation or summaries. | Needs TTL, clear-cache control, and privacy copy. |
| Long-document processing | Chunking and progressive summaries. | Avoid overbuilding before v1.0 usage data exists. |
| Page highlights | Save important snippets back to local history. | Needs persistence and privacy review. |

## Explicit Non-Scope For v1.0

- Browser Session, including reusing ChatGPT, Claude, Gemini, or similar web subscriptions as the primary quota strategy.
- Agent mode, broad autonomous browsing, multi-tab aggregation, and voice input.
- Full-page DOM translation as a v1.0 P0 item.
- Google Translate, Baidu, Youdao, or other third-party translation fallback.
- Generic API marketplace or complex provider routing UI.
- Team accounts, enterprise admin, or shared workspaces.
- Hosted Aviso AI, anonymous quota, login, subscription, payment, provider proxy, backend implementation, checkout, account lifecycle, and pricing pages.
- Remote link-body fetching, backend link summarization, broad new host permissions, and web search.
- Ordinary-user screenshot promotion until entry strategy is confirmed.
- Public claims that OpenAI, Anthropic, or vision providers are validated unless the release checklist has current validation evidence.

## Core User Modes

| Mode | Who it serves | Expected experience |
|------|---------------|---------------------|
| BYOK user | Current v1.0 basic launch user | Uses own API Keys, with provider limitations clearly shown. |
| Local-only user | User not ready to send data to AI | Can still use copy context, screenshot copy/save, and local UI actions where possible. |
| Future hosted user | Later roadmap user | Hosted AI, login, quota, subscription, and payment require a separate reopened decision. |

## Screenshot Requirements

Screenshot is paused as an ordinary-user public selling point for the v1.0 basic launch. Existing implementation and QA notes may remain for internal review, but follow-up work must first decide whether the entry should be hidden, removed, or kept internal-only.

If screenshot remains internal-only or later returns to public scope, the privacy boundary stays:

- Screenshot/base64 data must not be written to history, storage, docs, logs, telemetry, or release artifacts.
- Sending to AI must keep the existing BYOK route and unsupported-model gates unless a later decision approves hosted AI.
- Local save should avoid new permissions if browser APIs support a reliable user-mediated download path. If `downloads` is required, record it as a separate permission decision before implementation.

Do not add quota error, login-required, subscription-required, or hosted route states to screenshot acceptance for the basic launch.

## Translation Requirements

Selection translation should be immediate by default:

- Short selected text: translate inline near the selected text.
- Long selected text: route to the result panel.
- Unsuitable inline content: route to the result panel.
- Command input such as `翻译 hello`: route through the command palette and show the appropriate translation result.

Inline translation card requirements:

- Show translated text directly, without requiring the user to click "send to AI".
- Include copy action.
- Include "send to result panel" when content is long, streaming, or needs follow-up.
- Include loading, retry, provider-not-configured, and provider-error states.
- Respect page boundaries, scroll, iframe, and dark/light backgrounds.

Translation boundaries:

- Translation input should remain selected text or user-entered text.
- Do not include page URL, link URL, page body, screenshots, clipboard content, or full-page DOM content as translation input.
- Do not add third-party translation fallback in v1.0.
- Full-page translation is a later design candidate and may eventually replace part of selection translation.

## UI Language Requirements

Aviso must not ship publicly as a Chinese-only UI in English Chrome. The v1.0 basic launch needs a small localization layer for Chinese and English UI surfaces.

Required behavior:

- Default setting is `自动`.
- In `自动`, Aviso resolves UI language from Chrome UI language.
- `zh-*` Chrome UI languages show Chinese UI.
- Non-Chinese Chrome UI languages show English UI until additional locales are explicitly added.
- Settings provides `自动` / `中文` / `English`.
- Explicit `中文` or `English` overrides Chrome UI language.
- The UI language setting is separate from the inline translation target-language setting.
- Locale resolution applies to Popup, command palette, result panel, selection toolbar, inline translation card, double-click menu, native context menus, screenshot overlay/toolbars if kept, toasts/errors, and extension manifest copy if Chrome localization is needed.

Boundaries:

- Do not change provider output language or translation target-language behavior.
- Do not add a remote localization service, provider call, telemetry, analytics, new permission, host permission, dependency, backend, hosted AI, provider proxy, storage key migration, or API Key behavior change.

## Command Palette Requirements

The command palette is the future main entry point for Aviso.

Required default quick actions:

- Copy context.
- Custom templates.
- Page summary.

Required behaviors:

- Support direct natural-language instruction in the input.
- Dispatch local actions and AI actions from the same entry.
- Show provider configuration state without forcing users into unrelated future account or payment flows.
- Keep history/bookmark search useful, but do not let search-only behavior dominate the main product entry.
- Support keyboard navigation and clear empty, loading, no-result, error, and provider-not-configured states.

## Double-Click Shortcut Requirements

The double-click shortcut is a compact contextual entry for frequent page actions.

Default menu actions:

- Copy context.
- Custom template.
- Page summary.

Conditional actions:

- Translate, explain, polish, or summarize selected text when a valid selection exists.

Design requirements:

- Use the dropdown/right-click menu component style from the design system.
- Do not reuse the horizontal selection toolbar.
- Use icon plus text labels, compact spacing, hover/focus states, and the same surface/shadow/radius language as the dropdown menu.
- Work on light and dark webpages.
- Close on `Esc`, outside click, scroll, or action completion.

Interaction restrictions:

- Do not trigger inside text inputs, password fields, code editors, or `contenteditable` areas.
- Provide a settings toggle to disable the double-click shortcut.
- Avoid interrupting native double-click text selection; the menu should appear only when the gesture is safe and predictable.

## Quota, Login, Subscription, And BYOK

Quota, login, subscription, and payment are removed from v1.0 basic launch scope. They were not forgotten; they are explicitly future-state.

Current required flow:

1. User installs Aviso.
2. User configures their own provider API Key if they want AI features.
3. API Key is encrypted in local extension storage.
4. AI requests go directly from the browser extension to the selected provider host.
5. Local-only actions remain usable where possible without login, subscription, quota, payment, or hosted AI.

BYOK requirements:

- Keep BYOK as the current real AI path for v1.0 basic launch.
- Do not make generic API marketplace configuration a v1.0 blocker.
- Make it clear which configured provider/model is active.
- Keep API Key storage and validation behavior aligned with the existing privacy/security docs until a new implementation decision changes it.

## Design Finalization Workflow

Design should be finalized before development issue splitting.

### Design Package Required Before Development

The design package should include:

- Information architecture: first-run, command palette, result panel, settings, quota, BYOK, templates, history.
- User flows: BYOK setup, provider configuration, local-only usage, inline translation, result panel history, double-click menu, template sync.
- Component specs: command palette, double-click dropdown, inline translation card, result panel, settings pages, and screenshot entry only if owner confirms its public or internal-only strategy.
- State specs: empty, loading, streaming, success, failure, provider unsupported, BYOK missing, network failure, and manual provider validation status.
- Privacy copy: what is local, what goes to a user-owned provider, and what is never stored.
- Chrome Web Store copy impact: permissions, data collection, host permissions, and privacy declarations.

### Recommended Sequence

1. Finalize v1.0 product scope in docs.
2. Produce low-fidelity flow diagrams for command palette, screenshot, translation, double-click, and quota/login.
3. Produce high-fidelity component designs for the same surfaces.
4. Review privacy, permissions, and store-copy changes against the designs.
5. Product-confirm the v1.0 design package.
6. Split development issues by capability and dependency.
7. Implement in small slices, with docs and QA evidence updated per slice.

## Development Issue Map After Design Confirmation

| Issue | Scope | Dependency |
|-------|-------|------------|
| V1-001 design package confirmation | Final flows, components, states, copy, and acceptance criteria. | This spec |
| V1-002 Aviso architecture/privacy decision | Future-state only; not in basic launch unless owner reopens hosted AI. | Reopened owner decision |
| V1-003 quota/login/subscription UX | Future-state only; not in basic launch. | Reopened owner decision |
| V1-004 command palette main entry | Quick actions, direct instructions, local actions, and provider configuration states. | V1-001 |
| V1-005 screenshot entry decision | Decide hidden / removed / internal-only before any ordinary-user QA or store claim. | Owner decision |
| V1-006 inline selection translation | Immediate inline result, explicit enable/disable setting, target-language option, long-content routing, copy/follow-up states. | V1-001, V1-002 |
| V1-007 double-click dropdown shortcut | Dropdown-style contextual menu and settings toggle. | V1-001 |
| V1-008 BYOK settings cleanup | Keep existing provider config but make it advanced and clearer. | V1-001 |
| V1-013 UI language localization | Default UI language follows Chrome UI language, with Settings override `自动` / `中文` / `English`. | V1-008, before V1-009 final copy |
| V1-009 public release copy and policy | Privacy policy, store declarations, screenshots, support copy, release notes. | V1-002 to V1-008 and V1-013 |

## Acceptance Criteria For v1.0 Planning

- v1.0 basic launch is documented as BYOK direct-provider first.
- Login, subscription, payment, anonymous quota, hosted AI, and provider proxy are documented as future-state non-scope.
- Screenshot ordinary-user promotion is paused until owner confirms hidden / removed / internal-only strategy.
- Selection translation is documented as immediate inline translation for short text, controlled by a user-facing setting and target-language option.
- Command palette is documented as a useful local/AI entry without live quota/login/subscription claims.
- Double-click dropdown shortcut is documented and explicitly separated from the selection toolbar.
- UI language localization is documented as a public-launch requirement, separate from translation target-language settings.
- Browser Session and Agent are explicitly out of v1.0.
- Privacy and release documents keep the current no-backend BYOK data model unless a future hosted-AI decision is reopened.
- User-facing route and access copy uses "Aviso" as the brand name and does not introduce a separate hosted-service product name.
- V1-002 / V1-003 hosted AI, quota, login, and subscription drafts are not implementation authorization for the basic launch.
