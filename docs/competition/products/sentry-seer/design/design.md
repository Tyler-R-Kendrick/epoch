---
product: Sentry Seer
slug: sentry-seer
design_schema: 1
sources:
  - https://docs.sentry.io/product/ai-in-sentry/seer
  - https://sentry.io/changelog/seer-sentrys-ai-debugger-is-generally-available/
  - https://sentry.io/changelog/seer-now-debugs-in-every-stage-of-development/
  - https://sentry.zendesk.com/hc/en-us/articles/39872578968603-Will-Seer-create-PRs-automatically
---

# Sentry Seer Design

## Look And Feel

Seer is embedded in Sentry's observability UI: issue details, alerts, actionability scores, fix workflows, GitHub integration settings, and automation controls. The design is operational and evidence-heavy, more like incident triage than a code review bot dashboard.

## Design References

- Open design docs: no public Seer design-token package was found.
- Screenshots and docs show issue-fix workflows, actionability scores, suggested patches, and pull request creation.
- Help-center docs expose automation settings for scans, fixes, PR creation, and repository selection.

## Differentiators

- Runtime context is the design anchor: stack traces, spans, logs, profiles, releases, commits, and code mappings.
- Actionability scores help teams decide when automation is appropriate.
- Automation levels let teams choose between diagnosis, patch generation, and automatic PR creation.

## What Works Well

- Seer starts from bugs users actually hit, which makes its fixes easier to prioritize than speculative PR comments.
- Pull requests can carry root-cause context from Sentry, reducing the gap between incident and code change.
- Flat active-contributor billing is easier to explain than per-review token pricing for high-volume teams.

## UX Breakdowns

- Setup depends on correct GitHub integration, code mappings, and project settings; missing links can make Seer appear silent.
- Active-contributor billing can surprise organizations when external fork PRs or broadly enabled repositories count.
- Seer is strongest where Sentry already has rich telemetry; teams without instrumentation get less value.
