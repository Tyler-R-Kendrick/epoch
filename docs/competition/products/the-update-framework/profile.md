---
product: The Update Framework
slug: the-update-framework
category: supply_chain_update_security
primary_sources:
  - https://theupdateframework.io/
  - https://theupdateframework.io/docs/
  - https://theupdateframework.io/security/
  - https://github.com/theupdateframework/specification
---

# The Update Framework

The Update Framework, or TUF, is a CNCF-hosted specification and reference ecosystem for securing software update systems with signed metadata, delegated trust, threshold signatures, rollback protection, freeze protection, and key rotation.

## Competitive Relevance

- TUF competes with Epoch at the trust-distribution layer: it defines how clients decide whether repository content is safe to fetch and install.
- Its role model turns repository trust into explicit metadata objects, which is close to Epoch's signed history and content-addressed materialization concerns.
- The framework is mature enough to appear behind high-value package and container distribution systems, so it can shape security-team expectations before Epoch enters the conversation.
- TUF is not a collaboration product, but it can make update integrity feel solved without requiring a new source-history system.

## Epoch Implications

- Epoch should treat signed history and version materialization as compatible with TUF-style target metadata rather than as a competing vocabulary.
- Epoch can differentiate by showing how trusted source changes, review state, and actor identity flow into publishable update metadata.
- TUF's delegated roles expose a useful model for scoped trust in repositories, teams, package families, or release channels.
- Epoch should avoid making key-management UX harder than TUF; users will expect offline root keys, rotating online signing keys, and clear recovery paths.

## Unknowns To Track

- TUF implementations and ecosystem integrations vary, so Epoch should track which metadata profile major package systems actually require.
- Public UX surfaces are mostly documentation and command-line workflows, which means product-level adoption depends on integrators rather than a central TUF application.
