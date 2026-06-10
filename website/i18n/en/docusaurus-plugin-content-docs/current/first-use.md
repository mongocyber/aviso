---
title: First Use
description: Run your first Aviso action after installation.
sidebar_position: 4
---

# First Use

After installing Aviso and setting an API key, start from a normal public webpage that does not contain private information. This helps you confirm the basic flow safely.

## Option 1: Use the Selection Toolbar

1. Open a normal webpage.
2. Select a short paragraph.
3. Wait for the Aviso selection toolbar to appear.
4. Choose explain, translate, refine, summarize, or send to AI.
5. Check the in-page result panel.

The selection toolbar is intended for short pieces of text you are currently reading or editing.

## Option 2: Use the Right-Click Menu

After selecting text, an image, a link, or an empty area of the page, use the right-click menu to call Aviso.

Common actions include:

- Explain selected text.
- Translate selected text.
- Refine selected text.
- Summarize selected text or the current page.
- Use a custom template.
- Copy the current context to the clipboard without calling a provider.
- Switch model from the right-click menu.

Image explanation and screenshot-related flows remain internal right-click paths and are not the main user entry.

## Option 3: Use the Command Palette

Use the keyboard shortcut:

- Mac: `Command+Shift+Space`
- Windows/Linux: `Ctrl+Shift+Space`

The command palette can search:

- Local Aviso AI conversations.
- Chrome bookmarks.
- Chrome browsing history.

If there are no matching local results, pressing Enter can send your input to the configured AI provider.

The command palette does not show a screenshot entry.

## Option 4: Use Optional Local Helpers

You can enable optional helpers in the Popup:

- Selection translation card.
- Double-click quick menu.
- Clipboard prompt.

Aviso avoids input fields, editable regions, common code editors, and its own UI. The double-click quick menu does not show a screenshot entry.

## If Nothing Happens

Check:

- The extension is enabled in `chrome://extensions/`.
- The API key is saved and the provider account is usable.
- The current webpage allows extension content scripts.
- The feature switch is enabled.
- The model may simply be slow rather than failed.
