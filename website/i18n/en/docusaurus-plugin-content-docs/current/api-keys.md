---
title: AI Services And API Keys
description: Choose Aviso AI or configure model provider API keys and understand where data is sent.
sidebar_position: 3
---

# AI Services And API Keys

Aviso supports two AI service paths:

- **Aviso AI**: sign in and use free quota without providing your own model provider API key.
- **BYOK direct-provider**: use your own model provider API key. BYOK requests are sent directly from the browser extension to the provider you select.

You can manage the default service in the Popup and switch services by task.

## Aviso AI

Aviso AI is the quickest way to start. After sign-in, the Popup shows account status, quota status, refresh, and sign-out controls. When you use Aviso AI, requests pass through the Aviso backend and upstream model providers.

Important boundaries:

- Free quota is available after sign-in.
- Signing out of Aviso AI does not remove or disable BYOK provider configs.
- If quota or service availability blocks a task, you can switch back to a BYOK provider.

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

- Sign in to, refresh, or sign out of Aviso AI.
- View Aviso AI account status and quota status.
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

API keys are not stored in plaintext. They are stored in Chrome local extension storage inside the current browser profile with local encryption/obfuscation-level protection and are used for BYOK direct-provider requests.

Important boundaries:

- The API key exists inside the current browser profile.
- This protection is a convenience boundary inside the browser profile. It does not defend against a readable browser profile, a compromised device, or a malicious extension.
- It is not keychain storage, hardware-backed protection, end-to-end encryption, or zero-knowledge protection.
- Non-secret service settings are stored in Chrome sync settings; API keys are not stored there.
- When you use a BYOK provider, the request is sent directly to the provider you selected. When you use Aviso AI, requests pass through the Aviso backend and upstream providers after you choose that path and sign in.
- Provider billing, logs, retention, and limits follow your provider account terms.
- Do not expose API keys in screenshots, feedback, issues, recordings, or chat messages.

Aviso AI does not require a model provider API key from you. Its session is stored in local extension storage and can be signed out from the Popup.

## Replace or Remove a Key

You can update API keys in the Aviso Popup. To stop using a provider, delete the corresponding key and rotate or revoke the old key in the provider console if needed.

If you uninstall the extension, Chrome clears the extension’s local storage.
