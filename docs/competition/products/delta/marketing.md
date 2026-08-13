---
product: Delta
marketing_sources:
  - https://zed.dev/blog/introducing-delta
  - https://zed.dev/blog/introducing-deltadb
  - https://delta.dev/docs/getting-started
  - https://delta.dev/docs/account/plans-and-pricing
  - https://delta.dev/docs/collaboration/collaborate-thread
---

# Marketing

## Target Customers

- Teams already running agents daily who are tired of watching agent output in
  one window and reviewing it in another.
- Distributed teams whose review currently happens as pull-request comments on
  snapshots that go stale the moment code moves.
- Zed users, who receive the collaboration model through an editor they have
  already chosen.
- Anyone who needs to pull a teammate into in-progress agent work without
  asking them to install anything, since the browser build is the same app.

## Positioning

Delta is positioned as "a multiplayer environment for coding with agents and
reviewing what they build" — the place where the conversation, the code, and
the decisions live together, with Git and CI kept for checks and interchange
"rather than being the place collaboration is forced to happen." The pitch
against the incumbent is specific: comments attached to commits fall out of
date as soon as the code changes, and the pull request is ceremony imposed
because there was nowhere else to talk.

## Customer Model

Early access with invitations, an account and sign-in flow, hosted models
through Delta plans, and bring-your-own API keys with the constraint that
custom keys require local execution. Cloud machines are a hosted capability
attached to the account rather than a separate product.

## Captures

- Teams whose real problem is agent-output review volume rather than editing
  speed.
- Groups who want a joinable, linkable unit of work between "a chat message"
  and "a pull request."
- Developers persuaded by the stale-permalink argument, which is concrete and
  familiar.
- Reviewers who value that the agent works in its own clone by default, so
  trying something costs nothing locally.

## Misses

- Regulated and security-conscious organizations, which will read the agentic
  safety page and stop: no agent permissions, no sandbox, no worktree-config
  trust boundary, unrestricted device access.
- Teams requiring self-hosting or a published deletion guarantee, since the
  backend is entirely Cloudflare and deletion does not reach synced copies.
- Teams that refuse editor lock-in, since the benefit requires the client.
- Git-CLI and forge-first teams who treat the forge as the collaboration record
  by choice rather than by constraint.
- Non-code contributors, who have no representation in a thread built around an
  agent and a project folder.

## Epoch Lessons

- Lead with the two things Delta's own documentation concedes: governed agent
  authority and a real exit. Both are already Epoch contracts rather than
  aspirations.
- Adopt the interaction insight without the substrate: pending comments
  delivered with the turn, collaborative drafts, and a joinable link are
  interaction design, not infrastructure.
- Do not market a copy-on-write or virtual-filesystem claim to match a claim
  Delta has not actually made. Market cheap joining by residency, which Epoch
  can demonstrate.
- Delta legitimizes the category. Epoch's messaging should treat "work below
  the commit, conversation attached to code" as established rather than
  spending words establishing it.
