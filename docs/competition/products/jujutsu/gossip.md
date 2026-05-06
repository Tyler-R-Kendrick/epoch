---
product: Jujutsu
gossip_sources:
  - https://github.com/jj-vcs/jj
  - https://github.com/jj-vcs/jj/issues
  - https://github.com/jj-vcs/jj/issues/1841
  - https://github.com/jj-vcs/jj/issues/5596
  - https://github.com/jj-vcs/jj/issues/4978
  - https://www.reddit.com/r/git/comments/1rvnyj3/does_the_use_of_jujutsu_pose_any_dangers/
---

# Gossip

## What People Say

Jujutsu receives strong enthusiasm from advanced Git users, especially around undo, automatic commits, and stack-friendly workflows. Skeptics focus on compatibility with existing review systems and the risk of surprising teammates who expect ordinary Git branch behavior.

## Bug And Friction Themes

- The project README notes that it is not yet 1.0, has incomplete features such as native submodule support, and still has performance bugs.
- Open issues and release notes show Git compatibility edge cases around authentication, ignored-file tracking, large repos, branch export, packfiles, and Windows/macOS filesystem behavior.
- Community advice often warns that Jujutsu is best for users who already understand Git and can recover when GitHub/GitLab review workflows do not map cleanly.

## Product Risk For Epoch

Jujutsu is a strong benchmark for local repository ergonomics. Epoch should not ship an event-log model that is less understandable or less recoverable than `jj op log`.

