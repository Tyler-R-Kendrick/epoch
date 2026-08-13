---
product: Delta
gossip_sources:
  - https://delta.dev/docs/privacy-and-security/agentic-safety
  - https://delta.dev/docs/privacy-and-security/data-storage
  - https://delta.dev/docs/troubleshooting
  - https://www.reddit.com/r/programming/comments/1o4h34t/zeds_deltadb_idea_real_problem_or_overkill/
  - https://www.techtimes.com/articles/318322/20260613/zed-opens-deltadb-waitlist-crdt-version-control-records-every-edit-not-just-commits.htm
  - https://alphasignal.ai/news/zed-launches-delta-to-replace-git-where-ai-agents-write-code
---

# Gossip

## Evidence Quality

Delta-specific public sentiment is thin and should be treated as provisional.
Early access is invitation-gated, so most commentary still discusses the June
2026 DeltaDB announcement rather than hands-on use of the Delta application.
The strongest negative signals available are Zed's own documented limitations,
which are more reliable than secondhand reaction. Re-check this record once
general availability produces real usage reports.

## What People Say

Coverage frames Delta as a direct challenge to the commit-centred model — a
system that records development as a continuous stream of operations rather
than discrete snapshots. Enthusiasm centres on the loss of intent: rationale
that currently evaporates into chat, pull-request threads, and stale
permalinks. Skepticism, carried over from the DeltaDB announcement, asks
whether generated commits, better discipline, or existing forge tooling would
address the same pain with far less machinery, and whether recording every
operation produces a usable record or only a larger one.

## Bug And Friction Themes

- **Self-documented safety gaps.** Zed states there is no agent permission
  framework, no agent sandbox, and no mechanism preventing execution of shared
  worktree settings or configuration, with agents having unrestricted device
  access — labelled roadmap items, with early access "at your own risk."
- **Deletion does not fully delete.** Removing a thread clears the local
  machine but not already-synced server copies, and does not touch upstream
  repositories or copies others have downloaded.
- **Narrow secret redaction.** Redaction matches exact values already known
  from environment variables, dotenv, and Mise files; short or unusually named
  credentials can slip through, and Zed says so.
- **Link-sharing breadth.** "Anyone with the link" admits any authenticated
  Delta user, and the docs flag those URLs as sensitive.
- **Model and machine coupling.** Custom API keys force local execution, so the
  cloud-machine benefit is unavailable to teams with their own provider
  contracts.
- **Partial Jujutsu support.** Colocated repositories work; full compatibility
  is explicitly incomplete.

## Product Risk For Epoch

Delta can make joinable, conversation-anchored agent work feel ordinary before
a signed, portable equivalent is familiar — and it arrives through an editor
with existing users rather than asking anyone to adopt a version control system
first. The risk is not that Delta's trust model is better; it is that trust
stops being the axis users compare on once the ergonomics are settled.

## Opportunity For Epoch

Every limitation above is either a governance gap or a portability gap, and
both are already Epoch contracts rather than aspirations: attenuated agent
grants, budgets, and receipts; signed events that verify offline; durable
conflicts instead of silent convergence; and a real exit through compacts, cold
backups, bundles, Git projection, and archival. The gaps are dated rather than
permanent, which argues for sequencing against them now rather than assuming
they persist.
