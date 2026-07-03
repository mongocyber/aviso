---
title: Support & Feedback
description: How to safely report Aviso issues.
sidebar_position: 9
---

# Support & Feedback

This page explains where to send Aviso feedback, what information to include, and what not to send.

## Feedback Entry

Use the website [feedback form](/en/feedback/) first. The form supports an issue description, redacted images or screenshots, an optional issue tag, and an optional contact email. Submissions are emailed to the maintainer through the website email channel.

If you are an invited tester, you can also use the feedback channel provided by the maintainer. GitHub Issues are only useful if you have been granted repository access.

## Check Before Reporting

If Aviso does not work as expected, first check:

- The extension is enabled in `chrome://extensions/`.
- If you use Aviso AI, you are signed in, quota is available, and you have tried refreshing account status.
- If you use BYOK, the API key is saved and the provider account is usable.
- The current webpage allows extension content scripts.
- You are not in a sensitive page or sensitive-content scenario that causes the clipboard prompt to be skipped.
- Relevant feature switches are enabled, such as the selection translation card or double-click quick menu.
- The model may be slow rather than the request not being sent.

## Feedback Form Support

The website feedback form supports:

- One issue description field for reproduction steps, expected result, and actual behavior.
- Optional image or screenshot attachments; redact them before uploading.
- Optional issue type tags, such as bug, suggestion, install, or privacy.
- Optional contact email for replies.

## Useful Information to Include

In the issue description, include:

- Chrome version.
- Operating system.
- Aviso version.
- Trigger method: right-click menu, selection toolbar, selection translation card, double-click quick menu, command palette, clipboard prompt, in-page result panel, or Popup.
- Whether you were using Aviso AI or a BYOK provider.
- Provider name, but never the API key.
- Model or AI service config name, but never the API key.
- Page type where the issue appeared, such as normal webpage, iframe page, form page, or image page.
- Reproduction steps.
- Notes about a redacted screenshot or recording if useful.

## Do Not Provide

Do not send:

- API keys, tokens, secrets, or verification codes.
- Private webpage body.
- Customer data, financial data, contracts, admin pages, or unpublished documents.
- Full raw provider request or response.
- Screenshots containing real accounts, emails, phone numbers, or payment information.

## Common Issue Types

| Symptom | Possible cause |
| --- | --- |
| Floating panel appears but keeps waiting | Slow Aviso AI or provider response, API key issue, network problem, or long input. |
| Aviso AI is unavailable | Not signed in, quota unavailable, account status needs refresh, or service is temporarily unavailable. |
| Selection toolbar does not appear | Page blocks selection, content is inside a complex iframe, extension is not loaded, or feature switch is off. |
| Selection translation card does not appear | Feature switch is off, selection is too long, page is not suitable for injection, or provider is unavailable. |
| Double-click quick menu does not appear | Feature switch is off, or the target is an input, editable area, code editor, or Aviso UI. |
| Command palette shortcut does not work | System shortcut conflict, browser focus is not in the page, or extension shortcut is not active. |
| Command palette cannot find history/bookmarks | Browser permissions, keywords, local history/bookmark data, or page focus may affect results. |
| Link summary does not read like a page summary | Link summary uses the URL as context. |
| Image explanation fails | Image source, format, authentication, or provider download support may be limited. |

## Feedback Safety

Before sending screenshots or recordings, redact API keys, private webpages, real accounts, customer data, and unpublished materials.

## Support Entry

- The current public feedback entry is the [website feedback form](/en/feedback/).
- If you are an invited tester, you can also use the feedback channel provided by the maintainer.
