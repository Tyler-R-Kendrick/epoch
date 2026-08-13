---
product: Delta
design_sources:
  - https://delta.dev/docs/getting-started
  - https://delta.dev/docs/agents/threads
  - https://delta.dev/docs/agents/comments
  - https://delta.dev/docs/agents/review-and-sync
  - https://delta.dev/docs/collaboration/collaborate-thread
  - https://delta.dev/docs/configuration/keybindings
  - https://delta.dev/docs/concepts/worktrees-and-machines
  - https://zed.dev/blog/introducing-delta
---

# Design

## Look And Feel

Delta is a Zed-family application: Rust compiled to WebAssembly, rendered
through WebGL, so the native app and the browser build present the same
surface. The centre of the screen is the thread — a conversation with an agent
that also happens to be the review surface, the file-change surface, and the
place teammates appear. Configuration follows editor conventions: settings
files, customizable keybindings, and API-key management rather than a
web-console.

## Open Design Assets

- The product documentation at `delta.dev/docs` is the primary description of
  every user-facing flow: threads, review and sync, comments, collaboration,
  settings, and keybindings.
- The [launch post](https://zed.dev/blog/introducing-delta) carries the product
  narrative and the rendering/architecture claims.
- Zed's editor is open source, which lends credibility to the client even
  though Delta's backend is not independently deployable.

## Differentiators

- **The thread is the whole interface.** Conversation, diffs, comments, and
  agent activity share one scroll rather than living in a chat pane beside an
  editor.
- **A share link makes work joinable.** Four access tiers, and each participant
  receives their own synced checkout rather than a read-only view.
- **Comments batch into the turn.** Comments are pending until the next submit,
  are delivered together with the message, and the agent addresses them in that
  reply, with replies linked back to the comment they answer. This turns
  annotation into a review round rather than a stream of interruptions.
- **Collaborative drafts.** A message can be composed together before it is
  sent to the agent, which makes steering a group act.
- **Per-message machine selection.** The control sits next to send, so choosing
  local execution or a cloud machine is a per-turn decision rather than a
  project setting.
- **Full diffs, not collapsed ones.** The interface is explicitly built for
  agent-sized changes — "more text and bigger changes than any human."

## What Works

- Review has no ceremony: read the diff, comment on the passage, ask for the
  revision, and only then decide whether it becomes a branch or a pull request.
- The agent's work is isolated by default — it runs in its own clone, so the
  user's working tree stays untouched — while adoption in place remains
  available when the user wants edits to land directly.
- Handoff is asynchronous without being lossy; a teammate picks up a thread
  without wondering whether anything was committed.
- Browser access with no install removes the usual cost of inviting someone
  into a work-in-progress.

## UX Breakdowns

- **Safety is documented as absent.** No agent permission framework, no agent
  sandbox, and no mechanism preventing execution of shared worktree settings or
  configuration, with agents holding unrestricted device access. Zed labels
  these roadmap items and says early access is at the user's own risk.
- **Trust is per-thread and coarse.** "Anyone with the link" admits any
  authenticated Delta user, and the docs warn that such URLs are sensitive.
- **Secret redaction is narrow by design.** It matches exact values Delta
  already knows from environment variables, dotenv, and Mise files, and does
  not scan files for credentials.
- **Deletion is incomplete.** Deleting a thread removes it from the machine but
  not already-synced server copies.
- **The substrate is a single vendor.** Everything runs on Cloudflare with no
  self-hosting boundary published.
- **BYO models force local execution.** Cloud machines run Delta-hosted models
  only, so the machine control and the model control are coupled in a way the
  UI has to keep explaining.
- **The virtualization story is under-documented.** The launch post describes a
  virtualized worktree with near-free branching; the worktree documentation
  describes real per-machine checkouts and no mount or copy-on-write mechanism.
  Users reasoning about disk cost have no page to read.
