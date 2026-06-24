# V03-FE09 Hosted AI Sign-In UX Redesign

Status: `implemented / local + staging-config / owner-review-pending`
Updated: 2026-06-24
Linear: MON-26

## Purpose

Make hosted AI (`Aviso AI`) sign-in and account state explicit and easy to read, without turning sign-in into a global wall. Before this change, hosted account / login / quota state was only visible inside the API / AI-service tab and was scattered across a dropdown badge, an in-card account row, and a status line, so a user could not tell at a glance whether they were signed in.

This redesign separates two concerns that were previously mixed:

- Identity layer (who you are): signed-out vs signed-in, account, and tier — now a persistent header account chip plus an account panel, visible on every tab.
- Service / routing layer (what powers AI): `Aviso AI` stays a peer service beside BYOK provider configs in the AI-service tab.

BYOK remains first-class and usable without sign-in. Paid / subscription is out of scope and deferred (decision `0003`).

## What changed (frontend only)

- `src/popup/index.tsx`
  - Header: persistent account chip. Signed out shows a sign-in action; signed in shows an avatar initial + tier label + chevron that opens an account panel.
  - Account panel (popover from the chip): account label, tier, status pill, monthly quota meter + reset, refresh, "manage in AI services", and sign out. This is the single at-a-glance source for login state.
  - General tab: a non-blocking zero-state dual entry, shown only when there is no hosted session and no BYOK config — `Aviso AI` (sign in for free quota, recommended) or add your own API key. Not a wall; tabs, toggles, and history stay reachable.
  - Reuses existing hosted state and handlers (`signInHosted`, `refreshHostedAccount`, `signOutHostedLocal`, `hostedStatus`, `hostedSession`, `buildHostedAccountQuotaDisplay`).
- `src/utils/hosted-session.ts`: add `getHostedMonthlyQuotaWindow()` to expose the numeric monthly window for the quota meter (reuses the existing private normalizer).
- `src/utils/i18n.ts`: add `popup.account.*` and `popup.zero.*` keys (zh-CN + en). All new user-facing copy goes through i18n.
- `tests/unit.test.ts`: add a guard test for the account chip + zero-state dual entry, and that no upgrade / subscription entry is shipped.

The API / AI-service tab `Aviso AI` card (sign in / refresh / sign out / account + quota detail rows) is preserved as the settings-level surface. No change to manifest, permissions, host permissions, API key storage, providers, backend, routing, or OAuth.

## States covered

- Signed out, no BYOK: zero-state dual entry.
- Signing in: chip shows working state.
- Signed in (free): chip avatar + tier; panel quota meter with healthy / low / exhausted tones.
- Signed out + BYOK configured: chip shows sign-in; BYOK works without login.
- Hosted unavailable / expired / quota exhausted / rate limited: reflected in the panel status pill and the existing API-tab card; BYOK remains the fallback.

Maps to the State Matrix in [`../planning/v0.3/frontend-ux-states.md`](../planning/v0.3/frontend-ux-states.md).

## Decisions

- Identity entry = header account chip (not a separate Account tab): explicit on every tab without adding a tab.
- Zero-state = dual entry, no preselect: `Aviso AI` and BYOK shown together, `Aviso AI` slightly emphasized + recommended; the user chooses. Keeps BYOK first-class.
- Subscription = deferred. No upgrade CTA, Pro, or checkout in this build (decision `0003`). The account `tier` field is the future hook; the Pro presentation is designed but not shipped.

## Out of scope / deferred

Paid plan, checkout, billing, upgrade CTA, Pro / subscription copy; production backend, production OAuth, host-permission changes; public website / privacy / Chrome Web Store copy; API key storage / provider / routing / backend changes. All unchanged.

## Verification

- `npx tsc --noEmit`: pass.
- `npm test`: 190/190 pass (includes the new MON-26 guard test).
- `npm run build:wxt`: pass.
- `npm run build:plasmo`: pass.
- `npm run check:manifests`: pass (Plasmo + WXT outputs consistent).
- Loaded-extension OAuth smoke and signed-in screenshots remain owner-assisted and are not included here.

## Stop lines

Stop for owner / CTO approval before any production config, new or expanded permission, backend change, public / CWS copy, secret or token handling, real provider validation, or any payment / billing / subscription work.
