# Aviso Architecture

This folder is the L2 engineering-knowledge layer for Aviso. It explains the stable module contracts future agents should read before editing runtime code.

Current release facts still live in [docs/STATE.md](../STATE.md). Architecture docs should describe how the system works, not whether the current release is approved.

## Module Map

| Area                    | Read When                                                                                                                     | Contract                                                   |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Extension runtime       | Changing build entrypoints, manifest behavior, package scripts, or release artifacts                                          | [extension-runtime.md](./extension-runtime.md)             |
| Background services     | Changing message routing, AI request handling, history, context menus, streaming, or service-worker behavior                  | [background-services.md](./background-services.md)         |
| Content surfaces        | Changing toolbar, command palette, floating panel, clipboard, double-click, frame bridge, readability, or screenshot surfaces | [content-surfaces.md](./content-surfaces.md)               |
| Popup settings          | Changing settings UI, provider configs, account/session display, language/theme, templates, or connectivity test UX           | [popup-settings.md](./popup-settings.md)                   |
| Provider routing        | Changing BYOK provider calls, hosted chat routing, connectivity tests, model registry, or route selection                     | [provider-routing.md](./provider-routing.md)               |
| Supabase auth migration | Changing hosted sign-in provider boundaries, hosted session migration, or account-deletion frontend assumptions               | [supabase-auth-migration.md](./supabase-auth-migration.md) |
| Storage and privacy     | Changing storage keys, API Key handling, hosted session storage, history, logs, or sensitive data boundaries                  | [storage-and-privacy.md](./storage-and-privacy.md)         |
| Website and store copy  | Changing Docusaurus docs, public privacy wording, CWS listing source, or store asset copy                                     | [website-and-store-copy.md](./website-and-store-copy.md)   |
| Tests                   | Deciding what to run or where to add coverage                                                                                 | [testing.md](./testing.md)                                 |

## Cross-Cutting Rules

- Runtime behavior changes that affect release gates or public wording must update [docs/STATE.md](../STATE.md).
- Manifest permissions, host permissions, provider additions, storage-key migrations, production config, deploys, CWS submissions, release tags, and public live claims remain owner-gated.
- Do not write raw API Keys, raw prompts, raw provider responses, private page bodies, screenshots/base64, full URLs, clipboard content, or sensitive logs into docs, console, storage, release artifacts, or remote systems.
