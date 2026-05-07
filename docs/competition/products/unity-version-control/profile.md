---
product: Unity Version Control
slug: unity-version-control
category: asset_heavy_version_control
primary_sources:
  - https://docs.unity.com/en-us/unity-version-control
  - https://unity.com/features/version-control
  - https://activation.unity3d.com/how-to/redeem/version-control
  - https://docs.unity.com/en-us/unity-version-control/file-explorer
  - https://docs.unity.com/en-us/unity-version-control/code-reviews-landing
---

# Unity Version Control

Unity Version Control, previously Plastic SCM, is a version-control and source-code-management product optimized for game and real-time 3D teams. It competes with Epoch where repositories contain large binaries, scene files, generated assets, mixed artist/programmer workflows, and reviewable changes that need to work in desktop tools as well as web dashboards.

## Competitive Relevance

- UVCS explicitly serves programmers, artists, and designers in one repository.
- It supports both distributed Plastic workspaces and centralized Gluon workspaces so different disciplines can work in different modes.
- Smart Locks and lock rules target binary asset collaboration where text merge is often not enough.
- Unity Dashboard adds web repository browsing, file locks, code reviews, branches, permissions, and user/group administration.
- File explorer support includes 3D file preview and side-by-side 3D diff for common formats such as FBX, OBJ, GLB, and GLTF.

## Epoch Implications

- Epoch should treat binary and structured assets as native repository citizens instead of second-class blobs.
- Locking, preview, and semantic diff affordances matter for non-code collaborators.
- A single event model can still expose role-specific UX: CLI and distributed workflows for programmers, simpler check-in and lock flows for artists.
- Epoch's signed history can differentiate from lock-only coordination by preserving actor intent, review decisions, generated outputs, and policy events around assets.
- Repository design should support desktop, web, and SDK integrations without assuming all work happens in a code forge.

## Unknowns To Track

- How much Unity's broader business model and pricing changes affect trust in UVCS adoption.
- Whether teams outside Unity and Unreal ecosystems see UVCS as neutral enough for engine-agnostic asset management.
- How well Dashboard code reviews and 3D diffs scale for large, cross-discipline production teams.
