---
product: DVC
slug: dvc
category: ml_data_version_control
primary_sources:
  - https://dvc.org/doc/user-guide/what-is-dvc
  - https://dvc.org/doc/start
  - https://dvc.org/doc/user-guide/data-management/remote-storage
  - https://dvc.org/doc/user-guide/experiment-management/sharing-experiments
  - https://github.com/iterative/dvc
---

# DVC

DVC is an open-source tool for versioning datasets, models, ML pipelines, metrics, and experiments beside source code. It competes with Epoch where teams need reproducible artifact history, large-file coordination, pipeline state, and collaboration without leaving Git-centered development workflows.

## Competitive Relevance

- DVC codifies large data and model artifacts as lightweight metafiles committed to Git while the actual artifacts live in remote storage.
- The CLI, VS Code extension, and DVC Studio connect artifact versioning to experiment tracking and model workflows.
- Experiment refs allow teams to share experimental code, metrics, plots, and cached data without permanently cluttering normal Git history.
- DVC's "Git for data" framing captures ML practitioners who already trust Git but cannot store datasets and checkpoints directly in it.

## Epoch Implications

- Epoch should make artifact pointers, materialized content, and provenance inspectable without requiring users to mentally join Git metadata and separate storage state.
- DVC shows the value of human-readable metadata files that make reproducibility reviewable in ordinary code review.
- Epoch can differentiate by making the repository event model itself own signed identity, history, storage references, and collaboration semantics rather than delegating core history to Git refs.
- Experiment workflows are a useful precedent for temporary or exploratory history that can later be promoted into durable branches.

## Unknowns To Track

- How DVC's role changes after lakeFS acquired DVC and the two "Git for data" stories converge.
- Whether DVC Studio becomes the collaboration default or remains optional around a CLI-first workflow.
- How teams manage conceptual overhead when DVC, Git, remote storage, CI, experiment tracking, and model registries all participate in one workflow.
