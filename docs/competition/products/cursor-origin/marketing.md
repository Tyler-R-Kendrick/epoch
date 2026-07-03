---
product: Cursor Origin
marketing_sources:
  - https://cursor.com/origin
  - https://www.eesel.ai/blog/what-is-cursor-origin
  - https://finance.biggo.com/news/979fe270-a07e-4684-b99e-f1af5d31317e
  - https://aiinsiders.net/article/cursor-launches-origin-a-git-forge-built-for-parallel-ai
  - https://techcrunch.com/2025/12/19/cursor-continues-acquisition-spree-with-graphite-deal/
---

# Marketing

## Target Customers

- Teams already standardized on Cursor's editor and background agents who want
  the hosting and review layer built for the same agent-heavy workflow.
- "AI software factory" organizations running many agents in parallel against
  shared repositories, where clone/commit/rebase frequency has outgrown a
  human-paced forge.
- Engineering leaders who see code review — not code generation — as the new
  bottleneck and want an agent-first review and merge pipeline (the thesis
  behind the Graphite acquisition).

## Positioning

Origin's pitch is a single, sharp wedge: **"A git forge for the agentic era."**
The supporting claim — "Code is moving faster than any infrastructure was built
to handle. Origin was designed for this moment." — frames GitHub as human-era
infrastructure whose repository model, permissions, and CI/CD are optimized for
people, and Origin as the ground-up rebuild for machine-scale authorship. The
proof points are throughput (22.6 commits/second, ~296k clones/hour), an
architecture story (NVMe + S3, sub-400 ms sync, sub-10 ms failover), and an AI
conflict-resolution engine that keeps parallel agents from blocking each other.

The deeper strategic message is **vertical integration**: Cursor now owns the
editor, the agents, the review layer (Graphite), the forge (Origin), and a
proprietary model — one stack from prompt to merge — versus GitHub's horizontal
spread across many tools.

## Customer Model

Undisclosed. Origin is waitlist-only with a fall 2026 target and no public
pricing, plan structure, enterprise controls, or data-handling terms. The likely
motion, by analogy to Cursor's editor business and Graphite's team pricing, is
seat- or usage-based team and enterprise subscriptions with agent/model-cost
accounting layered on — but this is inference, not announced fact.

## Captures

- Cursor-native teams who want their agents to push into a forge designed for the
  same cadence, without stitching agents onto GitHub.
- Organizations betting on high agent parallelism who are bottlenecked on
  conflict resolution and review throughput today.
- Buyers attracted to one accountable vendor for the whole prompt-to-merge stack
  and willing to trade neutrality for integration.

## Misses

- Teams that require self-hosted, forge-neutral, offline-capable, or
  cryptographically auditable source history — Origin is centralized, closed, and
  custodial with no published escape hatch.
- Organizations with strict code-custody, provenance, or data-residency needs,
  especially given Origin's owner also trains frontier models on code and is the
  subject of a reported acquisition.
- Anyone who wants deterministic, inspectable merges rather than an opaque AI
  resolution engine, or who is unwilling to adopt a pre-launch forge with no docs
  or pricing.
- Non-Cursor shops with no incentive to leave GitHub's network effects (identity,
  Actions, marketplace, social proof) for an unproven single-vendor stack.

## Epoch Lessons

- Epoch should not try to out-market Origin on throughput theater. Epoch's
  message is the axis Origin concedes: **trust, provenance, and portability** —
  signed authorship, tamper-evident append-only history, deterministic replay,
  and forge-neutral, self-hostable, offline-first collaboration.
- Origin's own framing — "code is moving faster than infrastructure can handle" —
  is a gift Epoch can adopt and complete: the missing half is that faster,
  agent-authored code needs *more* verifiable history, not a faster place to lose
  track of it.
- Turn Origin's vertical integration into Epoch's contrast: Epoch makes the
  history beneath *any* editor, agent, or forge trustworthy, so teams are not
  forced to hand editor, review, forge, and model to one owner to get an
  agent-ready workflow.
