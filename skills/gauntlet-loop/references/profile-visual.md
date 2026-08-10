# Visual and multimodal profile

## When to load this file

Load this reference after `gauntlet profile select visual`, or whenever a
campaign produces or edits characters, scenes, sprites, renders, video, or
vector art. It is self-contained.

## What the profile models

The profile configuration is `assets/profiles/visual.yaml`
(`profile_id: profile:visual`). Three nodes are authoritative; every image,
video, voxel grid, or SVG is a derived view with declared losses.

| Node | Role | Purpose |
|---|---|---|
| `semantic-identity-bible` | normative | Entity ledger: stable IDs, coordinate frame, handedness, attachments, asymmetries, forbidden transforms. |
| `canonical-3d-scene` | canonical | OpenUSD scene: mesh, skeleton, blend shapes, composition. |
| `material-graph` | canonical | MaterialX material definitions. |
| `motion-program` | canonical | Key poses, joint trajectories, contacts, root motion, camera path. |
| `camera-lighting-rig` | derived | Reproducible camera/lighting configuration. |
| `turntable-sheets`, `silhouette-sheets`, `expression-pose-prop-sheets` | derived | Cross-view and per-feature comparison surfaces. |
| `render-passes` | derived | RGB/albedo/normal/depth/segmentation/ID/UV/shadow/lighting/flow/motion-vector passes. |
| `video-proposal` | derived | Generated video — a motion proposal, never the source of truth. |
| `masks-entity-tracks` | observational | Segmentation masks and persistent entity tracks. |
| `voxel-projection` | derived | Diagnostic/style occupancy projection, not the canonical character. |
| `layered-2d-scene-graph`, `vector-paths-svg`, `raster-frames` | derived | 2D layers, fitted/animated SVG, raster round-trip frames. |
| `gltf-delivery` | derived | glTF runtime export of the USD scene. |
| `editorial-timeline` | derived | OpenTimelineIO timeline referencing media by digest. |

Key transforms and what they protect:

| Transform | Protected invariants |
|---|---|
| `edge:scene-to-turntables` | Attachment side matches the ledger in every view; proportions agree across views. |
| `edge:scene-to-render-passes` | Passes are mutually consistent; segmentation uses ledger IDs. |
| `edge:identity-to-sheets` | Hair part side, prop attachment, no unqualified horizontal pixel flip. |
| `edge:motion-to-video` | Contacts and root motion match the motion program; no identity swaps. |
| `edge:scene-to-voxels` | Voxel connectivity matches mesh connectivity; silhouette comparison. |
| `edge:layers-to-vectors`, `edge:svg-to-raster` | Stable path IDs, z-order, no self-intersections, path budgets, raster round-trip at actual display scale. |

Formats are standard and produced by external tools through command
adapters: OpenUSD ([openusd.org](https://openusd.org)) for layered scenes,
glTF ([khronos.org/gltf](https://www.khronos.org/gltf/)) for delivery,
MaterialX ([materialx.org](https://materialx.org)) for materials,
OpenTimelineIO ([opentimeline.io](https://opentimeline.io)) for editorial,
SVG for vectors, and C2PA ([c2pa.org](https://c2pa.org)) for optional media
provenance. The gauntlet core never implements media algorithms.

## Evaluator templates

- `cross-view-consistency` (`evaluator:cross-view-consistency`, L3) —
  landmark and proportion agreement across turntable views plus
  depth/mask/silhouette agreement per view. Catches models that draw a
  different character per angle.
- `chirality-attachment-invariant`
  (`evaluator:chirality-attachment-invariant`, L4) — deterministic check
  that detected attachments, hair part side, and declared asymmetries match
  the ledger, and that no forbidden transform produced the view. Catches
  the naive-flip failure demonstrated in
  `assets/examples/visual-semantic-mirror/`.

Run structural evaluators first; style and preference judgments come only
after structural correctness passes.

## Pitfalls specific to this profile

- **A left-facing view is not a blind pixel flip.** A mirror confuses six
  distinct things: world direction, camera/image coordinates, skeleton
  chirality, semantic left/right IDs, prop attachments, and text/logos —
  plus intentional asymmetries (hair part, scars, patches). A naive
  horizontal pixel flip silently swaps the prop into the wrong hand and
  mirrors every logo; the ledger lists `unqualified_horizontal_pixel_flip`
  as a forbidden transform for exactly this reason.
- **Video generators are motion proposal mechanisms.** Accept a generated
  clip only when tracked landmarks agree with the motion program and the
  identity ledger; never treat the clip itself as ground truth.
- **Voxels are diagnostic projections.** Use them for occupancy,
  connectivity, and silhouette checks; do not promote them into the
  canonical character.
- **Derived representations declare losses.** Every render, sheet, track,
  or vector fit lists what it discards; a consistency check across two
  lossy views must account for both loss lists.

## Example spec fragment

```yaml
normative:
  hard_invariants:
    - prop attachments and asymmetries match the semantic identity ledger in every derived view
    - no forbidden transform appears in any derivation chain
  target_dimensions:
    - identity-consistency-score
    - cross-view-agreement
    - temporal-stability
  protected_dimensions:
    - chirality-attachment-invariants
    - silhouette-topology
    - forbidden-transform-compliance
  human_only_judgments:
    - final style and appeal sign-off
evaluators:
  hard:
    - evaluator:chirality-attachment-invariant
  deterministic:
    - evaluator:cross-view-consistency
representations:
  required_consistency_relations:
    - turntable-sheets agree with canonical-3d-scene landmarks
    - video-proposal tracks agree with motion-program contacts
```

Typical flow: `gauntlet spec init` → merge the fragment →
`gauntlet spec freeze` → `gauntlet campaign start` →
`gauntlet experiment propose/fork/run/compare` →
`gauntlet evaluate promotion` → `gauntlet promote plan/apply`.
