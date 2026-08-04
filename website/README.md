# Aviso Website

This folder contains the Docusaurus user documentation site for Aviso.

Current public copy starts from the AI Doc Kit truth surfaces:

- `docs/STATE.md` is the current-facts registry for release state, Chrome Web Store state, website state, storage/data boundaries, and public claim boundaries.
- `STATUS.md` and `RELEASE_CHECKLIST.md` keep supporting release evidence.
- `docs/architecture/website-and-store-copy.md` defines which website and store-copy files must move together.
- `docs/privacy-and-security.md` keeps the deeper privacy/security explanation.

Website edits should not turn website pages into their own release-state authority. Update `docs/STATE.md` first when a website change affects release state, storage/data boundaries, public wording gates, or feedback data flow.

Current public copy must keep implementation support, live provider validation, Chrome Web Store approval, and public release status separate. DeepSeek, Kimi / Moonshot, and OpenRouter may be described as configurable provider support, but not as live-provider validated. The site must not invent a Chrome Web Store URL.

## Local commands

```bash
npm install
npm run build
```

From the repository root, run `npm run docs:check` after public copy or feedback-flow changes.

This site contains user documentation and a website-only feedback endpoint. It does not run extension provider calls or extension deployment actions.

## Feedback email settings

The feedback form posts to `website/api/feedback.js`. It sends the issue description, optional contact email, optional tag, and up to three redacted PNG/JPG image attachments. The endpoint rejects high-confidence secrets/private-content markers and strips common PNG/JPG metadata before forwarding. On Vercel, configure these environment variables for the website project:

```bash
RESEND_API_KEY=<resend-api-key>
FEEDBACK_TO_EMAIL=you@example.com
FEEDBACK_FROM_EMAIL=Aviso Feedback <feedback@your-domain.example>
```

Use a verified sender domain for `FEEDBACK_FROM_EMAIL`. Do not commit real secrets.
