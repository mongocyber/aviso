---
title: Privacy Policy
description: Aviso privacy policy and permission explanation.
sidebar_position: 6
---

# Privacy Policy

This page explains the data flow and permission boundaries of the current Aviso version.

## Overview

Aviso is a Chrome extension. It helps users call AI inside the current webpage to explain, translate, refine, summarize, or run custom prompts.

Aviso currently has two AI request paths:

- BYOK direct-provider: you bring your own model API key. When you actively trigger an AI request, the browser extension sends the request directly to the model provider you selected. API keys, settings, and history are stored in Chrome extension storage.
- Aviso AI: after sign-in, you can use free quota. Only when you choose Aviso AI and actively trigger a request does the request pass through the Aviso backend and then to upstream model providers. BYOK remains available regardless of Aviso AI sign-in state.

## Data Stored Locally

Aviso stores necessary data in browser extension storage:

| Data type | Storage location | Notes |
| --- | --- | --- |
| API key | Chrome local extension storage | Not stored in plaintext; protected locally with encryption/obfuscation-level protection before storage; used only for requests to the provider you select. |
| Aviso AI session | Chrome local extension storage | Used to identify sign-in state, account state, and quota; users can sign out in the Popup. |
| Settings | Chrome sync settings | Includes UI language, theme, feature switches, custom templates, default service, and provider metadata. |
| History | Chrome local extension storage | Stores user-saved results for later viewing, search, and reuse. |
| Runtime short cache | Extension runtime memory | Reduces repeated preparation cost; not persisted. |

Some internal storage keys still use `contextai_*` names for compatibility with data before the rename. This does not mean data is sent to an old service or third party.

## Data Sent to Model Providers or Aviso AI

When you actively trigger an AI action, Aviso sends only the information needed for that action through the path you selected. The BYOK path sends it directly to the provider you selected. The Aviso AI path sends it through the Aviso backend and upstream model providers. Depending on the action, this may include:

- Selected text.
- User-entered question or prompt.
- Current page URL.
- Selected link URL.
- Supported image URL or supported base64 image data.
- Page text excerpt for page summarization.
- Expanded custom template prompt.
- Recent conversation excerpt for follow-up questions.

Page summarization truncates page text by default to reduce request size and waiting time. The current internal default is 5000 characters.

### Translation

Translation only uses the selected text or the text entered in the command palette. The current MVP does not include page URL, link URL, page body, remote link body, screenshot, or clipboard content as translation input.

### Screenshot Questions

Screenshot questions are kept only in a user-triggered internal right-click path. The user must manually select and confirm a visible page region. Aviso uses the selected screenshot only for that request; screenshot data is not written to history, extension storage, files, documentation, or logs. Provider support depends on whether the selected model supports visual input. This is not a main public entry point or promotional feature.

### Copy Current Context

Copy current context writes page title, URL, optional selected text, and truncated page text to the user’s clipboard. This action does not call an AI provider, save to history, or send anything to Aviso or any remote service.

### Connection Tests and Performance Summary

Provider connection tests can only be triggered manually by the user and test one provider at a time. The test uses a fixed public short phrase and does not include page body, selected text, link, image, screenshot, clipboard content, API key, raw prompt, or raw response.

Aviso’s performance summary is only written to the local extension console for internal latency debugging. It contains fixed stages and bucketed fields. It does not include original text, full URLs, images/base64, screenshots, API keys, raw prompts, or raw responses, and it is not sent to remote telemetry.

## Data Visible to the Aviso Project

The BYOK direct-provider path does not send user text, history, API keys, page content, or model requests to Aviso project servers.

The Aviso AI path passes through the Aviso backend only after the user actively chooses Aviso AI and signs in. The backend processes transient request content needed to complete the request, and stores account, quota, abuse-prevention, request-status, and operational metadata. Metadata is currently retained for 30 days. The Aviso backend does not persist raw prompts, raw responses, page bodies, screenshots/base64, clipboard content, user BYOK API keys, or full URLs. Upstream providers may process request content according to their own terms and account configuration.

The website feedback form is a separate website email channel. Only when a user actively submits feedback, the issue description, optional issue tag, optional contact email, and user-uploaded images or screenshots are sent through a Vercel Function and Resend email service to the maintainer mailbox. The feedback form does not read extension history, API keys, Chrome extension storage, or model request content, and it is not extension telemetry.

Do not submit API keys, tokens, private webpage bodies, customer data, unpublished documents, or unredacted screenshots in the feedback form. Feedback emails are retained in the maintainer mailbox for issue triage and replies.

## API Keys

BYOK API keys are not stored in plaintext. They are stored in Chrome local extension storage with local encryption/obfuscation-level protection. Aviso does not upload user BYOK API keys to Aviso servers. Aviso AI does not require users to provide model provider API keys.

This protection does not defend against an attacker who can read the local browser profile, control the device, or control the current Chrome user environment. If you suspect the device or browser profile is compromised, rotate or revoke the API key in the provider console first.

When you use a BYOK provider, the request goes directly from the browser extension to that provider. When you use Aviso AI, the request passes through the Aviso backend and upstream providers. Providers may process request content, logs, billing, and retention according to their own terms. Review and accept the provider’s terms and privacy policy before use.

## Chrome Web Store Limited Use Statement

Aviso uses extension-handled user data only to provide user-triggered AI assistant features on the current webpage. Aviso does not sell user data, use user data for advertising, or use user data for credit/lending or similar decisions.

When the user actively triggers an AI action, the BYOK path sends required content directly from the browser extension to the selected model provider. The Aviso AI path sends required content to the Aviso backend and upstream model providers. The Aviso backend does not persist raw prompts, raw responses, page bodies, screenshots/base64, clipboard content, user BYOK API keys, or full URLs. Provider handling depends on provider terms, account configuration, and privacy policy.

## Browser Permissions

Aviso currently uses these permissions:

- `contextMenus`: create right-click menu actions.
- `activeTab`: interact with the current tab after user action.
- `storage`: save settings, API keys, and history.
- `history`: search Chrome browsing history in the command palette; search runs locally.
- `bookmarks`: search bookmarks in the command palette.
- `identity`: open the Google authorization window and exchange for a session only when the user actively signs in to Aviso AI; BYOK does not require this sign-in.
- `clipboardWrite`: copy results from the floating panel.

Aviso content scripts match webpage URLs to show the selection toolbar, selection translation card, default-off double-click quick menu, command palette, in-page result panel, explicitly enabled clipboard prompt, iframe bridge, and the screenshot selection UI used by the internal right-click path. Clipboard-aware prompts are off by default, and Aviso does not keep a copy listener registered when the setting is off or missing. This site access is not used to fetch arbitrary remote link bodies, serve ads, run telemetry, or run analytics. Only when the user actively triggers an AI action that requires page content does Aviso send relevant content through the selected BYOK or Aviso AI path.

Current host permissions are limited to supported provider domains and the Aviso AI backend origin:

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

`https://aviso-backend-production.vercel.app/*` is the backend origin used for Aviso AI. Aviso does not request broad host permissions to fetch arbitrary remote webpage bodies.

## User Control

In the Aviso Popup, users can:

- Modify or delete API keys.
- Add, edit, or delete AI service configs.
- Switch default service and default model.
- Manually edit model IDs.
- Turn local feature switches on or off.
- Switch UI language and theme.
- Manage custom templates.
- View and manage local history.
- Sign in to, refresh, or sign out of Aviso AI; BYOK provider configuration is not blocked by Aviso AI sign-in state.

If you uninstall Aviso, Chrome clears the extension’s local storage. You can also rotate or revoke unused API keys in the provider console.

## Provider Support Scope

Aviso supports configurable OpenAI, Anthropic, Doubao / Volcengine Ark, DeepSeek, Kimi / Moonshot, OpenRouter, Gemini, and Tencent Hunyuan paths. Users can enter their own API key, model ID, or endpoint in settings; requests are sent directly from the browser extension to the selected provider. OpenRouter, Gemini, and Tencent Hunyuan model IDs must be entered manually, and Aviso does not automatically read model lists.

These model services require the user's own valid API key, model ID, or endpoint. Actual availability depends on the user's account access, model access, and service status.

Aviso AI free quota requires sign-in.
