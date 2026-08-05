---
title: Support & Feedback
description: How to safely report Aviso issues.
sidebar_position: 9
---

# Support & Feedback

This page explains where to send Aviso feedback, what information to include, and what not to send.

## Feedback Entry

Use the website [feedback form](/en/feedback/) first. The form prioritizes issue type, trigger method, Chrome / OS / Aviso versions, provider path, and optional contact email. Submissions email those structured fields to the maintainer through the website email channel. Optional notes help users organize context, but they are not included in the maintainer email by default.

If you are an invited tester, you can also use the feedback channel provided by the maintainer. GitHub Issues are only useful if you have been granted repository access.

## Check Before Reporting

If Aviso does not work as expected, first check:

- The extension is enabled in `chrome://extensions/`.
- If you use the hosted account candidate path, it is in an owner-gated activation environment, account or plan/quota state is available, and you have tried refreshing account status.
- If you use BYOK, the API key is saved and the provider account is usable.
- The current webpage allows extension content scripts.
- If the issue is the clipboard prompt, Clipboard-aware prompts are enabled in the Popup and the page/content is not being skipped as sensitive.
- Relevant feature switches are enabled, such as the selection translation card or double-click quick menu.
- The model may be slow rather than the request not being sent.

## Feedback Form Support

The website feedback form supports:

- Required issue type, such as bug, suggestion, install, or privacy.
- Required trigger method, such as right-click menu, selection toolbar, selection translation card, double-click quick menu, command palette, clipboard prompt, in-page result panel, Popup, install / setup, website / docs, or other.
- Chrome version, operating system, Aviso version, provider path, and optional provider / model name.
- Optional expected result, actual result, reproduction steps, and additional details. These fields may be omitted from the maintainer email if they look risky or under the current default policy.
- Screenshot upload is temporarily disabled; feedback emails do not forward attachment content by default.
- Optional contact email for replies.

## Useful Information to Include

Useful information to include:

- Chrome version.
- Operating system.
- Aviso version.
- Trigger method: right-click menu, selection toolbar, selection translation card, double-click quick menu, command palette, clipboard prompt, in-page result panel, or Popup.
- Whether you were using Aviso AI or a BYOK provider.
- Provider name, but never the API key.
- Model or AI service config name, but never the API key.
- Page type where the issue appeared, such as normal webpage, iframe page, form page, or image page.
- Reproduction steps.
- Notes about a redacted screenshot or recording if useful; the current form temporarily does not upload screenshot attachments.

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
| Floating panel appears but keeps waiting | Slow hosted path or provider response, API key issue, network problem, or long input. |
| Hosted account path is unavailable | Not in an owner-gated activation environment, account or plan/quota state unavailable, account status needs refresh, or service is temporarily unavailable. |
| Selection toolbar does not appear | Page blocks selection, content is inside a complex iframe, extension is not loaded, or feature switch is off. |
| Selection translation card does not appear | Feature switch is off, selection is too long, page is not suitable for injection, or provider is unavailable. |
| Double-click quick menu does not appear | Feature switch is off, or the target is an input, editable area, code editor, or Aviso UI. |
| Command palette shortcut does not work | System shortcut conflict, browser focus is not in the page, or extension shortcut is not active. |
| Command palette cannot find history/bookmarks | Browser permissions, keywords, local history/bookmark data, or page focus may affect results. |
| Link summary does not read like a page summary | Link summary uses the URL as context. |
| Image explanation fails | Image source, format, authentication, or provider download support may be limited. |

## Feedback Safety

Before sending screenshots or recordings, redact API keys, private webpages, real accounts, customer data, and unpublished materials. The feedback form emails structured fields by default; optional free-text notes and attachment content are not included in the email by default, and risky-looking optional content is reported back as needing redaction.

## Support Entry

- The current public feedback entry is the [website feedback form](/en/feedback/).
- If you are an invited tester, you can also use the feedback channel provided by the maintainer.
