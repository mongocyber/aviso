# Chrome Web Store Asset Spec

Updated: 2026-07-19

## Goal

Create publish-ready Chrome Web Store image assets for Aviso using the real product design language, real logo, real UI surfaces, and current product capabilities.

This pack prepares assets for future store submission. It does not mean the extension has already been submitted, approved, tagged, or publicly released.

## Official Asset Requirements

Based on Chrome Web Store documentation checked on 2026-06-09:

| Asset | Required | Size | Locale |
| --- | --- | --- | --- |
| Store icon | Required | 128x128 PNG | Shared |
| Screenshot | At least 1, up to 5 | 1280x800 preferred, 640x400 allowed | Can be localized |
| Small promo tile | Required | 440x280 PNG or JPEG | Not localized |
| Marquee promo tile | Optional | 1400x560 PNG or JPEG | Not localized |

Screenshot rules:

- Square corners.
- No padding; full bleed.
- Must reflect actual user experience.
- Must avoid blurry, distorted, pixelated, sideways, or over-text-heavy imagery.

Promo tile rules:

- Communicate brand, not just a screenshot.
- Avoid too much text.
- Avoid busy compositions.
- Work when reduced to half size.
- Fill the region with defined edges.
- Avoid misleading claims about ranking, status, performance, store approval, or platform endorsement.

## Product Truth Allowed In Assets

Allowed:

- Aviso is a Chrome extension that brings AI actions into the current webpage.
- Users can select text and use a lightweight toolbar.
- Available selection actions: explain, translate, refine, summarize, ask AI.
- Users can open a command palette with keyboard shortcut.
- Command palette can search Chrome browsing history, Chrome bookmarks, and local Aviso AI conversations.
- Users can send a question to AI when there are no command results.
- Results appear in an in-page Aviso floating panel.
- Result panel supports copy, save to local history, and continue asking.
- Popup manages UI language, theme, default model, AI service configuration, API keys, feature switches, templates, and local history.
- BYOK direct-provider model: users provide their own provider API keys and the extension calls approved provider hosts directly.
- Optional Aviso AI path: users can choose Aviso AI and sign in; only that path uses the Aviso backend and upstream model services.
- UI supports Chinese and English.

Allowed but not hero/promotional focus:

- Right-click menu.
- Double-click quick menu, because it is optional and default-off.
- Clipboard prompt, because it is contextual.
- Iframe support, because it is a compatibility detail.

Do not present as store-asset selling points:

- Screenshot/image-question feature. It remains a right-click internal path and is not a main public entry.
- OpenAI or Anthropic live validation. It is deferred until usable API keys are available.
- Aviso AI sign-in or quota as the primary store-asset selling point.

Do not claim or imply:

- Chrome Web Store approval, ranking, award, featured status, editor selection, or Google endorsement.
- Aviso AI public-live status, anonymous/public quota availability, subscription/payment support, BYOK via an Aviso provider proxy, telemetry, analytics, cloud sync, web search, or remote link-body fetching.
- Zero latency, guaranteed accuracy, guaranteed privacy by the selected provider, or model availability beyond user configuration.

## Design System References

Use the real Aviso design language:

- Source tokens: `src/styles/aviso.tsx`
- Website token mirror: `website/src/css/custom.css`
- Source logo files:
  - `website/static/img/aviso-mark-sage.svg`
  - `website/static/img/aviso-icon.png`

Logo:

- Use the exact Aviso spiral mark from the source files.
- The mark stroke/fill color is `#6F8C73`.
- Do not redraw, reinterpret, smooth, rotate, simplify, add extra rings, add extra dots, or replace the mark.
- If Image 2.0 cannot preserve the exact mark, generate the scene without the logo and report that exact-logo compositing must be done with the source file.

Typography:

- Product and marketing type: Hanken Grotesk.
- Small tags/technical labels: Space Mono.
- If Image 2.0 cannot render the exact font, keep generated text minimal and large. Critical UI text should come from real screenshots or final manual typesetting.
- Do not use serif logo text or a fake "Aviso" wordmark unless it comes from an approved source.

Color and surface language:

- Sage accent: `#6F8C73`.
- Deep ink: near `#2E3A33`.
- Paper: near `#FAFAF6`.
- Soft sage surface: near `#EEF4EE`.
- Line color: near `#E1E8DF`.
- Use restrained warm-white/paper surfaces, sage accents, ink text, thin borders, soft shadows, and compact browser-extension controls.
- Avoid purple-blue AI gradients, neon glow, dark sci-fi dashboards, beige/brown editorial palettes, decorative orbs, fake 3D mascots, and generic AI brain imagery.

Component language:

- Rounded corners: 8px, 10px, 14px, or 16px.
- Buttons are compact with icons where useful.
- Cards are individual UI surfaces only; do not put cards inside cards.
- Browser chrome can be simplified, but product panels must resemble existing Aviso UI.
- Keep UI density close to the real extension, not a large marketing dashboard.

## Real Content Sources

Use only these content sources for browser-page text shown behind Aviso UI:

- `website/docs/core-features.md`
- `website/docs/first-use.md`
- `website/docs/privacy-policy.md`
- `tests/manual-test.html`

Do not invent article pages, fake product dashboards, fake Chrome store pages, fake provider consoles, fake Google pages, or fake user data.

Preferred screenshot content:

- Chinese screenshots: use Chinese docs/manual-test content from the files above.
- English screenshots: use English UI text from the app implementation and safe English page excerpts from website code/docs where available.

When page text is too small to read, it may be abstracted as blurred paragraphs, but headings and highlighted text must still come from an allowed source.

## Asset Matrix

### 1. Store Icon

Output:

- `store-assets/chrome-web-store/output/icon-128.png`

Source:

- `website/static/img/aviso-icon.png`
- `website/static/img/aviso-mark-sage.svg`

Direction:

- Prefer a clean export derived from the existing icon/mark.
- Do not ask Image 2.0 to reinvent the icon.
- 128x128 PNG.
- Transparent background if derived from mark.
- Artwork should visually fit Chrome icon guidance and remain legible on light/dark backgrounds.

Acceptance:

- Exact Aviso mark geometry.
- No extra text.
- No thick external frame.
- No large shadow.

### 2. Small Promo Tile

Output:

- `store-assets/chrome-web-store/output/promo-small-440x280.png`

Size:

- 440x280.

Locale:

- Shared; do not create zh/en variants.

Content:

- Exact Aviso mark.
- One clean visual metaphor: selection toolbar over a real page, plus a small in-page result panel hint.
- Minimal or no words.
- If words are used, maximum one phrase: `Ask AI in place`.

Design:

- Sage/paper/ink palette.
- Full-bleed composition.
- Larger brand mark or exact icon on one side.
- UI preview should not look like a fake standalone app dashboard.

Acceptance:

- Logo exact.
- No provider logos.
- No screenshot feature.
- No ranking/status claims.
- Works when downscaled to 220x140.

### 3. Marquee Promo Tile

Output:

- `store-assets/chrome-web-store/output/promo-marquee-1400x560.png`

Size:

- 1400x560.

Locale:

- Shared; do not create zh/en variants.

Content:

- Exact Aviso mark.
- Wide composition showing current webpage, selection toolbar, command palette, and result panel as a cohesive browser-extension layer.
- Optional large phrase: `AI where you read`.

Design:

- Spacious but not empty.
- Browser/page should feel real and current.
- Avoid split-card marketing hero layout.

Acceptance:

- Logo exact.
- No invented UI actions.
- No fake platform badges.
- No excessive text.

### 4. Screenshot Set: Chinese

Outputs:

- `store-assets/chrome-web-store/output/zh/screenshot-01-selection-toolbar-1280x800.png`
- `store-assets/chrome-web-store/output/zh/screenshot-02-command-palette-1280x800.png`
- `store-assets/chrome-web-store/output/zh/screenshot-03-result-panel-1280x800.png`
- `store-assets/chrome-web-store/output/zh/screenshot-04-popup-service-settings-1280x800.png`
- `store-assets/chrome-web-store/output/zh/screenshot-05-local-history-1280x800.png`

Rules:

- 1280x800.
- Square corners.
- No padding.
- Use Chinese UI strings from current product implementation.
- Use allowed Chinese page content sources only.
- Keep API keys masked or absent.

Screenshot 01 content:

- Real browser page using `website/docs/core-features.md` or `tests/manual-test.html`.
- Selected text.
- Aviso selection toolbar with explain/translate/refine/summarize/ask AI actions.
- May show inline translation card only if enabled state is represented accurately.

Screenshot 02 content:

- Command palette.
- Search examples: local history, bookmark, browser history, local AI conversation.
- No screenshot entry.

Screenshot 03 content:

- In-page result panel.
- Result content should be safe placeholder derived from current docs, not raw real provider output.
- Show copy/save/continue controls.

Screenshot 04 content:

- Popup service/settings page.
- Show UI language/theme/service configuration shape.
- API key field must be empty, masked, or demo-only.
- Do not show a successful OpenAI/Anthropic live validation status.

Screenshot 05 content:

- Popup local history or templates.
- Show local saved conversation reuse.
- Do not imply cloud sync.

### 5. Screenshot Set: English

Outputs:

- `store-assets/chrome-web-store/output/en/screenshot-01-selection-toolbar-1280x800.png`
- `store-assets/chrome-web-store/output/en/screenshot-02-command-palette-1280x800.png`
- `store-assets/chrome-web-store/output/en/screenshot-03-result-panel-1280x800.png`
- `store-assets/chrome-web-store/output/en/screenshot-04-popup-service-settings-1280x800.png`
- `store-assets/chrome-web-store/output/en/screenshot-05-local-history-1280x800.png`

Rules:

- Same scenes as Chinese screenshots.
- English UI text should match current product implementation.
- Do not add extra claims to compensate for less text.
- Keep the same feature set as the Chinese screenshots.

## Required Reference Capture Before Generation

Before using Image 2.0, the generation thread must prepare or collect:

1. Exact logo source file.
2. At least one real current-product UI reference for each target scene.
3. The specific page content source used in each screenshot.
4. The exact visible marketing phrase, if any.

If any item is missing, stop and report the missing reference. Do not generate from imagination.
