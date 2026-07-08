# Current Requirements

This folder holds the active release-closeout work area. It is planning/future-facing, not the current product truth. Current facts live in [docs/STATE.md](../../STATE.md).

## Active Closeout Requirements

| ID | Requirement | Source |
| --- | --- | --- |
| CUR-R1 | Confirm Chrome Web Store backend review state for the cleaned/reuploaded `0.1.1` package. | [STATE](../../STATE.md), [CURRENT_GATE](../../ai/CURRENT_GATE.md) |
| CUR-R2 | If CWS review changes state, update [docs/STATE.md](../../STATE.md) first, then status/checklist evidence and public wording if owner-approved. | [STATE](../../STATE.md), [RELEASE_CHECKLIST](../../../RELEASE_CHECKLIST.md) |
| CUR-R3 | Keep BYOK default, optional hosted AI candidate boundaries, payment/quota exclusions, and public-copy stop lines aligned across docs and store/website copy. | [STATE](../../STATE.md), [STORE_LISTING_COPY](../../../store-assets/chrome-web-store/STORE_LISTING_COPY.md) |
| CUR-R4 | Do not perform production deploy, CWS submission, public release, tag, GitHub Release, permission expansion, provider call, secret read, or storage migration without owner approval. | [CLAUDE](../../../CLAUDE.md), [STATE](../../STATE.md) |

## Non-Requirements

- This file does not approve release.
- This file does not replace Chrome Web Store backend evidence.
- This file does not mark hosted AI public live.
