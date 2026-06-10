# Chrome Web Store Asset Generation Report

## Summary

- Completed: `output/icon-128.png` was derived from the real Aviso app icon.
- Completed: `output/promo-small-440x280.png` was generated as a no-logo Image 2.0 background, then composited with the exact source Aviso icon.
- Completed: `output/promo-marquee-1400x560.png` was generated as a no-logo Image 2.0 background, then composited with the exact source Aviso icon.
- Skipped: Chinese and English screenshots.
- Blocked: screenshot generation still requires real runtime UI capture or an image-editing flow that can preserve exact logo, exact UI references, and real page content. Per `ACCEPTANCE.md`, fake generated screenshots remain blocked.

## Sources Used

- Logo: `website/static/img/aviso-icon.png`, `website/static/img/aviso-mark-sage.svg`
- UI references: `src/styles/aviso.tsx`, `website/src/css/custom.css`
- Page content references: `STATUS.md`, `RELEASE_CHECKLIST.md`, `store-assets/chrome-web-store/SPEC.md`, `store-assets/chrome-web-store/IMAGE2_PROMPTS.md`, `store-assets/chrome-web-store/ACCEPTANCE.md`
- Image generation: built-in Image 2.0 path for no-logo promo backgrounds only; generated candidates that resembled a target/concentric logo were rejected.

## Output Files

| File | Size | Status | Notes |
| --- | --- | --- | --- |
| `output/icon-128.png` | 128x128 | Complete | Resized from `website/static/img/aviso-icon.png`; exact source logo geometry retained by derivation from the existing PNG. |
| `output/promo-small-440x280.png` | 440x280 | Complete | Image 2.0 generated a no-logo browser-extension background; exact Aviso icon was composited from `website/static/img/aviso-icon.png`. |
| `output/promo-marquee-1400x560.png` | 1400x560 | Complete | Image 2.0 generated a no-logo wide browser-extension background; exact Aviso icon was composited from `website/static/img/aviso-icon.png`. |
| `output/zh/screenshot-01-selection-toolbar-1280x800.png` | 1280x800 | Skipped | Blocked because generating a faithful screenshot would require exact logo retention and real UI fidelity that current tooling cannot guarantee. |
| `output/zh/screenshot-02-command-palette-1280x800.png` | 1280x800 | Skipped | Blocked because generating a faithful screenshot would require exact logo retention and real UI fidelity that current tooling cannot guarantee. |
| `output/zh/screenshot-03-result-panel-1280x800.png` | 1280x800 | Skipped | Blocked because generating a faithful screenshot would require exact logo retention and real UI fidelity that current tooling cannot guarantee. |
| `output/zh/screenshot-04-popup-service-settings-1280x800.png` | 1280x800 | Skipped | Blocked because generating a faithful screenshot would require exact logo retention and real UI fidelity that current tooling cannot guarantee. |
| `output/zh/screenshot-05-local-history-1280x800.png` | 1280x800 | Skipped | Blocked because generating a faithful screenshot would require exact logo retention and real UI fidelity that current tooling cannot guarantee. |
| `output/en/screenshot-01-selection-toolbar-1280x800.png` | 1280x800 | Skipped | Blocked because generating a faithful screenshot would require exact logo retention and real UI fidelity that current tooling cannot guarantee. |
| `output/en/screenshot-02-command-palette-1280x800.png` | 1280x800 | Skipped | Blocked because generating a faithful screenshot would require exact logo retention and real UI fidelity that current tooling cannot guarantee. |
| `output/en/screenshot-03-result-panel-1280x800.png` | 1280x800 | Skipped | Blocked because generating a faithful screenshot would require exact logo retention and real UI fidelity that current tooling cannot guarantee. |
| `output/en/screenshot-04-popup-service-settings-1280x800.png` | 1280x800 | Skipped | Blocked because generating a faithful screenshot would require exact logo retention and real UI fidelity that current tooling cannot guarantee. |
| `output/en/screenshot-05-local-history-1280x800.png` | 1280x800 | Skipped | Blocked because generating a faithful screenshot would require exact logo retention and real UI fidelity that current tooling cannot guarantee. |

## Self-Review

- Logo exactness: `icon-128.png` keeps the official icon by resizing the existing PNG. Promo files use the exact source icon composited over generated no-logo backgrounds. No generated logo was accepted.
- Typography/style: promo files avoid readable marketing text and do not rely on generated font accuracy.
- Product truth: promo files use abstract UI lines only and do not invent page copy, provider status, store status, or product capability.
- Policy boundaries: no provider calls, API keys, raw prompts, raw responses, private URLs, screenshots/base64, clipboard content, store submission, staging, commit, push, tag, or release actions were performed.
- Localization: promo assets are shared/non-localized; localized screenshot sets were skipped and are not claimed complete.

## Needs CTO Review

- Items needing rejection or regeneration: skipped screenshot assets should be treated as not generated and must be produced from real runtime UI capture or a reference-preserving image-editing flow.
- Items safe to keep: `output/icon-128.png`, `output/promo-small-440x280.png`, and `output/promo-marquee-1400x560.png`, pending CTO visual review against Chrome Web Store expectations.
