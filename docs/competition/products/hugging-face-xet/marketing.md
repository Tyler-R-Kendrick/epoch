---
product: Hugging Face Xet
marketing_sources:
  - https://huggingface.co/docs/hub/en/xet/overview
  - https://huggingface.co/docs/hub/en/storage-backends
  - https://xethub.com/blog/introducing-xethub
  - https://xethub.com/blog/xetdata-scale-github-repos-100-tb
  - https://xethub.com/archive/product/discover/access-anything
---

# Marketing

## Target Customers

- AI model and dataset publishers who need to host large binary artifacts.
- ML teams frustrated by Git LFS transfer costs, whole-file replacement, and slow repeated checkpoint uploads.
- Hugging Face Hub users who want large-file handling to stay inside familiar repository workflows.
- Infrastructure teams that need efficient, deduplicated access to data from local machines, CI, and GPU clusters.

## Positioning

Xet is positioned as modern storage for AI/ML repositories: Git-compatible, large-scale, chunk-deduplicated, and optimized for models and datasets. XetHub's historical positioning was "scale Git" and "store like S3, branch like Git." Hugging Face's current positioning is more platform-native: Xet is the Hub storage backend that improves on Git LFS while preserving familiar repository behavior.

## Customer Model

- XetHub was a standalone startup with hosted repository and GitHub-integration ambitions.
- Hugging Face acquired XetHub in 2024 and folded Xet into Hub storage infrastructure.
- Capture now happens through Hugging Face Hub usage, model/dataset hosting, enterprise Hub features, storage policies, and platform loyalty.
- Open-source client components remain available through xet-core and related repositories.

## Captured Audiences

- Model builders who need to publish and update very large artifacts.
- Dataset maintainers whose files change incrementally.
- Hub users who want repository UX without managing storage backends themselves.
- Teams that value compatibility with Git and existing Hub APIs.

## Missed Or Under-Captured Audiences

- Teams outside the Hugging Face ecosystem that want vendor-neutral repository governance.
- Organizations that need signed domain events, branch policies, or review semantics over large artifacts.
- Users who need semantic model or dataset diffs rather than efficient byte transfer.
- Companies with strict data-residency or private-storage requirements that cannot rely on public Hub workflows.
