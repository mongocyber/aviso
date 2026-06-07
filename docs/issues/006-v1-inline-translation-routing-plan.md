# Issue 006: V1-006 Inline Selection Translation Routing Plan

Status: P0 implemented and loaded-extension user QA passed; future work is regression-only unless scope is reopened.

Date: 2026-06-04

## Summary

This file now records the safety, routing, and QA contract for the V1-006 inline selection translation P0 implementation.

Current product truth:

- Aviso is still `v0.1 internal dogfood / 内部试用版` with v0.2-alpha BYOK direct-provider translation through the existing result panel.
- Existing V2-007 translation already limits provider input to selected text or command-palette user input.
- V1 inline translation card P0 is implemented in the current workspace and passed loaded-extension user QA. Hosted Aviso AI, anonymous quota, login, subscription, provider proxy, and payment are not implemented.
- Product decision on 2026-06-04: V1-006 must include a user-facing enable/disable switch and a target-language option. Do not auto-enable inline instant translation without those controls.
- `src/utils/prompts.ts` does not exist in the current tree; translation prompt and payload handling currently live in `src/background/ai-client.ts` and `src/utils/translation.ts`.

Recommended next step:

- Treat V1-006 as passed for P0. Future work should only run regression checks for the default-off setting, target-language option, short selection card, long selection fallback prompt, copy, retry, result-panel handoff, and unsafe editable/input exclusions unless the owner reopens scope.

## Sources Reviewed

- Session-provided `AGENTS.md` instructions. The worktree does not contain a physical `AGENTS.md` file.
- `CLAUDE.md`
- `README.md`
- `STATUS.md`
- `RELEASE_CHECKLIST.md`
- `docs/specs/aviso-v1-public-launch.md`
- `docs/issues/003-v1-public-launch-issue-map.md`
- `docs/07_PRIVACY_AND_SECURITY.md`
- `docs/specs/v1-backend-api-contract.md`
- `src/contents/toolbar.tsx`
- `src/contents/floating.tsx`
- `src/background/index.ts`
- `src/background/ai-client.ts`
- `src/background/context-menus.ts`
- `src/contents/command.tsx`
- `src/types/messages.ts`
- `src/utils/storage.ts`
- `src/utils/translation.ts`
- `tests/unit.test.ts`
- `package.json`

## Non-Scope

- No `src/*` implementation changes in this thread.
- No `website/*` changes.
- No `package.json`, manifest, permission, host permission, dependency, or storage key changes.
- No real provider API calls.
- No hosted AI, quota, login, payment, provider proxy, or backend wiring.
- No Git commit, push, tag, package, release artifact, or Chrome Web Store action.

## Product Goal

For short selected text, Aviso should show the translated result near the selection so the user can keep reading without opening the full result panel.

For long text, unsafe placement, provider/account problems, or follow-up-heavy workflows, Aviso should fall back to the existing result panel.

The feature must remain user-controlled:

- Add a clear setting for inline instant translation; default off for first implementation unless the owner explicitly approves default on.
- Add a target-language option. P0 recommended labels: `自动`, `中文`, `英文`, `日文`, `韩文`, `西班牙文`, `法文`, `德文`.
- `自动` should preserve the existing Chinese/English auto-translation behavior where appropriate; explicit language choices should override that behavior for inline translation output.
- Keep the existing toolbar `翻译` button path available even when inline instant translation is disabled.

## Routing Recommendation

### Short Text Inline Card

Use inline translation only when all conditions are true:

| Condition | Recommended P0 threshold |
|---|---|
| Source text length | 1 to 500 trimmed characters |
| Source text lines | 8 lines or fewer |
| Selection rect | At least one non-zero `DOMRect` with enough viewport room for a compact card |
| Context | Normal selection context, not password input, not code editor, not unsafe editable flow |
| User setting | Inline instant translation setting is enabled |
| Target language | Target-language setting is available; default is `自动` unless changed by the user |
| Payload | `operation=translate` with `selectionText` or `userMessage` only |
| Route state | Active BYOK provider is configured, or a future mocked/real Aviso route reports available |

Notes:

- The threshold should be conservative. Users selecting longer text should get the result panel rather than a crowded inline card.
- The first implementation can use source-text length only. It does not need to estimate target-language expansion.
- Command-palette input such as `翻译 hello` should continue using the command palette/result-panel path unless a later design explicitly asks for inline command results.

### Long Text Result Panel Fallback

Route directly to the result panel when any condition is true:

| Fallback reason | Examples |
|---|---|
| Long source | More than 500 characters or more than 8 lines |
| Complex source | Large code block, table-like text, multiline legal/financial content, or text that would make the card taller than a compact reading aid |
| Needs follow-up | User selects "send to result panel", retry with follow-up, or result needs streaming history |
| Unsafe inline placement | Selection rect unavailable, iframe placement cannot be confirmed, viewport space is insufficient, or page zoom/layout makes the card overlap important UI |
| Account/provider blocked | API key missing, provider unsupported, network failure, quota exhausted, login required, or route state unknown |

### Unsafe Placement Fallback

If inline placement is uncertain, fail closed to the existing result panel rather than trying to force a card onto the page.

Unsafe placement includes:

- `window.getSelection()` has no usable range or all rects are zero-sized.
- The selected text is inside a cross-origin or nested iframe where the local frame cannot reliably render the card near the selection.
- The selected text is inside or near an input, password field, `textarea`, `contenteditable`, known code editor, or rich editor.
- The calculated card would be clipped by viewport edges, fixed headers, or small iframes.
- The page has aggressive transforms or unusual zoom behavior that makes coordinates unreliable.

## Payload Boundary

For translation, the provider or hosted route payload must contain only one of:

- selected text
- user-entered text

Explicitly forbidden as translation input:

- page URL
- link URL
- page body
- remote link body
- screenshot or screenshot base64
- clipboard content
- full DOM
- prior conversation context
- raw prompt / raw response logs

Implementation must keep `sanitizeTranslationPayload` or an equivalent pre-provider guard as the final safety boundary. UI routing should not be the only protection.

## Inline Card States

The inline card should support these P0 states:

| State | Behavior |
|---|---|
| Loading | Compact card near selection, translated-text area reserved, close available. |
| Success | Show translated text directly. No extra explanation or title inside the result body. |
| Copy | Copy translated text only. No provider call, no storage write. |
| Retry | Reuse the same sanitized source text and route. Do not add URL/page/body context on retry. |
| Send to result panel | Open the existing result panel. Prefer reusing the completed translated output without a second provider call when possible; otherwise route the original sanitized translation request through the result panel. |
| Close | Close the card. If loading, abort or ignore the in-flight request using the existing request-id cancellation pattern. |
| Network error | Show concise failure copy and retry. No raw provider detail. |
| Provider missing | BYOK: ask the user to configure a provider/API key. Future Aviso route: show unavailable/planned state until implemented. |
| Quota exhausted | Future state only. Route to login/upgrade copy after V1-002/V1-003 implementation exists. |
| Login required | Future state only. Do not show a live login action until auth exists. |
| Unsupported route | Fall back to result panel or show a readable unsupported-provider state. |

## Settings Contract

V1-006 implementation must add settings only as non-secret `chrome.storage.sync/contextai_settings` fields. Do not store API keys, raw selected text, translated text, prompt text, or provider responses in sync storage.

Recommended P0 fields:

| Field | Type | Recommended default | Purpose |
|---|---|---|---|
| `enableInlineTranslation` | boolean | `false` | Enables automatic inline translation after safe short-text selection. |
| `inlineTranslationTargetLanguage` | string | `auto` | Controls output language for the inline translation card. |

Target-language labels should be natural Chinese in Popup settings. Internal values should be stable ASCII identifiers such as `auto`, `zh-CN`, `en`, `ja`, `ko`, `es`, `fr`, `de`.

The implementation should not add new host permissions, new provider routes, new dependencies, hosted AI, backend, auth, quota, subscription, payment, telemetry, or analytics.

The result panel fallback should keep its existing copy/save/stop/follow-up behavior.

## Replace Decision

Recommendation: do not include replace in P0 implementation.

Reason:

- Current code has no dedicated safe text-replacement utility.
- Selection can occur in ordinary pages, iframes, inputs, `contenteditable`, rich editors, and third-party editors with fragile selection state.
- Unsafe replacement can alter user content, break page state, or insert text into the wrong frame.
- The v1 spec says replace only "where safe"; current evidence is not sufficient to define safe replacement broadly.

P0 behavior:

- Show copy as the primary local action.
- Show "send to result panel" for follow-up.
- Do not show a replace button unless a later issue defines a strict safe-editing contract and tests it.

Future replace issue can be considered after P0 if it separately covers:

- plain `input` and `textarea` only
- focused element and selection ownership checks
- no password fields
- no rich editors or code editors
- iframe frame identity checks
- undo behavior expectations
- manual QA in Google Docs / Notion / Gmail / common editors before any public claim

## iframe And Editable Safety

Current facts:

- `src/contents/toolbar.tsx` runs in all frames.
- `src/contents/floating.tsx` runs only in the top frame.
- `src/background/frame-router.ts` is already used to route floating-window messages back to a display frame.

Implementation guidance:

- Inline card rendering should happen in the same frame that owns the selection when possible.
- If the same-frame card cannot be rendered safely, route to the existing result panel.
- Do not auto-replace text inside editable fields in P0.
- Do not trigger inline card inside password fields, code editors, or uncertain `contenteditable` surfaces.
- Keep one active inline card per frame and close it on selection change, scroll, `Esc`, outside click, route fallback, or request completion if the user closes it.

## Provider, Network, Quota, Login, And BYOK States

Current implementation state:

- BYOK direct-provider route is real.
- Hosted Aviso AI, quota, login, subscription, and payment are not implemented.
- API keys remain encrypted in `chrome.storage.local/contextai_api_keys`.
- Non-secret settings remain in `chrome.storage.sync/contextai_settings`.

P0 implementation should map states as follows:

| State source | Inline card behavior |
|---|---|
| BYOK API key missing | Do not call provider. Show "需要先在设置中配置 API Key" and offer result-panel/settings path if existing UI supports it. |
| Doubao model missing | Do not call provider. Show readable provider setup error. |
| Provider network failure | Show retry and result-panel fallback. |
| Provider returns normalized error | Show normalized message only; no raw provider body. |
| Hosted Aviso route unavailable | Treat as planned/unavailable unless V1-002/V1-003 implementation exists. |
| Quota state missing or unknown | Fail closed for hosted AI; BYOK can continue if configured. |
| Quota exhausted | Future state only; show mocked/planned copy only in design contexts until backend exists. |
| Login required | Future state only; do not add `/login/` route or live auth action in V1-006. |

## Follow-Up Implementation Scope

Allowed files for the implementation thread:

- `src/contents/toolbar.tsx`
- `src/contents/floating.tsx`
- a new inline card content component under `src/contents/` if needed
- `src/background/index.ts`
- `src/background/context-menus.ts`
- `src/background/ai-client.ts`
- `src/types/messages.ts`
- `src/utils/translation.ts`
- `src/utils/storage.ts` only for the two approved non-secret V1-006 settings fields; no storage migration and no secret storage changes
- `tests/unit.test.ts`
- relevant internal docs: `STATUS.md`, `RELEASE_CHECKLIST.md`, `docs/07_PRIVACY_AND_SECURITY.md`, and this issue file

Files to avoid unless separately approved:

- `package.json`
- manifest fields
- `website/*`
- auth, payment, hosted backend, or provider proxy files
- new dependency files
- storage migration files

## Automated Test Matrix

Minimum tests for the implementation thread:

| Area | Test expectation |
|---|---|
| Payload sanitization | Translation strips `pageUrl`, `linkUrl`, `pageContent`, `srcUrl`, `priorContext`, screenshot, clipboard, and full DOM fields before provider build. |
| Source priority | Selection text wins over user input for selection translation; command-palette target uses `userMessage`. |
| Empty input | Empty translation is blocked before provider start. |
| Inline threshold | `<=500` chars and `<=8` lines can route inline; above threshold routes result panel. |
| Inline setting disabled | Selecting text does not auto-open inline card when `enableInlineTranslation` is false; toolbar `翻译` still works. |
| Target language | Explicit target-language setting is reflected in the translation request instructions without adding URL/page/body context. |
| Unsafe placement | zero rect, missing range, editable unsafe, iframe uncertainty, or insufficient viewport space routes result panel. |
| Retry | Retry reuses sanitized source only. |
| Copy | Copy uses translated text only and does not call provider again. |
| Close/cancel | Closing a loading card cancels or ignores the request by request id. |
| Error mapping | API key missing, network error, provider normalized error, quota/login placeholders, and unsupported route show safe user-facing states. |
| Permissions | `package.json` permissions and host permissions remain unchanged. |

Recommended commands after implementation:

```bash
npm test
npx tsc --noEmit
npm run build
git diff --check
git status --short
```

For this docs-only thread, only `git diff --check` and `git status --short` are required.

## Regression QA Matrix

For future regressions, load the extension and verify:

| Surface | Cases |
|---|---|
| Normal article page | Short selection shows inline card; copy works; close works. |
| Long selection | Routes to result panel without inline card crowding. |
| Dark page | Card remains readable and does not obscure selected text. |
| Small viewport | Card either fits safely or falls back to result panel. |
| iframe | Same-frame selection works only if placement is reliable; otherwise result-panel fallback. |
| Editable/input | No replace in P0; no unsafe card in password/code/rich editor contexts. |
| Provider missing | No provider call; readable setup error. |
| Network failure | Retry and fallback are visible; raw provider details are not shown. |
| Command palette `翻译 hello` | Existing result-panel translation still works; no regression. |
| Right-click selection translation | Existing path still works or intentionally routes through inline card when short and safe. |
| Selection toolbar translation | Short safe text routes inline; long/unsafe routes result panel. |
| Logs | No raw selected text, page body, URL, screenshot/base64, raw prompt, raw response, or API key in console/storage/history beyond existing intended history behavior. |

## Stop Conditions

The implementation thread must stop and report before:

- adding permissions, host permissions, or dependencies
- changing `package.json` manifest fields
- adding hosted AI, backend, auth, quota, subscription, payment, or provider proxy calls
- running real provider API validation
- adding third-party translation fallback
- adding full-page DOM translation
- adding broad remote-link body fetching
- storing translation cache or new storage keys
- logging raw selected text, page body, screenshots, provider prompts/responses, or API keys
- implementing replace for editable content
- adding public website/store claims that inline translation is live

## Merge Recommendation

This file now records the passed V1-006 P0 implementation and regression contract. Further V1-006 work should be limited to regression fixes unless the owner explicitly reopens scope.
