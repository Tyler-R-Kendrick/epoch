---
product: Socket
gossip_sources:
  - https://docs.socket.dev/docs/ignoring-pull-request-alerts
  - https://docs.socket.dev/docs/socket-yml
  - https://www.reddit.com/r/programming/comments/ue414h/
  - https://www.reddit.com/r/node/comments/1s8c6k2/
  - https://www.reddit.com/r/ClaudeAI/comments/1rl1cfg/
  - https://www.reddit.com/r/aiagents/comments/1th4e8f/
---

# Gossip

## What People Say

Socket is frequently mentioned in supply-chain attack discussions as a practical tool to check packages before they land. Developers also cite it alongside lockfiles, exact version pinning, Snyk, npm audit, and other controls after npm compromise stories.

## Bug And Friction Themes

- Behavior-based scanning can raise suppression and ignore-workflow questions when protected branches require checks to pass.
- Some users worry that any security tool becomes another trust dependency and potential attack surface.
- Agent and AI-coding discussions show a growing demand for package-install guardrails, but also skepticism that prompt instructions alone can enforce those controls reliably.

## Product Risk For Epoch

Socket can own dependency-change trust decisions inside GitHub before a repository history product gets a chance to explain the decision later.

## Opportunity For Epoch

Epoch can complement Socket by turning dependency-security feedback into signed, durable history: alert observed, reviewer decision recorded, risk accepted or remediated, and materialized version linked to that evidence.
