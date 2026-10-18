---
title: Known Limitations
description: Current Aviso version limitations.
sidebar_position: 8
---

# Known Limitations

These notes explain the current Aviso usage boundaries.

## Provider Response Speed

Aviso tries to show the floating panel and waiting state immediately after an action is triggered, but first-token speed still depends on:

- Selected model.
- Network condition.
- API key validity.
- Provider load.
- Input length.
- Page text complexity.

The current Aviso version does not promise instant model responses. The UI shows waiting states, and long waits without a result are surfaced as clearer failures.

## Page Summary Length

Page summaries extract current page text and truncate it to about 5000 characters by default before sending it to the provider.

This reduces request size and waiting time, but later parts of long pages may not be fully covered.

## Remote Link Bodies

Link summarization mainly sends the link URL as context. Aviso does not actively fetch remote webpage bodies.

Aviso does not fetch arbitrary remote link content and does not request broad host permissions.

## Browsing History and Bookmark Search

The command palette can search Chrome browsing history, Chrome bookmarks, and local AI conversations. Browsing history and bookmarks are only used for local keyword search. They do not enter AI requests and are not sent to Aviso servers.

Browser permissions, page focus, or the user environment may affect search results.

Opening URLs, opening history/bookmark candidates, translating the current page, and summarizing the current page require the user to select a candidate first. The command palette does not perform autonomous browsing, web search, or remote link-body fetching.

## Image Explanation

In the internal right-click path, Aviso can explain supported image URLs or supported base64 image data. Some remote images may fail even if they look usable, because providers may be unable to download them due to authentication, cross-origin policy, source restrictions, or format constraints.

Arbitrary webpage image explanation is not guaranteed for every source.

## Screenshot Entry

Screenshot capability is kept only in a user-triggered internal right-click path. The command palette and double-click quick menu do not show screenshot entries, and the current site does not present screenshot as a main public entry point or promotional feature.

Screenshot questions also depend on whether the selected model supports visual input.

## Release Status And API Keys

Aviso is distributed only as a package via the website and GitHub Releases and and must be loaded manually.

Aviso requires your own model service API key and does not currently provide built-in free model quota.

## Provider Support Scope

Currently supported configs:

- Doubao / Volcengine Ark supports API key, model ID, and endpoint configuration.
- OpenAI supports API key and model ID configuration.
- Anthropic supports API key and model ID configuration.
- DeepSeek supports API key and model ID configuration.
- Kimi / Moonshot supports API key and model ID configuration.
- OpenRouter supports API key, model ID, and endpoint configuration.
- Gemini supports API key, model ID, and endpoint configuration.
- Tencent Hunyuan supports API key, model ID, and endpoint configuration.

These services require your own valid API key. When OpenRouter, Gemini, or Tencent Hunyuan is used as an OpenAI-compatible config, the model ID must be entered manually; Aviso does not automatically read model lists. You can also trigger connection tests manually in the Popup when needed.
