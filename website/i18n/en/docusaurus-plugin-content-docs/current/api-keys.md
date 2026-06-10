---
title: API Key Setup
description: Configure model provider API keys and understand where data is sent.
sidebar_position: 3
---

# API Key Setup

Aviso uses your own model provider API key. Requests are sent directly from the browser extension to the provider you select.

## Supported Providers

The current code includes these provider paths:

| Provider | Current status |
| --- | --- |
| Doubao / Volcengine Ark | Has user-usable feedback. |
| OpenAI | API key and model ID can be configured; actual availability depends on your key, model access, and provider status. |
| Anthropic | API key and model ID can be configured; actual availability depends on your key, model access, and provider status. |

OpenAI and Anthropic are not the main selling point of the current version. Users need to enter their own valid API keys and manually trigger connection tests in the Popup.

## AI Service Configs

The Popup supports multiple AI service configs. You can:

- Save multiple configs for the same provider.
- Set the current default service.
- Manually edit OpenAI / Anthropic model IDs.
- Fill in Doubao / Volcengine Ark endpoint and model fields.
- Manually trigger a connection test. Each test targets one provider and only shows a redacted summary.

Aviso does not automatically read model lists from your provider account and does not automatically call list-models APIs.

## Setup Steps

1. Click the Aviso icon in the Chrome toolbar.
2. Add or edit a service config in the AI services area.
3. Enter the matching API key.
4. Fill in model ID, endpoint, or service name as needed.
5. Save the config and optionally set it as default.
6. Return to a webpage and trigger requests through the right-click menu, selection toolbar, command palette, selection translation card, or result-panel follow-up.

## How API Keys Are Stored

API keys are encrypted with AES and stored in Chrome local extension storage. They are used for direct browser-to-provider requests.

Important boundaries:

- The API key exists in your local browser environment.
- Non-secret service settings are stored in Chrome sync settings; API keys are not stored there.
- When you use a model, the request is sent directly to the provider you selected.
- Provider billing, logs, retention, and limits follow your provider account terms.
- Do not expose API keys in screenshots, feedback, issues, recordings, or chat messages.

## Replace or Remove a Key

You can update API keys in the Aviso Popup. To stop using a provider, delete the corresponding key and rotate or revoke the old key in the provider console if needed.

If you uninstall the extension, Chrome clears the extension’s local storage.
