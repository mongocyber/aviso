---
title: Install
description: Current installation guidance for the Aviso Chrome extension.
sidebar_position: 2
---

# Install

Aviso is distributed as a downloadable package from this website and GitHub Releases. Download the zip and load it manually in Chrome (load unpacked).

## Download

[Download aviso-0.1.1.zip](https://github.com/mongocyber/aviso/releases/latest/download/aviso-0.1.1.zip) ([all releases](https://github.com/mongocyber/aviso/releases/latest)). Source is on [GitHub](https://github.com/mongocyber/aviso) under the MIT license.

Unzip it into a folder; you will select that folder below.

## Load the Extension in Chrome

1. Open Chrome.
2. Go to `chrome://extensions/`.
3. Turn on “Developer mode” in the top-right corner.
4. Click “Load unpacked”.
5. Select the folder you just unzipped (you should see `manifest.json` directly inside).
6. Confirm that Aviso appears in the extensions list.

After installation, Aviso appears in the Chrome toolbar. From the Popup you can set UI language, theme, default model, AI service configs, API keys, feature switches, local history, and custom templates.

## Check After Installing

Recommended checks:

- Open the Aviso Popup and confirm that AI service configs and API key settings are visible.
- Add a BYOK service config and save your own API key, model ID, or endpoint.
- After saving an API key, or switching to a new model service for the first time, the first request may take longer than usual. Wait for the page prompt to return; later requests are usually faster.
- Open a normal webpage, select text, and check whether the selection toolbar appears.
- Right-click on a webpage and check whether the Aviso menu appears.
- On Mac, use `Command+Shift+Space`; on Windows/Linux, use `Ctrl+Shift+Space`; check whether the command palette opens.
- If the selection translation card or double-click quick menu is enabled, confirm that it appears only in normal webpage areas.
