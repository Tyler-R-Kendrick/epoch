---
product: Cursor Origin
design_sources:
  - https://cursor.com/origin
  - https://news.ycombinator.com/item?id=48558605
  - https://www.eesel.ai/blog/what-is-cursor-origin
  - https://finance.biggo.com/news/979fe270-a07e-4684-b99e-f1af5d31317e
  - https://explainx.ai/blog/cursor-origin-git-hosting-github-alternative-ai-agents-2026
---

# Design

## Look And Feel

There is very little product surface to inspect. At the time of this research
`cursor.com/origin` is a single dark, high-contrast landing page carrying the
Cursor brand: a one-line headline — "A git forge for the agentic era" — a short
supporting line ("Code is moving faster than any infrastructure was built to
handle. Origin was designed for this moment."), and a waitlist form
("Join the waitlist" / "We'll reach out when Origin is ready for you"). No
repository chrome, review UI, dashboards, or screenshots are published. The
public design story is currently a promise, not an interface.

The visible product intent is inherited from two places: Cursor's editor-native,
keyboard-first aesthetic, and **Graphite's review surface** (stacked pull
requests, structured diff and review queues), whose re-architected technology
underpins Origin. That lineage is the strongest signal of what the review
experience is likely to look and feel like.

## Open Design Assets

- No Origin-specific design tokens, component library, or public style guide.
- No published screenshots of the forge, review, or conflict-resolution surfaces.
- The most inspectable adjacent artifacts are Graphite's existing review UI and
  Cursor's editor docs; both predate Origin and are proxies, not the product.

## Differentiators

- **Agent-first framing over human-first chrome.** The stated design premise is
  that the primary "user" reading and writing is an agent, so the durable
  surfaces are meant to be machine-legible (API, MCP) first and human dashboards
  second — the inverse of GitHub's browser-diff-centric model.
- **Review-as-checkpoint at machine speed.** The design bet is that humans move
  from reading diffs line-by-line to approving batches of machine-written change
  at a gate, with agents doing first-pass review of other agents' work.
- **Structured/semantic diffs (aspirational).** Commentary around the launch
  describes agent-authored changes surfaced as structured diffs with agent
  context, distinct from character-level unified diffs — but Cursor has not
  shipped or documented this, so it reads as direction, not delivered design.

## What Works

- The positioning is legible and sharp: one sentence communicates the wedge
  ("forge built for agents, not humans") better than most competitors' pages.
- Building the review surface on Graphite means the review UX starts from a
  mature, well-regarded stacked-PR product rather than a blank canvas.
- Treating API and MCP as primary interaction surfaces is the right instinct for
  a world where agents outnumber human contributors on a repo.

## UX Breakdowns

- **Opacity.** The launch page gives users almost nothing to evaluate. Public
  reaction singled this out directly — "is there literally zero information on
  what this is?" A waitlist with no docs, no pricing, and no screenshots asks for
  trust before showing anything.
- **The unresolved review problem is a design problem.** If agents commit 22×/s
  and humans approve in bulk, the interface has to make "did anyone actually
  understand this change?" answerable. Nothing published shows how Origin keeps a
  human meaningfully in the loop rather than rubber-stamping "AI slop."
- **Opaque automated merges.** An AI conflict-resolution engine that merges
  "without human intervention" needs a design for *showing its work* — what
  conflicted, which agent's intent won, and why. No such affordance is described.
- **Custodial by construction.** The design centralizes source, review, and model
  in one vendor surface; there is no visible export, self-host, or offline path,
  so the "escape hatch" is undesigned.

## Epoch Design Lessons

- Epoch should make the **merge itself a first-class, inspectable object**: a
  signed event that records the conflicting intents and the deterministic (or
  agent-proposed-then-approved) resolution — the opposite of a silent AI merge.
- Bulk approval of agent work is coming whether Epoch likes it or not; Epoch's
  answer should be **evidence-dense review**: signed authorship, test results,
  and policy checks attached to the history object so an approval gate has
  something real to gate on, not just a diff count.
- Origin's opacity is an opening. Epoch can differentiate by making the durable
  history **legible and portable by default** — content-addressed, verifiable,
  and inspectable without a proprietary dashboard.
- Agent authorship should be visible in the history chain: which identity, under
  which rules, from which prompt/intent — designed in, not bolted on later as
  Origin's "traceable agent authorship" commentary imagines.
