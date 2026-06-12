# Aviso Decisions

This folder is for durable cross-version decisions.

Use it when a decision affects architecture, permissions, privacy, provider strategy, payments, release policy, or storage compatibility.

## When To Add A Decision

Add a decision record when the choice:

- Changes or expands manifest permissions or host permissions.
- Changes provider routing, provider adapters, or API key handling.
- Adds backend, proxy, login, quota, payment, or subscription scope.
- Changes privacy, storage, logging, or retention boundaries.
- Becomes important enough that future agents should not rediscover it from scratch.

## Naming

Use short numbered files:

```text
0001-v0.2-provider-expansion-boundary.md
0002-v0.3-free-quota-backend-boundary.md
```

## Decision Record Shape

```md
# Title

Status:
Date:

## Context

## Decision

## Consequences

## Follow-up
```

## Current Decisions

- [0001-v0.2-provider-presets-and-permissions.md](./0001-v0.2-provider-presets-and-permissions.md)：V02-002 provider preset and host-permission decision for DeepSeek, Kimi / Moonshot, and the 2026-06-12 OpenRouter amendment; later Gemini / Tencent Hunyuan status is tracked through V02-016 / V02-017 / V02-018.
