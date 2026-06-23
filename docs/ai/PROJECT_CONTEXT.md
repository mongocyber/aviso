# Aviso Project Context For Agents

Updated: 2026-06-18

## Repository Role

This repository is the product, Chrome extension, website, and release-wording authority for Aviso.

It owns:

- extension user experience,
- BYOK direct-provider flow,
- website and public docs,
- current product truth,
- Chrome Web Store-facing copy and release checklist,
- v0.3 product requirements and cross-repo integration planning.

It does not own backend API implementation, database schema, deployment, or provider proxy internals.

## Current Product Truth

Aviso is currently a BYOK direct-provider Chrome MV3 extension. Users provide their own API keys and the browser extension calls approved provider hosts directly.

Current public/product truth:

- no project-owned backend in the released/submitted extension,
- no hosted Aviso AI in the current public product,
- no login requirement,
- no subscription or payment,
- no telemetry or analytics SDK,
- no remote link-body fetching or web search,
- screenshot remains only in the internal right-click path.

## v0.3 Planning Truth

v0.3 hosted AI is planned and cross-repo. It is not current product truth.

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
- adding production backend URL,
- enabling real provider calls,
- deploying backend,
- changing public privacy policy to claim hosted AI is live,
- updating Chrome Web Store data disclosure,
- enabling auth, billing, subscription, or payment in production.

## Agent Working Rule

Use this repository for product and frontend decisions. Use the backend repository API contract for backend fields and response shapes. Do not invent API fields in frontend work.
