---
product: Replit Agent
slug: replit-agent
category: browser_hosted_ai_app_builder_checkpoints_and_deployments
primary_sources:
  - https://replit.com/
  - https://docs.replit.com/core-concepts/agent/
  - https://docs.replit.com/learn/build-with-agent
  - https://docs.replit.com/billing/deployment-pricing
  - https://docs.replit.com/cloud-services/deployments/about-deployments
---

# Replit Agent

Replit Agent is a browser-hosted AI software builder that plans, edits, runs, tests, checkpoints, and deploys applications inside Replit's integrated development and hosting environment. It competes with Epoch around AI-generated change history, app deployment provenance, recovery from bad agent actions, and the packaging of source, runtime, secrets, database, and deployment state.

## Competitive Relevance

- Agent is presented as a builder that can take natural-language app ideas through planning, implementation, testing, and deployment.
- Checkpoints are central to the recovery story and are recommended when the app becomes worse, important behavior breaks, or Agent changes more than expected.
- Replit combines code editor, runtime, database integrations, secrets, publishing, and hosting into one cloud workspace.
- Deployment pricing and Agent usage tie software creation and hosting spend to Replit credits.

## Epoch Implications

- Replit demonstrates demand for "idea to running app" workflows where users may not understand the underlying version-control or deployment state.
- Epoch can differentiate by making each agent-produced state durable, signed, inspectable, and portable outside the hosted workspace.
- The Replit model highlights the need to connect source history with runtime environment, secrets boundaries, database migrations, and deployment target.

## Unknowns To Track

- Replit's Agent and publishing pricing changes frequently; credit mechanics should be rechecked before direct cost modeling.
- Hosted checkpoints may not map cleanly to Git commits, database state, deployment configuration, or external service changes.
