# Aviso Project Context For Agents

Updated: 2026-07-04

## Repository Role

This repository is the product, Chrome extension, website, and release-wording authority for Aviso.

It owns:

- extension user experience,
- BYOK direct-provider flow,
- website and public docs,
- current product truth,
- Chrome Web Store-facing copy and release checklist,
- hosted AI internal planning records.

It does not own backend API implementation, database schema, deployment, or provider proxy internals.

## Current Product Truth

Start with [`CURRENT_GATE.md`](./CURRENT_GATE.md) for the current execution gate, then use this file for broader context.

Aviso is a Chrome MV3 extension with BYOK direct-provider as the default available path. Users can provide their own API keys and the browser extension calls approved provider hosts directly.

Current public/product truth:

- the Chrome package version is `0.1.1`,
- BYOK direct-provider remains the default available path,
- optional Aviso AI / hosted AI is included in the same `0.1.1` production candidate package, with production backend smoke, exact production backend host permission, and candidate package evidence,
- historical labels such as `v0.2` and `v0.3` are internal planning / issue-group labels only, not separate upload versions,
- hosted AI is still not Chrome Web Store approved and not release-approved/live through Chrome Web Store; public website deployment evidence exists,
- no login requirement for BYOK,
- no subscription or payment,
- no telemetry or analytics SDK,
- no remote link-body fetching or web search,
- screenshot remains only in the internal right-click path.

2026-07-02 maintenance closeout: frontend `main` includes `9bfe1ae` for clearer API key obfuscation / hosted permission wording, `4c99f82` for splitting pure i18n logic into `src/utils/i18n-core.ts`, and `6f41513` for using the backend OAuth challenge before hosted Google sign-in. Backend `main` includes `3b69e3d` for the server-side OAuth challenge gate. Checks rerun: frontend `git diff --check`, `npm test` (214/214), and `npx tsc --noEmit`; backend `corepack pnpm lint`, `corepack pnpm typecheck`, `corepack pnpm test` (387/387), and `git diff --check`. Chrome Web Store listing copy and disclosure draft have been updated for BYOK + optional Aviso AI candidate wording. `npm run verify:release-candidate` regenerated and verified `build/chrome-mv3-prod.zip`; `website` `npm run build` passed. This did not upload CWS, deploy the website, or mark hosted AI live.

2026-07-03 production validation closeout: backend `main` includes `40c8c37` for backend-issued OAuth client ID, `b2b0b65` for secret-safe Google auth rejection diagnostics and Google `email_verified` compatibility, and `c60b895` for parsing Upstash JSON records returned as strings or objects. Backend checks passed `corepack pnpm lint`, `corepack pnpm typecheck`, `corepack pnpm test` (392/392), and `git diff --check`; production deployment completed and sanitized challenge smoke passed. Owner-loaded extension validation then confirmed Aviso AI login, translation, and send-to-AI flow work. The remaining latency issue is tracked as a next-version optimization, not a release blocker for the current candidate. Website page review passed, Vercel production deployment for frontend commit `b6d7b65` is ready, and the public project domain returned the updated homepage/docs. Chrome Web Store submission/disclosure and owner release approval remain pending.

## Hosted AI Planning Truth

The hosted AI work was tracked in the historical/internal `docs/planning/v0.3` folder. That folder remains useful as evidence and issue history, but the upload package version is `0.1.1`; do not treat `v0.3` as a separate public product version.

Planning entry:

- [`../planning/v0.3/README.md`](../planning/v0.3/README.md)
- [`../planning/v0.3/hosted-ai-spec.md`](../planning/v0.3/hosted-ai-spec.md)
- [`../planning/v0.3/requirements-closeout.md`](../planning/v0.3/requirements-closeout.md)
- [`../planning/v0.3/cross-repo-integration-plan.md`](../planning/v0.3/cross-repo-integration-plan.md)
- [`../planning/v0.3/release-gates.md`](../planning/v0.3/release-gates.md)

Backend repository:

- `/Users/jonyliu/Documents/01_Projects/Aviso-backend`

## Planning Intake Rule

New ideas should enter [`../planning/inbox.md`](../planning/inbox.md) unless they are already clear enough for a specific version plan or execution issue.

Triaged but non-current ideas should move to [`../planning/backlog.md`](../planning/backlog.md). Do not treat inbox or backlog items as approved implementation scope.

## Stop Lines

Ask the owner before:

- adding or changing manifest host permissions,
- changing API key storage behavior,
- changing the production backend URL,
- enabling additional real provider calls beyond approved smoke gates,
- deploying backend,
- changing public privacy policy to claim hosted AI is live,
- updating Chrome Web Store data disclosure,
- uploading Chrome Web Store changes,
- enabling auth, billing, subscription, or payment in production.

## Agent Working Rule

Use [`CURRENT_GATE.md`](./CURRENT_GATE.md) first for current gate decisions. Use this repository for product and frontend decisions. Use the backend repository API contract for backend fields and response shapes. Do not invent API fields in frontend work.
