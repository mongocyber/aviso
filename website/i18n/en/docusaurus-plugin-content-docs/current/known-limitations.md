---
title: Known Limitations
description: Current Aviso release-candidate limitations.
sidebar_position: 8
---

# Known Limitations

Aviso is still in internal-trial / release-candidate status. These notes explain the current usage boundaries. Public installation remains subject to Chrome Web Store review status, and v0.2 / v0.2.1 records do not mean public listing.

## Provider Response Speed

Aviso tries to show the floating panel and waiting state immediately after an action is triggered, but first-token speed still depends on:

- Selected model.
- Network condition.
- API key validity.
- Provider load.
- Input length.
- Page text complexity.

The current Aviso version does not promise instant model responses. v0.2 adds clearer waiting states and a local summary-only TTFT method, but no live provider sampling was run and no p50 / p95 target is claimed as achieved.

## Page Summary Length

Page summaries extract current page text and truncate it to about 5000 characters by default before sending it to the provider.

This reduces request size and waiting time, but later parts of long pages may not be fully covered.

## Remote Link Bodies

Link summarization mainly sends the link URL as context. Aviso does not actively fetch remote webpage bodies.

Aviso does not fetch arbitrary remote link content and does not request broad host permissions.

## Browsing History and Bookmark Search

The command palette can search Chrome browsing history, Chrome bookmarks, and local Aviso AI conversations. Browsing history and bookmarks are only used for local keyword search. They do not enter AI requests and are not sent to Aviso servers.

Browser permissions, page focus, or the user environment may affect search results.

Opening URLs, opening history/bookmark candidates, translating the current page, and summarizing the current page require the user to select a candidate first. The command palette does not perform autonomous browsing, web search, or remote link-body fetching.

## Image Explanation

In the internal right-click path, Aviso can explain supported image URLs or supported base64 image data. Some remote images may fail even if they look usable, because providers may be unable to download them due to authentication, cross-origin policy, source restrictions, or format constraints.

Arbitrary webpage image explanation is not guaranteed for every source.

## Screenshot Entry

Screenshot capability is kept only in a user-triggered internal right-click path. The command palette and double-click quick menu do not show screenshot entries, and the current site does not present screenshot as a main public entry point or promotional feature.

Screenshot questions also depend on whether the selected model supports visual input.

## Hosted AI Pre-Release Status

v0.3 hosted AI is still a pre-release gate. It does not mean public release, paid hosted AI, hosted AI live, or Chrome Web Store disclosure submission has been approved.

The verified evidence is layered: staging sign-in, quota, provider smoke, sensitive-log boundary, frontend account display, release build, and manifest checks have passed; production backend authenticated smoke has passed; and the production frontend candidate package now points to `https://aviso-backend-production.vercel.app/*`. Final loaded-extension production smoke, Chrome Web Store submission, website deployment, and owner release approval remain later gates.

BYOK direct-provider remains the default available path. Being signed out of hosted AI does not prevent users from continuing with their own API key.

## Provider Verification Status

Current records:

- Internal testing and user feedback confirm the Doubao / Volcengine Ark path works.
- OpenAI can be configured with API key and model ID; actual availability depends on your key, model access, and provider status.
- Anthropic can be configured with API key and model ID; actual availability depends on your key, model access, and provider status.
- DeepSeek can be configured with API key and model ID; it has one owner-manual connectivity pass, and actual availability still depends on your key, model access, and provider status.
- Kimi / Moonshot can be configured with API key and model ID; it has not been live-provider validated.
- OpenRouter can be configured with API key and manual model ID; provider id is `openrouter`, base URL is `https://openrouter.ai/api/v1`, host permission is `https://openrouter.ai/*`; it has not been live-provider validated, and Aviso does not automatically read model lists.
- Gemini can be configured with API key and manual model ID; provider id is `gemini`, base URL is `https://generativelanguage.googleapis.com/v1beta/openai/`, host permission is `https://generativelanguage.googleapis.com/*`; V02-018 completed non-live validation, but it has not been live-provider validated, and Aviso does not automatically read model lists.
- Tencent Hunyuan can be configured with API key and manual model ID; provider id is `hunyuan`, base URL is `https://api.hunyuan.cloud.tencent.com/v1`, host permission is `https://api.hunyuan.cloud.tencent.com/*`; V02-018 completed non-live validation, but it has not been live-provider validated, and Aviso does not automatically read model lists.

OpenAI, Anthropic, DeepSeek, Kimi / Moonshot, OpenRouter, Gemini, and Tencent Hunyuan are not availability guarantees in the current version. Users need to enter their own valid API keys and manually trigger connection tests in the Popup.
