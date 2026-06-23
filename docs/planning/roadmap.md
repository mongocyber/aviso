# Aviso Roadmap

Status: `planning / product-owner source`
Updated: 2026-06-18

This roadmap records product direction and version sequencing. It is not release approval, store approval, or implementation evidence.

## Source Of Truth

| Area | Source |
| --- | --- |
| Current product truth | [`../01_PROJECT_CHARTER.md`](../01_PROJECT_CHARTER.md), [`../../STATUS.md`](../../STATUS.md), [`../../RELEASE_CHECKLIST.md`](../../RELEASE_CHECKLIST.md) |
| Current privacy and permissions | [`../07_PRIVACY_AND_SECURITY.md`](../07_PRIVACY_AND_SECURITY.md), [`../03_TECH_SPEC.md`](../03_TECH_SPEC.md) |
| Active future-version planning | [`v0.3/README.md`](./v0.3/README.md) |
| Backend API and service design | `../Aviso-backend/docs/README.md` in the sibling backend repository |

## Current Sequence

| Version / Track | Status | Purpose | Release Rule |
| --- | --- | --- | --- |
| `0.1.0` internal dogfood | submitted to Chrome Web Store review / not public | Current BYOK extension package and store-review baseline. | Do not describe as public listing until Chrome Web Store approval and store URL exist. |
| `v0.2` hardening | implementation evidence recorded / not public | Provider configuration expansion, command-palette local intent, waiting-state improvements, and WXT parallel-path evidence. | Do not describe as release-ready or public. |
| `v0.2.1` WXT default-build gate | planned / owner-gated | Decide whether and when WXT becomes the default build and package path. | Requires owner release decision and loaded-extension confidence; not a user-facing feature release. |
| `v0.3` hosted AI | planned / cross-repo | Add hosted AI path with login, quota, backend API, and BYOK fallback. | Requires backend staging, frontend integration, privacy updates, CWS data disclosure, host-permission review, and owner approval. |

## Product Principles

- Keep BYOK direct-provider working; hosted AI is additive, not a replacement.
- Do not turn backend plans into public claims until deployed and approved.
- Keep current facts and future planning separate.
- Treat host permissions, auth, payments, provider routing, privacy policy, and Chrome Web Store disclosures as release gates.
- Use the frontend repository as product and user-experience authority.
- Use the backend repository as API, data model, deployment, and operations authority.

## Near-Term Milestones

1. Complete v0.3 planning source documents in this repository.
2. Align the backend repository docs to the new v0.3 source path.
3. Review backend Phase 1 implementation against the v0.3 product spec.
4. Define frontend integration issues only after API contract review.
5. Run cross-repo release-gate review before any hosted-AI public wording or Chrome Web Store update.

## Not Approved By This Roadmap

- New Chrome host permission.
- Project-owned backend in the current public product.
- Hosted AI, account, quota, subscription, or payment public claims.
- Provider live validation.
- Staging or production deployment.
- Chrome Web Store resubmission.
