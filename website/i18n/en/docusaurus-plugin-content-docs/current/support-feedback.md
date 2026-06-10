---
title: Support & Feedback
description: How to safely report Aviso issues.
sidebar_position: 9
---

# Support & Feedback

The Aviso support page is intended for public release use. Version `0.1.0` has been submitted for Chrome Web Store review, and the official Chrome Web Store link is not available yet. This page explains what information to include in feedback and what not to send.

## Check Before Reporting

If Aviso does not work as expected, first check:

- The extension is enabled in `chrome://extensions/`.
- The API key is saved and the provider account is usable.
- The current webpage allows extension content scripts.
- You are not in a sensitive page or sensitive-content scenario that causes the clipboard prompt to be skipped.
- Relevant feature switches are enabled, such as the selection translation card or double-click quick menu.
- The model may be slow rather than the request not being sent.

## Useful Information to Provide

When reporting an issue, include:

- Chrome version.
- Operating system.
- Aviso version.
- Trigger method: right-click menu, selection toolbar, selection translation card, double-click quick menu, command palette, clipboard prompt, in-page result panel, or Popup.
- Provider name, but never the API key.
- Model or AI service config name, but never the API key.
- Page type where the issue appeared, such as normal webpage, iframe page, form page, or image page.
- Reproduction steps.
- Redacted screenshot or recording if safe.

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
| Floating panel appears but keeps waiting | Slow provider response, API key issue, network problem, or long input. |
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

- The current preferred feedback entry is [GitHub Issues](https://github.com/mongocyber/aviso/issues).
- If you are an invited tester, you can also use the feedback channel provided by the maintainer.
- After Chrome Web Store approval, the Store Support URL should point to this page.
