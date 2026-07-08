# Website And Store Copy Contract

## Responsibility

Website and store copy translate internal product truth into public/user-facing wording. They must stay aligned with [docs/STATE.md](../STATE.md) without becoming their own release-state authority.

## Key Files

- `website/src/pages/index.tsx` is the homepage copy source for both Chinese and English.
- `website/src/pages/feedback.tsx` and `website/api/feedback.js` are the public feedback form and website email endpoint.
- `website/docusaurus.config.ts`, `website/i18n/en/code.json`, and `website/i18n/en/docusaurus-theme-classic/*.json` own website navigation, footer, locale, and route-facing copy.
- `website/docs/intro.md` and sibling files are the Chinese Docusaurus user docs.
- `website/i18n/en/docusaurus-plugin-content-docs/current/intro.md` and sibling files are the English docs.
- `website/README.md` documents website-local build and feedback behavior.
- `store-assets/chrome-web-store/STORE_LISTING_COPY.md` is the Chrome Web Store listing copy source.
- `store-assets/chrome-web-store/README.md` is the store image asset-pack entrypoint.

## Invariants

- Public copy must not claim Chrome Web Store approval, formal store URL, public release, hosted AI live status, payment, subscription, public anonymous quota, telemetry, analytics SDK, web search, or remote link-body fetching unless [docs/STATE.md](../STATE.md) gates are updated first.
- BYOK direct-provider and optional hosted AI must remain distinguishable.
- Provider configuration support must not be written as live provider validation.
- Store listing copy is owner-validated source text; editing it is public-copy work and should be treated as owner-gated when it affects CWS submission.
- Website build success does not imply Chrome Web Store approval or release approval.

## Extension Points

- Public wording change: update the homepage, website docs, and English i18n together when the claim appears across those surfaces, then run website build and `npm run docs:check`.
- Feedback wording or behavior change: update the feedback page/API, privacy/support docs, and [docs/STATE.md](../STATE.md) Storage & Data row together.
- CWS wording change: update `STORE_LISTING_COPY.md`, keep provider-name lists out of public product descriptions, and record owner approval/review state in release evidence docs.
- Store asset changes: keep generated visual assets grounded in the store asset pack and real UI/logo references.

## Checks

```bash
npm run docs:check
cd website && npm run build
```

Use `npm run docs:check` to catch forbidden public claims across configured website docs, homepage/feedback source, navigation/footer config, and store listing source.
