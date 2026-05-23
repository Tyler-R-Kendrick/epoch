---
product: Ratify
slug: ratify
category: deployment_attestation_policy
primary_sources:
  - https://ratify.dev/docs/quick-start
  - https://ratify.dev/docs/concepts/ratify-framework-overview/
  - https://ratify.dev/docs/plugins/verifier/notation/
  - https://www.cncf.io/projects/ratify
---

# Ratify

Ratify is a CNCF Sandbox artifact verification engine for Kubernetes. It verifies OCI artifact security metadata such as Notation signatures, Cosign signatures, SBOM attestations, and other verifier outputs, then returns policy decisions to admission controllers such as Gatekeeper.

## Competitive Relevance

- Ratify moves trust enforcement to deployment time, which competes with Epoch's signed version and platform approval story.
- Its verifier/plugin model lets platform teams compose artifact evidence without owning a new source-control system.
- It treats OCI registries as evidence distribution points, which can bypass repository-native history if teams only care whether an image can run.
- CNCF positioning gives it neutrality against cloud-specific managed controls.

## Epoch Implications

- Epoch should make signed versions exportable as artifact evidence that admission tools can verify.
- Epoch can differentiate by preserving the source intent, author, review, CI, and materialized-version chain before the deployment gate sees an image digest.
- Epoch Platform should avoid treating admission denial as the whole story; it should explain which repository event or missing attestation caused the denial.

## Unknowns To Track

- Ratify is still a specialized Kubernetes artifact-verification project, so adoption depends on Gatekeeper/Kyverno and registry support.
- The UX is mostly YAML, CRDs, and docs; non-platform developers may never see the reason a deployment was denied.
