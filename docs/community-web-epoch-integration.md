# Community Web As An Epoch Participant

Community Web should be to Epoch what a forge is to a version control system: a
social surface over the real object graph, not a second product that talks about
the same nouns. This document records the gap between that intent and the
repository as it stands, the target architecture, and the workstreams that close
the distance. It is the design companion to
[ADR-0040](design-decisions/0040-community-runtime-command-layer.md).

Source-level audit, verified against `main` on 12 August 2026. Findings below
were re-checked against the files they name; nothing here is inferred from
package names alone.

## The invariant

> Every meaningful mutation — a UI action, a prompt-generated interface change, a
> WebMCP tool call, a CLI command, or a remote synchronization — passes through
> the same application command, produces the same auditable receipt, and updates
> or proposes an explicit Epoch ref.

Everything else in this document follows from that sentence.

## What was actually wrong

The repository was never short of ingredients. It has Core and a real CLI, a
browser-safe event/VFS layer, tracked-change history in the browser, generated-UI
version tracking, a Community domain with API/CLI/Web packages, Community Web with a
local WebMCP registry, an OpenUI parser and component library, and two
self-evolving samples that already demonstrate browser history and
browser-to-Node gossip.

The defect is composition. Those pieces form several parallel products:

| Layer | What it owns today | Why that is a problem |
|---|---|---|
| Core + `epoch` CLI | DVCS concepts, change graph, signed events | No application layer above it for the browser to share |
| Community Core/API/CLI/Web | Social and collaboration models | Can describe repositories, proposals, and merges without touching native Epoch objects |
| Integration Core + GenUI | Browser tracked changes and generated-UI versions | Not composed into any deployed application |
| Community Web | The application that is actually deployed | Lives in `docs/design-explorations/`, composed from `window.CW_*` globals |
| Samples | The missing browser history and sync patterns | Demonstrations, not production packages |

Two claims from earlier framings needed correcting before anything else:

- **Epoch does have a CLI.** The root workspace ships `epoch`, `epoch-git`,
  `epoch-community`, and `git-remote-epoch`. The defect was never absence; it was
  that `epoch` and `epoch-community` were separate command surfaces with no
  shared implementation, and that the standalone `epoch-community` binary called
  `main()` with no context while `main()` required a host-injected one — so the
  published binary threw before parsing a command.
- **Community Web already had the prototypes.** `samples/self-evolving-dashboard`
  records generated components against a browser Epoch instance and renders a
  version ledger; `samples/self-evolving-canvas` gives the browser a local VFS and
  gossips events with a Node participant. These should be promoted, not
  reimplemented.

## Verified findings

| # | Finding | Evidence | Status |
|---|---|---|---|
| 1 | The Community CLI could not bootstrap itself | `main()` called `requireContext(context)`; the `require.main` entry passed none | **Fixed** — `--remote`/`EPOCH_COMMUNITY_URL` bootstrap, help works before configuration |
| 2 | `epoch` and `epoch-community` were separate command surfaces | Two parsers, two binaries, no shared layer | **Fixed** — `epoch community …` and `epoch ui …` route into one implementation |
| 3 | No shared command/receipt layer behind UI, WebMCP, CLI, SDK | Community Web's action registry is page-scoped; Community CLI and Core CLI each have their own | **Fixed for the workspace/UI surface** — `@epoch/community-runtime` |
| 4 | The browser had history but no forge vocabulary | `BrowserEpoch` exposes track/read/ledger/subscribe and the raw repository | **Fixed for UI state** — views, diff, merge, revert, recovery |
| 5 | WebMCP registration was fire-and-forget | `webmcp.js` called `native.registerTool(descriptor)` without awaiting; unregister only deleted the local entry | **Fixed** — awaited registration, `AbortSignal` lifetime, accurate annotations |
| 6 | The WebMCP availability comment was stale | Said no browser ships it; Chrome 149 runs a public origin trial and deprecated `navigator.modelContext` in 150 | **Fixed** |
| 7 | Deployment builds the design exploration, not the package | `scripts/render-community-web.mjs` copies `packages/Epoch.Community.Web/app`; `serve-community-web-local.mjs` serves it | **Open** — workstream H |
| 8 | Community Web does not instantiate a browser Epoch workspace | Its manifest depends on core/community-core/design-tokens only | **Fixed** — the board opens a workspace on load and ensures the `.epoch` project that owns its interface |
| 9 | Generated OpenUI and generated themes are not wired into the board | `board.html` loads `openui-parser.js` and `openui-library.js` but never `generate.js`; `theme.js` is loaded by no page | **Open** — workstream D |
| 13 | Two applications both called Community Web | A TypeScript-rendered document in the package and a script-tag app in `docs/`, kept aligned by a parity script | **One app** — the board is the Community Web application; the rendered-document surface remains as a server-rendered projection until workstream H finishes converging them |
| 10 | No signed static harness, ABI, or enforced safe mode in the board | Static markup exists; a release manifest, slot ABI, and recovery boundary did not | **Fixed for the harness region** — the board installs a content-addressed release, renders slots from it, and boots recovery when the head fails validation. Signing the release is workstream C |
| 11 | Community proposals do not resolve to native Epoch IDs | Social records model their own repositories and changes | **Open** — workstream F |
| 12 | Browser storage defaults to `localStorage` | Synchronous, quota-bound, unsuited to a growing object graph | **Open** — workstream B |

## What this change implements

`@epoch/community-runtime` is the composition root and the shared command bus.
It depends only on `@epoch/integration-core`, so it stays browser-safe, and it
carries no DOM or React code.

```
  Community Web UI ─┐
  Prompt composer  ─┤
  WebMCP adapter   ─┼─► CommunityCommandBus ─► capability + confirmation checks
  epoch CLI        ─┤                       ─► BrowserEpochWorkspace (views, diff,
  Platform SDK     ─┘                            merge, revert, recovery)
                                             ─► signed command receipts
```

### Command receipts

Every command returns the same record: `commandId`, `kind`, `source`, `actor`,
`workspaceId`, `baseRef`/`proposalRef`, `revisionIds`, `eventIds`, a policy
receipt, a validation receipt, a confirmation state, and the command's data.
Identifiers are content digests of their inputs rather than clock or random
values, so the same command issued from the CLI and from a WebMCP tool against
the same base produces the same `commandId` — which makes "the button and the
tool did the same thing" a checkable property. The digest is drift detection,
not a signature, and the runtime never describes it as one.

### The browser workspace

`createBrowserEpochWorkspace` adds the forge vocabulary on top of `BrowserEpoch`:
named views, proposal views with a recorded base, semantic diff, validated merge,
append-only revert, last-known-good promotion, safe mode, and materialization.

Two rules are enforced rather than documented:

- **Nothing is removed.** A rollback appends a revision restoring an earlier
  manifest. The rejected proposal and the merge that preceded it stay in the
  ledger and stay inspectable.
- **The harness decides what a manifest may contain.** An invalid proposal is
  still recorded — you want to inspect the bad one — but it cannot be merged, and
  a head that stops validating is not rendered.

### The default `.epoch` project

A forge needs somewhere for a person's own configuration to live that is a real
repository rather than a settings blob. GitHub answers this with a `.github`
repository; Community Web answers it with `.epoch`, created once per workspace
on first boot. It owns the dynamic interface the browser renders, and it has the
same history, diff, merge, revert, and recovery as anything else in the
workspace — `epoch ui log`, in the terminal, reads the interface you are looking
at.

The board's static harness region is markup the page ships: a status slot in the
footer, a context panel, and a recovery region. The dynamic layer fills those
slots and sets theme tokens; it cannot add, move, hide, or restyle the region
itself, and the recovery controls live inside it precisely so a generated
revision cannot reach them.

### The static harness and the dynamic layer

A `StaticHarnessRelease` is a content-addressed description of what the dynamic
layer may be: semantic slots, an allowlisted component catalog with the actions
each component may bind, permitted theme tokens, and the safe-mode manifest used
for recovery. "Static" means immutable at runtime, not unpatchable forever;
shipping a new release is a separate, deliberate act.

A dynamic revision is declarative data — placements and a theme patch — and never
executable code. The vocabulary is deliberately too small to express "run this",
"fetch that", or "hide the recovery controls". Theme values are additionally
screened for `url(`, `javascript:`, and characters that could escape a
declaration, because they are the one place a model still emits a free string.

Scope (`personal`, `project`, `session`) is part of the manifest rather than a UI
mode, so "make my feed denser" and "change this for everyone" cannot become the
same merge by accident.

### WebMCP

Tools are a projection of the command catalog. The adapter awaits
`registerTool`, passes an `AbortSignal` for lifetime because WebMCP has no
`unregisterTool`, sets `readOnlyHint` and `untrustedContentHint` from the command
descriptor, and returns compact structured results carrying the receipt
identifiers rather than a wall of page content.

Capability enforcement lives in the command layer, never in a tool description.
A tool being visible to a browser agent says nothing about whether the caller may
run it: the propose tool stays advertised to a read-only principal and the
command still refuses, with a receipt recording the refusal.

### The CLI

`epoch ui …` and `epoch view …` route into the runtime; `epoch community …`
delegates to the Community CLI implementation. `epoch-community` remains as a
compatibility binary over the same code. `--json` prints the receipt verbatim;
human output is a formatting adapter over the same record. `--confirm` is the
CLI's user interaction — without it a merge returns `confirm` and changes
nothing, the same answer an agent gets. The CLI workspace persists under
`<repo>/.epoch/ui-workspace.json`, so a second process sees the same state.

See [`cli.md`](cli.md) for the command surface.

## Target architecture for the remaining work

### Canonical package layout

```
packages/Epoch.Community.Runtime/    commands, receipts, workspace, ui, harness, adapters
packages/Epoch.Community.Web/        the application: static shell, dynamic renderer,
                                     safe mode, prompt workflow, history, WebMCP, projections
```

Community Web's design and keyboard/social interaction model become the view layer
inside `Epoch.Community.Web`, with `window.CW_*` globals replaced by typed
modules and injected runtime services. `docs/design-explorations/` returns to
being design record rather than production source, and the deployment scripts run
a real application build instead of copying files.

### Remaining workstreams

These are independently ownable; the ordering below is dependency, not calendar.

| Workstream | Scope | Depends on |
|---|---|---|
| **A. Runtime and command contracts** | Command/query/receipt layer, policy hooks, contract tests | — (**landed**) |
| **B. Browser workspace and durable storage** | IndexedDB/OPFS storage, real identity and signing, export/import, migration | A |
| **C. Static harness release and safe mode** | Signed release install, boot verification, CSP/origin policy, recovery shell | A |
| **D. OpenUI dynamic workspace** | Model gateway, `@openuidev/lang-core` parser, renderer, generated themes as versioned entities | A, C |
| **E. WebMCP Epoch tool family in the board** | The runtime's tool catalog registered by the board, tool inspector, evals | A, H |
| **F. Community remote as an Epoch forge** | Capability discovery, ref negotiation, object transfer, native IDs on social records | B |
| **G. CLI unification completion** | Config file, session import, browser bundle export/import and pairing | A |
| **H. Community Web migration** | Port Community Web into the package, build and deploy from the package | A, C |
| **I. Vertical demonstration and hardening** | The end-to-end walkthrough as the primary test and demo | B–H |

### Acceptance criteria

The target is met when all of these are demonstrably true. Items already true are
marked.

- [x] A generated UI proposal writes native Epoch events, changes, and revisions
      rather than only browser state.
- [x] The workspace survives reload and works offline.
- [x] Dynamic output can only use allowlisted components, slots, actions, and
      theme tokens.
- [x] A corrupt or malicious dynamic manifest cannot hide or modify the recovery
      path; safe mode boots without materializing the dynamic head.
- [x] Rollback is an append-only operation that preserves all evidence.
- [x] Shared merge requires an explicit confirmation, from every interface.
- [x] Tool execution returns the same receipt schema as UI, CLI, and SDK.
- [x] `epoch community …` and `epoch ui …` operate without an injected
      test-only context.
- [x] The deployed Community app is built from `packages/Epoch.Community.Web`.
- [x] No production script copies the application from `docs/design-explorations`.
- [ ] The browser and the Community remote negotiate and transfer native
      immutable objects; browser, CLI, and remote materialize the same head.
- [ ] Social proposals and reviews resolve to native base, proposal, change, and
      revision identifiers.
- [ ] Production storage is asynchronous and reports and migrates schema
      versions.
- [ ] The prompt → proposal → preview → semantic diff → merge → offline reload →
      rollback → sync walkthrough runs as a single end-to-end test.

## Showing the technology, not hiding it

Community Web demonstrates a compelling social interface while concealing what makes
it different. The guided scenario the product should perform is one prompt:

> "Make my feed denser, put verification status beside each proposed change, and
> move live activity into the right context panel."

and then, visibly: create a proposal on an explicit base and scope; stream a
preview constrained to the pinned component library; validate; show the semantic
diff — layout, widgets, tokens, actions — before anything changes; show the Epoch
evidence behind it; merge behind an explicit confirmation; reload offline to prove
it is local; roll back while the proposal and merge stay inspectable; and
optionally publish it as a project proposal with review.

The same operation through four interfaces should be shown side by side, because
they return the same receipt:

| Interface | Invocation |
|---|---|
| UI | Merge proposal |
| Prompt | "Accept this UI proposal" |
| WebMCP | `epoch_change_merge({ from: "denser-feed" })` |
| CLI | `epoch ui merge denser-feed --confirm --json` |

## Adversarial notes

These shaped the implementation and should shape the rest of it.

- **Generated UI is untrusted input.** Parsing against a component library is
  necessary and insufficient; actions, queries, URLs, theme values, and state
  bindings each need their own check.
- **Dynamic code must not own its guardrails.** A layer that can edit its parser,
  component library, validator, recovery controls, or tool registry is not safely
  self-modifying.
- **Rollback can violate the audit model.** Deleting events to restore a UI would
  undermine the thing being demonstrated.
- **Preference history is a privacy surface.** Prompts can reveal disability,
  work patterns, and private interests. Personal views stay local by default, and
  a prompt is stored as a digest unless the caller asks to retain the text.
- **WebMCP availability is not authorization.** Capabilities, policy, identity,
  base ref, and confirmation are checked in the command layer.
- **Community content is a prompt-injection channel.** Results carrying
  user-authored text are annotated as untrusted so an agent treats them as data.
- **Static does not mean permanently unpatchable.** Releases are installed,
  content-addressed, and replaced deliberately — never by a runtime mutation.
- **Structural merge is not automatically a good UI merge.** Concurrent edits to
  the same slot or token can converge cleanly and still produce an unusable
  interface; type-specific policies and surfaced conflicts are needed.

## Feature-state honesty

Each capability should be labelled where it appears: production, experimental,
sample-only, fallback, or planned. The findings table above is the current
answer; keeping it accurate is part of changing any of this.
