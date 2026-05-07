---
product: Unity Version Control
gossip_sources:
  - https://docs.unity.com/en-us/unity-version-control/release-notes/overview
  - https://docs.unity.com/en-us/unity-version-control/release-notes/11
  - https://docs.unity.com/en-us/unity-version-control/vcs-plugins/unreal-plugin
  - https://docs.unity.cn/2019.3/Documentation/Manual/plasticSCMIntegration.html
  - https://support.unity.com/hc/en-us/articles/360047453371--Unity-How-to-setup-UnityYAMLMerge-with-Plastic-SCM-
---

# Gossip

## Positive Sentiment

- UVCS is repeatedly praised in official and community material for handling large files and binary-heavy game repositories better than plain Git workflows.
- Artists benefit from Gluon-style centralized workflows, file locks, and editor-integrated check-ins.
- Programmers benefit from branches, merges, code reviews, and distributed workflows without forcing artists into the same interface.

## Complaints And Friction

- Public docs and support pages show that merge conflict resolution still requires careful setup and user education, especially for Unity scene/prefab files and external merge tools.
- Unreal plugin docs list known issues around merge conflict handling, cherry-pick or range-merge resolution, visual diff for renamed or moved assets, and unsupported features.
- Release notes show a steady stream of fixes around merge dialogs, credential prompts, tool command refresh, DNS onboarding, and merge-view behavior.
- Older Unity integration docs note that some Perforce-style remote activity statuses are unavailable in Plastic SCM integration.

## Bug Themes To Watch

- Merge and diff tool configuration across Unity, Unreal, desktop clients, and command-line clients.
- Credential and onboarding issues when cloud organizations, dashboards, and local clients meet.
- Binary merge UX, especially when a visual editor cannot resolve or display a useful diff.
- Fragmentation between legacy Plastic naming and newer Unity Version Control branding.

## Epoch Takeaways

- Binary asset collaboration needs proactive conflict prevention, not only conflict resolution.
- Semantic previews and diffs can be more important than low-level storage details for non-code reviewers.
- Role-specific workflow design is valuable, but too many clients and brand transitions can make the product feel complicated.
- Epoch should make external-tool integration explicit and testable so teams can trust repository state across editors, CLIs, and automation.
