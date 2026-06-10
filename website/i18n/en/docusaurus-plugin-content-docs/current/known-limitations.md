---
title: Known Limitations
description: Current Aviso v0.1 limitations.
sidebar_position: 8
---

# Known Limitations

Aviso is currently v0.1. These notes explain the current version boundaries.

## Provider Response Speed

Aviso tries to show the floating panel and waiting state immediately after an action is triggered, but first-token speed still depends on:

- Selected model.
- Network condition.
- API key validity.
- Provider load.
- Input length.
- Page text complexity.

Aviso v0.1 does not promise instant model responses.

## Page Summary Length

Page summaries extract current page text and truncate it to about 5000 characters by default before sending it to the provider.

This reduces request size and waiting time, but later parts of long pages may not be fully covered.

## Remote Link Bodies

Link summarization mainly sends the link URL as context. Aviso does not actively fetch remote webpage bodies.

Aviso does not fetch arbitrary remote link content and does not request broad host permissions.

## Browsing History and Bookmark Search

The command palette can search Chrome browsing history, Chrome bookmarks, and local Aviso AI conversations. Browsing history and bookmarks are only used for local keyword search. They do not enter AI requests and are not sent to Aviso servers.

Browser permissions, page focus, or the user environment may affect search results.

## Image Explanation

In the internal right-click path, Aviso can explain supported image URLs or supported base64 image data. Some remote images may fail even if they look usable, because providers may be unable to download them due to authentication, cross-origin policy, source restrictions, or format constraints.

Arbitrary webpage image explanation is not guaranteed for every source.

## Screenshot Entry

Screenshot capability is kept only in a user-triggered internal right-click path. The command palette and double-click quick menu do not show screenshot entries, and the current site does not present screenshot as a main public entry point or promotional feature.

Screenshot questions also depend on whether the selected model supports visual input.

## Provider Verification Status

Current records:

- Doubao / Volcengine Ark has user-usable feedback.
- OpenAI can be configured with API key and model ID; actual availability depends on your key, model access, and provider status.
- Anthropic can be configured with API key and model ID; actual availability depends on your key, model access, and provider status.

OpenAI and Anthropic are not the main selling point of the current version. Users need to enter their own valid API keys and manually trigger connection tests in the Popup.
