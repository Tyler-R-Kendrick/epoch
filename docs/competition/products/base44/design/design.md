# Base44 Design

## Look And Feel

Base44 presents itself as a polished no-code business-app platform: large marketing screenshots, bright app mockups, step-by-step build language, and reassuring security copy. The product pages show chat-style generation, dashboards, mobile app previews, integration logos, and business workflow examples instead of code-first screenshots.

Design references:

- [AI app builder page](https://base44.com/ai-app-builder)
- [Pricing page](https://base44.com/pricing?_rsc=1wtp7)
- [Developer docs](https://docs.base44.com/developers/changelog)
- [SDK docs](https://doc-sdk.base44.app/)

## Differentiators

- The marketing UI frames software creation as business enablement rather than developer productivity.
- Built-in integrations, auth, database, privacy, SSO, SCIM, and access control are part of the visual promise, not hidden developer docs.
- The developer docs are structured for AI-assisted reading, including `llms.txt`, SDK references, and CLI commands.
- The CLI and SDK create a hybrid design language: non-coder builder in the app, typed backend/resource controls in docs.

## What Works Well

- The core journey is easy to understand: describe, connect integrations, publish, improve.
- Security and access-control content is visible enough for small-business buyers to feel that the platform is not just a toy generator.
- Connector docs distinguish shared service tokens from per-user OAuth tokens, which is useful product thinking for workflow apps.
- The credit and integration-credit model is exposed in pricing and docs, giving buyers a way to forecast some costs.

## Where UX Breaks Down

- Public complaints suggest the production experience can feel opaque when backend logic, integrations, or platform updates fail without clear user-visible cause.
- GitHub integration is positioned as an ownership feature, but community discussion still treats the backend as black-box or platform-dependent.
- Credits make iterative repair feel expensive when the agent introduces regressions.
- The polished business-app surface can overpromise production readiness for teams that still need source control, staging, observability, recovery, and change review.

## Epoch Design Takeaway

Epoch should borrow the plain-language app ownership framing but avoid hiding the trust boundary. Users need a visible state model: generated change, accepted change, signed dependency, live deployment, and recoverable rollback.
