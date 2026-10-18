---
title: AI Services And API Keys
description: Configure model provider API keys and understand where data is sent.
sidebar_position: 3
---

# AI Services And API Keys

Aviso uses a bring-your-own-API-key (BYOK) model: you use your own model provider API key, and requests are sent directly from the browser extension to the provider you select. 
You can manage the default service in the Popup and switch services by task.

## Supported Providers

The current code includes these provider paths:

| Provider | Current status |
| --- | --- |
| Doubao / Volcengine Ark | API key, model ID, and endpoint can be configured; actual availability depends on your key, model access, and service status. |
| OpenAI | API key and model ID can be configured; actual availability depends on your key, model access, and service status. |
| Anthropic | API key and model ID can be configured; actual availability depends on your key, model access, and service status. |
| DeepSeek | API key and model ID can be configured; actual availability depends on your key, model access, and service status. |
| Kimi / Moonshot | API key and model ID can be configured; actual availability depends on your key, model access, and service status. |
| OpenRouter | API key, model ID, and endpoint can be configured; actual availability depends on your key, model access, and service status. |
| Gemini | API key, model ID, and endpoint can be configured; actual availability depends on your key, model access, and service status. |
| Tencent Hunyuan | API key, model ID, and endpoint can be configured; actual availability depends on your key, model access, and service status. |

These services require your own valid API key. You can trigger a connection test in the Popup when needed. OpenRouter, Gemini, and Tencent Hunyuan use OpenAI-compatible configs and require a manually entered model ID; Aviso does not automatically read model lists.

## AI Service Configs

The Popup supports multiple AI service configs. You can:

- Save multiple configs for the same provider.
- Set the current default service.
- Manually edit OpenAI / Anthropic / DeepSeek / Kimi-Moonshot / OpenRouter / Gemini / Tencent Hunyuan model IDs.
- Fill in Doubao / Volcengine Ark endpoint and model fields.
- Manually trigger a connection test. Each test targets one provider and only shows a redacted summary.

Aviso does not automatically read model lists from your provider account and does not automatically call list-models APIs.

## BYOK Setup Steps

1. Click the Aviso icon in the Chrome toolbar.
2. Add or edit a service config in the AI services area.
3. Enter the matching API key.
4. Fill in model ID, endpoint, or service name as needed.
5. Save the config and optionally set it as default.
6. Return to a webpage and trigger requests through the right-click menu, selection toolbar, command palette, selection translation card, or result-panel follow-up.

## How API Keys Are Stored

API keys are not stored in plaintext. They are stored in Chrome local extension storage with local encryption/obfuscation-level protection and are used for direct browser-to-provider requests.

Important boundaries:

- The API key exists in your local browser environment.
- This protection does not defend against an attacker who can read the local browser profile, control the device, or control the current Chrome user environment.
- Non-secret service settings are stored in Chrome sync settings; API keys are not stored there.
- When you use a model, the request is sent directly to the provider you selected.
- Provider billing, logs, retention, and limits follow your provider account terms.
- Do not expose API keys in screenshots, feedback, issues, recordings, or chat messages.

## Replace or Remove a Key

You can update API keys in the Aviso Popup. To stop using a provider, delete the corresponding key and rotate or revoke the old key in the provider console if needed.

If you uninstall the extension, Chrome clears the extension’s local storage.
