---
product: Ratify
marketing_sources:
  - https://www.cncf.io/projects/ratify
  - https://ratify.dev/docs/quick-start
  - https://opensource.microsoft.com/blog/2021/12/09/ratify-container-supply-chain-in-kubernetes
---

# Marketing

## Target Customers

- Platform teams running Kubernetes admission control.
- Supply-chain security engineers standardizing OCI artifact verification.
- Organizations that want cloud-neutral policy for signed images, SBOMs, provenance, and custom artifact evidence.

## Positioning

Ratify positions itself as a cloud-native verification engine. The message is not "replace your forge"; it is "admit only artifacts that satisfy the metadata policies you create."

## Customer Model

Ratify is open source and CNCF Sandbox, so the customer model is ecosystem adoption rather than direct SaaS revenue. Commercial pull comes indirectly through vendors, cloud providers, consultants, and platform teams that package it into Kubernetes security stacks.

## Captures

- Kubernetes operators who need admission-time trust enforcement.
- Multi-cloud teams that do not want a single cloud provider's binary authorization service.
- Security teams standardizing around OCI registries, Notation, Cosign, SBOMs, and SLSA-style provenance.

## Misses

- Developers looking for repository-native review, source history, or beginner-friendly collaboration UX.
- Teams that do not operate Kubernetes or admission controllers.
- Buyers that want a managed dashboard, opinionated workflow, and support contract as the primary product.

## Epoch Lessons

Ratify captures the final deploy gate. Epoch should capture the earlier authorship and decision trail, then provide evidence Ratify-like systems can consume.
