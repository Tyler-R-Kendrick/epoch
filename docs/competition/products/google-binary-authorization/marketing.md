---
product: Google Binary Authorization
marketing_sources:
  - https://docs.cloud.google.com/binary-authorization/docs/overview
  - https://cloud.google.com/binary-authorization/pricing
  - https://docs.cloud.google.com/binary-authorization/docs/set-up-platform
---

# Marketing

## Target Customers

- Google Cloud customers running GKE, Cloud Run, Google Distributed Cloud, or service mesh workloads.
- Regulated platform teams that need centralized deployment policy and separation of duties.
- Security teams already invested in Cloud Build, Artifact Registry, IAM, Cloud KMS, and Google Cloud audit trails.

## Positioning

Binary Authorization positions itself as centralized software supply-chain security for container deployment. Its practical promise is that only images satisfying trusted policy and attestation requirements can run on supported Google Cloud platforms.

## Customer Model

Binary Authorization is a managed Google Cloud feature. Cloud Run enforcement is provided at no charge, while GKE enforcement uses a per-cluster hourly price with a free monthly credit that can cover one cluster.

## Captures

- Enterprises that prefer managed cloud controls over self-running admission infrastructure.
- Teams that need attestation policy linked to cloud IAM and audit.
- Google Cloud platform owners who want deployment security inside their existing console, billing, and support relationship.

## Misses

- Multi-cloud and self-hosted teams that need portable policy.
- Developers who need source-history-native trust and offline collaboration.
- Organizations that do not want deployment governance coupled to one cloud provider.

## Epoch Lessons

Binary Authorization captures cloud deployment governance. Epoch should interoperate with it while keeping the source, review, CI, and version evidence independent from the cloud runtime.
