---
title: Core Features
description: Main Aviso v0.1 features and current boundaries.
sidebar_position: 5
---

# Core Features

Aviso v0.1 focuses on connecting common webpage objects to AI and keeping the result inside the current page.

## Right-Click Menu

The right-click menu supports multiple webpage contexts:

- Selected text: explain, translate, refine, summarize.
- Current page: extract page text and summarize it.
- Link: send the link URL as context to AI.
- Copy current context: write page title, URL, optional selected text, and truncated page text to the clipboard without calling a provider.
- Image: in the internal right-click path, explain supported image URLs or supported base64 image data; this is not a main public entry point.
- Custom templates: use prompt templates configured in the Popup.
- Model switching: quickly switch the current model from the right-click menu.

## Selection Toolbar

After selecting text, Aviso shows a lightweight toolbar in the page. It is designed for quickly processing the text you are reading or editing.

Available actions include explain, translate, refine, summarize, and send to AI.

## Selection Translation Card

The selection translation card is off by default. When enabled, short selections can show an in-place translation result with copy, retry, and open-panel actions.

The translation payload only uses the selected text or user-entered text to translate. It does not mix in page URL, page body, remote link body, screenshot, or clipboard content.

## Command Palette

The command palette is for keyboard users:

- Search local history.
- Search Chrome bookmarks.
- Search Chrome browsing history.
- Search local Aviso AI conversations.
- Send input to AI when there is no local match.
- Continue from history items using the original action.

Mac uses `Command+Shift+Space`; Windows/Linux uses `Ctrl+Shift+Space`.

The command palette does not show a screenshot entry.

## Double-Click Quick Menu

The double-click quick menu is off by default. When enabled, it provides a compact entry in normal webpage areas and avoids inputs, editable regions, common code editors, and Aviso UI.

It reuses existing local and AI actions and does not show a screenshot entry.

## Clipboard-Aware Prompt

After copying normal text, Aviso can show a prompt that helps you send the clipboard text to AI.

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
- OpenAI / Anthropic model IDs.
- Doubao / Volcengine Ark endpoint and model fields.
- Feature switches.
- Custom templates.
- History.
- Privacy information.

The UI supports Chinese / English, follows the Chrome UI language by default, and can be manually overridden in the Popup. Translation target language and UI language are independent.

## Iframe Scenarios

Aviso supports common iframe scenarios for the selection toolbar, right-click triggers, and command-palette bridge, while trying to show only one floating panel on the top-level page.

More complex embedded pages, cross-origin pages, and dynamic apps remain ongoing observation areas.
