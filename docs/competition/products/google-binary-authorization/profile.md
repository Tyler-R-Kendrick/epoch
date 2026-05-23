---
product: Google Binary Authorization
slug: google-binary-authorization
category: managed_deployment_attestation_policy
primary_sources:
  - https://docs.cloud.google.com/binary-authorization/docs/overview
  - https://docs.cloud.google.com/binary-authorization/docs/key-concepts
  - https://docs.cloud.google.com/binary-authorization/docs/making-attestations
  - https://cloud.google.com/binary-authorization/pricing
---

# Google Binary Authorization

Google Binary Authorization is a managed Google Cloud service for centralized software supply-chain security. It enforces deployment policies for container workloads on GKE, Cloud Run, and Google Distributed Cloud, including policies that require verified attestations from configured attestors.

## Competitive Relevance

- Binary Authorization packages attestation enforcement as a managed cloud service rather than a repository feature.
- It integrates with Google Cloud build, artifact, IAM, GKE, Cloud Run, and continuous validation workflows.
- The product captures regulated cloud teams that want deployment gates tied to cloud identity and policy administration.
- It competes with Epoch Platform if customers want managed deployment trust without adopting a new DVCS.

## Epoch Implications

- Epoch should export materialized-version evidence in formats that cloud deployment services can consume.
- Epoch Platform should explain source-to-deploy causality more deeply than a cloud attestor policy can.
- Epoch should treat cloud IAM and attestor separation as a design influence for key ownership and approval boundaries.

## Unknowns To Track

- Binary Authorization is strongest inside Google Cloud and less relevant for teams committed to other clouds or bare-metal clusters.
- The mental model requires projects, attestors, attestations, IAM, keys, policies, and deployment targets, which can be hard to reason about.
