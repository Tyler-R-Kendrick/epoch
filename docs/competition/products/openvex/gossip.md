---
product: OpenVEX
gossip_sources:
  - https://github.com/openvex/spec/issues
  - https://www.reddit.com/r/cybersecurity/comments/1lalcff/
  - https://www.reddit.com/r/devsecops/comments/1oh581p/
  - https://www.reddit.com/r/devsecops/comments/1rx059b/
---

# Gossip

## What People Say

Public discussion is generally favorable toward the lightweight format, especially when users want to suppress non-applicable findings with more rigor than a scanner exception. Community questions also show that teams are still looking for good risk-acceptance patterns and tool-specific examples.

## Bug And Friction Themes

- Open issues request richer vulnerability information, risk scoring, clearer timestamps, discovery standards, and product-identifier clarification.
- Users report interoperability questions when a vulnerability tool supports one VEX representation but not OpenVEX directly.
- The workflow can break down if exploitability status becomes a one-off suppression file without review, ownership, or expiration.

## Product Risk For Epoch

OpenVEX may become the common unit of vulnerability decision evidence, making repository tools less persuasive if they cannot connect source versions to VEX statements.

## Opportunity For Epoch

Epoch can preserve the review trail behind exploitability statements: who assessed the source state, which version was materialized, which tests or policies supported the decision, and which release artifact received the statement.
