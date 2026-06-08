# Issue 008: V1-013 UI Language Localization

Status: planned requirement. Not implemented.

Date: 2026-06-08

## Goal

Make Aviso usable for both Chinese and English Chrome users before public release. By default, Aviso UI should follow the Chrome UI language, while Settings keeps an explicit language override: `自动` / `中文` / `English`.

This is a UI language requirement, not a translation-output requirement.

## Product Decision

- Default behavior: `自动`.
- In `自动`, resolve UI language from Chrome UI language, such as `chrome.i18n.getUILanguage()`.
- `zh-*` Chrome UI languages display Chinese UI.
- Non-Chinese Chrome UI languages display English UI until more locales are explicitly added.
- User override in Settings wins over Chrome UI language:
  - `自动`
  - `中文`
  - `English`
- The setting must persist as a non-secret field inside existing `chrome.storage.sync/contextai_settings`; do not add a new storage key.
- The existing inline translation target-language selector remains separate and must not be confused with UI language.

## In Scope

- Popup UI copy.
- Command palette UI copy and helper text.
- Floating result panel copy, buttons, loading states, errors, and action labels.
- Inline translation card copy.
- Selection toolbar tooltips / labels.
- Double-click menu copy.
- Native Chrome context-menu item titles.
- Screenshot overlay / toolbar copy if screenshot remains available.
- Clipboard / copy-context toasts and user-facing errors.
- Extension manifest name / description / command description if Chrome extension localization is needed for English extension-management surfaces.
- Settings entry for UI language: `自动` / `中文` / `English`.

## Out Of Scope

- No machine translation of provider output.
- No change to translation target-language behavior.
- No new provider, provider route, model, hosted AI, provider proxy, backend, telemetry, analytics, login, subscription, payment, quota, or web search.
- No manifest permission or host permission expansion.
- No dependency addition unless a separate owner decision approves it.
- No API Key storage change, storage key migration, or persistent raw prompt / raw response / page-body storage.
- No website localization requirement in this slice; website language can be handled separately if needed.

## Implementation Guidance

- Prefer a small shared i18n helper and dictionaries over ad hoc ternaries spread across components.
- Use stable message ids and keep Chinese / English copy close enough that QA can compare surfaces.
- Use `chrome.storage.sync/contextai_settings.uiLanguage` or an equivalent non-secret field name inside the existing settings object.
- Rebuild or refresh native context menus when UI language changes, similar to template/model context-menu sync.
- Keep locale resolution memory-only at runtime; do not log Chrome UI language or send it to providers.
- If `_locales` is added for manifest localization, verify that generated manifest permissions and host permissions remain unchanged.

## Acceptance Criteria

- Fresh install in Chinese Chrome shows Chinese UI by default.
- Fresh install in English Chrome shows English UI by default.
- Settings exposes `自动` / `中文` / `English`.
- Choosing `中文` forces Chinese UI even in English Chrome.
- Choosing `English` forces English UI even in Chinese Chrome.
- Choosing `自动` returns to Chrome UI language based resolution.
- Popup, command palette, result panel, toolbar, inline translation card, double-click menu, toasts/errors, and native context menus use the resolved UI language.
- Translation target-language selector still controls translation output only and remains separate from UI language.
- No API Key, raw prompt, raw response, private page body, screenshot/base64, clipboard content, full URL, or provider output is logged or persisted as part of localization.
- No new permission, host permission, dependency, provider route, backend, hosted AI, provider proxy, telemetry, analytics, storage key migration, or public release claim is introduced.

## Verification

- `npm test`
- `npx tsc --noEmit`
- `git diff --check`
- `npm run build`
- Inspect built manifest to confirm permissions and host permissions are unchanged.
- Loaded-extension QA in both Chinese and English UI modes, using either Chrome UI language or the Settings override.

## Stop Conditions

Stop before adding permissions, dependencies, backend calls, remote localization services, telemetry, analytics, storage key migration, API Key handling changes, broad public-copy claims, store submission, package release, tag, push, or production deployment.
