---
title: Install
description: Current installation guidance for the Aviso Chrome extension.
sidebar_position: 2
---

# Install

The official Chrome Web Store install link is not available yet. This page explains the current loading method before the official link is available, plus the checks to run after installation.

## Chrome Web Store Install

When the official store link is available, this page will be updated with the standard install steps. For now, no fake store URL is shown:

```text
Chrome Web Store official link: not available yet; will be updated later
```

The website homepage and navigation CTA will also point to the official store listing when that link is available.

## Current Build Access

Before the official store link is available, the build directory is provided by the maintainer. The current build directory is:

```text
build/chrome-mv3-prod
```

This directory comes from the local project build and is used to load the extension and complete the installation checks. After the Chrome Web Store link is available, this page will be replaced with the official install steps.

## Load the Extension in Chrome

1. Open Chrome.
2. Go to `chrome://extensions/`.
3. Turn on “Developer mode” in the top-right corner.
4. Click “Load unpacked”.
5. Select the provided `build/chrome-mv3-prod` directory.
6. Confirm that Aviso appears in the extensions list.

After installation, Aviso appears in the Chrome toolbar. From the Popup you can set UI language, theme, default model, AI service configs, API keys, feature switches, local history, and custom templates.

## Check After Installing

Recommended checks:

- Open the Aviso Popup and confirm that the hosted account candidate entry, AI service configs, and API key settings are visible.
- Confirm the hosted account path fails safely when owner-gated Supabase configuration is absent; do not treat it as a public live sign-in entry.
- To use your own model service, add or edit a BYOK service config and save the API key, model ID, or endpoint as needed.
- After saving an API key or switching to a new model service for the first time, the first request may take longer than usual. Wait for the page prompt to return; later requests are usually faster.
- Open a normal webpage, select text, and check whether the selection toolbar appears.
- Right-click on a webpage and check whether the Aviso menu appears.
- On Mac, use `Command+Shift+Space`; on Windows/Linux, use `Ctrl+Shift+Space`; check whether the command palette opens.
- If the selection translation card or double-click quick menu is enabled, confirm that it appears only in normal webpage areas.
