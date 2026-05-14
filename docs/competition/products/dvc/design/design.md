---
product: DVC
design_sources:
  - https://dvc.org/doc/user-guide/what-is-dvc
  - https://dvc.org/doc/start
  - https://dvc.org/doc/studio/user-guide/experiments/explore-ml-experiments
  - https://dvc.org/doc/user-guide/experiment-management/sharing-experiments
  - https://github.com/iterative/dvc
---

# Design

## Look And Feel

DVC's design is documentation-led and developer-native: command examples, diagrams of Git and DVC remotes, pipeline concepts, experiment rows, metrics plots, and Studio screenshots. The product experience spans CLI, repository files, IDE extension, and hosted Studio rather than one unified app shell.

## Open Design Assets

- Public docs include diagrams for remote storage, experiments, pipelines, and sharing flows.
- DVC Studio docs include screenshots for experiment tables, live metrics, plots, and branch creation from experiments.
- The core project is open source, but hosted Studio design tokens and a complete design system are not packaged as public open-design assets.

## Differentiators

- DVC's key design move is hiding large artifacts behind small, reviewable metafiles while preserving Git-based collaboration.
- Experiments are visually nested under Git commits in Studio, which clarifies that runs are derived from code states without turning every run into a permanent branch.
- The CLI and Studio share language around pushes, pulls, remotes, metrics, plots, and persistence, keeping the mental model consistent.

## What Works

- Teams can adopt DVC incrementally inside existing Git repositories.
- Human-readable metadata is friendly to code review, CI, and reproducibility audits.
- Remote storage is deliberately bring-your-own, which fits teams already using S3, GCS, Azure, SSH, NAS, or other artifact stores.
- Studio gives less CLI-heavy collaborators a way to compare metrics and plots.

## UX Breakdowns

- The workflow has several synchronization planes: Git remotes, DVC remotes, experiment refs, Studio, local cache, and optional live metrics.
- New users can confuse DVC-tracked files, Git-tracked metafiles, remote cache contents, and files visible in normal Git hosting UIs.
- Sharing many experiments can clutter Studio and Git remotes enough that docs need cleanup guidance.
- Because DVC is not a full VCS by itself, users must understand which behavior belongs to Git and which belongs to DVC.
