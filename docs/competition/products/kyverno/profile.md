---
product: Kyverno
slug: kyverno
category: kubernetes_policy_engine
primary_sources:
  - https://kyverno.io/
  - https://kyverno.io/docs/policy-types/cluster-policy/verify-images/overview/
  - https://kyverno.io/docs/policy-types/image-validating-policy/
  - https://www.cncf.io/projects/kyverno/
---

# Kyverno

Kyverno is a Kubernetes-native policy engine. For Epoch, the relevant competitive surface is image verification: Kyverno policies can require signed images, mutate tags to digests, verify digests, check Cosign or Notary signatures, and evaluate signed attestations during admission.

## Competitive Relevance

- Kyverno turns deployment policy into Kubernetes YAML, which is where many platform teams already manage control.
- Its image verification features can enforce trust without requiring developers to adopt a new version-control model.
- It combines supply-chain controls with broader Kubernetes policy, so image provenance becomes one policy category among many.
- Kyverno's mature policy library and CNCF visibility make it a default option for teams not ready for bespoke trust systems.

## Epoch Implications

- Epoch should treat Kubernetes policy outcomes as downstream consumers of repository evidence, not competitors to ignore.
- Epoch Platform can differentiate by tracing Kyverno admission failures back to signed source events and version materialization.
- Epoch should keep deployment trust data exportable as signatures, attestations, labels, or manifests that Kyverno can evaluate.

## Unknowns To Track

- Kyverno policy behavior depends on cluster configuration and version-specific APIs.
- Image verification is powerful but can be hard to debug when registry credentials, private signatures, or admission webhook ordering are wrong.
