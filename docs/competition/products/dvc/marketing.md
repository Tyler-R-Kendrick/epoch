---
product: DVC
marketing_sources:
  - https://dvc.org/doc/user-guide/what-is-dvc
  - https://dvc.org/doc/start
  - https://dvc.org/doc/user-guide/data-management/remote-storage
  - https://dvc.org/doc/user-guide/experiment-management/sharing-experiments
  - https://www.dvc.org/
---

# Marketing

## Target Customers

- Data scientists and ML engineers who use Git but need to version datasets, models, metrics, and pipelines.
- Teams that want reproducible ML projects without moving all artifacts into a proprietary platform.
- Organizations that already have cloud or network storage and want to bring their own artifact backend.
- Practitioners who need experiment tracking and model workflows tied to code history.

## Positioning

DVC positions itself as data version control for AI, ML, and data infrastructure. The core message is that teams can manage large datasets and models alongside code while avoiding Git's large-file limits. The broader Iterative story adds Studio, live metrics, plots, model registry workflows, and collaboration around experiments.

## Customer Model

- Free open-source CLI for local and team adoption.
- Hosted or managed collaboration through DVC Studio and related Iterative services.
- Expansion through teams that need shared experiment dashboards, model registry flows, and managed collaboration beyond local Git/DVC commands.
- Storage cost and control remain with the customer's chosen remote backend.

## Captured Audiences

- Git-native ML teams that want reproducibility without a full platform migration.
- Researchers who want lightweight metadata and CLI-first workflows.
- Teams that want cloud-storage flexibility.
- Organizations that need reproducible data/model states tied to code review.

## Missed Or Under-Captured Audiences

- Non-technical data users who do not want Git, CLI, or storage configuration concepts.
- Teams that want a single integrated platform for training, registry, deployment, governance, and observability.
- Data-lake platform teams that need server-side branch protection and atomic promotion over shared object storage.
- Application teams whose artifacts include code, product state, agent actions, and signed domain events in addition to ML files.
