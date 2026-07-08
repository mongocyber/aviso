# Popup Settings Contract

## Responsibility

Popup owns user-configurable settings: language, theme, feature switches, provider configs, default/fast provider selection, API Key entry, connectivity testing, local history, templates, and hosted account/session display.

## Key Files

- `src/popup/index.tsx:23` imports hosted client and hosted account/session helpers.
- `src/popup/index.tsx:61` imports provider config creation, normalization, routing, and test-result helpers.
- `src/popup/index.tsx:85` imports storage helpers for API Keys, provider config keys, and settings.
- `src/popup/index.tsx:107` defines the Popup default settings.
- `src/popup/index.tsx:136` defines the connectivity test timeout.
- `src/popup/index.tsx:138` defines provider display order.

## Invariants

- Saving a provider config is not live validation.
- Connectivity tests are user-triggered, one provider at a time, and must use sanitized summaries.
- BYOK config must not be blocked by hosted sign-in state.
- Hosted account/session display must not imply public hosted-AI release or payment availability.
- Popup settings changes that affect menus, language, templates, or default model must keep background/context-menu sync behavior intact.

## Extension Points

- New provider settings require provider registry, provider config helpers, host permission review, i18n strings, tests, CWS/public wording review, and owner approval if host permissions expand.
- New feature switches should be added to the `Settings` type, default settings, Popup control, and the content/background surface that consumes the switch.
- New account or quota fields should flow through hosted session helpers and should not bypass the backend contract.

## Checks

```bash
npm test
npx tsc --noEmit
```

Use `tests/popup-settings.test.ts`, `tests/model-provider.test.ts`, and `tests/hosted-ai.test.ts` first.
