# Chrome Web Store Asset Acceptance

## Generation Thread Scope

Allowed:

- Read project docs, UI source files, design tokens, and this asset pack.
- Use Image 2.0 / image generation or image editing to create the specified assets.
- Save generated outputs under `store-assets/chrome-web-store/output/`.
- Create a short generation report under `store-assets/chrome-web-store/GENERATION_REPORT.md`.

Not allowed:

- Do not modify product source code, manifest permissions, host permissions, provider routing, storage keys, package dependencies, website copy, policy docs, or release state.
- Do not code-draw final assets as SVG, HTML canvas, CSS art, or generated mock UI.
- Do not submit to Chrome Web Store.
- Do not tag, release, push, publish, or stage/commit unless CTO explicitly authorizes later.
- Do not run real provider API calls.
- Do not expose API keys, private URLs, raw prompts, raw provider responses, screenshots/base64 containing sensitive data, or clipboard content.

## Stop Conditions

Stop and report instead of generating if:

- The thread cannot access Image 2.0 or an equivalent image-generation tool.
- The tool cannot accept or preserve the exact Aviso logo reference.
- Real UI references are missing for a screenshot scene.
- A requested scene would require inventing a page, feature, provider status, store status, or user data.
- The generated output changes the Aviso logo shape.
- The generated output presents screenshot capability as a main public selling point.
- The generated output claims OpenAI/Anthropic live validation, store approval, Google endorsement, ranking, hosted AI, login, subscription, cloud sync, web search, or analytics.

## Required Output Checklist

Files expected:

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

If time or tooling limits prevent the full set, create only assets that pass the checks and list missing items in `GENERATION_REPORT.md`.

## Visual Acceptance

Every generated image must pass:

- Correct dimensions.
- Correct output path and filename.
- Exact Aviso logo if logo appears.
- Aviso sage/paper/ink visual system.
- No wrong font direction such as serif wordmark or decorative AI typography.
- No fake features or fake pages.
- No policy-risk claims.
- No unreadable dense text blocks.
- No warped browser UI.
- No cropped product controls.
- No excessive white-gray empty tile that fails promo guidance.

Screenshot-specific checks:

- 1280x800.
- Square corners.
- Full bleed; no decorative padding frame.
- Reflects actual product experience.
- Chinese and English screenshot sets describe the same capabilities.
- API key fields are masked or empty.

Promo-specific checks:

- Small promo is 440x280.
- Marquee is 1400x560.
- Shared visual language, not locale-specific text-heavy variants.
- Simple, branded, readable at half size.

## Generation Report Format

Write `GENERATION_REPORT.md` with:

```md
# Chrome Web Store Asset Generation Report

## Summary

- Completed:
- Skipped:
- Blocked:

## Sources Used

- Logo:
- UI references:
- Page content references:

## Output Files

| File | Size | Status | Notes |
| --- | --- | --- | --- |

## Self-Review

- Logo exactness:
- Typography/style:
- Product truth:
- Policy boundaries:
- Localization:

## Needs CTO Review

- Items needing rejection or regeneration:
- Items safe to keep:
```
