# Aviso v1.0 Public Launch Requirements

Date: 2026-06-03

Status: Current formal v1.0 requirements source. Docs-only; design, architecture, implementation, policy rewrite, and public release are not complete.

## Positioning

Aviso v1.0 should be a browser AI assistant that ordinary users can install and use immediately. The product should no longer assume that most users already understand provider configuration or own usable API Keys.

The v1.0 launch direction is:

- Default path: Aviso provides a default hosted AI capability under the Aviso brand.
- Free start: users receive an anonymous free quota before login.
- Upgrade path: when the anonymous quota is exhausted, the product triggers login and subscription guidance.
- Advanced path: users who do not want a subscription can still configure their own API Keys.
- Local utility path: non-AI browser actions remain usable without login or provider configuration where possible.

This changes the public-launch plan from a BYOK-first tool into a default-usable browser assistant with BYOK as an advanced fallback.

## Launch Version Scope

### v1.0 P0 Requirements

| Area | Requirement | Notes |
|------|-------------|-------|
| Default AI capability | Provide a default Aviso AI route for public users. | Requires backend, auth/quota, billing, privacy, and store-copy updates before implementation. User-facing route labels use "Aviso", not a separate hosted-service product name. |
| Anonymous free quota | Allow no-login users to use a small free quota. | Quota exhaustion should trigger login, not block the user with API setup first. |
| BYOK fallback | Keep user-owned API Key configuration as an advanced path. | Generic provider configuration is low priority and can be improved after launch. |
| Command palette | Make the command palette the primary product entry. | Supports direct natural-language instructions and quick actions. |
| Screenshot workflow | Enhance screenshot so captured images can be copied, saved locally, or sent to AI. | The current screenshot-to-AI internal dogfood path is not enough for v1.0. |
| Selection translation | Translate short selected text immediately in-place. | Do not force short translations into the full AI result panel. |
| Long translation routing | Route long or unsuitable translation content into the result panel. | Inline cards should stay compact and readable. |
| Double-click shortcut | Add a double-click shortcut menu using the dropdown/right-click menu component style. | Must not reuse the horizontal selection toolbar. |
| Privacy boundary | Update privacy policy, store declarations, and product copy for Aviso. | Current docs still describe the direct-provider-only model. |
| Design finalization | Complete UI/UX design before development issue splitting. | Development should start only after the interaction states are reviewed. |

### v1.0 P1 Requirements

| Area | Requirement | Notes |
|------|-------------|-------|
| Screenshot prompt | Do not add a prompt field to the v1.0 P0 screenshot overlay. | Optional screenshot prompts require a later explicit design decision so the current overlay does not become a separate popup. |
| Screenshot overlay action toolbar | Extend the existing screenshot overlay toolbar with copy, save, cancel, and send-to-AI actions after a region is selected. | Must include retry, loading, success, and failure states without adding a separate screenshot popup. |
| Translation inline card | Provide copy, replace where safe, send to result panel, and error states. | Replacement should avoid unsafe editable or page-breaking contexts. |
| Command templates | Surface custom templates from command palette and double-click menu. | Template management can remain in settings. |
| Quota UI | Show remaining free quota and login/upgrade states. | Copy should avoid exposing technical billing details. |
| Settings IA | Separate default AI account, BYOK provider settings, privacy, templates, and history. | BYOK should not dominate first-run setup. |

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
- Public claims that OpenAI, Anthropic, or vision providers are validated unless the release checklist has current validation evidence.

## Core User Modes

| Mode | Who it serves | Expected experience |
|------|---------------|---------------------|
| Anonymous free user | First-time public user | Install, use default AI features immediately, then see login when quota is exhausted. |
| Logged-in free user | User who wants more continuity | Gets account-linked quota, usage history where supported, and clear upgrade path. |
| Subscriber | User who wants predictable usage | Uses Aviso as default, without managing external API Keys. |
| BYOK user | Power user or privacy/cost-sensitive user | Can use own API Keys instead of subscription, with provider limitations clearly shown. |
| Local-only user | User not ready to send data to AI | Can still use copy context, screenshot copy/save, and local UI actions where possible. |

## Screenshot Requirements

The v1.0 screenshot flow should support three user outcomes after capture:

- Copy image: copy the selected screenshot image to the system clipboard so it can be pasted into another chat, document, note, or design tool.
- Save locally: save the selected screenshot image to the user's computer.
- Send to AI: send the selected screenshot image to the configured AI route, optionally with a user prompt.

Required states:

- Start from command palette, double-click menu, or context menu.
- Draw visible-page selection.
- Select, cancel, or retry the region.
- Keep the existing overlay visible and show the expanded action toolbar after a valid region is selected.
- Show copy success/failure.
- Show save success/failure.
- Show AI send loading, success, unsupported-model error, quota error, and login-required state.

Privacy and permission requirements:

- Screenshot/base64 data must not be written to history, storage, docs, logs, telemetry, or release artifacts.
- Sending to AI must not attach the full page URL unless a later design explicitly requires it and privacy copy is updated.
- Local save should avoid new permissions if browser APIs support a reliable user-mediated download path. If `downloads` is required, record it as a separate permission decision before implementation.

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
- Include loading, retry, quota, login-required, and provider-not-configured states.
- Respect page boundaries, scroll, iframe, and dark/light backgrounds.

Translation boundaries:

- Translation input should remain selected text or user-entered text.
- Do not include page URL, link URL, page body, screenshots, clipboard content, or full-page DOM content as translation input.
- Do not add third-party translation fallback in v1.0.
- Full-page translation is a later design candidate and may eventually replace part of selection translation.

## Command Palette Requirements

The command palette is the future main entry point for Aviso.

Required default quick actions:

- Screenshot.
- Copy context.
- Custom templates.
- Page summary.

Required behaviors:

- Support direct natural-language instruction in the input.
- Dispatch local actions and AI actions from the same entry.
- Show quota/login/provider state without forcing users into settings first.
- Keep history/bookmark search useful, but do not let search-only behavior dominate the main product entry.
- Support keyboard navigation and clear empty, loading, no-result, error, and quota-exhausted states.

## Double-Click Shortcut Requirements

The double-click shortcut is a compact contextual entry for frequent page actions.

Default menu actions:

- Screenshot.
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

v1.0 should not require login before the first useful AI interaction.

Required flow:

1. User installs Aviso.
2. User uses a default AI feature with anonymous quota.
3. Quota is consumed by AI requests only, not by local-only actions.
4. When anonymous quota is exhausted, the product prompts for login.
5. After login, user can continue with free account quota, subscription, or BYOK.

BYOK requirements:

- Keep BYOK available as an advanced option.
- Do not make generic API configuration a v1.0 blocker.
- Make it clear whether the active request uses Aviso or the user's own provider.
- Keep API Key storage and validation behavior aligned with the existing privacy/security docs until a new implementation decision changes it.

## Design Finalization Workflow

Design should be finalized before development issue splitting.

### Design Package Required Before Development

The design package should include:

- Information architecture: first-run, command palette, result panel, settings, quota, BYOK, templates, history.
- User flows: anonymous first use, quota exhaustion, login, subscription, BYOK setup, local-only usage.
- Component specs: command palette, double-click dropdown, screenshot overlay action toolbar, inline translation card, quota banners, login prompts, settings pages.
- State specs: empty, loading, streaming, success, failure, provider unsupported, quota exhausted, login required, BYOK missing, network failure.
- Privacy copy: what is local, what goes to Aviso, what goes to a user-owned provider, and what is never stored.
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
| V1-002 Aviso architecture/privacy decision | Backend route, provider routing, auth, quota, logging, retention, billing boundary. | V1-001 |
| V1-003 quota/login/subscription UX | Anonymous quota, login trigger, account state, upgrade prompts. | V1-001, V1-002 |
| V1-004 command palette main entry | Quick actions, direct instructions, quota/provider states. | V1-001 |
| V1-005 screenshot enhancement | Copy, save, cancel, send-to-AI, states, and privacy controls in the existing screenshot overlay toolbar. | V1-001 |
| V1-006 inline selection translation | Immediate inline result, long-content routing, copy/follow-up states. | V1-001, V1-002 |
| V1-007 double-click dropdown shortcut | Dropdown-style contextual menu and settings toggle. | V1-001 |
| V1-008 BYOK settings cleanup | Keep existing provider config but make it advanced and clearer. | V1-001 |
| V1-009 public release copy and policy | Privacy policy, store declarations, screenshots, support copy, release notes. | V1-002 to V1-008 |

## Acceptance Criteria For v1.0 Planning

- v1.0 public launch is documented as default-AI-first, not BYOK-first.
- Anonymous free quota and login-after-quota are documented.
- BYOK is retained as an advanced fallback.
- Screenshot copy/save/send-to-AI is documented.
- Selection translation is documented as immediate inline translation for short text.
- Command palette is documented as the primary entry.
- Double-click dropdown shortcut is documented and explicitly separated from the selection toolbar.
- Browser Session and Agent are explicitly out of v1.0.
- Design finalization is documented as the next required phase before development splitting.
- Privacy and release documents call out that Aviso changes the current no-backend data model.
- User-facing route and access copy uses "Aviso" as the brand name and does not introduce a separate hosted-service product name.
- V1-002 architecture/privacy decision must be documented before hosted AI implementation, while implementation and public policy rewrite remain separate gates.
