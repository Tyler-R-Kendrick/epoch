---
product: Gitea
slug: gitea
category: lightweight_self_hosted_forge
primary_sources:
  - https://about.gitea.com/
  - https://about.gitea.com/pricing
  - https://docs.gitea.com/1.24/category/usage
  - https://docs.gitea.com/next/
---

# Gitea

Gitea is a lightweight, self-hosted Git forge with code hosting, pull requests, issues, projects, package registry, and GitHub Actions-compatible CI/CD. It competes with Epoch where teams want a small deployable forge rather than a large DevSecOps suite.

## Competitive Relevance

- Gitea offers the familiar GitHub-style collaboration surface in a self-managed package that can run on modest infrastructure.
- Its Actions implementation, package registry, pull requests, issue tracking, and repository permissions give small teams a complete forge without adopting GitLab-scale operations.
- Gitea's commercial site now sells self-managed and cloud-managed enterprise support, SAML SSO, audit logs, and runner features, creating a path from hobby deployment to paid organizational use.
- Documentation emphasizes Git workflows, AGit pull requests without forks, packages, protected tags, mirrors, webhooks, signatures, and administrative control.

## Epoch Implications

- Epoch should assume many teams will prefer "GitHub-like but self-hosted" before considering a new history model.
- Epoch's signed event log should interoperate with lightweight forges rather than requiring a full platform migration.
- The clearest differentiation is not forge breadth; it is portable, cryptographic, content-addressed history that remains meaningful outside a single web UI.
- Gitea's low operational footprint raises the bar for Epoch deployment simplicity.

## Unknowns To Track

- Enterprise feature boundaries can change as Gitea Ltd expands paid offerings.
- Gitea Actions compatibility is close enough for many users but has known differences and bugs that matter for GitHub migration decisions.
