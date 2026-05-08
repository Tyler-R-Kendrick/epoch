---
product: Perforce P4
gossip_sources:
  - https://www.reddit.com/r/gamedev/search/?q=perforce&restrict_sr=1
  - https://www.reddit.com/r/unrealengine/search/?q=perforce&restrict_sr=1
  - https://community.perforce.com/
  - https://www.perforce.com/resources/vcs/helix-core-pricing
  - https://www.perforce.com/products/helix-core/learning-resources
---

# Gossip

## Positive Sentiment

- Game-development communities often recommend P4 when teams work with Unreal projects, large binary assets, or artists who need file locking.
- Professional users value that P4 is built for asset scale rather than retrofitting Git with large-file extensions.
- The free tier and cloud offering reduce some of the historic barrier for small studios evaluating Perforce.

## Complaints And Friction

- Common community friction centers on setup complexity, administration burden, pricing, and unfamiliar centralized workflows.
- Git-native developers may find depots, workspaces, changelists, and streams more cumbersome than branch-and-pull-request habits.
- Small teams often compare P4 against Git LFS and only accept P4's overhead when binary locking and performance pain become acute.
- P4's many clients and add-ons can make it unclear which product surface a new team should start with.

## Bug Themes To Watch

- Workspace mapping mistakes and sync surprises.
- Locking and permissions misconfiguration.
- Server administration, backups, upgrades, and depot storage growth.
- Mixed Git/P4 integration friction where developers and artists use different clients.

## Epoch Takeaways

- Binary and creative asset workflows need explicit product design, not only generic repository storage.
- Locking can be a positive collaboration feature when merge is impossible.
- Enterprise credibility depends on deployment, backup, permission, and support stories.
- Keep onboarding lighter than P4 where possible, but do not ignore the problems P4 solves well.
