# Generation Thread Brief

You are the Chrome Web Store asset generation thread for Aviso.

Autonomy level: L2 isolated execution. Work only inside this repo/worktree. Do not stage, commit, push, tag, release, or submit to Chrome Web Store.

## Must Read First

1. `AGENTS.md`
2. `STATUS.md`
3. `RELEASE_CHECKLIST.md`
4. `store-assets/chrome-web-store/README.md`
5. `store-assets/chrome-web-store/SPEC.md`
6. `store-assets/chrome-web-store/IMAGE2_PROMPTS.md`
7. `store-assets/chrome-web-store/ACCEPTANCE.md`
8. `src/styles/aviso.tsx`
9. `website/src/css/custom.css`
10. `website/static/img/aviso-mark-sage.svg`
11. `website/static/img/aviso-icon.png`

## Goal

Generate Chrome Web Store image assets under `store-assets/chrome-web-store/output/` using Image 2.0 or equivalent image-generation/image-editing tooling.

The previous generation attempt was rejected because the logo was wrong, the font/design system was not followed, and page content was invented. Do not repeat that approach.

## Required Outputs

Create as many of these as can pass `ACCEPTANCE.md`:

- `output/icon-128.png`
- `output/promo-small-440x280.png`
- `output/promo-marquee-1400x560.png`
- `output/zh/screenshot-01-selection-toolbar-1280x800.png`
- `output/zh/screenshot-02-command-palette-1280x800.png`
- `output/zh/screenshot-03-result-panel-1280x800.png`
- `output/zh/screenshot-04-popup-service-settings-1280x800.png`
- `output/zh/screenshot-05-local-history-1280x800.png`
- `output/en/screenshot-01-selection-toolbar-1280x800.png`
- `output/en/screenshot-02-command-palette-1280x800.png`
- `output/en/screenshot-03-result-panel-1280x800.png`
- `output/en/screenshot-04-popup-service-settings-1280x800.png`
- `output/en/screenshot-05-local-history-1280x800.png`
- `GENERATION_REPORT.md`

## Critical Rules

- Use the exact Aviso logo from `website/static/img/aviso-mark-sage.svg` or `website/static/img/aviso-icon.png`.
- Do not redraw, reinterpret, or replace the logo.
- Use the design language from `src/styles/aviso.tsx` and `website/src/css/custom.css`.
- Use real product UI surfaces: toolbar, command palette, floating result panel, popup settings/history.
- Use only approved page content sources listed in `SPEC.md`.
- Do not make screenshot capability a public hero feature.
- Do not claim OpenAI/Anthropic live validation.
- Do not imply store approval, Google endorsement, Aviso AI public-live status, anonymous quota, payment, subscription, analytics, cloud sync, or web search.
- Do not use code drawing for final assets. No SVG/HTML/CSS/canvas mock assets as final output.

## Stop And Report

Stop instead of generating if the image tool cannot:

- accept image references,
- preserve the exact logo,
- output the required dimensions,
- or avoid inventing UI/page content.

If blocked, write `GENERATION_REPORT.md` explaining the blocker and do not create low-quality fallback assets.

## Final Reply To CTO

Report:

- assets created,
- assets skipped or blocked,
- files changed,
- self-review verdict,
- any items that should be rejected before store use.
