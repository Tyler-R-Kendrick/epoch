---
product: Delta
slug: delta
category: agent_collaboration_workspace
primary_sources:
  - https://delta.dev/docs/getting-started
  - https://delta.dev/docs/concepts/delta-and-git
  - https://delta.dev/docs/concepts/worktrees-and-machines
  - https://delta.dev/docs/agents/threads
  - https://delta.dev/docs/agents/review-and-sync
  - https://delta.dev/docs/agents/comments
  - https://delta.dev/docs/collaboration/collaborate-thread
  - https://delta.dev/docs/privacy-and-security/data-storage
  - https://delta.dev/docs/privacy-and-security/security
  - https://delta.dev/docs/privacy-and-security/agentic-safety
  - https://zed.dev/blog/introducing-delta
---

# Delta

Delta is Zed's multiplayer agent workspace, built on
[DeltaDB](../zed-deltadb/profile.md). DeltaDB is the history layer; Delta is
the product that makes a shared agent conversation joinable. It is tracked
separately because the competitive pressure on Epoch Community comes from the
product surface, not only from the history model.

The unit of work is the **thread**: "one thread, one agent, and its own
worktrees." Worktrees live in DeltaDB and are shared across participants;
**checkouts** are the per-machine folders that realize them, either
Delta-managed or an existing project folder the thread adopts in place. The
agent runs on exactly one **machine** per turn — a participant's computer or a
Delta cloud machine, chosen per message — and file changes propagate to every
participant regardless.

Delta is Rust compiled to WebAssembly and rendered through WebGL, so a
teammate can open a thread in a browser without installing anything. The
backend "runs entirely on Cloudflare": R2 for file contents and Git commits,
Durable Objects with SQLite for thread and worktree changes, KV and D1 for
metadata.

## Competitive Relevance

- Delta ships the joinable shared workspace Epoch has described but never
  assembled: conversation, materialized code, participants, and agent activity
  in one object a second person can enter from a link.
- Collaboration is the product, not an add-on. Shared threads show messages,
  edits, comments, and agent activity live; draft messages are collaborative
  before they are sent; comments stay pending until submit and are delivered
  with the message so the agent answers them in that reply.
- Access levels are shipped and legible: invited-only, organization-wide, any
  signed-in user with the link, and fully public. Email invitation is a separate
  flow with a fourteen-day expiry rather than a fifth level.
- Git is kept deliberately in its place. Two remotes per checkout — `origin`
  upstream and `local` back to the user's repository — and landing work is
  still `git switch` or a normal pull request.
- Browser-first access with no install undercuts any argument that a
  local-first system must be harder to join than a hosted one.

## Epoch Implications

- Epoch now has that object: a **Space** binds View, Workspaces, conversation,
  participants, and agent turns, with membership enforced as a Grant. See
  [ADR-0042](../../../design-decisions/0042-spaces-shared-signed-workspaces.md).
  What remains unbuilt is the part Delta leads on: a browser-native surface, a
  mount provider, an isolated execution provider, and federated join.
- Delta's comment interaction — pending until submit, delivered with the turn,
  replies linked back — is a better review loop than a comment stream, and is
  worth adopting directly in Community's selected-message action tray.
- Joining must be cheap without claiming copy-on-write. Epoch reaches this
  through virtual materialization and chunk-granular residency, and should say
  so precisely rather than matching a filesystem claim Delta does not actually
  make.
- Delta's documented absence of an agent permission framework, agent sandbox,
  and worktree-configuration trust boundary is the clearest opening Epoch has;
  ADR-0034 grants, budgets, and receipts are the answer already accepted.
- A browser path into a Space is table stakes, not a differentiator.

## Unknowns To Track

- Pricing, plan limits, and whether cloud machines remain restricted to
  Delta-hosted models.
- Whether any self-hosting or export boundary appears; deletion currently does
  not reach already-synced server copies.
- How far the stated roadmap for agent permissions, sandboxing, and worktree
  trust progresses, since the differentiator in ADR-0042 depends on that gap
  persisting.
- Whether Jujutsu support beyond colocated repositories arrives, and what that
  implies about Delta's willingness to sit under a non-Git model.
