---
title: Product Intro
description: Aviso is a Chrome extension for calling AI in place on the current webpage.
sidebar_position: 1
---

# Product Intro

Aviso is a Chrome extension for quickly calling AI while you read, research, or edit content on the web. You can explain, translate, refine, summarize, or run custom prompts on selected text, the current page, links, image clues, clipboard text, browsing history, bookmarks, and local AI conversations. Results appear in an in-page floating panel.

Aviso is not trying to replace a full chat app. Its goal is to reduce copy-paste friction: when you are already looking at a webpage or drafting content, you can work with the current context directly.

## Current Status

Aviso is currently version `0.1.0`. This site is the public product website and documentation, covering current capabilities, privacy boundaries, and installation guidance. The official Chrome Web Store install link is not available yet and will be updated after review approval. Core features are implemented, internal manual acceptance has a basic-pass record, and internal testing plus user feedback confirm the Doubao / Volcengine Ark path works.

Current facts:

- This site describes the current product in public website form; the Chrome Web Store install link is not available yet and will be updated after review approval.
- The current build directory is provided only to invited testers and listing-preparation maintainers.
- Right-click menu, selection toolbar, selection translation card, command palette, double-click quick menu, clipboard prompt, in-page result panel, and Popup settings are implemented.
- Multiple AI service configs, default service switching, editable model IDs, Chinese / English UI, and Manifest localization are implemented.
- Internal testing and user feedback confirm the Doubao / Volcengine Ark path works.
- OpenAI and Anthropic can be configured with an API key and model ID; actual availability depends on your key, model access, and provider status.
- This site explains the current implemented capabilities and boundaries. It does not mean the extension has already been submitted to or approved by the Chrome Web Store.

## Who It Is For

Aviso is useful if you often process information in the browser:

- Reading English materials and needing quick translation or explanation.
- Editing webpage text, emails, forms, or drafts and needing wording help.
- Researching webpages, links, bookmarks, and history records.
- Calling models with your own API key while understanding exactly which data goes to the selected provider.
- Keeping prompts, model switching, history reuse, and follow-up questions inside the current browser context.

## Product Boundaries

AI requests are sent directly from the browser extension to the model provider you select. API keys, settings, and history are stored primarily in your browser.

This means:

- You need to provide your own provider API key.
- Provider billing, data handling, and terms are governed by your account relationship with that provider.
- Aviso does not promise instant model responses. First-token latency depends on network, model, input length, provider status, and API key status.
- Aviso does not fetch arbitrary remote link bodies and does not request broad host permissions for that purpose.
- Screenshot capability is kept as an internal right-click path, not a main public entry point or promotional feature.

## Documentation Entry

Recommended reading order:

1. [Install Aviso](./install.md)
2. [API Key Setup](./api-keys.md)
3. [First Use](./first-use.md)
4. [Core Features](./core-features.md)
5. [Privacy Policy](./privacy-policy.md)
