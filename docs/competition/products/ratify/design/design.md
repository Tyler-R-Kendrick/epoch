---
product: Ratify
design_sources:
  - https://ratify.dev/docs/quick-start
  - https://ratify.dev/docs/concepts/ratify-framework-overview/
  - https://ratify.dev/docs/reference/custom%20resources/policies/
  - https://ratify.dev/docs/plugins/verifier/notation/
---

# Design

## Look And Feel

Ratify presents as an open-source cloud-native infrastructure project. The public surface is a documentation site with versioned docs, left navigation, code-heavy quick starts, CRD reference tables, and architecture diagrams rather than a polished SaaS console.

## Open Design Assets

- The docs expose the main information architecture: quick starts, concepts, CRDs, verifiers, stores, executors, policies, and security.
- Framework diagrams explain how verification requests flow through stores, verifiers, policy evaluation, and admission controllers.
- CRD samples and YAML blocks are the effective design tokens for operators because policy shape is the product surface.

## Differentiators

- Ratify separates artifact verification from the admission controller, letting Gatekeeper or Kyverno stay focused on policy enforcement.
- The verifier model is extensible enough to cover Notation, Cosign, SBOM, vulnerability, and custom evidence patterns.
- It is cloud-neutral and registry-oriented, which is attractive for multi-cloud platform teams.

## What Works

- The docs make the mental model explicit: subject artifact, referenced evidence, verifier result, policy decision.
- Examples show real denial output when unsigned artifacts fail admission, which helps operators connect policy to runtime behavior.
- CRD references are parseable and concrete, so teams can codify the trust contract in GitOps repositories.

## UX Breakdowns

- The developer experience is indirect: application authors may see only a Kubernetes denial, not the full evidence graph.
- The docs assume comfort with Helm, Gatekeeper, CRDs, registries, certificates, and OCI artifact conventions.
- Trust-policy debugging can spread across registry layout, certificates, verifier config, policy CRDs, and admission-controller logs.

## Epoch Design Lessons

Epoch should make deploy-time evidence legible to both platform operators and authors. If a signed version fails admission, the UI should point back to the missing source event, approval, CI attestation, or artifact binding rather than stopping at a generic policy failure.
