---
product: Hugging Face Xet
gossip_sources:
  - https://www.reddit.com/r/LocalLLaMA/comments/1en69nr/huggingface_acquires_xethub/
  - https://www.reddit.com/r/huggingface/comments/1gwutce/from_files_to_chunks_improving_hugging_face/
  - https://www.reddit.com/r/LocalLLaMA/comments/1je6bfq/migrating_hugging_face_repos_off_git_lfs_and_onto/
  - https://www.reddit.com/r/LocalLLaMA/comments/1o4dswr/huggingface_storage_is_no_longer_unlimited_12tb/
  - https://github.com/xetdata/xet-core
---

# Gossip

## Positive Sentiment

- Community reactions to the Hugging Face acquisition generally understood Xet as a practical answer to scaling model and dataset hosting.
- Users discussing chunk-level migration respond positively to the idea that only changed bytes need to move for large checkpoints and datasets.
- Xet's original demos around Git workflows, mounts, and large-file previews resonated with ML users who disliked Git LFS friction.

## Complaints And Friction

- Public discussions still describe Git LFS as painful, and some of that anxiety transfers to Xet because users may not know when storage behavior has changed.
- Hugging Face storage limits and abuse-prevention policies create frustration for users who thought public model hosting was effectively unlimited.
- Some community members worry that large model artifacts in Git-like repos can become expensive, slow, or inappropriate when mixed with source code.
- Standalone XetHub references are now partly historical, so users can struggle to distinguish current Hugging Face behavior from older XetHub capabilities.

## Bug Themes To Watch

- Migration edge cases from Git LFS to Xet-backed storage.
- Cache invalidation, partial download, and client compatibility issues.
- Quota, upload restriction, and public-storage policy surprises.
- Gaps between storage-level deduplication and user-facing repository explanation.

## Epoch Takeaways

- Storage efficiency needs transparent status, not just invisible backend optimization.
- Large-artifact support should be paired with explicit policy, quota, and retention UX.
- Git compatibility can win adoption, but Epoch should document which guarantees go beyond Git and LFS.
- Repository designs for AI artifacts need both efficient bytes and meaningful provenance.
