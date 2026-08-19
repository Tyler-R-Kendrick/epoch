# Epoch Documentation

This index is the wiki landing page for repository documentation. Start here
when you need to understand the product, architecture, public APIs, design
decisions, operations, or contribution workflow.

## Product And Requirements

| Document | Use it for |
|---|---|
| [Feature Registry](features.md) | Implemented feature IDs, behavior, and executable coverage links. |
| [Executable Feature Scenario Inventory](feature-scenario-inventory.md) | Scenario-level records for every executable Gherkin scenario, persona tag, rule context, and examples count. |
| [User Stories](user-stories.md) | Persona-oriented workflows supported by the current prototype, including platform conformance flows. |
| [Community Human-Centered Design](community-human-centered-design.md) | Design thinking, personas (adversarial critics), craft/playfulness/wonder bar, DESIGN.md adherence, pain points, and human considerations for Epoch Community. |
| [Community Web Experience](community-web-experience.md) | Channel-first Community Web behavior, personas, browser evidence, and selected-message signed actions. |
| [Community Web As An Epoch Participant](community-web-epoch-integration.md) | Verified integration audit, the shared command/receipt layer, the static harness and dynamic UI contract, and the remaining workstreams. |
| [Change Graph And Operation History](change-graph.md) | Stable Changes, immutable Revisions, Review Bundles, Merge Plans, conflicts, interoperability, and honest gaps. |
| [Epoch Nomenclature](nomenclature.md) | Normative vocabulary and boundaries used across Protocol, Core, CLI, SDK, Community, and Operations. |
| [Community Search And Projections](community-search-projections.md) | Typed cross-source search, snapshots, GraphQL, Projection Definitions, Namespace Mounts, browser backends, migration, and recovery. |
| [Workspace Providers](workspace-providers.md) | Truthful residency, materialization, copy mode, and execution-isolation boundaries. |
| [Native Sync And Resolution](resolver-sync.md) | Filtered sync, promises, verification, deterministic conflict resolution, and provider trust. |
| [OpenZL Host Entropy Codec](openzl.md) | Entity-aware OpenZL compression for blobs/artifacts and changediffs (`@epoch/openzl`). |
| [NATS Realtime Fabric](nats.md) | Host NATS JetStream/WebSocket, complementary auth callout, host-side JWT issuance, Live/platform/community streams, and posture-gated `epoch.svc.>` discovery (`@epoch/nats`). |
| [Testing Lanes](testing-lanes.md) | Honest inventory: unit, Cucumber, Pact, chaos, fuzz, NATS/Protocol mutant kill, and Verify-style goldens. |
| [Protocol Experiments](protocol-experiments.md) | E01–E16 gated registry, rejected-protocol ledger, standing Production ship: (none yet). |
| [XMPP s2s Profile](xmpp-profile.md) | Loss-declared `@epoch/xmpp` FederationTransport, XEP profile, and fidelity statement. |
| [Exit And Migration](exit-and-migration.md) | `epoch-exit/v1` export, import, and community migration with binding continuity. |
| [Repository Composition And Workspace Selection](repository-composition-and-selection.md) | The model for nested repositories, vendored source, monorepo scale, and partial workspaces: Repository Links, Selection, materialization modes, and the Namespace Manifest. |
| [Forge And Mirror Adapters](forge-adapters.md) | Authority, fidelity, loss, mirror safety, and federation codec boundaries. |
| [Community Web Content Design](community-web-content-design.md) | Voice, microcopy, and empty/loading/error state-copy rules for Community surfaces — the written half of DESIGN.md. |
| [Design Critique Record](evidence/design-critique/README.md) | Both adversarial critique rounds against Community Web, the findings worked, measured before/after, and the residual list. |
| [Community Web Competitive Evaluation](community-web-competitive-evaluation.md) | Scored compare/contrast vs GitHub and Tangled; wedge vs overall outcompete assessment. |
| [Identity Bridge](identity-bridge.md) | Nostr ↔ ATProto mutual identity binding (v2); pure verifier; witness index. |
| [Persona Feature Matrix](persona-feature-matrix.md) | Persona, journey, pain point, trust, degraded-state, and validation mapping for every executable feature spec. |
| [Create Repository And Version Materialization Spec](create-repository-and-version-materialization.md) | Implemented create, push, version, and materialization user stories. |
| [Specification Template Outline](spec-template-outline.md) | Reusable outline extracted from a conformance-grade app spec. |
| [Epoch.Platform Specification](epoch-platform-spec.md) | Draft product and system spec for a self-hostable Epoch platform. |
| [Epoch Live Specification](epoch-live-spec.md) | Design-only spec for `@epoch/live`, a browser client positioned as a direct competitor to Redux and Yjs for rollback and data propagation. |
| [Community Operations Extension](community-operations.md) | Product and API reference for the separate sandbox workspace, hosted-app, workflow, runner, and agent-sandbox operations package. |
| [Samples](../samples/README.md) | Runnable minimal integrations for Epoch browser, Node backend, and repository workflows. |
| [Notebooks](../notebooks/README.md) | Executable Node.js notebook examples for Epoch usage scenarios with stored results and output explanations. |
| [Competition Research](competition/README.md) | Parseable competitor dossiers across design, features, marketing, and public sentiment. |
| [Change Graph And Operation-History Dossier](competition/change-graph-vcs-dossier.md) | Primary-source comparison led by direct competitor Zed DeltaDB, then jj, Pijul/Darcs, Graphite, GitButler, Git, forge adapters, and Software Heritage. |
| [Delta Workspace Convergence Analysis](competition/delta-workspace-convergence.md) | What Zed shipped in Delta and DeltaDB, the virtualized-worktree claim separated from any copy-on-write mechanism, every Delta concept mapped onto a named Epoch primitive, and the sequenced response. |
| [Product Record](../PRODUCT.md) | Durable product truth — users (ranked), purpose, positioning, operating context, capabilities, constraints, and what must not be fabricated. Written by `impeccable init`; the input every design decision is checked against. |
| [Community Web App Reference](community-web/README.md) | The one Community Web application ([ADR-0027](design-decisions/0027-community-visual-world.md)), built from `packages/Epoch.Community.Web`: CanvasUI creator landing at `/`, Tron/tmux-style keyboard-first board at `board.html`. Evidence under [`evidence/community-web-app/`](evidence/community-web-app/README.md). |
| [Community Web Navigation/Projection Parity](evidence/community-web-app-navigation-projection-parity/README.md) | Executable evidence for stable object identity, mounted projections, explicit graph navigation, route restoration, shared actions, and APG feed/tree/combobox behavior. |
| [Community Search/Projection Evidence](evidence/community-search-projection/README.md) | Status-indexed conformance, privacy, browser persistence, performance, and adversarial critique evidence; pending items are not pass claims. |
| [Ten Directions (2026 redesign)](design-explorations/redesign-2026/README.md) | Ten candidate replacement design worlds for the product family, each a different information architecture, with a runtime picker for side-by-side review. |
| [Design Explorations](design-explorations/00-foundation.md) | Ten candidate successor-experience design loops (philosophy, design system, hardened mockup, screenshot evidence) with the shared persona foundation and distinctness ledger. |
| [Cucumber Feature Specs](../features/) | Executable Gherkin scenarios for repository, CLI, WASM, React, merge, actor, CRDT, view, HA/DR, and platform behavior. |

## Competition Additions

| Product | Profile | Design | Feature | Marketing | Gossip |
|---|---|---|---|---|---|
| Delta | [Profile](competition/products/delta/profile.md) | [Design](competition/products/delta/design/design.md) | [Feature](competition/products/delta/features/joinable-agent-workspace.feature) | [Marketing](competition/products/delta/marketing.md) | [Gossip](competition/products/delta/gossip.md) |
| Tangled | [Profile](competition/products/tangled/profile.md) | [Design](competition/products/tangled/design/design.md) | [Feature](competition/products/tangled/features/atproto-social-coding.feature) | [Marketing](competition/products/tangled/marketing.md) | [Gossip](competition/products/tangled/gossip.md) |
| Rork | [Profile](competition/products/rork/profile.md) | [Design](competition/products/rork/design/design.md) | [Feature](competition/products/rork/features/mobile-app-store-launch.feature) | [Marketing](competition/products/rork/marketing.md) | [Gossip](competition/products/rork/gossip.md) |
| Magic Patterns | [Profile](competition/products/magic-patterns/profile.md) | [Design](competition/products/magic-patterns/design/design.md) | [Feature](competition/products/magic-patterns/features/design-system-prototype.feature) | [Marketing](competition/products/magic-patterns/marketing.md) | [Gossip](competition/products/magic-patterns/gossip.md) |
| Framer AI | [Profile](competition/products/framer-ai/profile.md) | [Design](competition/products/framer-ai/design/design.md) | [Feature](competition/products/framer-ai/features/ai-marketing-site-workflow.feature) | [Marketing](competition/products/framer-ai/marketing.md) | [Gossip](competition/products/framer-ai/gossip.md) |

## Architecture And Public APIs

| Document | Use it for |
|---|---|
| [Current Design](design.md) | Current architecture, event model, sync, policy, CRDT surfaces, hooks, actors, and non-goals. |
| [Change Graph And Operation History](change-graph.md) | Shipped stable Change/Revision graphs, explicit transactions, conflicts, storage, sync, Git/forge interoperability, authority, and honest capability boundaries. |
| [Object Resolver And Native Sync](resolver-sync.md) | Storage descriptors, promises, verified hydration, `epoch.sync/v2`, bounded commands, and recovery behavior. |
| [Workspace Providers](workspace-providers.md) | Separate residency, materialization, storage, and execution capabilities for memory, filesystem, browser, and opt-in Rift launch. |
| [Forge Adapters And Mirror Authority](forge-adapters.md) | Public-only loss-aware codecs, explicit mirror authority, drift handling, SSRF controls, and escape paths. |
| [Extensions And Capability Providers](extensions.md) | External `epoch-*` subcommands, manifests, trust policy, the typed capability registry, deterministic resolution, and recorded provenance. |
| [Semantic Content Pipeline](semantic-pipeline.md) | Structural diff, structural patches, three-way structural merge, path-scoped conflicts, and semantic compression. |
| [Blob And Large-File Gap Analysis](blob-large-file-gap-analysis.md) | Competitive capability matrix and residual gaps behind Epoch's large-file direction, feeding the ADR-0018 reference architecture. |
| [Visual Design System](../DESIGN.md) | Epoch Community visual tokens, component rules, accessibility guardrails, and design-system sidecar guidance. |
| [CLI Reference](cli.md) | Source checkout commands, `epoch` shorthand, `epoch-git`, global linking, and command groups. |
| [Git Compatibility Proxy](git-compatibility-proxy.md) | Git façade for ATProto/forge interop and live migration; Epoch remains authoritative (ADR-0020/0021). |
| [Git Live Migration Cutover](git-live-migration-cutover.md) | Operator cutover recipe for import-live / export-live / dual-run and `epoch-git serve`. |
| [Community ATProto](community-atproto.md) | Federated Community modes, mock PDS, lexicons, Epoch-native lexicons. |
| [Pact Contracts](pact-contracts.md) | Official Pact consumer/provider contracts for HTTP service boundaries. |
| [Core SDK Reference](sdk.md) | Repository lifecycle, async actor API, CRDT operations, React integration, hooks, sync, and Git-compatible core surfaces. |
| [Platform Core And SDK APIs](sdk.md) | Repository lifecycle, async actor API, CRDT operations, React integration, hooks, sync, Git-compatible core surfaces, and `Epoch.Platform.Core` / `Epoch.Platform.Sdk` APIs. |
| [Platform Packages](platforms.md) | Separate `Epoch.Platform.Web`, `Epoch.Community.*`, and Community Operations package responsibilities and integration boundary. |
| [HA/DR Runbook](HA-DR.md) | Compacts, seed bootstrap, cold backups, and disaster recovery operator flow. |
| [Documentation Freshness Policy](documentation-freshness.md) | Required docs update matrix, no-orphan rules, and docs check command. |

## Design Decisions And ADRs

| Document | Use it for |
|---|---|
| [Design Decisions Index](design-decisions/README.md) | ADR index and decision-record conventions. |
| [ADR-0001: Design Philosophy And Inspiration](design-decisions/0001-design-philosophy-and-inspiration.md) | Project principles and the research systems that shaped Epoch. |
| [ADR-0003: Competitive Gap Design Options](design-decisions/0003-competitive-gap-design-options.md) | Competitive gaps and proposed Epoch-shaped design options. |
| [ADR-0002: CRDT Backend Selection](crdt-backend-decision.md) | Collabs versus Automerge measurement and backend decision. |
| [ADR-0004: First-Class Repository Creation And Versions](design-decisions/0004-first-class-repository-creation-and-versions.md) | Accepted direction for simple repository creation, asset push, and signed versions. |
| [ADR-0005: Platform Core Domain Seam](design-decisions/0005-platform-core-domain-seam.md) | Keep Epoch.Platform invariants in Core while SDK, Community, and Web consume Core contracts. |
| [ADR-0006: Platform Filesystem Core](design-decisions/0006-platform-filesystem-core.md) | Add filesystem-backed Epoch.Platform Core state, HMAC webhooks, and verified backup artifacts. |
| [ADR-0007: Platform Community Module](design-decisions/0007-platform-community-module.md) | Historical record for the SDK-backed Community module before extraction into dedicated packages. |
| [ADR-0008: Separate Platform Web And Community Apps](design-decisions/0008-separate-platform-web-and-community.md) | Keeps hosting operations and community collaboration in separate web-app packages. |
| [ADR-0009: Native Working Tree Lifecycle](design-decisions/0009-native-working-tree-lifecycle.md) | Adds native signed working-tree lifecycle commands, ignore rules, and TOML repository config. |
| [ADR-0010: Epoch Community Design System](design-decisions/0010-epoch-community-design-system.md) | Defines Community Web visual tokens, component rules, and review coverage. |
| [ADR-0011: Community Web Dogfoods Epoch](design-decisions/0011-community-web-dogfoods-epoch.md) | Builds Community Web releases through signed Epoch site history. |
| [ADR-0012: Design Thinking And Human-Centered Design For Epoch Community](design-decisions/0012-community-human-centered-design.md) | Makes design thinking, user-centric design, human-centered design, and the GitHub open-source contributor persona the default method for Community work. |
| [ADR-0013: Community Operations Extension Package](design-decisions/0013-community-operations-extension-package.md) | Keeps Coolify-inspired project operations in a separate deployable extension over Platform SDK/Core state. |
| [ADR-0014: Virtual Working Tree And Sparse Checkout](design-decisions/0014-virtual-working-tree-and-sparse-checkout.md) | Adds a virtual working tree with sparse checkout, rolling patch aggregates, and virtual-by-default init. |
| [ADR-0015: Large-File And Blob Handling Options](design-decisions/0015-large-file-and-blob-handling-options.md) | Content-defined chunking with signed Merkle manifests behind a storage-descriptor seam. |
| [ADR-0016: Entity-Aware Streaming And Targeted Checkout](design-decisions/0016-entity-aware-streaming-and-targeted-checkout.md) | Chunk-granular partial residency, entity-aware streaming, and signed exclusive locks. |
| [ADR-0017: Konsistent Structural Conventions](design-decisions/0017-konsistent-structural-conventions.md) | Adopts konsistent as an npm-managed structural-convention gate for workspace layout. |
| [ADR-0018: Blob Subsystem Reference Architecture](design-decisions/0018-blob-subsystem-reference-architecture.md) | Consolidates ADR-0015/0016 into one layered blob reference architecture mapped onto existing code seams. |
| [ADR-0019: Epoch Live Browser State And Propagation](design-decisions/0019-epoch-live-browser-state-and-propagation.md) | Designs `@epoch/live` as a browser client competing with Redux and Yjs for rollback and data propagation, advancing ADR-0003 Options 2 and 6. |
| [ADR-0026: Community Visual World Course Line](design-decisions/0026-community-visual-world-course-line.md) | Superseded by ADR-0027 — light civic-workshop / ISOM world, archived. |
| [ADR-0027: Community Visual World Community Web](design-decisions/0027-community-visual-world.md) | Makes Community Web (Grid) the canonical Community Web runtime and deployment. |
| [ADR-0028: Recoverable Community Web Startup And Sticky Routing](design-decisions/0028-community-web-startup-and-routing.md) | Defines the Ctrl+U restart inbox and workspace route affinity. |
| [ADR-0029: Community Canonical Objects, Mounted Projections, And Explicit Navigation](design-decisions/0029-community-canonical-objects-and-projections.md) | Defines stable object IDs, mounted projections, explicit graph and navigation operations, private-safe links, Projection Definitions, one action registry, and APG interaction contracts. |
| [ADR-0030: Stable Changes, Revisions, Change Graphs, Reviews, And Merges](design-decisions/0030-stable-changes-revisions-stacks-reviews-merges.md) | Defines stable lineages, immutable Revisions, dependency graphs, exact Review Bundles, and stale-safe Merge Plans. |
| [ADR-0031: Durable Conflicts And Conservative Commutation](design-decisions/0031-durable-conflicts-and-conservative-commutation.md) | Makes conflicts durable, commutation proof-based, and provider proposals explicitly non-authoritative. |
| [ADR-0032: Residency, Native Sync, And Workspace Providers](design-decisions/0032-residency-native-sync-and-workspace-providers.md) | Separates residency/materialization/storage/execution and defines chunk manifests, promises, sync v2, and truthful providers. |
| [ADR-0033: Git v2, Quarantine, And Projection Fidelity](design-decisions/0033-git-v2-quarantine-and-projection-fidelity.md) | Defines deterministic Git projection, quarantine receive, a bounded v2 profile, and explicit fidelity/loss reporting. |
| [ADR-0034: Agent Principals, Grants, And Budgets](design-decisions/0034-agent-principals-grants-and-budgets.md) | Defines attenuated agent authority, transactional budgets, receipts, and injected persistence boundaries. |
| [ADR-0035: Forge Adapters And Mirror Authority](design-decisions/0035-forge-adapters-and-mirror-authority.md) | Defines public-only forge codecs and explicit mirror authority, drift, SSRF, idempotency, and pause behavior. |
| [ADR-0036: SWHIDs And Software Heritage Archival](design-decisions/0036-swhids-and-software-heritage-archival.md) | Defines browser-safe SWHIDs and injected, verified public archival requests. |
| [ADR-0037: Extension Mechanism And Capability Registry](design-decisions/0037-extension-mechanism-and-capability-registry.md) | Defines external `epoch-*` subcommands with manifests and trust policy, a typed capability registry, deterministic resolution, and mandatory provider provenance. |
| [ADR-0038: Semantic Diff, Merge, And Compression](design-decisions/0038-semantic-diff-merge-and-compression.md) | Defines the bytes-to-entities representation ladder, structural patches, structural merge with commutative containers, and syntax-guided storage. |
| [ADR-0039: Native Capabilities From The Git Extension Ecosystem](design-decisions/0039-native-capabilities-from-the-git-extension-ecosystem.md) | Sorts the Git extension ecosystem into native capabilities, genuine extensions, and deliberate non-goals. |
| [ADR-0040: Repository Composition And Repository Links](design-decisions/0040-repository-composition-and-links.md) | Defines one exact read-only Repository Link, vendorize-plus-provenance instead of a native subtree type, and repository-qualified Change dependencies. |
| [ADR-0041: Workspace Selection And Materialization Modes](design-decisions/0041-workspace-selection-and-materialization-modes.md) | Defines workspace-local Selection, the `eager`/`explicit`/`lazy`/`delta` materialization modes, and the content-addressed Namespace Manifest. |
| [ADR-0042: Deterministic Search And Mounted Projections](design-decisions/0042-deterministic-search-and-mounted-projections.md) | Makes Core search semantics authoritative, composes declarative Projection Definitions through scoped Namespace Mounts, and selects optional browser accelerators. |
| [ADR-0043: Spaces — Shared, Signed, Joinable Workspaces](design-decisions/0043-spaces-shared-signed-workspaces.md) | `epoch.space/v1`: a joinable object composing View, Workspaces, conversation, authority, and per-turn Sandbox bindings; what a Space is not; and which phases shipped. |
| [ADR-0044: Verified Launch And Platform Execution Contract](design-decisions/0044-verified-launch-and-platform-execution-contract.md) | Closes the check-to-exec race on Linux and macOS by executing an open descriptor, and defines a Windows launch contract that refuses arguments it cannot quote safely. |
| [ADR-0045: Sandboxed Capability Providers](design-decisions/0045-sandboxed-capability-providers.md) | Fills the empty Tier 2 provider seam with a WASM ABI: one host-owned memory import, a memory ceiling the engine enforces, content-addressed modules, and trust inherited from the existing manifest mechanism. |
| [ADR-0046: Publisher Key Lifecycle](design-decisions/0046-publisher-key-lifecycle.md) | Adds a lifecycle to `signed` trust: signatures can expire, keys rotate via statements signed by the retiring key, and revocations sync because they only ever remove authority. |
| [ADR-0047: Mixed-Language Compression Planning](design-decisions/0047-mixed-language-compression-planning.md) | Replaces the single-provider restriction in `semantic plan` with per-provider groups, a cross-language dictionary, provider-scoped dedup keys, and reported unplanned files. |
| [ADR-0048: Repository Configuration Parsing](design-decisions/0048-repository-configuration-parsing.md) | Replaces the subset config reader that rejects valid TOML and silently mis-parses multi-line strings, and stops a config parse failure from quietly dropping a hand-written extension `block`. |
| [ADR-0049: One Community Command Layer](design-decisions/0049-community-runtime-command-layer.md) | Makes one command bus, receipt schema, browser UI workspace, and static harness ABI serve web, WebMCP, CLI, and SDK. |
| [ADR-0050: Command Livestream Privacy](design-decisions/0050-command-livestream-privacy.md) | Livestreams are sanitized command logs, not pixels; spectators replay them in their own theme; ignore/rewrite files and protected inputs fail closed. |
| [ADR-0051: Change-Based Review Publish](design-decisions/0051-change-based-review-publish.md) | Review publish is change-based by default: `Change-Id` trailer, `refs/for/<target>`, topic/hashtag/WIP — not a pull-request branch and not a mode. |
| [ADR-0052: Model-Based And Coverage-Guided Fuzzing](design-decisions/0052-model-based-and-coverage-guided-fuzzing.md) | Deterministic smoke (PR), fast-check history command model with shrinking, Jazzer.js parser campaigns with versioned corpora; scheduled CI, not every PR. |
| [ADR-0053: OpenZL Host Entropy Codec](design-decisions/0053-openzl-host-entropy-codec.md) | Entity-aware OpenZL host codec for blobs/artifacts and changediffs; SHA-256 stays on plaintext. |
| [ADR-0054: NATS Realtime Fabric](design-decisions/0054-nats-realtime-fabric.md) | Host nats-server with JetStream, WebSocket, and complementary Epoch auth callout (fabric credentials); Live/platform/community streams plus posture-gated `epoch.svc.>` discovery. |
| [ADR-0055: Trust Posture Modes And Federation Topology](design-decisions/0055-trust-posture-modes-and-federation-topology.md) | Hosted / private / open postures, intra-community NATS, optional XMPP bridges, and rejected-by-default experiment gates. |
| [Fuzz Lanes And Corpora](../test/fuzz/README.md) | How smoke, fast-check, Jazzer.js, corpora, and regression promotion relate. |
| [Dependency Exceptions](dependency-exceptions.md) | Security-sensitive dependency overrides and rationale. |

## Contribution, Safety, And Agent References

| Document | Use it for |
|---|---|
| [Contributing](../CONTRIBUTING.md) | Coding workflow, testing expectations, and pull request checklist. |
| [AGENTS.md](../AGENTS.md) | Repository-specific agent instructions and quality gate requirements. |
| [Change Graph Convergence State](plans/change-graph-convergence/sdlc-state.md) | Historical implementation record for stable Changes, projections, synchronization, interoperability, authority, and validation. |
| [Change Graph Signed Events State](plans/change-graph-signed-events/sdlc-state.md) | Follow-up record for persisting Change Graph CLI commands as signed protocol events. |
| [Community Search And Projection State](plans/community-search-projection/sdlc-state.md) | Closed implementation record for deterministic cross-source search, user-defined projections, and namespace recovery. |
| [Community Web Pass-2 Honesty State](plans/community-web-pass2-honesty/sdlc-state.md) | Active record for sample/live honesty, receipt verbs, AT OAuth, and live multi-user Activity after competitor pass 2. |
| [Community Web Startup And Routing Plan](plans/community-web-startup-routing/sdlc-state.md) | Accepted implementation and validation record for resumable startup, sticky routing, next-action guidance, and focus expansion. |
| [Federation Hardening State](plans/federation-hardening/sdlc-state.md) | Closed record for trust posture, NATS discovery, native channels, gated bridges, and test lanes. |
| [Community Web Voice Tray State](plans/community-web-voice-grid/sdlc-state.md) | Closed record for persistent lounge voice connections and Grid design-system cleanup. |
| [XMPP Channel Fanout State](plans/xmpp-channel-fanout/sdlc-state.md) | Closed record for public-channel s2s fanout, Verify goldens, mutant kill, and chaos envelopes. |
| [Test Lanes Honesty State](plans/test-lanes/sdlc-state.md) | Closed record for Verify goldens, Protocol mutant kill, honest lane inventory, and the 80% branch floor. |
| [Epoch Skill](../skills/epoch/SKILL.md) | Compact wiki for agents operating on the repository. |
| [Gauntlet Loop Skill](../skills/gauntlet-loop/README.md) | Durable, spec-grounded improvement campaigns with auditable promotion gates. |
| [AI Subscription And Automation Strategy](ai-automation-strategy.md) | Audit of connected AI subscriptions versus what the repository actually uses, with a sequenced plan for CI, agent configuration, persona fan-out, and product telemetry. |
