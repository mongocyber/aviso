# Aviso Release Plan

Version: v0.1.0 internal dogfood / Phase 1 docs

Date: 2026-06-01

Status: Internal release plan; not approved for public release

## Release Position

Aviso v0.1.0 is currently an internal dogfood build. It is not publicly released and should not be submitted to the Chrome Web Store yet.

The current release goal is to preserve the v0.1 internal baseline, close verification gaps, and prepare a controlled public-release path.

## Current Evidence

| Evidence | Status | Notes |
|----------|--------|-------|
| Local Git baseline | Done | Commit `3dc7ea3 chore: establish v0.1 internal dogfood baseline`. |
| A-G manual QA | User-reported basic pass | Detailed environment evidence remains incomplete. |
| 豆包 / 火山方舟 | User-confirmed usable | This Phase 1 docs task did not run a real API call. |
| OpenAI | Not verified | Needs explicit approval and safe test key. |
| Anthropic | Not verified | Needs explicit approval and safe test key. |
| Package zip | Not done | `npm run package` has not been recorded as passed. |
| Store assets | Not done | Screenshots, description, support copy, and privacy declarations remain pending. |
| Public privacy policy | Not done | Popup copy exists; public hosted policy does not. |
| Tag / rollback point | Not done | No tag should be created until release package and gates are ready. |

## Release Gates

### Gate 1: Internal Docs Review

- Phase 1 docs exist and are reviewed.
- README points to internal docs.
- STATUS reflects Phase 1 docs status.
- Old checklist-only release language is removed or marked historical.

### Gate 2: Local Verification

Run and record:

```bash
npm test
npx tsc --noEmit
npm run build
npm run package
```

Notes:

- `npm run build` may need to run outside the default sandbox if `Operation not permitted` appears.
- `npm run package` is still unverified for current release readiness.

### Gate 3: Browser QA

Record:

- Chrome version.
- OS version.
- Extension build path.
- Date and tester.
- A-G checklist result.
- Known exceptions or screenshots/short recordings where useful.

### Gate 4: Provider Validation

Provider validation must use explicit approval and safe test keys.

Minimum record:

- provider
- model or endpoint
- action tested
- result
- first-token or qualitative latency note
- error text if failed
- whether any API Key or sensitive content appeared in logs or screenshots

OpenAI and Anthropic remain unverified until this record exists.

### Gate 5: Privacy And Store Materials

Before store submission:

- Public privacy policy exists and matches implementation.
- Store screenshots do not contain API Keys, private webpages, or real accounts.
- Store description matches permissions and data flow.
- Chrome Web Store privacy declarations match Popup copy and `docs/07_PRIVACY_AND_SECURITY.md`.

### Gate 6: Version Control And Rollback

Before release:

- Create release commit after docs and release package are confirmed.
- Create tag only after package and release gates pass.
- Record rollback action and known-good commit/tag.
- Do not push or publish without explicit approval.

## Release Checklist Snapshot

| Area | Current state |
|------|---------------|
| Internal dogfood | Active |
| Public release | Blocked |
| Store submission | Blocked |
| Real OpenAI validation | Blocked pending approval |
| Real Anthropic validation | Blocked pending approval |
| Package zip | Pending |
| Privacy policy | Pending |
| Store assets | Pending |
| Tag / rollback point | Pending |

## Not In This Phase

- GitHub remote creation.
- Push.
- Tag.
- Chrome Web Store submission.
- Docusaurus setup.
- release-please, commitlint, husky, or Vercel.
- Real API calls.

## Open Questions

- What public version label should be used if v0.1.0 remains internal only?
- Who owns store account, screenshots, privacy policy hosting, and support contact?
- Should release notes include provider-specific limitations or keep them general?

## Changelog

- 2026-06-01: Created Phase 1 release plan from release checklist and current project status.
