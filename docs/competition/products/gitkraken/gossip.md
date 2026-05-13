---
product: GitKraken
gossip_sources:
  - https://help.gitkraken.com/gitkraken-desktop/performance-issues/
  - https://feedback.gitkraken.com/suggestions/196652/improve-git-lfs-performance
  - https://feedback.gitkraken.com/suggestions/198451/improve-performance-by-not-scanning-ignored-files
  - https://stackoverflow.com/questions/64925749/gitkraken-is-very-slow-since-macos-big-sur-update
  - https://www.reddit.com/r/git/comments/6cu9w3/gitkraken_is_by_far_the_most_frustrating_git/
  - https://www.trustpilot.com/review/gitkraken.com
---

# Gossip

## What People Say

GitKraken is often praised for making Git visual and approachable, especially the graph, conflict tools, and integrated hosting workflows. The negative public signal clusters around performance, licensing friction, support expectations, and concern that account/cloud-dependent features can interfere with a local Git workflow.

## Design And UX Complaints

- Large graphs, many branches, many repositories, or LFS-heavy repos can make the UI slow enough that users fall back to CLI Git.
- The official troubleshooting docs acknowledge performance sensitivity around graph size, auto-fetch, repository maintenance, branch cleanup, and LFS cleanup.
- Some users dislike when private-repository access or advanced workflow affordances sit behind paid tiers because the core mental model still feels like "my local Git repo."

## Feature Complaints

- Historical feedback threads describe LFS and rebase performance pain, though several items are marked done or have documented mitigations.
- Public community posts describe confusion when repository visibility or account state causes GitKraken to treat a repo differently than users expect.
- Recent AI and MCP-related complaints are more trust than functionality: users want clear controls over what is installed, changed, or sent to cloud services.

## Product Risk For Epoch

GitKraken proves that excellent visualization can win hearts, but it also shows that local developer tools are judged harshly when they feel slow, cloud-dependent, or opaque. Epoch should be explicit about local guarantees, account requirements, and what metadata leaves the machine.
