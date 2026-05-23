---
product: Kyverno
marketing_sources:
  - https://kyverno.io/
  - https://www.cncf.io/projects/kyverno/
  - https://kyverno.io/policies/
---

# Marketing

## Target Customers

- Kubernetes platform and security teams.
- DevOps teams adopting policy-as-code without learning Rego first.
- Organizations that want admission controls, compliance reports, and image verification in one Kubernetes-native project.

## Positioning

Kyverno positions itself as policy management designed for Kubernetes. Its pitch is practical: define policies as Kubernetes resources, apply them with GitOps, and use the same engine for validation, mutation, generation, cleanup, and image verification.

## Customer Model

Kyverno is open source under CNCF. Commercial value is captured by managed Kubernetes platforms, enterprise security vendors, support providers, and adjacent products such as Nirmata that build around policy management.

## Captures

- Teams already standardizing on Kubernetes YAML and GitOps.
- Operators who want one policy engine for runtime controls and supply-chain checks.
- Security teams that need digest pinning, signature verification, and attestation checks near deployment.

## Misses

- Non-Kubernetes users and teams looking for source-control-native trust.
- Developers who need a simple explanation of why a change is trusted before it reaches the cluster.
- Organizations that require centralized SaaS workflow, procurement, and executive dashboards.

## Epoch Lessons

Kyverno captures operational trust at admission time. Epoch should capture authoring trust, review trust, and version trust earlier, then make those facts available to Kyverno policies.
