---
product: lakeFS
slug: lakefs
category: object_storage_data_version_control
primary_sources:
  - https://github.com/treeverse/lakeFS
  - https://docs.lakefs.io/
  - https://lakefs.io/pricing/
  - https://lakefs.io/blog/lakefs-repository-git-for-data/
  - https://github.com/treeverse/lakeFS/issues
---

# lakeFS

lakeFS is an open-source data version control system that layers Git-like commits, branches, tags, merges, rollback, and hooks over object storage such as S3, Azure Blob Storage, and Google Cloud Storage. It competes with Epoch where teams want repository history, isolated changes, governed promotion, and reproducible materialization for large non-code assets.

## Competitive Relevance

- lakeFS turns object storage into a repository surface without copying every branch, which makes data-lake isolation economically legible.
- The product pairs familiar Git language with data-engineering integrations such as Spark, Delta Lake, Airflow, DuckDB, dbt, Iceberg, Kafka, and cloud object stores.
- Hooks and branch protection make data quality gates part of the version-control flow instead of an external checklist.
- Managed lakeFS Cloud and Enterprise features capture organizations that want the open-source engine but do not want to operate metadata, lifecycle, and governance plumbing alone.

## Epoch Implications

- Epoch should treat large artifact history and materialization as a first-class repository concern, not an add-on for files that fit into Git.
- Server-side policy hooks are a strong precedent for signed, auditable, enforced repository transitions.
- lakeFS shows that "data stays in place" is a powerful enterprise message when privacy, egress, and existing storage investments matter.
- Epoch can differentiate by combining data, code, agent context, actor identity, signatures, and CRDT collaboration in one security-sensitive event model rather than specializing only in data lakes.

## Unknowns To Track

- How often lakeFS is used as a daily collaboration UI versus an infrastructure control plane behind pipelines.
- Whether enterprise governance features become the practical default for regulated teams.
- How customers evaluate lakeFS against table-format-native versioning in Delta Lake, Iceberg, and warehouse platforms.
