---
product: E2B
design_sources:
  - https://e2b.dev/ai-agents
  - https://e2b.dev/docs/billing
  - https://e2b.dev/pricing
  - https://e2b.dev/blog/docker-e2b-partner-to-introduce-mcp-support-in-e2b-sandbox
---

# Design

## Look And Feel

E2B uses a developer-infrastructure design language: dark technical marketing, code blocks, pricing calculators, SDK examples, and docs tables for limits and billing. The product is framed as an invisible execution substrate for AI agents more than as a visible workspace.

## Open Design Assets

- Public docs expose billing, rate-limit, template, and sandbox lifecycle tables.
- The pricing page includes a calculator and plan comparison that function as product design references.
- Blog posts and Docker docs include diagrams and examples for MCP-enabled sandboxes.
- No public design-token package was found in the reviewed sources.

## Differentiators

- The pricing page makes sandbox economics explicit with CPU, memory, and storage cost inputs.
- Docs foreground operational constraints such as concurrent sandbox limits, creation rates, and session lengths.
- Docker MCP Catalog integration gives the product a recognizable tool ecosystem surface instead of only raw compute.

## What Works

- Developers can quickly map a product requirement to an SDK call, a sandbox limit, and a price model.
- The sandbox object is simple enough for agent framework integrations to adopt.
- MCP support makes external-tool access legible while preserving the sandbox boundary.

## UX Breakdowns

- Per-second compute pricing and concurrency add-ons require careful cost modeling for production agent loops.
- The product is less visually inspectable than full workspace systems; much of the experience happens through SDKs, logs, and dashboards.
- Users must understand when a code interpreter, shell sandbox, template, or MCP-enabled sandbox is the right tool.

## Epoch Design Lessons

- Epoch should show sandbox economics and trust state beside work provenance when agent execution affects repository history.
- SDK-first experiences still need human-readable evidence after the agent finishes.
- Tool access through MCP should be captured as part of the signed execution record, not treated as ambient context.
