---
product: Jujutsu
slug: jujutsu
category: vcs_semantics
primary_sources:
  - https://github.com/jj-vcs/jj
  - https://docs.jj-vcs.dev/latest/conflicts/
  - https://jj-vcs.github.io/jj/latest/operation-log/
  - https://www.jj-vcs.dev/v0.15.1/git-compatibility/
---

# Jujutsu

Jujutsu (`jj`) is a Git-compatible VCS focused on safer, simpler history manipulation. It competes with Epoch at the version-control semantics layer: operation log, undo, automatic working-copy commits, first-class conflicts, and Git interoperability.

## Competitive Relevance

- Jujutsu's operation log provides a user-visible safety net for repository mutations.
- First-class conflicts let users record and move conflicted states instead of blocking rebase or merge.
- Git compatibility lowers adoption risk, but colocation also creates subtle edge cases.

## Epoch Implications

- Epoch should study `jj op log` as a UX benchmark for explaining repository mutations.
- Epoch should make signed event history as recoverable and navigable as Jujutsu's operation log.
- Epoch can differentiate by making events cryptographically authored collaboration artifacts, not only local repo mutations.

