---
product: Continue
slug: continue
design_sources:
  - https://docs.continue.dev/features/agent/quick-start
  - https://docs.continue.dev/features/agent/plan-mode
  - https://docs.continue.dev/guides/configuring-models-rules-tools
  - https://www.continue.dev/pricing
---

# Design

## Look And Feel

Continue's design is configuration-led. In the IDE, the user sees a familiar assistant panel with Chat, Plan, Agent, Edit, Autocomplete, mode selectors, context mentions, permission prompts, diffs, and tool responses. In Mission Control and docs, the visual language shifts to agents, configs, blocks, models, rules, MCP tools, secrets, and organization governance.

## Open Design Artifacts

- Continue publishes docs for mode selection, agent tool handshakes, Plan mode, model roles, autocomplete, rules, MCP servers, configs, secrets, and pricing.
- Screenshots in docs show mode selectors, agent permission prompts, plan-mode flows, block inputs, and IDE configuration surfaces.
- There is no public standalone design-token package for the product UI; the design contract is the IDE extension plus Mission Control configuration model.

## Differentiators

- Continue treats agents as composed artifacts: prompts, rules, tools, models, secrets, and reusable configuration blocks.
- Plan mode limits work to read-only exploration before Agent mode gets write and terminal authority.
- Model roles let teams route chat, edit, apply, autocomplete, and agent behavior to different models instead of treating the assistant as one monolithic model.
- Pricing and governance emphasize private team agents and controlled catalogs, not just individual IDE autocomplete.

## What Works Well

- The configuration model is strong for teams that need repeatable AI workflows.
- Local and Hub/Mission Control split lets individuals keep workspace-specific rules while organizations publish shared agents and blocks.
- Tool policies and secrets handling make agent capability and credential use more explicit than many editor assistants.

## Where It Breaks Down

- The product vocabulary has many moving parts: Hub, Mission Control, agents, configs, blocks, rules, tools, model roles, secrets, local/global/workspace directories, and deprecated docs.
- Autocomplete and local-provider setup can be fragile because FIM models, routes, and provider APIs vary.
- Configuration power can feel like infrastructure work before a developer gets a simple coding outcome.
