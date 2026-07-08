## Summary

- Summarize the main change.

## Checks

- [ ] `git diff --check`
- [ ] `npm run docs:check`
- [ ] `npm test`
- [ ] `npx tsc --noEmit`
- [ ] `npm run build`
- [ ] `npm run package` when release package, manifest, permissions, or loaded-extension behavior changes
- [ ] `cd website && npm run build` when website files change

## Documentation And Gates

- [ ] Updated [docs/STATE.md](../docs/STATE.md) if release gates, public wording, capabilities, storage/data boundaries, or owner decisions changed
- [ ] No CWS approval, hosted-AI live, payment, quota, telemetry, web search, or remote content claim was added without matching owner-approved evidence
- [ ] No manifest permission, host permission, provider, storage-key, secret, production config, deployment, CWS submission, tag, or release action is hidden in this PR

## Notes

None
