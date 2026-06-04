---
product: Sentry Seer
slug: sentry-seer
gossip_schema: 1
sources:
  - https://www.reddit.com/r/OpenAI/comments/1li8clc/anyone_using_codex_sentry_to_autofix_bugs/
  - https://www.reddit.com/r/ExperiencedDevs/comments/1rkjg9z/can_ai_code_review_tools_actually_catch/
  - https://www.reddit.com/r/SaaS/comments/1tiq1no/code_reviews_are_becoming_the_biggest_bottleneck/
  - https://sentry.zendesk.com/hc/en-us/articles/38332947459227-Seer-not-commenting-on-PRs
  - https://sentry.zendesk.com/hc/en-us/articles/46380693974043-How-does-Sentry-determine-which-repositories-Seer-can-access
  - https://sentry.zendesk.com/hc/en-us/articles/46380974525723-How-is-Seer-billed-and-how-do-I-predict-costs
---

# Sentry Seer Gossip

## Positive Signals

- Developers are interested in workflows where Sentry issues automatically become tested pull requests.
- Runtime evidence is seen as a meaningful advantage over pure diff review when diagnosing real bugs.
- Flat active-contributor billing can feel more predictable than token-metered review for teams with many review iterations.

## Complaints And Friction

- Community anecdotes include users who tried Sentry Autofix or Seer-style workflows and did not get reliable fixes.
- Help-center articles around Seer not commenting on PRs suggest setup confusion around repository association and project settings.
- Billing docs call out external fork PRs and connected repository scope, which can surprise open-source or broadly integrated teams.

## What Seems Buggy Or Risky

- Seer depends on instrumentation quality; weak traces or missing code mappings reduce usefulness.
- If automation opens pull requests from incident context without enough tests, teams still need strong human and CI review.
- Active-contributor billing can be predictable at steady state but surprising when a repository is widely enabled.

## Epoch Opportunity

Epoch can connect Sentry-style runtime evidence to source provenance without making Sentry the system of record. The durable object should be a signed fix lineage: issue evidence, proposed patch, tests, pull request, review, and merge decision.
