---
title: Install
description: Current installation guidance for the Aviso Chrome extension.
sidebar_position: 2
---

# Install

Aviso documentation is public-facing, and version `0.1.0` has been submitted for Chrome Web Store review, but the official install link is not available yet. This page covers both the future store install path and the current loading method for invited testers and review-preparation maintainers.

## Install After Chrome Web Store Approval

After the Chrome Web Store listing is approved, this page will be updated with the official store link and final install steps. For now, no fake store URL is shown:

```text
Chrome Web Store official link: not available yet; will be updated after review approval
```

At that point, the website homepage and navigation CTA will also point to the official store listing.

## Current Build Access

Before the official store link is available, the build directory is provided only to invited testers and review-preparation maintainers. The current production build directory is:

```text
build/chrome-mv3-prod
```

This directory comes from the local project build and is currently used for invited testing and review preparation. After the Chrome Web Store link is available, this page will be replaced with the official install steps.

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

- Open the Aviso Popup and confirm that model and API key settings are visible.
- Open a normal webpage, select text, and check whether the selection toolbar appears.
- Right-click on a webpage and check whether the Aviso menu appears.
- On Mac, use `Command+Shift+Space`; on Windows/Linux, use `Ctrl+Shift+Space`; check whether the command palette opens.
- If the selection translation card or double-click quick menu is enabled, confirm that it appears only in normal webpage areas.

Treat the current material as “submitted for Chrome Web Store review; official store link not available yet; currently verified through the build directory provided by the maintainer.”
