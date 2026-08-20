# Community Web feed/thread nav + receipt chrome — SDLC state

- Initiative: `community-web-feed-thread-nav`
- Phase: review
- Delivery branch: `feat/community-web-feed-thread-receipt-chrome`
- Observed trunk: `0222ef1` (`origin/main`)
- PR: [#178](https://github.com/Tyler-R-Kendrick/epoch/pull/178)

## Scope

1. Channel feed roots-only + reply affordances; single-column thread tree.
2. Restore Bracket Rule receipt chips; add fail-closed design chrome lint; agent rule.

## Session PR set

- Primary delivery: [#178](https://github.com/Tyler-R-Kendrick/epoch/pull/178)
- [#174](https://github.com/Tyler-R-Kendrick/epoch/pull/174) closed as superseded by #178
- Prior anti-slop stack [#172](https://github.com/Tyler-R-Kendrick/epoch/pull/172) / [#173](https://github.com/Tyler-R-Kendrick/epoch/pull/173) residual (schema-1/2 drop not in this delivery)

## Decisions

1. One coherent PR from `main` (sequential fallback) rather than continuing the stale anti-slop stack base.
2. Design lint must fail if `.cn-sig-text` loses native reset, brackets, or `--cw-signed`.

## Closeout notes

- Rubber-duck: feeds show roots + reply counts; thread is APG tree; receipt chips use signed Bracket Rule; lint in gate:commit/CI; cursor rule + AGENTS memory.
- Adversarial: no secrets; design lint fails closed; workbench buttons get design classes; superseding #174 avoids duplicate land.
- CI fix: morph-key unit pin accepts `cn-comment` class modifiers; compose drafts carry `data-key="compose-draft"`.
