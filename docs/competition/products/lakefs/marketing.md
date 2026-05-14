---
product: lakeFS
marketing_sources:
  - https://github.com/treeverse/lakeFS
  - https://lakefs.io/pricing/
  - https://lakefs.io/blog/lakefs-repository-git-for-data/
  - https://docs.lakefs.io/
---

# Marketing

## Target Customers

- Data engineering teams operating S3, Azure Blob, Google Cloud Storage, or S3-compatible data lakes.
- ML and analytics teams that need reproducible datasets, isolated experiments, atomic promotion, and rollback.
- Regulated organizations that need data governance, RBAC, branch protection, retention, and auditable change paths.
- Platform teams that want a Git-like control plane without copying production-scale data into separate environments.

## Positioning

lakeFS positions itself as "Git for Data" and "Data Version Control" for data lakes. Its core promise is repeatable, atomic, versioned operations over object storage with data kept in the customer's cloud or VPC. The marketing emphasizes zero-copy branching, atomic merges, quality gates, rollback, cloud agnosticism, and compatibility with common data-engineering tools.

## Customer Model

- Apache-2.0 open-source project for self-managed adoption.
- lakeFS Cloud for managed service buyers.
- Enterprise plan for unlimited seats and governance-oriented capabilities.
- Capture expands through storage, governance, support, managed metadata, private connectivity, and enterprise security requirements.

## Captured Audiences

- Data engineers who already believe production data should be promoted like code.
- Teams with expensive or risky data-copy workflows.
- Cloud data platforms that need rollback without rebuilding the entire lake.
- Buyers who need technical proof before committing to a managed vendor.

## Missed Or Under-Captured Audiences

- Small teams that can solve reproducibility with Git, DVC, or warehouse snapshots.
- Analysts who live in BI tools and do not want branch/merge terminology.
- Teams standardized on warehouse-native versioning or table formats with sufficient time travel.
- Product teams that need multi-object application history rather than data-lake governance alone.
