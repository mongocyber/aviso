---
title: Product Intro
description: Aviso is a Chrome extension for using AI directly inside the current webpage.
sidebar_position: 1
---

# Product Intro

Aviso is a Chrome extension for using AI while you read, research, or edit content on the web. You can explain, translate, refine, summarize, or run custom prompts on selected text, the current page, links, clipboard text, browsing history, bookmarks, and local AI conversations. Results appear in an in-page floating panel.

Aviso's core value is reducing copy-paste friction: when you are already looking at a webpage or drafting content, you can work with the current context directly.

## Two Ways To Start

Aviso supports two AI service paths:

- **Sign in to Aviso AI**: best for starting quickly. After sign-in, you can use free quota without preparing a model provider API key first.
- **Bring your own API key**: best if you already have model service accounts such as OpenAI, Anthropic, Doubao / Volcengine Ark, DeepSeek, Kimi / Moonshot, OpenRouter, Gemini, or Tencent Hunyuan. Requests are sent directly from the browser extension to the provider you choose.

You can switch between the two paths by task. BYOK does not require sign-in; signing out of Aviso AI does not remove or disable your BYOK configs.

## Current Status

Current facts:

- This site describes the current product in public website form; the Chrome Web Store install link is not available yet and will be updated later.
- Before the official link is available, the install guide explains the current loadable extension build directory.
- Right-click menu, selection toolbar, selection translation card, command palette, double-click quick menu, clipboard prompt, copy current context, in-page result panel, and Popup settings are implemented.
- Aviso AI sign-in, account status, free quota display, refresh / sign-out, BYOK provider configuration, default service switching, manual model ID editing, Chinese / English UI, and Manifest localization are implemented.
- Aviso supports multiple model service configs, including OpenAI, Anthropic, Doubao / Volcengine Ark, DeepSeek, Kimi / Moonshot, OpenRouter, Gemini, and Tencent Hunyuan. You can enter your own API key, model ID, or endpoint in settings; actual availability depends on your account access, model access, and provider status.

## Who It Is For

Aviso is useful if you often process information in the browser:

- Reading English materials and needing quick translation or explanation.
- Editing webpage text, emails, forms, or drafts and needing wording help.
- Researching webpages, links, bookmarks, and history records.
- Signing in and starting with Aviso AI free quota.
- Calling models with your own API key while understanding exactly which data goes to the selected provider.
- Keeping copy context, prompts, model switching, history reuse, and follow-up questions inside the current browser context.

## Product Boundaries

If you choose “bring your own API key”, Aviso lets your browser connect directly to the model service you selected. Your API keys, settings, and history stay primarily in your browser. When you sign in to Aviso AI and use free quota, requests pass through the Aviso backend and upstream model providers.

This means:

- To start quickly, sign in to Aviso AI and use free quota.
- To use your own model service, add your own API key. Billing, data handling, and terms are governed by your account relationship with that service.
- Aviso does not promise instant model responses. First-token latency depends on network, model, input length, provider status, and API key status.
- Aviso has improved visible waiting states and a local summary-only timing method, but it does not claim live provider p50 / p95 targets have been achieved.
- Aviso does not fetch arbitrary remote link bodies and does not request broad host permissions for that purpose.
- Command-palette history, bookmark, and local AI conversation results are local candidates. Open/page actions require user selection and confirmation; there is no autonomous browsing or web search.
- Screenshot capability is kept as an internal right-click path, not a main public entry point or promotional feature.

## Documentation Entry

Recommended reading order:

1. [Install Aviso](./install.md)
2. [First Use](./first-use.md)
3. [AI Services And API Keys](./api-keys.md)
4. [Core Features](./core-features.md)
5. [Privacy Policy](./privacy-policy.md)
