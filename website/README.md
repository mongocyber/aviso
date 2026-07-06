# Aviso Website

This folder contains the Docusaurus user documentation site for Aviso.

The public copy is adapted from the internal project source of truth in the repository root:

- `README.md`
- `STATUS.md`
- `RELEASE_CHECKLIST.md`
- `docs/README.md`
- `docs/charter.md`
- `docs/prd.md`
- `docs/tech-spec.md`
- `docs/privacy-and-security.md`

The root project docs remain the internal source of truth and should not be overwritten by website edits.

Current public copy must keep implementation support, live provider validation, Chrome Web Store approval, and public release status separate. DeepSeek, Kimi / Moonshot, and OpenRouter may be described as configurable provider support, but not as live-provider validated. The site must not invent a Chrome Web Store URL.

## Local commands

```bash
npm install
npm run build
```

This site contains user documentation and a website-only feedback endpoint. It does not run extension provider calls or extension deployment actions.

## Feedback email settings

The feedback form posts to `website/api/feedback.js`. It sends the issue description, optional contact email, optional tag, and up to three image attachments. On Vercel, configure these environment variables for the website project:

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
FEEDBACK_TO_EMAIL=you@example.com
FEEDBACK_FROM_EMAIL=Aviso Feedback <feedback@your-domain.example>
```

Use a verified sender domain for `FEEDBACK_FROM_EMAIL`. Do not commit real secrets.
