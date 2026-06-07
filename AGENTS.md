# AGENTS.md

## Project Working Agreements

- Understand the request and inspect the existing codebase before making changes.
- Keep outputs concise, structured, and directly usable.
- Prefer the best final answer over long option lists.
- Ask only when missing information blocks safe execution.
- State assumptions explicitly when they affect the result.
- Reuse existing architecture, files, naming, and patterns before creating new abstractions.
- Prefer small, reviewable diffs over broad rewrites.
- Keep changes consistent with the current product scope, style, and technical direction.
- Do not invent APIs, file paths, configs, data models, or package names when they can be checked first.
- Flag risks, missing dependencies, unclear requirements, and scope changes early.

## Current Aviso Scope

- Aviso is a Chrome MV3 extension built with Plasmo, React, and TypeScript.
- Current product state is `v0.1 internal dogfood / 内部试用版`; it is not publicly released and has not been submitted to Chrome Web Store.
- The current usable model is BYOK direct-provider: users provide their own API Keys and the browser extension calls approved model provider hosts directly.
- Do not add or imply a project-owned backend, hosted Aviso AI, anonymous quota, login, subscription, payment, provider proxy, telemetry, analytics, remote link-body fetching, web search, broad new permissions, or storage key migration unless the owner explicitly approves that scope again.
- API Key boundary is strict: secrets stay encrypted in `chrome.storage.local/contextai_api_keys`; non-secret settings stay in `chrome.storage.sync/contextai_settings`.
- Screenshot features are under review for basic v1.0. Do not strengthen screenshot as a public store selling point or ordinary-user entry until the owner confirms whether it should be hidden, removed, or kept internal-only.

## Development Workflow

- Before editing, identify the relevant files and summarize the intended change.
- Make the smallest change that fully solves the task.
- Preserve existing behavior unless the user explicitly asks to change it.
- Update related docs when behavior, setup, commands, scope, release gates, or architecture changes.
- After changes, run the most relevant available checks, such as lint, typecheck, tests, build, or docs-only checks.
- If checks cannot be run, explain why and list the exact command the user should run.
- Do not leave temporary debug code, unused files, dead imports, or commented-out experiments.
- Do not create new versions, new product directions, or expanded scope unless explicitly requested.
- When working from PRD, TASKS, README, CLAUDE.md, STATUS, RELEASE_CHECKLIST, or project docs, treat them as source material but resolve conflicts using current owner decisions, `STATUS.md`, `RELEASE_CHECKLIST.md`, and actual source.

## Git And Review Discipline

- Keep commits focused and reviewable.
- Do not rewrite unrelated code.
- Do not change formatting across unrelated files.
- Do not use `git add .`; stage by explicit file whitelist.
- Before final response, summarize what changed, which files changed, what checks were run, and any remaining risks or next required actions.

## Safety And Secrets

- Never expose secrets, tokens, private keys, credentials, or `.env` values.
- Never commit secrets or generated credentials.
- If a task requires secrets, ask for a safe way to provide them.
- Do not add analytics, telemetry, tracking, or external network calls unless explicitly requested.
- Do not install new dependencies unless they are necessary and justified.
- Prefer official SDKs, documented APIs, and stable libraries.
- Do not read, print, store, or write raw prompts, raw provider responses, private page bodies, screenshots/base64, full URLs, API Keys, clipboard content, or sensitive logs.

## Product And Design Preferences

- Prioritize clear user value and a complete working flow over decorative complexity.
- Keep UI simple, modern, consistent, and production-oriented.
- Avoid placeholder-only implementations when the user asks for real functionality.
- Avoid over-engineering; choose the most direct maintainable solution.
- For Chinese product copy, keep it natural, concise, and non-academic.

## Communication Preference

- Answer in plain Chinese by default unless the user asks for another language.
- When explaining technical topics, translate jargon into product or decision language the user can act on.
- If the user says they do not understand a technical confirmation, explain what the decision means, why it matters, the recommended default, and the tradeoff in simple terms.
- For project development coaching, separate guidance from execution: explain what the user should decide, what Codex can do automatically, and what requires approval.
- Prefer concrete next-step prompts the user can paste into a project Codex session over abstract explanations.
- Avoid assuming the user wants to write code manually; frame them as product owner and reviewer unless they ask to learn code details.
