---
product: OCI Registry / ORAS
marketing_sources:
  - https://github.com/opencontainers/distribution-spec
  - https://github.com/opencontainers/image-spec
  - https://oras.land/
  - https://github.com/oras-project/oras
  - https://github.com/containers/image
---

# Marketing

OCI and ORAS are open specifications and open-source tooling, so their "marketing" is an ecosystem and positioning narrative carried by the OCI specs, the ORAS project, and the registries (Docker Hub, GHCR, ECR, Harbor, Zot) that implement the distribution API.

## Target Customers

- Teams already running container registries who want to store non-image artifacts (Helm charts, models, datasets, SBOMs, WASM modules) in the same place.
- Platform and infrastructure teams wanting a content-addressed artifact store on infrastructure they already operate.
- Supply-chain and CI/CD pipelines that push and pull build artifacts by digest for reproducibility.
- Cloud-native ecosystems (Kubernetes and adjacent tooling) where OCI registries are the default distribution substrate.

## Positioning

OCI is positioned as the vendor-neutral standard for content-addressed distribution: one registry API, any registry vendor, with content named by digest so pulls are reproducible. ORAS extends the positioning from container images to "OCI Registry As Storage" — any artifact, any OCI registry — making the registry a general-purpose content-addressed store. zstd:chunked frames the model as efficient even at chunk granularity.

## Customer Model

- Adoption is standards- and open-source-led; the value is the spec and the installed base, not a single hosted service.
- Because the distribution API is ubiquitous, distribution rides on registries teams already run, cloud-managed or self-hosted.
- ORAS lowers the barrier to storing arbitrary artifacts, broadening registries beyond containers.
- Signing (cosign/Notation) and scanning are adjacent products layered on top rather than part of the registry itself.

## Captures

- Artifact distribution where content addressing and reproducible pull-by-digest matter.
- Teams wanting to reuse existing registry infrastructure for non-image bytes.
- Cloud-native and supply-chain workflows already standardized on OCI.
- Large-layer delivery that benefits from Range GET, resumable transfer, and zstd:chunked partial pulls.

## Misses

- Version control: registries store artifacts, not branching history or authorship.
- Intrinsic authenticity: signing is a separate system, so the registry alone does not answer "who made this."
- Guaranteed availability: unreferenced blobs may be garbage-collected by operator policy.
- Local-first self-containment: a clone that points at a registry is not complete on its own.
