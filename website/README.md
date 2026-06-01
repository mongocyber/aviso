# Aviso Website

This folder contains the Docusaurus user documentation site for Aviso.

The public copy is adapted from the internal project source of truth in the repository root:

- `README.md`
- `STATUS.md`
- `RELEASE_CHECKLIST.md`
- `docs/01_PROJECT_CHARTER.md`
- `docs/02_PRD.md`
- `docs/03_TECH_SPEC.md`
- `docs/05_RELEASE_PLAN.md`
- `docs/07_PRIVACY_AND_SECURITY.md`

The root `docs/01-07` files remain the internal source of truth and should not be overwritten by website edits.

## Local commands

```bash
npm install
npm run build
```

This site does not configure Vercel, GitHub Actions, store submission, release tags, or real provider calls.
