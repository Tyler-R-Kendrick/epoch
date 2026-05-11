---
product: Mercurial
slug: mercurial
category: distributed_vcs
primary_sources:
  - https://www.mercurial-scm.org/
  - https://mercurial-scm.org/about.html
  - https://mercurial-scm.readthedocs.io/en/latest/help/topics/phases.html
  - https://mercurial-scm.org/help/topics/config.html
---

# Mercurial

Mercurial is a distributed source control tool historically positioned as easier and more predictable than Git while still supporting full local history, branching, merging, extensions, and multiple workflows.

## Competitive Relevance

- Mercurial competes at the VCS primitive layer rather than the forge layer. It matters to Epoch because it shows a mature alternative model for distributed history with simpler command ergonomics.
- Phases distinguish public, draft, and secret changesets so users are less likely to accidentally rewrite shared history.
- Its main weakness is ecosystem gravity: Git won most hosting, tooling, and developer mindshare.

## Epoch Implications

- Epoch should study Mercurial's "easy to learn, hard to break" positioning. Cryptographic and CRDT-backed history will need an equally calm user model.
- Mercurial also shows that good VCS primitives are not enough without distribution, interoperability, and a compelling collaboration surface.

