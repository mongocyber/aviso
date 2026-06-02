# Aviso Risk Register

Version: v0.1.0 internal dogfood / v0.2-alpha planning

Date: 2026-06-02

Status: Internal risk register; active for dogfood, release prep, and v0.2-alpha planning

## Risk Summary

Aviso's current risk profile is less about missing core code and more about release evidence, provider validation, privacy promises, browser permissions, and user trust.

## Active Risks

| ID | Risk | Status | Impact | Mitigation | Next action |
|----|------|--------|--------|------------|-------------|
| R-001 | OpenAI path, host permission, and manual validation UI are implemented, but live validation is incomplete. | Open | Public users may hit untested provider behavior. | Use V2-004 user-triggered minimal validation with safe test key. | Keep public claims blocked until validation record exists. |
| R-002 | Anthropic path, host permission, and manual validation UI are implemented, but live validation is incomplete. | Open | Public users may hit untested provider behavior. | Use V2-004 user-triggered minimal validation with safe test key. | Keep public claims blocked until validation record exists. |
| R-003 | 豆包 / 火山方舟 needed a fresh structured validation record. | Closed | Release evidence is stronger for the provider-limited path. | V2-004 summary-only validation is recorded without secrets or raw provider content. | Keep future provider evidence in the same summary-only format. |
| R-004 | Public privacy policy does not exist. | Open | Chrome Web Store release blocked. | Derive policy from `docs/07_PRIVACY_AND_SECURITY.md` and Popup copy. | Prepare public policy page in a separate task. |
| R-005 | Store screenshots or docs may accidentally expose API Keys or private pages. | Open | Security and trust risk. | Use sanitized fixtures and run a final leakage check. | Define screenshot capture rules. |
| R-006 | Broader remote-link fetching would require wider host permissions. | Controlled | Could weaken privacy and store trust. | Keep out of v0.1; require product decision for v0.2. | Decide v0.2 host-permission stance. |
| R-007 | Model first token can be slow. | Controlled | Users may interpret delay as failure. | Immediate floating UI, “等待模型响应…” copy, 9-second slow hint, stop waiting, shorter default output, and V2-004B/V2-004C redacted `[Aviso perf]` summaries. | Continue using local perf summaries before changing models, token limits, providers, or permissions. |
| R-008 | Long pages are truncated to 5000 characters. | Accepted for v0.1 | Summaries may miss later content. | Record as limitation; evaluate chunking in v0.2. | Add v0.2 discovery issue. |
| R-009 | Remote image URLs may fail even after format validation. | Accepted for v0.1 | Image explain may be unreliable on protected images. | Show readable error; consider local capture in v0.2. | Add v0.2 image reliability issue. |
| R-010 | `npm run build` can fail in sandbox with `Operation not permitted`. | Known environment risk | False debugging path if treated as code failure. | Re-run outside sandbox when needed and document environment. | Keep note in release plan. |
| R-011 | `npm run package` has not been recorded as passed. | Open | Store release artifact missing. | Run package command during release-prep task. | Add to release gate. |
| R-012 | `contextai_*` legacy storage keys remain. | Accepted for v0.1 | Brand inconsistency in internals; migration could risk local data. | Keep for compatibility unless a migration plan is approved. | Decide before public release if brand-clean internals matter. |
| R-013 | Manual A-G QA lacks full environment evidence. | Open | Harder to reproduce issues or prove release readiness. | Record Chrome version, OS, tester, date, and exceptions. | Update release checklist after next QA pass. |
| R-014 | Release automation exists but public publishing is not ready. | Controlled | Accidental store submission risk if secrets and workflow are triggered without review. | Keep workflow manual and do not trigger without approval. | Review workflow only during release prep. |

## v0.2-alpha Planning Risks

| ID | Risk | Status | Impact | Mitigation | Next action |
|----|------|--------|--------|------------|-------------|
| R-101 | Desktop v0.2 drafts over-expand scope into a 30-42 day feature set. | Controlled | Development could drift away from release evidence and privacy constraints. | Treat project docs as canonical; keep v0.2-alpha MVP narrow. | Use V2-001 issue map before implementation. |
| R-102 | Provider hosts expanded to the approved OpenAI / Anthropic / Ark set. | Controlled | Chrome Web Store review and user trust risk. | Keep host permissions limited to the three approved provider hosts and keep broad page-fetching hosts out of MVP. | Re-audit before package or store submission. |
| R-103 | Connectivity checks can spend tokens or leak test prompts if auto-run. | Controlled | Unexpected cost and privacy risk. | V2-004 implements explicit user-triggered single-provider checks with a fixed public prompt and summary-only output. | Verify installed-extension behavior before recording provider claims. |
| R-104 | Model routing could store API Keys in synced settings. | Controlled | Secrets could sync unexpectedly across devices. | Keep API Keys encrypted in `chrome.storage.local`; store only route IDs in sync. | Enforce in V2-003 acceptance. |
| R-105 | Screenshot-to-AI may capture private page content. | Controlled | Sensitive data could be sent to a provider. | V2-005 requires a user-triggered right-click action, visible-region selection, explicit confirmation, in-memory crop, no screenshot/base64 persistence, no full page URL in screenshot provider payload, and no screenshot logging. | Complete loaded-extension QA and keep public release claims blocked until screenshot UX and provider vision behavior are verified. |
| R-106 | Result caching may retain sensitive translated or AI-generated text locally. | Open | Local privacy risk if users expect no persistence. | Include operation-aware cache keys, TTL, clear-cache control, and privacy copy. | Decide whether caching is default-on. |
| R-107 | Third-party translation fallback could contradict no-extra-network expectations. | Controlled | Data may be sent to Google/Baidu/Youdao without the user understanding it. | Keep out of MVP until provider copy and host permissions are approved. | Move to discovery backlog. |
| R-108 | Multi-tab, tab grouping, and voice features require high-sensitivity permissions. | Controlled | Store review, microphone trust, and broad browsing-data access risk. | Keep out of MVP; evaluate with decision docs before coding. | Create discovery issue only if user approves. |
| R-109 | Future implementation may confuse host permission implementation with completed validation. | Controlled | Docs or public copy could overstate provider support. | Keep live validation in V2-004; public copy claims only validated providers. | Use registry metadata but keep provider claims blocked until validation records exist. |
| R-110 | Performance logs could accidentally expose private context if raw inputs are logged. | Controlled | Console output may reveal selected text, page content, URLs, image/base64 payloads, or API Keys. | V2-004B uses fixed fields, size buckets, context types, sanitized provider/model labels, and no persistence or telemetry. | Keep tests covering field shape, buckets, missing timing, error categories, and redaction. |
| R-111 | Follow-up requests can become slow by resending long prior answers. | Controlled | Each follow-up may feel like a fresh long request and increase first-token latency. | V2-004C sends only bounded recent `priorContext` and adds slow hint plus stop waiting. | Watch dogfood cases where users expect deeper long-history memory; do not add model summarization or caching without a separate decision. |
| R-112 | Copy current context can place private page text into the system clipboard. | Controlled | User may paste sensitive content elsewhere after copying. | V2-006 is manual right-click only, shows visible feedback, truncates long page text, and does not call AI, provider, history, storage, files, docs, console, or telemetry. | Complete installed-extension QA and keep public copy explicit that this writes to clipboard only. |

## Accepted v0.1 Limitations

- Provider latency can vary.
- Latency diagnosis is local-console only and should not be treated as telemetry or benchmark evidence.
- Long content is truncated.
- Remote link body extraction is not implemented.
- Some image sources are unsupported or may fail provider-side.
- OpenAI and Anthropic host permissions and manual connectivity UI are implemented, but live validation is not complete.

## Not Accepted For Public Release

- Shipping without a public privacy policy.
- Shipping without provider validation records for any provider claimed in public copy.
- Shipping screenshots or docs containing real API Keys or private account data.
- Shipping without package artifact, tag, and rollback point.
- Expanding permissions without product-owner approval.
- Persisting performance logs or sending them to any remote service without a separate privacy decision.
- Shipping v0.2-alpha provider, screenshot, translation, tab, or voice features without updated privacy/security docs.
- Shipping copy-current-context without installed-extension QA for normal pages, selected text, missing body, and clipboard-write failure feedback.

## Open Questions

- What is the minimum evidence package required before public release?
- Should public release be provider-limited if OpenAI or Anthropic validation is delayed?
- Should store screenshots use only local fixtures, or include sanitized real webpages?
- Should v0.2-alpha result caching be default-on, default-off, or disabled until public release?
- Which high-permission discovery item, if any, is worth an explicit decision doc first?

## Changelog

- 2026-06-02: Updated provider host permission risks after V2-003 landed OpenAI / Anthropic manifest hosts and minimal registry/routing, while live validation remains open for V2-004.
- 2026-06-02: Updated provider validation risks after V2-004 added manual single-provider connectivity UI while keeping live evidence open.
- 2026-06-02: Added V2-004B latency-baseline risk controls for local-only redacted `[Aviso perf]` summaries.
- 2026-06-02: Added V2-004C follow-up speed guard risk controls for bounded prior context, slow-response hint, stop waiting, and `user_cancelled` classification.
- 2026-06-02: Updated V2-005 screenshot-to-AI risk controls after adding user-confirmed visible-region capture, in-memory crop, no new permissions, and no screenshot persistence.
- 2026-06-02: Added V2-006 copy-current-context risk controls for manual clipboard-only writes, page truncation, visible feedback, and no provider/storage/logging expansion.
- 2026-06-02: Updated provider host permission risks after OpenAI / Anthropic host decisions were approved for V2-003, while live validation remains open for V2-004.
- 2026-06-02: Added v0.2-alpha planning risks for scope expansion, host permissions, provider checks, model-route storage, screenshots, caching, third-party translation, and high-permission tab/voice features.
- 2026-06-01: Created Phase 1 risk register from current release checklist, status file, and technical baseline.
