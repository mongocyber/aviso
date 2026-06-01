# Aviso Risk Register

Version: v0.1.0 internal dogfood / Phase 1 docs

Date: 2026-06-01

Status: Internal risk register; active for dogfood and release prep

## Risk Summary

Aviso's current risk profile is less about missing core code and more about release evidence, provider validation, privacy promises, browser permissions, and user trust.

## Active Risks

| ID | Risk | Status | Impact | Mitigation | Next action |
|----|------|--------|--------|------------|-------------|
| R-001 | OpenAI path is implemented but not live-validated. | Open | Public users may hit untested provider behavior. | Run approved minimal validation with safe test key. | Schedule provider validation task. |
| R-002 | Anthropic path is implemented but not live-validated. | Open | Public users may hit untested provider behavior. | Run approved minimal validation with safe test key. | Schedule provider validation task. |
| R-003 | 豆包 / 火山方舟 is user-confirmed but lacks a fresh structured validation record. | Open | Release evidence may be too informal. | Record endpoint, action, result, and latency note without exposing secrets. | Add provider validation note before public release. |
| R-004 | Public privacy policy does not exist. | Open | Chrome Web Store release blocked. | Derive policy from `docs/07_PRIVACY_AND_SECURITY.md` and Popup copy. | Prepare public policy page in a separate task. |
| R-005 | Store screenshots or docs may accidentally expose API Keys or private pages. | Open | Security and trust risk. | Use sanitized fixtures and run a final leakage check. | Define screenshot capture rules. |
| R-006 | Broader remote-link fetching would require wider host permissions. | Controlled | Could weaken privacy and store trust. | Keep out of v0.1; require product decision for v0.2. | Decide v0.2 host-permission stance. |
| R-007 | Model first token can be slow. | Accepted for v0.1 | Users may interpret delay as failure. | Immediate floating UI, waiting states, timing logs, shorter default output. | Document limitation in user-facing release copy. |
| R-008 | Long pages are truncated to 5000 characters. | Accepted for v0.1 | Summaries may miss later content. | Record as limitation; evaluate chunking in v0.2. | Add v0.2 discovery issue. |
| R-009 | Remote image URLs may fail even after format validation. | Accepted for v0.1 | Image explain may be unreliable on protected images. | Show readable error; consider local capture in v0.2. | Add v0.2 image reliability issue. |
| R-010 | `npm run build` can fail in sandbox with `Operation not permitted`. | Known environment risk | False debugging path if treated as code failure. | Re-run outside sandbox when needed and document environment. | Keep note in release plan. |
| R-011 | `npm run package` has not been recorded as passed. | Open | Store release artifact missing. | Run package command during release-prep task. | Add to release gate. |
| R-012 | `contextai_*` legacy storage keys remain. | Accepted for v0.1 | Brand inconsistency in internals; migration could risk local data. | Keep for compatibility unless a migration plan is approved. | Decide before public release if brand-clean internals matter. |
| R-013 | Manual A-G QA lacks full environment evidence. | Open | Harder to reproduce issues or prove release readiness. | Record Chrome version, OS, tester, date, and exceptions. | Update release checklist after next QA pass. |
| R-014 | Release automation exists but public publishing is not ready. | Controlled | Accidental store submission risk if secrets and workflow are triggered without review. | Keep workflow manual and do not trigger without approval. | Review workflow only during release prep. |

## Accepted v0.1 Limitations

- Provider latency can vary.
- Long content is truncated.
- Remote link body extraction is not implemented.
- Some image sources are unsupported or may fail provider-side.
- OpenAI and Anthropic are not validated live.

## Not Accepted For Public Release

- Shipping without a public privacy policy.
- Shipping without provider validation records.
- Shipping screenshots or docs containing real API Keys or private account data.
- Shipping without package artifact, tag, and rollback point.
- Expanding permissions without product-owner approval.

## Open Questions

- What is the minimum evidence package required before public release?
- Should public release be provider-limited if OpenAI or Anthropic validation is delayed?
- Should store screenshots use only local fixtures, or include sanitized real webpages?

## Changelog

- 2026-06-01: Created Phase 1 risk register from current release checklist, status file, and technical baseline.
