---
product: Gitea
gossip_sources:
  - https://www.reddit.com/r/selfhosted/comments/1rlrgbw/how_are_the_differences_between_gitea_and_forgejo/
  - https://www.reddit.com/r/selfhosted/comments/188d5nc/gitea_vs_forgejo/
  - https://github.com/go-gitea/gitea/issues/35780
  - https://github.com/go-gitea/gitea/issues/35134
  - https://docs.gitea.cn/en-us/1.20/usage/actions/comparison/
---

# Gossip

## What People Say

Self-hosting discussions often describe Gitea as stable, easy to run, and good enough for private repositories, package registries, and CI/CD. The main controversy is not day-to-day usability; it is governance, commercial control, and whether Forgejo is the safer long-term community fork.

## Bug And Friction Themes

- Public GitHub issues show Actions-specific bugs such as rerun failures and API visibility gaps for waiting jobs.
- Gitea's Actions documentation calls out differences from GitHub Actions, including missing or ignored features in older documentation such as variables, problem matchers, annotations, and pre/post step UI sections.
- Migration from GitHub can be deceptively easy until workflows depend on proprietary GitHub behavior.
- Community threads debate whether Gitea's commercial entity creates rug-pull risk, even though many users report years of reliable operation.

## Product Risk For Epoch

Gitea can absorb teams that primarily want self-hosted repository workflow, CI, and package management. If Epoch asks those users to operate a larger platform, Gitea will look simpler.

## Opportunity For Epoch

Epoch can focus on the part Gitea does not try to solve: signed, portable, queryable history and actor intent that can be attached to a Gitea-hosted repository without being trapped in the forge UI.
