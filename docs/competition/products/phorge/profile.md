---
product: Phorge
slug: phorge
category: integrated_review_and_project_suite
primary_sources:
  - https://phorge.it/
  - https://projects.clusterlabs.org/book/phorge/article/introduction/
  - https://projects.clusterlabs.org/book/phorge/article/differential/
  - https://secure.phabricator.com/book/phabricator/article/audit/
  - https://we.phorge.it/w/installation_and_setup/update_from_phabricator/
---

# Phorge

Phorge is the community-maintained fork of Phabricator, continuing an integrated suite for code review, repository browsing, tasks, wiki, projects, and policy automation. It competes with Epoch where teams want a self-owned, review-first development portal with Git, Mercurial, and Subversion support.

## Competitive Relevance

- Phorge carries forward Phabricator's distinctive model: Differential for pre-push review, Diffusion for repository browsing, Maniphest for tasks, Phriction for wiki, Audit for post-publish review, and Herald for automation rules.
- It targets teams that want an integrated, self-hosted development environment rather than separate forge, tracker, wiki, and review tools.
- The Phabricator lineage has strong design precedents around stacked diffs, test plans, inline comments, ownership rules, and post-commit audits.
- It is especially relevant because several large communities kept Phabricator workflows alive after Phacility stopped maintenance.

## Epoch Implications

- Phorge proves that review metadata, task metadata, and repository metadata can be treated as one collaboration system.
- Epoch should study Differential's revision lifecycle and Audit's post-publish concern model when designing signed review events and history remediation.
- Phorge also shows the cost of a powerful but idiosyncratic workflow: users must learn custom objects, Arcanist-style submission, Herald rules, and instance-specific conventions.

## Unknowns To Track

- Phorge is community maintained, so velocity, security posture, and ecosystem support vary by deployment and upstream participation.
- Many public references still point to Phabricator docs or legacy instances, which can make current product status hard to parse for new adopters.
