# Design Decisions And ADRs

Epoch records architectural decisions as short ADR-style documents. A decision
record should explain the context, the chosen direction, meaningful trade-offs,
and when the decision should be revisited.

## Index

| ADR | Status | Decision |
|---|---|---|
| [ADR-0001](0001-design-philosophy-and-inspiration.md) | Accepted | Keep Epoch small, event-driven, local-first, auditable, and shaped by prior DVCS/local-first systems. |
| [ADR-0002](../crdt-backend-decision.md) | Accepted | Use Collabs for operation-based CRDT entities and store Collabs messages in signed Epoch events. |
| [ADR-0003](0003-competitive-gap-design-options.md) | Accepted | Evaluate competitive gaps and outline Epoch-shaped options for collaboration objects, sync, conflict reuse, operation recovery, entity adapters, browser live state, redaction, and signed gates. |
| [ADR-0004](0004-first-class-repository-creation-and-versions.md) | Accepted | Add simple repository creation, asset-first push, and signed version materialization as first-class user stories. |
| [ADR-0005](0005-platform-core-domain-seam.md) | Accepted | Keep Epoch.Platform invariants in Core while SDK, Community, and Web consume Core contracts. |
| [ADR-0006](0006-platform-filesystem-core.md) | Accepted | Add filesystem-backed Epoch.Platform Core state, HMAC webhooks, and verified backup artifacts. |
| [ADR-0007](0007-platform-community-module.md) | Accepted | Document the now-superseded SDK-backed `Epoch.Platform.Community` module and why it existed before package extraction. |
| [ADR-0008](0008-separate-platform-web-and-community.md) | Accepted | Keep Epoch Platform Web and Epoch Community as separate package families with a descriptor-only deployment boundary. |
| [ADR-0009](0009-native-working-tree-lifecycle.md) | Accepted | Add native signed working-tree lifecycle commands, ignore rules, and TOML repository config. |
| [ADR-0010](0010-epoch-community-design-system.md) | Accepted | Give Epoch Community a product design system with tokens, repository cards, workflow navigation, and visual review coverage. |
| [ADR-0011](0011-community-web-dogfoods-epoch.md) | Accepted | Build Community Web releases through Epoch site history so the project dogfoods branch, merge, version, and rollback evidence. |
| [ADR-0012](0012-community-human-centered-design.md) | Accepted | Use design thinking, user-centric design, human-centered design, and the GitHub open-source contributor persona to drive Epoch Community design. |
| [ADR-0013](0013-community-operations-extension-package.md) | Accepted | Add Community Operations as a separate deployable extension over Platform SDK/Core state. |
| [ADR-0014](0014-virtual-working-tree-and-sparse-checkout.md) | Accepted; naming amended by 0038 | Add a virtual working tree with rolling patch aggregates and virtual-by-default init, keeping the object store fully verifiable. ADR-0038 renames this mode to `delta` because it is not sparse checkout. |
| [ADR-0015](0015-large-file-and-blob-handling-options.md) | Accepted | Evaluate large-file/blob strategies and choose content-defined chunking with signed Merkle manifests behind a storage-descriptor seam, plus chunk-range transport and entity-aware streaming, keeping blobs fully verifiable. |
| [ADR-0016](0016-entity-aware-streaming-and-targeted-checkout.md) | Accepted | Extend the virtual working tree to chunk-granular partial residency with entity-aware streaming adapters, chunk-level live editing via signed manifest deltas, and signed exclusive locks, so contributors make targeted edits without holding every file or byte. |
| [ADR-0017](0017-konsistent-structural-conventions.md) | Accepted | Adopt konsistent as an npm-managed structural-convention gate for workspace layout, using wildcard globs because dot-delimited package names defeat placeholder capture. |
| [ADR-0018](0018-blob-subsystem-reference-architecture.md) | Accepted | Consolidate ADR-0015 and ADR-0016 into one layered blob reference architecture (L0 storage descriptor through L7 availability/external-pointer) mapped onto existing code seams, operationalizing the chosen shape without committing a build sequence. |
| [ADR-0019](0019-epoch-live-browser-state-and-propagation.md) | Accepted | Design `@epoch/live` as a browser client competing with Redux and Yjs for rollback and data propagation, advancing ADR-0003 Options 2 and 6; design only, implementation deferred. |
| [ADR-0020](0020-community-federation-atproto-git-proxy.md) | Accepted (design) | Federate public Community social data via ATProto and require a Git compatibility proxy so clone URLs and live migration work while Epoch Core stays authoritative. |
| [ADR-0021](0021-git-projection-and-live-migration.md) | Accepted (design) | Treat Git as a rebuildable projection and live-migration boundary (serve, import-live, export-live, dual-run) with signed mapping events; Epoch Core remains the system of record. |
| [ADR-0022](0022-gossip-event-plane-atproto-public-artifacts.md) | Accepted | Gossip is the authoritative network event plane; ATProto dual-writes public artifacts only; hybrid resolve is local → gossip → AT. |
| [ADR-0023](0023-three-plane-identity-binding.md) | Accepted | Link Epoch Ed25519, Nostr BIP-340, and AT DIDs via mutual dual-signed hash-chained bindings; client-side verify; witness index non-authoritative. |
| [ADR-0024](0024-community-theming-deferral.md) | Accepted (amended by 0027) | Originally light-only; Community Web product UI may be dark under ADR-0027. Token layer stays role-named. |
| [ADR-0025](0025-community-unread-model.md) | Accepted | Unread is a local watermark over real receipts; a channel with no watermark is never unread; count is text, not colour-only; server push out of scope. |
| [ADR-0026](0026-community-visual-world-course-line.md) | Superseded by 0027 | Course Line (ISOM / light civic workshop) — archived; not the product visual world. |
| [ADR-0027](0027-community-visual-world.md) | Accepted | Community Web ships Community Web (Grid): CanvasUI landing, Tron/tmux-style TUI, keyboard-first board; the former renderer is not a runtime entrypoint. |
| [ADR-0028](0028-community-web-startup-and-routing.md) | Accepted | Combine resumable startup work behind Ctrl+U and keep model routes workspace-sticky for cache locality. |
| [ADR-0029](0029-community-canonical-objects-and-projections.md) | Accepted | Give Community objects stable identity, mount navigable projections over one explicit graph, separate exact navigation from fuzzy jump, and generate every action surface from one registry. |
| [ADR-0030](0030-stable-changes-revisions-stacks-reviews-merges.md) | Accepted | Separate stable Changes from immutable Revisions and bind Change Graphs, Review Bundles, and Merge Plans to exact graph state. |
| [ADR-0031](0031-durable-conflicts-and-conservative-commutation.md) | Accepted | Preserve conflicts as durable state and record commutation only after deterministic equivalence proof. |
| [ADR-0032](0032-residency-native-sync-and-workspace-providers.md) | Accepted | Keep residency, materialization, workspace storage, and execution isolation as separate truthful capabilities. |
| [ADR-0033](0033-git-v2-quarantine-and-projection-fidelity.md) | Accepted | Use protocol-v2 negotiation and quarantine while retaining Epoch authority and explicit Git fidelity. |
| [ADR-0034](0034-agent-principals-grants-and-budgets.md) | Accepted | Authorize agents through distinct principals, attenuated grants, and reserved durable budgets. |
| [ADR-0035](0035-forge-adapters-and-mirror-authority.md) | Accepted | Treat forge protocols and mirrors as loss-declared adapters with explicit authority. |
| [ADR-0036](0036-swhids-and-software-heritage-archival.md) | Accepted | Compute standards-conformant SWHIDs locally and guard public archival with policy and verified status. |
| [ADR-0049](0049-community-runtime-command-layer.md) | Accepted | Serve web, WebMCP, CLI, and SDK from one command bus, one receipt schema, and one browser UI workspace behind a content-addressed harness ABI. |
| [ADR-0050](0050-command-livestream-privacy.md) | Accepted | Livestreams carry sanitized command envelopes; spectators replay them in their own view; protected inputs and ignore/rewrite files fail closed. |
| [ADR-0051](0051-change-based-review-publish.md) | Accepted | Change-based review publish is the default: `Change-Id` trailer, `refs/for/<target>`, topic/hashtag/WIP — not a Gerrit mode flag. |
| [ADR-0052](0052-model-based-and-coverage-guided-fuzzing.md) | Accepted | Three fuzz lanes: deterministic smoke (PR), fast-check history/properties with shrinking, Jazzer.js parsers with versioned corpora; Maelstrom deferred. |
| [ADR-0053](0053-openzl-host-entropy-codec.md) | Accepted | OpenZL host entropy codec for entity-aware blob/artifact and changediff compression; plaintext SHA-256 identity unchanged. |
| [ADR-0054](0054-nats-realtime-fabric.md) | Accepted | Host nats-server (JetStream + WebSocket) with complementary Epoch auth callout (opaque fabric credentials + scoped ACLs); nats.ws clients; dumb Live fan-out; posture-gated intra-community service discovery. |
| [ADR-0055](0055-trust-posture-modes-and-federation-topology.md) | Proposed | Trust posture modes (hosted / private / open-default) with XMPP s2s inter-node transport, intra-community NATS, ADR-0023 identity authority, and gated experimental acceptance. |
| [ADR-0056](0056-anti-slop-oxlint.md) | Accepted | Vendor anti-slop as Oxlint JS-plugin rules; required in `gate:fast` and CI Lint alongside ESLint. |
| [ADR-0057](0057-community-channel-nav-presence-badges.md) | Accepted | Channel nav badges count active members from declared presence and live `channel.presence` events — never subscriber counts — with targeted DOM repaints. |
| [ADR-0030](0030-stable-changes-revisions-stacks-reviews-merges.md) | Accepted and implemented | Model stable Change lineages, immutable Revisions, dependency graphs, exact review evidence, and stale-safe Merge Plans. |
| [ADR-0031](0031-durable-conflicts-and-conservative-commutation.md) | Accepted and implemented | Preserve conflicts as durable objects, commute only when independence is proven, and keep provider proposals untrusted until explicit acceptance. |
| [ADR-0032](0032-residency-native-sync-and-workspace-providers.md) | Accepted and implemented | Separate object residency, materialization, storage, and execution; add verified chunk manifests, promises, native sync, and truthful workspace providers. |
| [ADR-0033](0033-git-v2-quarantine-and-projection-fidelity.md) | Accepted and implemented as a bounded profile | Project deterministic Git objects, quarantine receives, propagate validated protocol-v2 metadata, and report unsupported/lossy semantics. |
| [ADR-0034](0034-agent-principals-grants-and-budgets.md) | Accepted and implemented with injected durability | Give human and agent principals attenuated grants, transactional budgets, receipts, and non-authoritative provider boundaries. |
| [ADR-0035](0035-forge-adapters-and-mirror-authority.md) | Accepted and implemented as codecs plus an injected coordinator | Provide public-only loss-aware forge codecs and explicit mirror authority, drift, SSRF, idempotency, and pause contracts. |
| [ADR-0036](0036-swhids-and-software-heritage-archival.md) | Accepted and implemented with injected transport; CLI default HTTP adapter | Compute and inspect SWHIDs locally and request public archival through Save Code Now. The library client stays injected; the CLI ships HTTP with `EPOCH_SWH_SAVE_URL` override. |
| [ADR-0037](0037-extension-mechanism-and-capability-registry.md) | Accepted (design); staged implementation | Extend Epoch through declared, trust-gated external `epoch-*` subcommands and a typed capability registry, with provider provenance recorded in signed state. |
| [ADR-0038](0038-semantic-diff-merge-and-compression.md) | Accepted (design); staged implementation | Share one bytes-to-entities representation ladder across diff, merge, conflict identity, and storage, keyed by structural path. |
| [ADR-0039](0039-native-capabilities-from-the-git-extension-ecosystem.md) | Accepted (design); staged implementation | Adopt the Git extension ecosystem's capabilities natively where Epoch's model already implies them, keep language/vendor adapters as extensions, and reject content-filter encryption. |
| [ADR-0040](0040-repository-composition-and-links.md) | Accepted and implemented for exact read-only links | Embed independently owned repositories through one exact, read-only Repository Link; treat subtree/subrepo as owned files plus provenance and a Projection; make cross-repository work dependency-linked rather than falsely atomic. |
| [ADR-0041](0041-workspace-selection-and-materialization-modes.md) | Accepted and implemented; `lazy` behaves like `explicit` | Add workspace-local Selection, name the four materialization modes (`eager`, `explicit`, `lazy`, `delta`), replace whole-namespace metadata with a content-addressed Namespace Manifest, and compose Selection across Repository Links. |
| [ADR-0042](0042-deterministic-search-and-mounted-projections.md) | Accepted | Compile text and GraphQL into one authorized Search Expression, execute against explicit snapshots, and compose declarative Projection Definitions through scoped Namespace Mounts. |
| [ADR-0043](0043-spaces-shared-signed-workspaces.md) | Accepted; phases 1–3 implemented | Add `epoch.space/v1`, a signed joinable object composing View, Workspaces, conversation, Principals/Grants/Budgets, and per-turn Sandbox bindings, with consent-gated capture sessions and structural anchors. |
| [ADR-0044](0044-verified-launch-and-platform-execution-contract.md) | Accepted; implemented | Execute the descriptor whose bytes were digested where the platform allows, and launch Windows `.cmd`/`.bat` extensions through an explicitly quoted interpreter rather than a shell flag. |
| [ADR-0045](0045-sandboxed-capability-providers.md) | Accepted; implemented for `syntax` | Ship Tier 2 capability providers as import-free WebAssembly modules, so a provider that shapes signed evidence is deterministic and holds no ambient authority. |
| [ADR-0046](0046-publisher-key-lifecycle.md) | Accepted; implemented | Give publisher keys expiry, offline rotation by successor statement, and revocation as a replicating signed event — grants stay local, revocations propagate. |
| [ADR-0047](0047-mixed-language-compression-planning.md) | Accepted; implemented | Group compression planning by resolved syntax provider and derive one dictionary across every group, so `semantic plan` works on a real repository. |
| [ADR-0048](0048-repository-configuration-parsing.md) | Accepted; implemented | Read complete TOML 1.0 for repository configuration and report parse failures to the operator instead of silently resolving to defaults. |
| [ADR-0049](0049-community-runtime-command-layer.md) | Accepted; runtime, adapters, and browser UI workspace implemented | Route UI, WebMCP, CLI, and SDK through `@epoch/community-runtime`; validate declarative dynamic UI against a content-addressed static harness; keep rollback append-only. |
| [ADR-0050](0050-command-livestream-privacy.md) | Accepted; policy engine and board adapter implemented | Livestreams carry sanitized command envelopes; spectators replay them in their own view; protected inputs and ignore/rewrite files fail closed. |
| [ADR-0051](0051-change-based-review-publish.md) | Accepted; protocol, store, CLI, and Git projection implemented | Change-based review publish is the default native capability; Git speaks Gerrit dialect without a mode flag. |
| [ADR-0052](0052-model-based-and-coverage-guided-fuzzing.md) | Accepted | Three fuzz lanes: deterministic smoke (PR), fast-check history/properties with shrinking, Jazzer.js parsers with versioned corpora; Maelstrom deferred. |

## Supporting Decision Records

| Document | Purpose |
|---|---|
| [Dependency Exceptions](../dependency-exceptions.md) | Documents reviewed dependency overrides, including the protobuf override required by the Collabs backend. |

## Adding A Decision

New design decisions should:

- use the next `ADR-NNNN` number;
- include status, context, decision, consequences, and revisit criteria;
- link related feature coverage or implementation docs; and
- be added to this index.
