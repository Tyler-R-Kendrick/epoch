---
product: Ona
slug: ona
gossip_schema: 1
sources:
  - https://support.gitpod.io/articles/6131188622-accessing-billing-for-gitpod-classic-vs-ona-accounts
  - https://www.reddit.com/r/devops/comments/1qu68wh/coder_vs_gitpod_vs_codespaces_vs_just_ssh_into/
  - https://www.reddit.com/r/kubernetes/comments/1gk13i1/we_re_leaving_kubernetes/
  - https://www.theregister.com/2025/09/03/gitpod_rebrands_as_ona/
---

# Ona Gossip

## Positive Sentiment

- Users and operators still recognize Gitpod's original value: disposable environments, devcontainers as source of truth, and fewer snowflake setup tickets.
- The new Ona positioning resonates with teams that see cloud workspaces as necessary infrastructure for safe AI agents.
- Public commentary often compares Ona, Coder, and Codespaces as serious options for teams that have outgrown local-only development.

## Negative Sentiment

- The Gitpod Classic to Ona transition introduces billing and product-identity confusion, enough that support documentation explains how to distinguish the two portals.
- Some cloud development environment discussions frame the category as over-engineered when a dev team could use SSH, devcontainers, or self-managed servers.
- Older Gitpod users may see the AI-agent pivot as a departure from the simple browser workspace story they originally adopted.

## Bug And Friction Themes

- Product migration confusion: legacy Gitpod accounts, Ona billing, and renamed docs can send users through the wrong path.
- Cost predictability: credits, usage limits, and prebuild or environment runtime are harder to understand than a flat IDE subscription.
- Trust boundary anxiety: teams want the benefits of cloud agents but still worry about source access, secrets, review habits, and auditability.

## Epoch Takeaways

- Epoch should make platform transitions explicit in signed records so users can tell which product identity produced which work.
- The Community sandbox story should avoid making environment governance feel like an enterprise-only maze.
- Durable agent provenance is a wedge: Ona can run the environment, while Epoch can prove what happened in it.
