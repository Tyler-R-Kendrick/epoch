---
product: Factory Droid
slug: factory-droid
design_schema: 1
sources:
  - https://docs.factory.ai/welcome/index
  - https://docs.factory.ai/pricing
  - https://docs.factory.ai/enterprise
---

# Factory Droid Design

## Look And Feel

Factory's public docs and screenshots present Droid as a serious developer platform: dense docs navigation, app screenshots with sessions, chat, and code editor panes, and enterprise pages organized around deployment, identity, controls, telemetry, and compliance. The visual language is more operational than playful.

## Design References

- Product screenshot: Factory docs show the Factory App with Droid sessions, chat, and code editor.
- Documentation IA: capability-first docs for CLI, app, exec, missions, review, control, readiness, computers, templates, and enterprise.
- Design tokens: no public token package is advertised; the design surface is primarily documentation, app screenshots, and product diagrams.

## Differentiators

- Factory makes agent operations visible as a platform: sessions, local or cloud computers, missions, usage, readiness, and enterprise policy.
- Enterprise controls are not buried in sales copy; the docs enumerate identity, privacy, network, model, telemetry, and compliance concerns.
- The product uses "Droid" as a unifying metaphor across CLI, app, SDK, CI, and remote machines.

## What Works Well

- The docs make it easy for a platform team to map Droid into existing infrastructure and governance.
- Agent Readiness is a strong design move because it turns autonomy into an incremental maturity model.
- Clear pricing tiers help individual developers understand the upgrade path from Pro to Plus to Max.

## UX Breakdowns

- The breadth of surfaces can make it hard for a new user to know whether to start in CLI, app, missions, computers, or enterprise configuration.
- Rolling rate limits across 5-hour, weekly, and monthly windows are operationally precise but cognitively heavy.
- The Droid metaphor can obscure concrete boundaries between agents, sessions, machines, tools, and policies until a user reads the docs deeply.
