---
product: Zed DeltaDB
design_sources:
  - https://zed.dev/blog/introducing-deltadb
  - https://zed.dev/
  - https://zed.dev/blog/zed-1-0
  - https://zed.dev/blog/sequoia-backs-zed
  - https://zed.dev/blog/crdts
  - https://zed.dev/docs/collaboration/overview
  - https://zed.dev/docs/collaboration/channels
  - https://zed.dev/blog/parallel-agents
---

# Design

## Look And Feel

DeltaDB's public design is inseparable from Zed: a fast native editor with collaboration panels, channel trees, shared projects, channel notes, presence, following, screen sharing, and agent threads in the same workspace as the code. The experience is meant to feel like editing locally while humans and agents share one live context.

## Open Design Assets

- Zed's homepage and blog posts provide the primary screenshots and product narrative.
- Collaboration docs describe the user-facing channel, project sharing, notes, guest, and following flows.
- The CRDT blog documents the underlying text-addressing model with diagrams for anchors, tombstones, vector timestamps, Lamport ordering, and undo.
- The open Zed repository lets teams inspect the editor and AI surfaces, though DeltaDB itself is not yet available as a public standalone artifact.

## Differentiators

- DeltaDB is positioned as a synchronization engine and version-control evolution embedded directly in the authoring environment, with real-file worktrees mountable to disk.
- The UI can attach discussions, audio, review, and agent threads to code locations without leaving the editor.
- Character-level references promise finer granularity than commits, PR comments, or file-line permalinks.
- Existing collaboration channels give Zed an adoption path for operation history through everyday team workflow.

## What Works

- The editor-native surface removes a large amount of ceremony around pairing, mentoring, and agent review.
- Zed's speed and low-latency CRDT story make operation-level history feel like a natural extension of editing.
- Agent threads, editable diffs, and shared buffers make the "why behind code" visible at the moment changes are produced.
- The June 2026 DeltaDB announcement makes the operation/conversation timeline and worktree model concrete, while the external protocol and deployment boundary remain unspecified.

## UX Breakdowns

- Teams must buy into Zed as the primary interface before they receive the full DeltaDB benefit.
- Recording every edit risks a noisy history unless Zed builds strong summarization, filtering, grouping, and retention controls.
- Collaboration docs warn that shared projects expose local files to trusted collaborators, which is a higher-friction security posture for regulated teams.
- External file changes, generated code, command-line edits, and non-Zed tools may challenge an editor-centered source of truth.
- DeltaDB's stable external storage/API, governance, self-hosting, signature, and migration details are not public enough for an Epoch fidelity adapter.
