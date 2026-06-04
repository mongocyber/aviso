# Issue 005: V1-008 BYOK Settings Cleanup Feasibility

Status: feasibility report with a minimal 2026-06-04 implementation follow-up.

Date: 2026-06-03

Implementation follow-up: 2026-06-04

## Summary

V1-008 is feasible as a small Popup/settings information-architecture cleanup, but only if it stays UI-state and copy scoped. The safe v1.0 direction is to make BYOK an advanced fallback while preserving the current BYOK direct-provider implementation.

Current implementation remains:

- No hosted Aviso AI backend.
- No login, account, anonymous quota, subscription, payment, or provider proxy.
- BYOK direct-provider calls from the extension to OpenAI, Anthropic, or 豆包 / 火山方舟.
- API Keys encrypted in `chrome.storage.local` under `contextai_api_keys`.
- Non-secret settings in `chrome.storage.sync` under `contextai_settings`.

Therefore, V1-008 should not introduce new storage keys, migrate API Keys, add permissions, call providers, or present default Aviso AI as available. It can safely reorganize settings, label the current BYOK route more clearly, and show planned/disabled Aviso account states only as mock or unavailable UI.

2026-06-04 implementation note:

- Implemented the smallest Popup IA version: the top-level user-visible tab label changed from `API Key` to `AI`.
- Added a disabled/planned `Aviso AI` section that states default Aviso AI, anonymous quota, login, and subscription are not available in the current version.
- Kept OpenAI, Anthropic, and 豆包 / 火山方舟 key fields plus manual single-provider connectivity tests under `高级：使用自己的 API Key`.
- Added a route label derived from the current model/provider route only. No hosted Aviso provider was added.
- Did not change storage keys, API Key encryption, sync settings, manifest permissions, host permissions, dependencies, background routing, provider connectivity payloads, website files, or release artifacts.

## Sources Read

- Task-provided `AGENTS.md` rules. No repository `AGENTS.md` file is present in this worktree.
- `CLAUDE.md`
- `README.md`
- `STATUS.md`
- `RELEASE_CHECKLIST.md`
- `docs/specs/aviso-v1-public-launch.md`
- `docs/issues/003-v1-public-launch-issue-map.md`
- `docs/decisions/002-v1-aviso-ai-architecture-privacy.md`
- `docs/decisions/003-v1-quota-login-subscription.md`
- `docs/07_PRIVACY_AND_SECURITY.md`
- `src/popup/index.tsx`
- `src/utils/storage.ts`
- `src/utils/model-registry.ts`
- `src/utils/provider-connectivity.ts`
- `src/background/index.ts`
- `src/background/ai-client.ts`
- `src/types/messages.ts`
- `package.json`

## Current Facts

### Product And Release State

- Aviso is still `v0.1 internal dogfood / 内部试用版`, not public-release ready.
- v1.0 requirements change the intended public path from BYOK-first to default Aviso AI-first with BYOK as an advanced fallback.
- `docs/decisions/002-v1-aviso-ai-architecture-privacy.md` and `docs/decisions/003-v1-quota-login-subscription.md` are decision drafts only. They do not approve backend, auth, quota, subscription, payment, provider proxy, permission changes, privacy rewrite, or public launch.
- OpenAI and Anthropic code paths and host permissions exist, but live validation remains incomplete. 豆包 / 火山方舟 has a recorded manual single-provider success summary.

### Popup / Settings IA

`src/popup/index.tsx` currently has four top-level tabs:

- `常规`
- `API Key`
- `模板`
- `历史`

Current `常规` contains:

- Default model dropdown.
- Local feature toggles: selection toolbar, clipboard prompt, command palette.

Current `API Key` contains:

- A privacy note saying API Keys are AES-encrypted locally and not uploaded.
- Provider key fields for OpenAI, Anthropic, and 豆包 / 火山方舟.
- One manual `测试连接` button per provider.
- A 豆包接入点 ID / 模型名 field.

This means BYOK is still visually prominent as a main tab and remains the core setup path in the current UI.

### Storage Boundary

`src/utils/storage.ts` uses two existing storage areas:

- `chrome.storage.local` key `contextai_api_keys` for encrypted API Keys.
- `chrome.storage.sync` key `contextai_settings` for non-secret settings.

API Key behavior:

- `saveApiKey()` encrypts provider keys before writing to `contextai_api_keys`.
- `getApiKeys()` decrypts keys for runtime use.
- Popup loads saved keys only to display masked values ending in the last 4 characters.
- Popup skips saving empty values or masked placeholder values on blur.
- If the user enters a fresh value and clicks connectivity test, Popup saves that provider key before testing.

Settings behavior:

- `defaultModel`, `doubaoModel`, local feature toggles, and templates are saved to `contextai_settings`.
- `doubaoModel` is explicitly non-secret endpoint/model configuration.
- There is no current account state, quota state, subscription state, hosted route state, or active-route setting.

Boundary conclusion:

- API Keys must remain only in encrypted `chrome.storage.local` under `contextai_api_keys`.
- Sync settings must remain non-secret.
- V1-008 should not add `openaiApiKey`, `anthropicApiKey`, or any secret-like field to sync settings.

### Model Registry And Route State

`src/utils/model-registry.ts` defines exactly three provider IDs:

- `openai`
- `anthropic`
- `doubao`

The approved provider host permissions are:

- `https://api.openai.com/*`
- `https://api.anthropic.com/*`
- `https://ark.cn-beijing.volces.com/*`

Current routing:

- Default model is `gpt-4o-mini`.
- Registered OpenAI models route to OpenAI.
- Registered Claude models route to Anthropic.
- `doubao` routes to Ark OpenAI-compatible base URL and requires `doubaoModel`.
- Unknown non-Claude models fall back to OpenAI for compatibility.

There is no `aviso` hosted provider or default Aviso AI route in the registry. Adding one would be architecture work, not settings cleanup.

### Manual Provider Connectivity

Manual connectivity is implemented through:

- Popup button: `测试连接`.
- Message action: `VALIDATE_PROVIDER_CONNECTIVITY`.
- Background handler: `handleProviderConnectivityTest()`.
- Helper contract: `src/utils/provider-connectivity.ts`.

Current safety properties:

- User-triggered only.
- One provider at a time.
- Uses a fixed public prompt: `请用一句中文回答：连接测试成功。`
- Blocks before provider call if host permission is missing.
- Blocks before provider call if API Key is missing.
- Blocks before 豆包 test if endpoint/model is missing.
- Rejects connectivity payloads that include selected text, page content, URLs, screenshots, prior context, links, clipboard content, or template IDs.
- UI displays only a redacted summary with fixed fields.
- Summary declares no raw prompt, no raw response, no API Key, and no private page data logged.

V1-008 must preserve this behavior.

### Background / AI Client

`src/background/ai-client.ts` still routes real AI requests directly to the selected provider using decrypted BYOK keys in memory. It does not implement a hosted Aviso backend route.

Current request logging is timing/performance oriented:

- Logs operation labels, timing marks, provider/model labels, and input-length counts/buckets.
- Does not intentionally log raw prompts, raw responses, API Keys, page text, selected text, screenshots, or base64 payloads.

The existing direct-provider flow is compatible with BYOK advanced fallback, but it is not compatible with claiming default Aviso AI is live.

## Minimal Feasible V1-008 Cleanup

### Goal

Make the settings UI match the v1.0 direction without changing runtime data flow:

- Ordinary users see that Aviso default AI is planned or unavailable in this build.
- BYOK remains available but is grouped as advanced fallback.
- Power users can still configure and test providers exactly as today.
- Privacy and storage boundaries remain unchanged.

### Recommended UI Grouping

Use the existing Popup structure and avoid new routes.

Recommended top-level tabs:

- `常规`
- `AI`
- `模板`
- `历史`

Recommended `AI` tab sections:

- `Aviso AI` section:
  - Show disabled or unavailable state, for example `规划中，当前版本未上线`.
  - No login button, no quota counter, no subscription action, no backend call.
  - Do not persist this state.
- `高级：使用自己的 API Key` section:
  - Move the existing OpenAI / Anthropic / 豆包 key fields here.
  - Keep existing manual test buttons.
  - Keep 豆包接入点 ID / 模型名.
  - Add a clear route label derived from the selected model/provider, such as `当前请求将使用你的 OpenAI Key`.
- `隐私与数据` section or inline note:
  - Keep current direct-provider wording for this build.
  - Say API Keys are encrypted locally.
  - Say AI requests go directly from browser to the selected provider.

Alternative if keeping tab names stable is preferred:

- Keep `API Key` tab for minimum risk.
- Add a section title inside it: `高级：使用自己的 API Key`.
- Add a disabled `Aviso AI` planned section above it.
- This is the smallest visual change and has the lowest chance of breaking layout.

### Safe Mock States

Safe to show as non-persisted UI constants:

- `Aviso AI: planned`
- `anonymous_quota: unavailable in current build`
- `login: not implemented`
- `subscription: not implemented`
- `active_route: byok_provider`, derived from `settings.defaultModel`
- `provider_configured`, derived from whether the Popup currently has a masked or freshly typed key value

Do not store these mock states in `chrome.storage.sync`. If later route state needs persistence, it should be a separate non-secret settings decision after V1-002/V1-003 are approved.

### Safe Real States

Safe to derive from current implementation:

- Selected model label.
- Selected provider label via model registry route metadata.
- Whether 豆包 endpoint/model field is configured.
- Last manual connectivity summary in Popup memory for the current session.

Do not derive or display full API Key contents. Keep only the existing masked last-4 behavior.

## Files For A Future Implementation Thread

Likely implementation scope:

- `src/popup/index.tsx`
  - Reorganize tabs/sections.
  - Add planned/unavailable Aviso AI section.
  - Move existing key fields under advanced BYOK section.
  - Preserve manual connectivity UI.
  - Update local privacy copy for this build.
- `src/utils/model-registry.ts`
  - Read-only import or helper use is acceptable if needed to derive provider labels.
  - Do not add an Aviso hosted provider here in V1-008.
- `src/utils/storage.ts`
  - Ideally no change.
  - If touched, only add tests/guards that reinforce current key boundaries.
- `src/types/history.ts`
  - Ideally no change.
  - Do not add secret fields.
- `tests/unit.test.ts`
  - Add focused regression tests for storage/key boundary or route-label helper if helper logic is extracted.

Possible docs updates after implementation:

- `STATUS.md`
- `RELEASE_CHECKLIST.md`
- `docs/07_PRIVACY_AND_SECURITY.md`

Only update those if the implementation actually changes user-visible settings IA or privacy copy. Do not mark hosted AI, login, quota, or subscription as implemented.

## Files That Should Stay Out Of Scope

- `package.json`
- Manifest permissions or `host_permissions`
- `src/background/ai-client.ts`
- `src/background/index.ts`
- `src/types/messages.ts` unless a UI-only message is explicitly required, which is not recommended for V1-008
- `website/*`
- Backend, auth, billing, quota, or provider proxy files
- Any release artifact, package zip, tag, deployment, or store material

## Tests For Future Implementation

If V1-008 changes only Popup UI and copy:

- `npm test`
- `npx tsc --noEmit`
- `npm run build`
- Loaded-extension manual QA for:
  - Existing provider key entry remains usable.
  - Masked key values are not overwritten.
  - Manual connectivity remains user-clicked and one provider at a time.
  - 豆包 endpoint/model missing state remains readable.
  - Route labels do not imply hosted Aviso AI is live.
  - Templates and history tabs still work.
  - Privacy note matches current direct-provider behavior.

If implementation extracts route-label helper logic:

- Add unit tests for:
  - `gpt-4o-mini` displays OpenAI BYOK route.
  - Claude model displays Anthropic BYOK route.
  - `doubao` displays 豆包 / 火山方舟 BYOK route and endpoint requirement.
  - No route-label helper reads or returns API Key values.

Storage regression tests worth adding:

- `contextai_settings` must not include API Key fields.
- `contextai_api_keys` remains the only API Key storage key.
- Connectivity summary shape remains redacted.

## Stop Conditions

Stop before any of the following:

- Reading, printing, logging, migrating, deleting, or syncing API Keys.
- Adding any new `chrome.storage` key for secrets.
- Adding account, quota, subscription, auth, payment, backend, or provider proxy implementation.
- Adding an `aviso` hosted provider to model registry.
- Adding provider, backend, auth, or payment dependencies.
- Changing manifest permissions or `host_permissions`.
- Running real provider API calls.
- Auto-testing providers when settings opens.
- Testing more than one provider per user click.
- Showing raw prompt, raw response, API Key, selected text, page body, screenshot/base64, clipboard content, or private webpage content in UI, logs, docs, or validation records.
- Updating website or public copy to claim default Aviso AI, anonymous quota, login, subscription, payment, or hosted route is live.
- Creating release artifacts, commits, tags, pushes, deployments, or Chrome Web Store submissions.

## Acceptance Criteria For V1-008 Implementation

- BYOK appears as an advanced fallback, not the first-run default path.
- Existing BYOK functionality still works.
- Existing keys remain encrypted in local storage under `contextai_api_keys`.
- Non-secret settings remain in sync storage under `contextai_settings`.
- No secret is added to sync storage.
- No storage migration is introduced.
- No new provider, permission, host permission, dependency, backend route, or provider call is introduced.
- Manual connectivity remains user-triggered, one provider at a time, and summary-only.
- Any Aviso AI/default account UI is disabled, planned, or mocked until backend/account/quota exists.
- Public-release readiness remains blocked unless release checklist evidence separately closes it.

## Recommended Execution Prompt For The Next V1-008 Thread

```text
请按生产级开发方式处理 V1-008 BYOK settings cleanup。

项目路径：
/Users/jonyliu/Documents/01_Projects/ContextAI

目标：
在不改变 storage、provider routing、manifest、权限、API Key 行为和真实网络调用的前提下，把 Popup 里的 BYOK 设置整理为高级 fallback，并让当前默认 Aviso AI 方向以 planned / unavailable / mocked 状态呈现，不能写成已上线。

必须先读：
- AGENTS.md（如仓库没有，按任务消息规则）
- CLAUDE.md
- README.md
- STATUS.md
- RELEASE_CHECKLIST.md
- docs/specs/aviso-v1-public-launch.md
- docs/issues/003-v1-public-launch-issue-map.md
- docs/issues/005-v1-byok-settings-cleanup-feasibility.md
- docs/decisions/002-v1-aviso-ai-architecture-privacy.md
- docs/decisions/003-v1-quota-login-subscription.md
- docs/07_PRIVACY_AND_SECURITY.md
- src/popup/index.tsx
- src/utils/storage.ts
- src/utils/model-registry.ts
- src/utils/provider-connectivity.ts
- tests/unit.test.ts

范围内：
- 仅调整 Popup/settings IA、section copy、route label、planned/unavailable mock state。
- 保留 OpenAI / Anthropic / 豆包 API Key 输入。
- 保留手动单 provider 连接测试。
- 如抽出 helper，可补最小单元测试。
- 如行为/文案变化，更新 STATUS / RELEASE_CHECKLIST / privacy docs 的事实口径。

范围外：
- 不改 package.json、manifest、host_permissions、dependencies。
- 不改 API Key storage key。
- 不迁移、读取、输出、删除或同步 API Key。
- 不新增 hosted Aviso AI、backend、auth、login、quota、subscription、payment、provider proxy。
- 不运行真实 provider API。
- 不更新 website 或公开发布文案为 live claim。
- 不提交 Git、不 push、不打包、不发布。

验收标准：
- BYOK 被呈现为高级 fallback，但现有 BYOK 设置和测试仍可用。
- API Key 仍只存在 encrypted chrome.storage.local 的 contextai_api_keys。
- sync settings 只存非 secret provider/model/route 配置。
- 手动连接测试仍由用户点击、一次一个 provider、脱敏摘要。
- 默认 Aviso AI 只能显示 planned/unavailable/mocked，不得暗示当前可用。

检查命令：
- npm test
- npx tsc --noEmit
- npm run build

停止条件：
- 任何权限、依赖、storage secret、真实 provider 调用、backend/auth/payment/quota、public live claim、API Key 迁移或读取输出需求，立即停下来回报。

最终回报：
1. 做了什么
2. 改了哪些文件
3. storage/API Key/provider 边界是否保持
4. 跑了哪些检查
5. 剩余风险
6. 是否建议合并
```

## Merge Recommendation

This docs-only report is safe to merge into the main thread as planning evidence for V1-008. It does not change source behavior, permissions, storage, provider validation, website copy, package metadata, release artifacts, or Git state.
