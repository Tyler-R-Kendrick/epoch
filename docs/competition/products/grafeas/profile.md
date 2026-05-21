---
product: Grafeas
slug: grafeas
category: artifact_metadata_governance
primary_sources:
  - https://grafeas.io/
  - https://github.com/grafeas/grafeas
  - https://github.com/grafeas/kritis
  - https://cloud.google.com/artifact-analysis/docs
---

# Grafeas

Grafeas is an open-source artifact metadata API for storing and querying software supply-chain metadata such as vulnerabilities, build details, package information, deployment history, and attestations. Kritis builds on this model for deploy-time policy enforcement, while Google Cloud Artifact Analysis exposes related concepts as a managed product surface.

## Competitive Relevance

- Grafeas competes with Epoch at the metadata-index layer: it offers a shared API for describing artifacts and their security state after source is built.
- Its occurrence and note model makes supply-chain facts queryable across builds, scanners, attestations, and deployments.
- Managed Artifact Analysis shows how this metadata can become a cloud-native control plane rather than a local repository feature.
- Grafeas can reduce demand for source-history-native evidence if buyers primarily reason about built artifacts and deployments.

## Epoch Implications

- Epoch should treat repository versions and signed actor events as metadata producers that can feed Grafeas-like stores.
- Epoch can differentiate by preserving causality from source change to artifact metadata instead of only indexing artifact findings after the fact.
- Queryable provenance and vulnerability context should be designed as first-class outputs, not as a later scanner integration.

## Unknowns To Track

- The standalone open-source Grafeas and Kritis ecosystems appear less visibly active than managed cloud artifact-analysis products.
- Buyers may encounter Grafeas concepts indirectly through Google Cloud rather than adopting the open API themselves.
