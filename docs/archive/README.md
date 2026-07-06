# Aviso Archive

This folder is for completed or retired version records.

The archive should preserve historical planning and execution evidence without keeping outdated claims in current product docs.

## Archive Rule

When a version is completed or retired:

1. Keep current product truth in root docs and current docs.
2. Add a short release or closeout summary.
3. Move or copy the final version planning set into `docs/archive/<version>/`.
4. Do not keep stale planned features in `docs/prd.md`, website copy, or store copy.

## Recommended Version Archive Shape

```text
docs/archive/v0.2/
  README.md
  v0.2-*.md
  perf-*.md
  cmd-*.md
  supporting historical artifacts
```

## Current Archive State

- `v0.2/`: frozen historical planning, execution, performance, command-palette, provider, WXT, manual acceptance, and design-system migration records.

Current `0.1.1` remains the submitted / Chrome Web Store pending product baseline, not an archived historical version.
