---
title: Core Features
description: Current Aviso features and usage boundaries.
sidebar_position: 5
---

# Core Features

Aviso currently focuses on connecting common webpage objects to AI and keeping the result inside the current page. Public installation remains subject to Chrome Web Store review status.

## AI Service Paths

Aviso supports two AI service paths:

- Aviso AI: sign in and use free quota, useful for starting quickly.
- BYOK direct-provider: enter your own model API key, and the browser extension calls the selected provider directly without forcing sign-in.

Only when the user chooses Aviso AI and signs in does the request pass through the Aviso backend and upstream model providers. BYOK configuration and direct-provider requests are not blocked by Aviso AI sign-in state.

## Right-Click Menu

The right-click menu supports multiple webpage contexts:

- Selected text: explain, translate, refine, summarize.
- Current page: extract page text and summarize it.
- Link: send the link URL as context to AI.
- Copy current context: write page title, URL, optional selected text, and truncated page text to the clipboard without calling a provider. This is useful for follow-up questions, notes, reports, or team handoff.
- Image: in the internal right-click path, explain supported image URLs or supported base64 image data; this is not a main public entry point.
- Custom templates: use prompt templates configured in the Popup.
- Model switching: quickly switch the current model from the right-click menu.

## Selection Toolbar

After selecting text, Aviso shows a lightweight toolbar in the page. It is designed for quickly processing the text you are reading or editing.

Available actions include explain, translate, refine, summarize, and send to AI.

## Selection Translation Card

The selection translation card is off by default. When enabled, short selections can show an in-place translation result with copy, retry, and open-panel actions.

The translation payload only uses the selected text or user-entered text to translate. It does not mix in page URL, page body, remote link body, screenshot, or clipboard content.

Translation target language can be set in the Popup. It is independent from the UI language.

## Command Palette

The command palette is for keyboard users:

- Search local history.
- Search Chrome bookmarks.
- Search Chrome browsing history.
- Search local Aviso AI conversations.
- Send input to AI when there is no local match, or generate local intent candidates.
- Require candidate selection before opening URLs, opening history/bookmark results, translating the current page, or summarizing the current page.
- Continue from history items using the original action.

Mac uses `Command+Shift+Space`; Windows/Linux uses `Ctrl+Shift+Space`.

The command palette does not show a screenshot entry.

The command palette does not perform autonomous browsing, web search, or remote link-body fetching. Browsing history, bookmarks, and local AI conversations are local candidates only.

## Double-Click Quick Menu

The double-click quick menu is off by default. When enabled, it provides a compact entry in normal webpage areas and avoids inputs, editable regions, common code editors, and Aviso UI.

It reuses existing local and AI actions, including copy current context, page summary, templates, translate, explain, refine, and summarize selection. It does not show a screenshot entry.

## Clipboard-Aware Prompt

Clipboard-aware prompts are off by default. After you enable them in the Popup, Aviso can show a prompt after copying normal text so you can send the clipboard text to AI.

Aviso skips sensitive domains and sensitive content to reduce accidental handling of passwords, keys, payment pages, admin panels, and similar high-risk content.

## In-Page Result Panel

The floating panel is Aviso’s main result surface. It appears quickly after the user triggers an action and shows waiting states while page content is being prepared or the model is responding.

The panel supports copying results, saving results, deduplicated saving, and follow-up questions.

Local history is stored in browser local extension storage. Saved conversations can be reused from the command palette and Popup.

## Popup Settings

The Popup manages:

- UI language.
- Theme.
- Default model and default AI service.
- Multiple AI service configs.
- API keys.
- OpenAI / Anthropic / DeepSeek / Kimi-Moonshot / OpenRouter / Gemini / Tencent Hunyuan model IDs.
- Doubao / Volcengine Ark endpoint and model fields.
- Aviso AI account sign-in, refresh, sign-out, account status, and quota status.
- Feature switches.
- Translation target language.
- Custom templates.
- History.
- Privacy information.

The UI supports Chinese / English, follows the Chrome UI language by default, and can be manually overridden in the Popup. Translation target language and UI language are independent.

## Iframe Scenarios

Aviso supports common iframe scenarios for the selection toolbar, right-click triggers, command-palette bridge, and explicitly enabled clipboard prompts, while trying to show only one floating panel on the top-level page.

More complex embedded pages, cross-origin pages, and dynamic apps remain ongoing observation areas.
