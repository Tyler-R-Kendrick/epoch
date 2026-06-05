# Base44 Profile

## Product Summary

Base44 is a Wix-owned AI app builder for generating full-stack business apps from natural-language prompts. It combines chat-based generation, managed auth, managed data, built-in integrations, one-click publish, GitHub integration on paid tiers, SDK access, and a developer CLI for syncing Base44 backend resources.

Sources:

- [Base44 AI app builder](https://base44.com/ai-app-builder)
- [Base44 pricing](https://base44.com/pricing?_rsc=1wtp7)
- [Base44 developer changelog](https://docs.base44.com/developers/changelog)
- [Base44 CLI](https://github.com/base44/cli)
- [Wix acquisition release](https://www.wix.com/press-room/home/post/wix-further-expands-into-vibe-coding-with-acquisition-of-base44-a-hyper-growth-startup-that-simplif)
- [Wix 2025 results](https://www.wix.com/press-room/home/post/wix-reports-fourth-quarter-and-full-year-2025-results)

## Competitive Relevance

- Base44 competes for non-developers and business operators who want an idea-to-running-app path without learning repository, auth, database, or deployment primitives.
- The Wix acquisition gives Base44 distribution, small-business credibility, and a pricing model familiar to website-builder buyers.
- The developer surface is becoming more serious: SDK modules, OAuth connectors, backend functions, GitHub disconnect controls, and CLI sync all move Base44 from toy prototypes toward app-platform dependency.
- For Epoch, Base44 is a warning about managed-backend lock-in: users like fast generation, but public complaints cluster around production stability, credit burn, black-box backend behavior, and platform updates breaking live apps.

## Product Model

- Prompt-first builder for web and app workflows.
- Managed hosting, auth, data, integrations, app access, and publish flow.
- Credits for AI build activity and separate integration credits for app-user actions that call integrations.
- Paid tiers unlock higher limits plus features such as backend functions, custom domains, and GitHub integration.
- Developer SDK and CLI expose Base44 backend entities, functions, connectors, and local sync.

## Epoch Implications

- Epoch should make ownership and rollback legible before users publish, not after a production incident.
- If Epoch supports generated apps or agent-created workflows, the evidence model should show which state is repo-owned, platform-owned, user-owned, and recoverable.
- Base44's connector model is a strong signal that app builders are turning OAuth and integration tokens into first-class product primitives; Epoch should keep signed provenance around those bindings.
