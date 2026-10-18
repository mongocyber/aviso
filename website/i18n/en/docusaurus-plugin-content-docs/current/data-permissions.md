---
title: Data & Permissions
description: What data Aviso handles and which Chrome permissions it uses.
sidebar_position: 7
---

# Data & Permissions

Aviso follows a minimum-use permission design: it requests only the permissions needed for current features and does not request broad webpage access for remote link-body fetching.

## Data Flow Overview

1. The user actively triggers an Aviso action on a webpage.
2. Aviso opens an in-page floating panel and reads the context needed for that action.
3. Aviso reads settings, AI service choice, or BYOK API key from local storage.
4. The request is sent directly from the browser extension to the selected provider, not through Aviso servers.
5. After the provider returns a result, Aviso shows it in the current page.
6. If the user saves the result, history is stored locally in the browser.

BYOK does not require an Aviso account sign-in.

## Local Data

| Data | Purpose | Current storage |
| --- | --- | --- |
| API key | Call the provider selected by the user | Not stored in plaintext; stored in Chrome local extension storage with local encryption/obfuscation-level protection. |
| Settings | Models, switches, UI language, theme, templates, and provider metadata | Stored in Chrome sync settings. |
| History | Search, save, and reuse previous results | Stored in Chrome local extension storage. |
| Runtime short cache | Reduce repeated preparation cost | Only in extension runtime memory; not persisted. |

## Content That May Enter Provider Requests

Depending on the selected feature, request content may include selected text, page URL, link URL, image URL, page text excerpt, custom prompt, recent conversation excerpt for follow-up, or the user’s directly entered question.

This content is sent directly to the provider selected by the user, not through Aviso servers.

The following do not enter provider requests:

- Browsing history and bookmark search terms/results; they are used only for local command-palette search.
- The copy current context action itself; it only writes to the user’s clipboard.
- Webpage body, selection, screenshot, clipboard content, raw prompt, or raw response in connection tests.

Do not actively send passwords, API keys, private account information, unpublished documents, or sensitive customer data to model providers.

## Chrome Permissions

| Permission | Purpose |
| --- | --- |
| `contextMenus` | Show Aviso actions in the right-click menu. |
| `activeTab` | Read or interact with the current tab after the user triggers an action. |
| `storage` | Save settings, API keys, templates, and history. |
| `history` | Search Chrome browsing history in the command palette; search is local and is not sent to Aviso servers or AI providers. |
| `bookmarks` | Search Chrome bookmarks in the command palette. |
| `identity` | Used by an earlier hosted sign-in; BYOK does not use it and needs no sign-in. The permission is still declared in the manifest of the current package. |
| `clipboardWrite` | Copy results from the floating panel. |

## Site Access

Aviso content scripts match webpage URLs to display the selection toolbar, selection translation card, double-click quick menu, command palette, in-page result panel, clipboard prompt, iframe bridge, and the screenshot selection UI used by the internal right-click path.

This access is not used to fetch arbitrary remote link bodies, advertising, telemetry, analytics, or project-owned remote logs. Only when the user actively triggers an AI action that needs page content is relevant content sent to the provider you selected.

Command-palette browsing history, bookmark, and local AI conversation results are local candidates. Opening URLs, opening history/bookmark candidates, translating the current page, and summarizing the current page require user confirmation before execution.

## Host Permissions

Current host permissions are limited to supported provider domains plus one retired early backend origin (see below):

```text
https://api.openai.com/*
https://api.anthropic.com/*
https://ark.cn-beijing.volces.com/*
https://api.deepseek.com/*
https://api.moonshot.cn/*
https://openrouter.ai/*
https://generativelanguage.googleapis.com/*
https://api.hunyuan.cloud.tencent.com/*
https://aviso-backend-production.vercel.app/*
```

They are used for OpenAI, Anthropic, Doubao / Volcengine Ark, DeepSeek, Kimi / Moonshot, OpenRouter, Gemini, and Tencent Hunyuan BYOK provider requests. These model services can be configured with API key, model ID, or endpoint; OpenRouter, Gemini, and Tencent Hunyuan model IDs must be entered manually, and Aviso does not automatically read model lists. Actual availability depends on the user's account access, model access, and service status.

`https://aviso-backend-production.vercel.app/*` was used by an earlier hosted path that has been retired; BYOK requests are not sent to it. Host permissions do not include broad webpage access.

## Sensitive Content Handling

Aviso applies sensitive-domain and sensitive-content filtering to clipboard-aware prompts to reduce accidental handling of passwords, keys, payment pages, admin panels, and similar high-risk content.

This is not a complete guarantee for all sensitive information. Users should still judge which content may be sent to model providers.

Local API key protection is not a device-security boundary. It does not defend against an attacker who can read the local browser profile, control the device, or control the current Chrome user environment.

## Screenshot Capability

Screenshot capability is kept only in a user-triggered internal right-click path. Screenshot/base64 data is used only for that image explanation request and is not written to history, storage, docs, console, telemetry, or release artifacts.

The command palette and double-click quick menu do not show screenshot entries. Current documentation does not present screenshot as a main user entry or promotional feature.

## Screenshots and Feedback

When submitting an issue through the [website feedback form](/en/feedback/) or sharing screenshots, do not expose:

- API keys.
- Private webpages.
- Real accounts.
- Customer data.
- Unpublished business materials.
- Sensitive content that may appear in raw provider errors.

The website feedback form sends only the issue description, optional issue tag, optional contact email, and images or screenshots actively uploaded by the user. It does not read extension history, API keys, Chrome extension storage, or model request content.
