# Image 2.0 Prompt Pack

Use these prompts only after reading `README.md`, `SPEC.md`, and `ACCEPTANCE.md`.

## Global System Direction For Image Generation

Create Chrome Web Store assets for Aviso, a browser extension that lets users call AI inside the current webpage. Use the real Aviso design system: exact sage spiral logo from `website/static/img/aviso-mark-sage.svg`, Hanken Grotesk-like modern humanist sans typography, Space Mono-like tiny technical labels, sage accent `#6F8C73`, warm paper surfaces, deep ink text, thin sage-gray borders, compact extension UI, soft realistic shadows, 8-16px radius controls.

The visual style must feel like a polished Chrome extension product, not a generic AI SaaS dashboard. Use real product UI references for selection toolbar, command palette, floating result panel, and popup settings. Use real allowed page content sources from the repo. Keep copy minimal and truthful.

## Global Negative Prompt

Do not invent or alter the Aviso logo. Do not create a fake wordmark, serif "Aviso" logo, extra spiral rings, extra center dots, mascot, AI brain, robot, purple-blue AI gradient, neon glow, dark sci-fi dashboard, fake Google/Chrome endorsement, store badge, ranking badge, award badge, provider logo, cloud-sync claim, login, subscription, payment, hosted AI, analytics dashboard, screenshot feature as hero, fake page content, fake API key, raw secrets, raw private URL, or fake provider validation.

Do not add large blocks of tiny unreadable text. Do not produce blurry UI, skewed browser windows, distorted screenshots, rounded outer padding for screenshot assets, or decorative floating orbs.

## Exact Logo Handling

Input/reference file:

- `website/static/img/aviso-mark-sage.svg`
- Optional backup: `website/static/img/aviso-icon.png`

Instruction:

Use the exact supplied logo mark as a fixed brand asset. Preserve shape, number of rings, center dot, stroke style, and color. If the image model cannot preserve the exact mark, omit the logo from generated background and report that exact-logo compositing must be done from the source file.

## Prompt 1: Small Promo Tile

Output:

- `store-assets/chrome-web-store/output/promo-small-440x280.png`
- 440x280 PNG

Reference inputs:

- Exact Aviso logo.
- Selection toolbar UI reference.
- Floating result panel UI reference.
- Allowed page content reference.

Prompt:

Create a 440x280 Chrome Web Store small promo tile for Aviso. Full-bleed composition, no outer padding. Use the exact Aviso sage spiral logo as the brand anchor. Show a clean browser-page moment where selected text has a compact Aviso selection toolbar nearby and a subtle in-page answer panel hint, using warm paper background, deep ink text, sage accent `#6F8C73`, thin borders, compact controls, and soft realistic shadow. The composition should communicate "AI actions directly inside the current page" without looking like a fake dashboard. Use minimal text; if any text is included, only use the phrase `Ask AI in place` in a Hanken Grotesk-like font. Keep UI readable at half size. Avoid provider logos and status claims.

## Prompt 2: Marquee Promo Tile

Output:

- `store-assets/chrome-web-store/output/promo-marquee-1400x560.png`
- 1400x560 PNG

Reference inputs:

- Exact Aviso logo.
- Selection toolbar UI reference.
- Command palette UI reference.
- Floating result panel UI reference.
- Allowed page content reference.

Prompt:

Create a 1400x560 Chrome Web Store marquee promo image for Aviso. Use a wide full-bleed browser scene with a real webpage background from the allowed content sources, an Aviso selection toolbar near highlighted text, a compact command palette layer, and an in-page floating result panel. Use the exact Aviso sage spiral logo as the brand anchor. Keep the composition clean, high-resolution, and uncluttered. Use sage `#6F8C73`, warm paper, deep ink, thin sage-gray borders, compact rounded extension controls, and soft shadows. Optional large phrase: `AI where you read`, set in Hanken Grotesk-like typography. No fake platform badges, no provider logos, no screenshot feature, no ranking/status claims.

## Prompt 3: Chinese Screenshot 01 - Selection Toolbar

Output:

- `store-assets/chrome-web-store/output/zh/screenshot-01-selection-toolbar-1280x800.png`
- 1280x800 PNG

Reference inputs:

- Real or faithful UI reference from `src/contents/toolbar.tsx`.
- Allowed Chinese page content from `website/docs/core-features.md` or `tests/manual-test.html`.

Prompt:

Create a 1280x800 full-bleed Chrome Web Store screenshot in Chinese. Show a real browser page using allowed Chinese product/manual content. A short text selection is highlighted. Near the selection, show the Aviso selection toolbar using the real product style: exact sage mark, compact rounded toolbar, thin borders, sage accent, Hanken Grotesk-like UI labels, actions for 解释, 翻译, 润色, 总结, 发给 AI. The screenshot should feel like the actual Chrome extension running on a webpage, not a marketing mockup. Square corners, no padding, no outer frame beyond the browser/page itself. Do not show screenshot/image-question entry.

## Prompt 4: Chinese Screenshot 02 - Command Palette

Output:

- `store-assets/chrome-web-store/output/zh/screenshot-02-command-palette-1280x800.png`

Reference inputs:

- Real or faithful UI reference from `src/contents/command.tsx`.
- Allowed Chinese page content in background.

Prompt:

Create a 1280x800 full-bleed Chinese screenshot of Aviso command palette over a webpage. The command palette should match the current product style: compact floating panel, sage accent, warm paper surface, deep ink text, thin borders, soft shadow, exact Aviso mark. Show rows for 浏览历史, 书签, 本地 AI 对话, and a direct AI question state when there are no results. Use realistic but safe example labels from current docs. Do not include a screenshot entry. Do not imply cloud search or web search.

## Prompt 5: Chinese Screenshot 03 - Result Panel

Output:

- `store-assets/chrome-web-store/output/zh/screenshot-03-result-panel-1280x800.png`

Reference inputs:

- Real or faithful UI reference from `src/contents/floating.tsx`.
- Allowed Chinese page content in background.

Prompt:

Create a 1280x800 full-bleed Chinese screenshot of Aviso's in-page floating result panel. Show a browser page with selected or contextual content from allowed sources, and an Aviso result panel near the content. The panel should show a safe generated-style answer derived from the visible docs content, plus controls for 复制, 保存, 继续追问. Use current Aviso UI style: exact sage mark, compact toolbar buttons, warm paper card, thin sage-gray borders, soft shadow, deep ink text. Do not show raw provider output, API keys, private URLs, or claims that model response is instant.

## Prompt 6: Chinese Screenshot 04 - Popup Service Settings

Output:

- `store-assets/chrome-web-store/output/zh/screenshot-04-popup-service-settings-1280x800.png`

Reference inputs:

- Real or faithful UI reference from `src/popup/index.tsx`.

Prompt:

Create a 1280x800 full-bleed Chinese screenshot showing the Aviso Chrome extension Popup over a neutral browser page. Focus on settings and AI service configuration. Show tabs or sections for 通用, AI 服务, 历史, 指令 where appropriate. Show UI language, theme, default model/service, and API key configuration shape. API key fields must be empty, masked, or demo-only with bullets. Do not show a successful OpenAI or Anthropic live validation status. Do not show login, subscription, payment, hosted AI, or cloud sync. Use the exact Aviso mark and current sage/paper/ink UI style.

## Prompt 7: Chinese Screenshot 05 - Local History

Output:

- `store-assets/chrome-web-store/output/zh/screenshot-05-local-history-1280x800.png`

Reference inputs:

- Real or faithful UI reference from `src/popup/index.tsx` history tab and `src/contents/floating.tsx`.

Prompt:

Create a 1280x800 full-bleed Chinese screenshot showing Aviso local history reuse. Show the Popup history tab or a compact history state with saved local conversations. Use labels such as 本地历史, 恢复对话, 删除, 保存. Make clear visually that this is local browser history, not cloud sync. Use safe short sample entries derived from product docs. Use exact Aviso mark, sage accent, warm paper surfaces, compact controls, and thin borders.

## Prompt 8: English Screenshot 01 - Selection Toolbar

Output:

- `store-assets/chrome-web-store/output/en/screenshot-01-selection-toolbar-1280x800.png`

Prompt:

Create a 1280x800 full-bleed English screenshot of Aviso selection toolbar over an allowed page source. Show selected text and the real Aviso toolbar style with actions: Explain, Translate, Refine, Summarize, Ask AI. Use exact Aviso logo mark, sage accent `#6F8C73`, warm paper surface, deep ink text, compact rounded controls, and realistic browser-extension placement. Do not include screenshot/image-question entry.

## Prompt 9: English Screenshot 02 - Command Palette

Output:

- `store-assets/chrome-web-store/output/en/screenshot-02-command-palette-1280x800.png`

Prompt:

Create a 1280x800 full-bleed English screenshot of Aviso command palette over a webpage. Show rows for browsing history, bookmarks, and local AI conversations, plus the ability to ask AI directly when no results match. Match current Aviso design: exact mark, warm paper surface, sage accent, thin border, compact list rows, soft shadow, Hanken Grotesk-like UI labels. Do not imply web search, cloud search, or screenshot entry.

## Prompt 10: English Screenshot 03 - Result Panel

Output:

- `store-assets/chrome-web-store/output/en/screenshot-03-result-panel-1280x800.png`

Prompt:

Create a 1280x800 full-bleed English screenshot of Aviso's in-page floating result panel. Use allowed page content in the background. The panel should show a safe answer derived from visible docs content and controls for Copy, Save, and Continue asking. Use exact Aviso mark and current sage/paper/ink UI style. Do not include raw provider output, API keys, private URLs, or speed/accuracy guarantees.

## Prompt 11: English Screenshot 04 - Popup Service Settings

Output:

- `store-assets/chrome-web-store/output/en/screenshot-04-popup-service-settings-1280x800.png`

Prompt:

Create a 1280x800 full-bleed English screenshot showing the Aviso Chrome extension Popup focused on settings and AI service configuration. Show Interface language, Appearance theme, default model/service, provider configuration, and masked API key fields. Do not show a successful OpenAI or Anthropic live validation status. Do not show login, subscriptions, payments, hosted AI, or cloud sync. Use exact Aviso mark, Hanken Grotesk-like UI labels, sage accent, warm paper surfaces, compact controls, and thin borders.

## Prompt 12: English Screenshot 05 - Local History

Output:

- `store-assets/chrome-web-store/output/en/screenshot-05-local-history-1280x800.png`

Prompt:

Create a 1280x800 full-bleed English screenshot showing Aviso local history reuse. Show a Popup history tab or compact local history state with saved local conversations. Use labels such as Local history, Restore conversation, Delete, Save. Make clear visually that history is local to the browser, not cloud sync. Use safe short sample entries derived from product docs. Use exact Aviso mark and current sage/paper/ink UI style.

## Prompt 13: Store Icon

Output:

- `store-assets/chrome-web-store/output/icon-128.png`

Instruction:

Do not generate a new icon from scratch. Export or adapt the existing Aviso icon/mark into a 128x128 PNG while preserving exact geometry. Use transparent background where appropriate. Keep visual weight consistent with Chrome icon guidance. No wordmark, no extra border, no large shadow.
