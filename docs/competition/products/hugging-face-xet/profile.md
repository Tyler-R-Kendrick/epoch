---
product: Hugging Face Xet
slug: hugging-face-xet
category: chunk_deduplicated_large_repo_storage
primary_sources:
  - https://huggingface.co/docs/hub/en/xet/overview
  - https://huggingface.co/docs/hub/en/storage-backends
  - https://xethub.com/blog/introducing-xethub
  - https://github.com/xetdata/xet-core
  - https://github.com/xetdata/pyxet
---

# Hugging Face Xet

Hugging Face Xet is the XetHub storage technology adopted by Hugging Face to replace Git LFS for large model and dataset repositories. It competes with Epoch where teams need Git-compatible history, deduplicated large-file storage, efficient transfer, repository browsing, and reproducible access to AI artifacts.

## Competitive Relevance

- Xet keeps Git-style repository workflows while moving large content into a chunk-deduplicated storage backend.
- Hugging Face positions Xet as a modern storage backend built for AI/ML repositories with terabyte-scale models and datasets.
- Xet deduplicates at the byte or chunk level rather than replacing whole large files for small changes, improving upload and download efficiency for checkpoints and datasets.
- XetHub's original product story emphasized large repository browsing, mounts, file previews, data profiles, GitHub integration, and access from GPU clusters.

## Epoch Implications

- Epoch should assume AI-era repositories include very large binary artifacts, model checkpoints, datasets, and generated outputs, not only source code.
- Chunk-level content addressing is a strong competitive baseline for efficient history and materialization.
- Git compatibility remains a powerful adoption channel, but it can also constrain how much the repository model can evolve.
- Epoch can differentiate by combining storage efficiency with signed actor identity, policy-rich events, and application-level collaboration semantics.

## Unknowns To Track

- How fully Hugging Face exposes Xet's original collaboration and mount experience versus using it mostly as storage infrastructure.
- Whether Xet-backed repositories reduce Git LFS pain enough for model builders without creating new support burdens.
- How storage quotas, abuse prevention, and free public model hosting constraints affect user sentiment.
