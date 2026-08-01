---
product: Tangled
gossip_sources:
  - https://news.ycombinator.com/item?id=44876557
  - https://lobste.rs/s/zxthnz/tangled_git_collaboration_platform
  - https://anil.recoil.org/notes/disentangling-git-with-bluesky
  - https://blog.tangled.org/bobbin/
  - https://bsky.app/profile/tangled.org
---

# Gossip

## What People Say

Positive themes: ATProto for forge metadata is clever; issues/stars living on
the author's PDS enable portability; knots make self-hosting approachable;
stacked PRs and social timeline feel fresh versus GitHub.

Skeptical themes: Git data on knots "violates" a pure "user data stays on PDS"
reading of ATProto; private repos are hard while protocol data is public;
running the full stack (PDS, AppView, knot, jetstream) is still operationally
heavy; product maturity and AppView reliability incidents show up in public
status posts.

## Bug And Friction Themes

- Multi-service mental model (PDS + knot + AppView + spindle).
- AppView as historical single point of product UX (Bobbin is the API answer).
- Migration from GitHub issues/PRs is limited; git history migrates more easily.
- Secure-mode knot setup and SSH key sync are power-user paths.

## Product Risk For Epoch

Tangled already occupies "decentralized social coding on ATProto" in public
mindshare. Epoch should compete on signed event-log history, CRDT merge,
private/enterprise Community, and deploy/ops — not by integrating with or
cloning that product.
