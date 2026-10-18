---
title: First Use
description: Run your first Aviso action after installation.
sidebar_position: 4
---

# First Use

After installing Aviso, start from a normal public webpage that does not contain private information. On first start, add your own API key (BYOK) in the Popup.

## Add An API Key First


1. Click the Aviso icon in the Chrome toolbar.
2. Add or edit a provider config in the AI services area.
3. Enter the API key, model ID, or endpoint.
4. Save it and optionally make it the default service.
5. Return to the page and trigger an action through selection, right-click, or the command palette.

## Option 1: Use the Selection Toolbar

1. Open a normal webpage.
2. Select a short paragraph.
3. Wait for the Aviso selection toolbar to appear.
4. Choose explain, translate, refine, summarize, or send to AI.
5. Check the in-page result panel.

If the selection translation card is enabled, short selections can show an inline translation result with copy, retry, and open-result-panel actions.

If you often translate foreign-language content, set the translation target language in the Popup first. The translation target language is independent from the interface language.

## Option 2: Use the Right-Click Menu

After selecting text, an image, a link, or an empty area of the page, use the right-click menu to call Aviso.

Common actions include:

- Explain selected text.
- Translate selected text.
- Refine selected text.
- Summarize selected text or the current page.
- Copy the current context to the clipboard without calling a provider.
- Switch model from the right-click menu.
- Use a custom template.
- Explain supported image URLs.
- Start a summary prompt for a link URL.

Image explanation and screenshot-related flows remain internal right-click paths and are not the main user entry.

Link summary sends the link itself as context to the model.

Copy current context writes the page title, URL, optional selected text, and truncated page body to your clipboard. That action itself does not call a model or save to history.

## Option 3: Use the Command Palette

Use the keyboard shortcut:

- Mac: `Command+Shift+Space`
- Windows/Linux: `Ctrl+Shift+Space`

The command palette can search:

- Local Aviso AI conversations.
- Chrome bookmarks.
- Chrome browsing history.

If there are no matching local results, pressing Enter can send your input to the configured AI provider or generate local intent candidates.

Opening URLs, opening history/bookmark candidates, translating the current page, and summarizing the current page require you to select a candidate first. The command palette does not perform autonomous browsing, web search, or remote link-body fetching.

The command palette does not show a screenshot entry.

## Option 4: Use the Double-Click Quick Menu

The double-click quick menu is off by default. After you enable it, double-clicking in a normal webpage area can show a compact entry for local actions and AI actions.

Aviso avoids input fields, editable regions, common code editors, and its own UI. The double-click quick menu does not show a screenshot entry.

## Option 5: Use the Clipboard Prompt

After you copy normal text, Aviso can show a prompt so you can send clipboard content to AI. Sensitive pages and sensitive content are skipped to reduce accidental triggers in high-risk contexts.

## If Nothing Happens

Check:

- The extension is enabled in `chrome://extensions/`.
- The API key is saved and the provider account is usable.
- The current webpage allows extension content scripts.
- The feature switch is enabled.
- The model may simply be slow rather than failed.

## View and Save Results

AI results appear in the in-page Aviso floating panel. The panel supports:

- Streaming output.
- Copying the result.
- Saving to local history.
- Asking follow-up questions based on the current result.
- Restoring saved local conversations.

History is stored locally in the browser.
