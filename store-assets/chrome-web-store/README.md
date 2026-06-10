# Chrome Web Store Asset Pack

Status: spec-ready, generation pending.

This folder defines the Chrome Web Store image asset work for Aviso. It is a source-of-truth pack for a separate image-generation thread. Generated images must follow these files instead of relying on free-form visual guesses.

## Files

- `SPEC.md`: asset list, product truth, real source references, design-system references, and output naming.
- `IMAGE2_PROMPTS.md`: prompts for Image 2.0 generation and editing.
- `ACCEPTANCE.md`: review checklist, stop conditions, and handoff format.
- `THREAD_BRIEF.md`: execution brief for the separate generation thread.

## Source References

- Real logo mark: `website/static/img/aviso-mark-sage.svg`
- Real app icon: `website/static/img/aviso-icon.png`
- Shared product UI tokens: `src/styles/aviso.tsx`
- Website token mirror: `website/src/css/custom.css`
- Current product docs: `website/docs/core-features.md`, `website/docs/first-use.md`
- Current UI implementation references:
  - `src/contents/toolbar.tsx`
  - `src/contents/command.tsx`
  - `src/contents/floating.tsx`
  - `src/contents/double-click-menu.tsx`
  - `src/popup/index.tsx`

## Working Rule

Do not invent logo geometry, typography, UI states, provider status, page content, or product capabilities. Use Image 2.0 for visual generation/polish only after the logo, UI state, page content, and copy are grounded in this pack. Do not code-draw the assets as SVG, HTML canvas, CSS art, or generated mock UI.
