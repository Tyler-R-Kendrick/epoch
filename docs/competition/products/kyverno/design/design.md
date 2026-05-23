---
product: Kyverno
design_sources:
  - https://kyverno.io/
  - https://kyverno.io/docs/policy-types/cluster-policy/verify-images/overview/
  - https://kyverno.io/policies/other/verify-image/verify-image/
  - https://kyverno.io/docs/policy-types/image-validating-policy/
---

# Design

## Look And Feel

Kyverno uses a clean open-source project site with documentation, policy examples, tutorials, and a searchable policy library. The design is Kubernetes-native: YAML examples, resource diagrams, versioned docs, and "open in playground" flows matter more than dashboards.

## Open Design Assets

- Public docs include verifyImages diagrams, field references, and policy examples.
- The policy library exposes category, severity, subject, minimum version, and ready-to-copy YAML.
- The playground and GitHub links make examples executable rather than purely descriptive.

## Differentiators

- Kyverno policy is written as Kubernetes resources, reducing the language jump for cluster operators.
- Image verification is integrated with broader mutate, validate, generate, cleanup, and report workflows.
- Digest mutation and verification directly address tag-spoofing and mutable-reference risks.

## What Works

- The policy library gives teams a starting point for common controls instead of blank-page policy authoring.
- The docs explain both signatures and attestations, including Cosign, Notary, keyless, certificates, custom predicates, and registry credentials.
- Kubernetes-native packaging makes GitOps adoption straightforward.

## UX Breakdowns

- YAML policy remains dense, and exceptions can become their own governance problem.
- Admission failures can surprise developers when CI did not run the same policy before merge.
- Private registry and imagePullSecret behavior adds operational complexity that product pages do not make obvious.

## Epoch Design Lessons

Epoch should keep policy feedback close to the source decision. If Kyverno denies an image, Epoch should already know whether the missing evidence was a source signature, review approval, CI attestation, SBOM, or artifact digest binding.
