# Community Web feed/thread nav + receipt chrome — SDLC state

- Initiative: `community-web-feed-thread-nav`
- Phase: finishing
- Delivery branch: `feat/community-web-feed-thread-receipt-chrome`
- Observed trunk: `0222ef1` (`origin/main`)

## Scope

1. Channel feed roots-only + reply affordances; single-column thread tree.
2. Restore Bracket Rule receipt chips; add fail-closed design chrome lint; agent rule.

## Session PR set

- Primary delivery PR: (pending open)
- Supersedes open [#174](https://github.com/Tyler-R-Kendrick/epoch/pull/174) receipt/design-chrome layer (rebased onto main with nav work)
- Prior anti-slop stack [#172](https://github.com/Tyler-R-Kendrick/epoch/pull/172) / [#173](https://github.com/Tyler-R-Kendrick/epoch/pull/173) left as residual (schema-1/2 drop not in this delivery)

## Decisions

1. One coherent PR from `main` (sequential fallback) rather than continuing the stale anti-slop stack base.
2. Design lint must fail if `.cn-sig-text` loses native reset, brackets, or `--cw-signed`.
