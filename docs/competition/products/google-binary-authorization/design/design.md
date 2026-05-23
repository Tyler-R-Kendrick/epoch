---
product: Google Binary Authorization
design_sources:
  - https://docs.cloud.google.com/binary-authorization/docs/overview
  - https://docs.cloud.google.com/binary-authorization/docs/key-concepts
  - https://docs.cloud.google.com/binary-authorization/docs/making-attestations
  - https://cloud.google.com/binary-authorization/pricing
---

# Design

## Look And Feel

Binary Authorization uses the standard Google Cloud product design: dense documentation, console-driven setup paths, gcloud commands, IAM resource concepts, and pricing pages. The experience is enterprise cloud administration rather than developer collaboration.

## Open Design Assets

- Documentation diagrams and concept pages define the public interaction model: policy, attestor, attestation, signer, deployer, and deployment platform.
- Quick starts and setup docs show console and CLI flows for GKE, Cloud Run, Distributed Cloud, and continuous validation.
- Pricing documentation exposes the commercial model directly, including per-cluster GKE enforcement pricing and free Cloud Run enforcement.

## Differentiators

- Managed service integration reduces the need to run a separate admission controller.
- Attestors and IAM make separation of duties a first-class cloud resource model.
- Continuous validation expands the story beyond one-time admission to ongoing policy monitoring.

## What Works

- Cloud-native buyers can centralize policy in the same administrative surface as build, artifact storage, runtime, IAM, and audit.
- The attestor concept gives security teams a crisp approval resource they can protect separately from deployers.
- Pricing is clear enough for small GKE adoption and free Cloud Run enforcement.

## UX Breakdowns

- The workflow can feel scattered across Cloud Build, Artifact Analysis, KMS or keys, IAM, attestors, policies, and target runtimes.
- The product is less portable than open-source admission policy because its best UX is inside Google Cloud.
- Developers may not see why a deployment is denied unless platform teams surface the attestation and policy context.

## Epoch Design Lessons

Epoch should make trust boundaries visible without making users navigate several administrative products. The source event, artifact digest, attestation, approver, and deployment policy should read as one causal chain.
