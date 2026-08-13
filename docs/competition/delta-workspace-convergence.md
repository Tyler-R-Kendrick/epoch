# Delta, DeltaDB, And Epoch: Workspace Convergence Analysis

Researched 2026-08-13 against Zed's public product documentation at
`delta.dev/docs` and the two launch posts. This document analyzes what Zed
actually shipped, separates the verified mechanism from the marketing claim,
maps every Delta concept onto a named Epoch primitive, and proposes the
sequenced work that would put Epoch ahead rather than in parity.

Labels follow the [dossier](change-graph-vcs-dossier.md) convention:
**Official** is a linked primary-source claim, **Implemented** is executable
Epoch behavior, **Difference** is a design boundary, **Unverified** is a claim
public sources do not establish.

Related: [Change Graph And Operation-History Dossier](change-graph-vcs-dossier.md),
[Delta product dossier](products/delta/profile.md),
[Zed DeltaDB product dossier](products/zed-deltadb/profile.md),
[ADR-0042](../design-decisions/0042-spaces-shared-signed-workspaces.md).

## 1. What Zed Shipped

Zed shipped two things with one name, and keeping them apart is the whole
analysis.

**DeltaDB** is the history and synchronization layer. **Official:** it stores
work as "a stream of fine-grained _deltas_"; "Where Git captures a snapshot at
each commit, DeltaDB captures every operation in between and gives each one a
stable identity." A delta is "a recorded change to a thread or worktree" —
file edits, tree changes, messages, comments, and state updates, each carrying
who made it and where it sits in history. It "embeds conflict-free replicated
worktrees," so many people and agents edit the same files across machines.
References anchor "to a delta instead of a line number." Commits stay in Git;
Git and CI keep "running checks and connecting you to the rest of the world."
([Introducing DeltaDB](https://zed.dev/blog/introducing-deltadb),
[Delta & Git](https://delta.dev/docs/concepts/delta-and-git))

**Delta** is the product on top: "a multiplayer environment for coding with
agents and reviewing what they build." Rust compiled to WebAssembly, rendered
through WebGL, so a teammate can open a thread in a browser with no install.
([Introducing Delta](https://zed.dev/blog/introducing-delta))

### The object model, as documented

| Object | Definition (Official) |
|---|---|
| **Thread** | "a conversation with an agent that has access to your project… the basic unit of work in Delta: one thread, one agent, and its own worktrees." |
| **Worktree** | "a project folder that belongs to a thread," one per project, living **in DeltaDB** — explicitly *not* a Git worktree. |
| **Checkout** | the actual folder on one machine. Either Delta-managed (Delta owns it and may discard it) or an existing folder a thread **adopts in place**. Metadata sits in a `.delta` directory hidden from Git. |
| **Machine** | where the agent runs for a given turn: a participant's computer or a Delta-provisioned cloud machine, selectable per message. |
| **Delta** | one recorded change to a thread or worktree, with author and history position. |

Two Git remotes exist per checkout: `origin` (upstream, e.g. GitHub) and
`local` (a teammate's repository or Delta's own clone). Work returns to the
user three ways — adopt the project folder in place, push a branch to `origin`,
or copy out of a Delta-managed checkout. `.gitignore` is respected; ignored
files stay local. Early Jujutsu support exists for colocated repositories.
([Worktrees & Machines](https://delta.dev/docs/concepts/worktrees-and-machines),
[Review & Sync](https://delta.dev/docs/agents/review-and-sync))

### Collaboration, which is the actual product

The collaboration surface is not a side feature; it is what the thread object
exists to enable.

- **Shared threads.** "Everyone sees messages, edits, comments, and agent
  activity as they happen." Participants send messages, steer the agent, edit
  files directly, and comment. Draft messages are collaborative *before* they
  are sent.
- **Per-participant checkouts.** "Each participant gets their own checkout of
  the thread's worktrees, synced through DeltaDB." File changes propagate to
  every participant regardless of which machine ran the agent.
- **Access tiers.** Invited-only, organization-wide, anyone-with-the-link (any
  authenticated Delta user), and email invitation (ten recipients per batch,
  fourteen-day expiry). The docs warn that link URLs are sensitive.
- **Comments as review.** Comments attach to agent output or selected text,
  stay *pending until the next submit*, are delivered together with the
  message, and the agent addresses them in that reply. Replies link back to the
  comment they answer, and comments become threaded discussions among
  collaborators.
- **Review and land.** A Review Changes tab aggregates the thread's diffs;
  after revision the agent pushes to `local` (then `git switch`) or to `origin`
  as a normal pull request.
- **Attribution.** The agent receives authorship metadata for each request, so
  a turn knows which human asked for it.

([Collaborate in a Thread](https://delta.dev/docs/collaboration/collaborate-thread),
[Comments](https://delta.dev/docs/agents/comments),
[Threads](https://delta.dev/docs/agents/threads))

### Substrate and posture

**Official:** "Delta's backend runs entirely on Cloudflare" — R2 for file
contents and Git commits, Durable Objects with SQLite for thread and worktree
changes, KV and D1 for metadata, encrypted at rest with Cloudflare-managed
keys, TLS in transit. Secret redaction replaces known values from environment
variables, dotenv, and Mise files with `[REDACTED]` before data leaves the
device, and the docs state plainly that it "matches exact secret values that
Delta already knows about. It does not scan arbitrary files for credentials."
Deleting a thread "removes the thread from your machine; it does not yet remove
already-synced copies from our servers."
([Data Storage](https://delta.dev/docs/privacy-and-security/data-storage),
[Security](https://delta.dev/docs/privacy-and-security/security))

**Official, and unusually candid:** the agentic safety page states there is
"no framework for agent permissions," "no agent sandbox capability," and "no
mechanism that prevents execution of shared settings or configuration" in a
worktree — with agents having "unrestricted device access." Zed calls these
roadmap items and says early access is "at your own risk."
([Agentic Safety](https://delta.dev/docs/privacy-and-security/agentic-safety))

## 2. Correcting The Copy-On-Write Premise

The prevailing reading — that Delta obsoleted per-workspace checkouts because
it mounts a copy-on-write virtual filesystem — is half right, and the wrong
half is the half that would change Epoch's plan.

**Official:** the *worktree* is virtualized inside DeltaDB. Branching is
effectively free and "any point in the history, even mid-way through an agent
run, can be a branch point." That is a claim about the **data model**: a branch
is a position in the delta stream, not a directory copy.

**Official, and pulling the other way:** files "are real and mountable to
disk"; every participant "gets their own copy of the code on their local
machine, kept in sync in real time"; a checkout is a real folder with a real
`.delta` metadata directory and two real Git remotes; and a thread can adopt
your existing project folder in place.

**Unverified:** that Delta ships a kernel VFS, a FUSE/ProjFS mount, or
filesystem copy-on-write on the user's machine. The
[Worktrees & Machines](https://delta.dev/docs/concepts/worktrees-and-machines)
page — the page that would say so — describes shared folders, per-machine
checkouts, and machine selection, and describes no mount, no CoW, and no
hydration mechanism. The word "virtualized" in the launch post is doing
data-model work, not filesystem work.

So the honest statement is:

> Delta did not remove the local workspace. It removed the *worktree as the
> unit of branching*, and it removed the requirement to commit before anyone
> else can see the work.

That reframing matters because it changes what Epoch should build. The
attractive property is not a CoW mount. It is that **the branch point moved
from a commit to an operation, and the workspace stopped being a private
directory and became a shared, addressable, joinable object.** Epoch can reach
that with primitives it has already accepted and partly shipped — virtual
materialization ([ADR-0014](../design-decisions/0014-virtual-working-tree-and-sparse-checkout.md)),
chunk-granular residency ([ADR-0016](../design-decisions/0016-entity-aware-streaming-and-targeted-checkout.md)),
and truthful workspace providers ([ADR-0032](../design-decisions/0032-residency-native-sync-and-workspace-providers.md)) —
without asserting a filesystem capability it does not have.

It also settles the question about Rift. Rift is an **execution** concern;
worktrees are a **materialization** concern; the delta stream is an
**identity** concern. Epoch's [nomenclature](../nomenclature.md) already holds
those three apart, and ADR-0032 already refuses to let a Workspace imply
execution isolation. Delta collapsed the shared object and the local folder
into one word, "worktree," and the consequence is visible in its own docs: it
cannot state a trust boundary for worktree-supplied configuration, because the
model has no seam where one would attach. Epoch should keep the seam.

## 3. Concept Mapping

Every Delta concept, against the Epoch primitive that already covers it.

| Delta concept | Nearest Epoch primitive | State of play |
|---|---|---|
| Delta (one recorded operation) | **Code Operation** / **Fragment** | Epoch's are explicit and Ed25519-signed; Delta's are continuous and unsigned. Granularity comparable; capture posture opposite. |
| Thread (conversation + worktrees + participants) | *no single object* — Community channel plus Change come closest | **The principal gap.** Nothing in Epoch binds conversation, materialization, participants, and agent turns into one shareable thing. |
| Worktree (DeltaDB object, shared) | **View** plus **Workspace** | Epoch's Workspace is provider-owned, local, and unshared. It is not addressable or joinable. |
| Checkout (per-machine folder) | filesystem **Workspace** provider plus virtual working tree | Near parity, and Epoch is ahead: sparse materialization, chunk manifests, and promises give partial residency Delta does not advertise. |
| Machine selection per turn | **Sandbox** (declared execution provider) | Epoch declares the boundary honestly but ships no isolated provider. Delta ships a cloud runner with no isolation model. |
| Conflict-free replicated worktree | CRDT entities, Code Operations, `epoch.sync/v2`, gossip | Epoch has the parts; it has no continuous worktree-level CRDT and no always-on replication. |
| Anchor to a delta | structural paths in `@epoch/semantic` (`object#0/member:version`) | Epoch's anchor survives reformatting *and* rebase; it is not yet wired to conversation. |
| Share link with four access tiers | **Principals**, **Grants**, **Budgets** ([ADR-0034](../design-decisions/0034-agent-principals-grants-and-budgets.md)) | Epoch's authority model is stronger and has no product surface. Delta's surface is shipped and has no authority model. |
| Review Changes tab → push to `local`/`origin` | **Review Bundle**, **Merge Plan**, Git projection | Epoch has exact, digest-bound review evidence; it has no live review surface over a shared workspace. |
| Comments pending until submit, delivered with the message | `intent.comment`, Community selected-message action tray | Comparable; Epoch's are signed, Delta's batching-into-the-turn behavior is a better interaction. |
| Cloud machine | Community Operations agent sandboxes | Descriptors exist; no runners. |
| Cloudflare Durable Objects substrate | local-first repository, gossip plane, ATProto, Git projection | Epoch's clearest structural advantage. |
| No signature or authority model | signed events, `verify()`, deterministic policy | Epoch's clearest security advantage. |
| No agent permissions, no sandbox, no worktree trust | grants, budgets, receipts, declared Sandbox contract | Epoch's contracts exist; the isolated provider does not. |

## 4. What This Confirms About Epoch's Thesis

Delta is not a refutation of Epoch's goals. It is a well-capitalized
confirmation of the load-bearing ones, with the trust half left out.

- **Confirmed: work below the commit is the real record.** Both systems put a
  durable history under Git commits and keep Git for interchange and CI. Epoch
  reached this independently via Changes and Revisions; Zed reached it via
  deltas.
- **Confirmed: conversation and code belong in one artifact.** `PRODUCT.md`
  states the positioning as "conversation and work share one substrate, and the
  link between them is cryptographic rather than editorial." Delta shipped the
  first clause. It cannot ship the second — its docs describe authorship
  metadata, not signatures.
- **Confirmed: a joinable shared space is the unit people want.** The thread —
  not the repository, not the branch — is what Delta made shareable, and that
  is what makes it feel like a channel rather than a forge.
- **Not confirmed, and left open: governed agent participation.** Delta's own
  documentation states there is no permission framework, no sandbox, and no
  worktree-config trust boundary. Epoch's ADR-0034 principals, attenuated
  grants, budgets, and receipts address exactly that, and `PRODUCT.md` already
  commits to "agents are accountable members."
- **Not confirmed, and left open: portability.** A Durable-Object-backed
  substrate with no self-hosting and deletion that does not reach synced copies
  is a different product category from a local-first, offline-verifiable,
  exportable repository.

The competitive read is therefore not "catch up on the VFS." It is: Delta owns
the *ergonomics* of the shared agent workspace and has explicitly deferred its
*governance*. Epoch owns the governance primitives and has never assembled the
ergonomics. The wedge is the assembly.

## 5. Proposed Direction: Spaces

The named gap from §3 is that Epoch has Views, Workspaces, Sandboxes, Changes,
channels, and Code Operations, and no object that binds them into something a
second person can join.

[ADR-0042](../design-decisions/0042-spaces-shared-signed-workspaces.md)
proposes `epoch.space/v1`: a **Space** is a signed, joinable object that
composes — and deliberately does not replace — the existing primitives:

- a **View** fixing which history the Space is over;
- zero or more **Workspaces**, one per participant machine, each reporting its
  own residency, materialization, storage, and execution facts;
- a **conversation** carried as existing Community receipts and Code Operations
  with conversation digests;
- a **participant set** of Principals holding attenuated **Grants** and
  **Budgets**; and
- a per-turn **Sandbox** binding recording where an agent turn actually ran.

The discipline that makes this worth doing is the discipline Delta skipped: a
Space is not a View, not a Workspace, and not a Sandbox. It references them.
Collapsing them is precisely what left Delta unable to describe a trust
boundary for worktree-supplied configuration.

### Sequenced plan

Ordered by leverage per unit of new machinery. Phases 1–3 are composition over
shipped primitives and **are now implemented** — `epoch.space/v1`,
`SignedSpaceStore`, and the `epoch space ...` CLI family, with unit, CLI, and
Gherkin coverage. Phases 4–6 are genuinely new infrastructure and are **not
built**; nothing below claims otherwise.

**Phase 1 — Space object and join (shipped).** Signed `space.create`, `space.join`,
`space.leave`, `space.bind-workspace`, and `space.turn` events. Joining
receives a signed grant, syncs over the shipped `epoch.sync/v2` plus gossip,
and materializes through an existing workspace provider in virtual mode, so
joining is cheap by *residency* rather than by any copy-on-write claim. This
delivers the shareable, joinable channel property with almost no new
infrastructure, and it is the phase that makes the rest legible.

**Phase 2 — Consent-gated continuous capture (shipped).** Delta's ergonomic advantage is
that the record accumulates without ceremony. Epoch's nomenclature currently
disclaims continuous capture, and reversing that outright would be wrong. The
resolution is a signed **capture session**: `session.open` declares scope,
retention, and redaction policy; Code Operations may be recorded continuously
while it is open; `session.close` seals it. Operations outside a session stay
explicit. Epoch then matches Delta's fidelity, and the consent itself is a
signed artifact Delta has no equivalent for.

**Phase 3 — Anchors that outlive refactors, bound to conversation (shipped).**
`@epoch/semantic` already keys artifacts by structural path so a patch survives
reformatting. Anchor conversation to `(RevisionId, structural path)` and
resolve forward through the Change Graph. This is *better* than anchoring to a
delta: a delta anchor names a historical position that must be replayed, while
a structural path re-resolves across a rebase and after a rename. Ship
`epoch anchor resolve`, and make Community's promote-to-change path use it.

**Phase 4 — Live materialization, stated truthfully (not built).** ADR-0014's revisit
criteria already name "lazy, on-access hydration (a real virtual filesystem
handle)." Implement it in two truthful layers: the `reflink` provider already
probes the destination filesystem and reports the actual clone or fallback
mode, so real CoW is used where the filesystem provides it; and an opt-in mount
provider hydrates from chunk manifests and promises, reporting
`execution: none` and never implying isolation. The capability report stays
authoritative — which is the part Delta's documentation does not offer.

**Phase 5 — The isolation Delta does not have (not built).** This is the highest-leverage
differentiator available right now, because it is a stated hole in a funded
competitor's shipping product and Epoch's contracts for it are already
accepted. Ship one genuinely isolated execution provider that consumes a Grant
and a Budget, emits a Receipt per turn, and refuses to execute
repository-supplied configuration it was not granted. Delta's agentic-safety
page is the specification for what to beat.

**Phase 6 — Federated join instead of a vendor backend (not built).** Spaces should be
discoverable and joinable over gossip and ATProto per ADR-0020 and ADR-0022,
with any hosted seed a convenience rather than an authority. A join link should
resolve local → gossip → AT and keep working offline afterward. Delta cannot
match this without leaving Durable Objects.

## 6. Where Epoch Can Be Better, Specifically

Claims grounded in a documented Delta limitation rather than a guess. Items
1–4 and 7 are enforced by the shipped Space implementation; item 5 was already
shipped; item 6 depends on Phase 4.

1. **Signed participation.** Every message, edit, comment, and agent turn
   carries an Ed25519 signature and verifies offline. Delta records authorship
   metadata against a server it controls.
2. **Attenuated agent authority.** Grants, budgets, and receipts versus
   documented "unrestricted device access" and "no framework for agent
   permissions."
3. **Durable conflicts over silent convergence.** A CRDT worktree always
   converges, which means it never surfaces semantic disagreement — two agents
   editing the same function produce a text-valid, semantically wrong state
   with no artifact recording that anyone disagreed. Epoch's durable conflicts
   keep every side and the resolution lineage, and
   [ADR-0031](../design-decisions/0031-durable-conflicts-and-conservative-commutation.md)
   refuses to treat unknown commutation as permission. This is the strongest
   *technical* critique available, and it should be made carefully: CRDT
   convergence is a correctness property about replicas, not about programs.
4. **Structural anchors.** Survive reformatting, renames, and rebases, not just
   line drift.
5. **Exit is real.** Compacts, cold backups, bundle transport, Git projection,
   SWHID archival, and `verify()`. Delta documents that deletion "does not yet
   remove already-synced copies from our servers."
6. **Editor neutrality.** Any tool sees a real tree; joining a Space is not
   adopting an IDE. Delta's benefit requires Delta.
7. **Non-code contribution as a first-class member of the record.** `PRODUCT.md`
   ranks the citizen builder first. A Delta thread is a developer artifact; an
   Epoch Space can credit an idea, a translation, a test, or a design decision
   with the same machinery.

## 7. Honest Counterpoints

Recorded so the plan is not read as more favorable than it is.

- **Distribution is a real advantage and Epoch has none.** Zed ships DeltaDB
  through an editor with existing users and venture funding behind it. Epoch's
  answer must be a wedge, not parity, and §5 is ordered accordingly.
- **Continuous capture is genuinely hard.** The public skepticism captured in
  the [Zed DeltaDB gossip record](products/zed-deltadb/gossip.md) — that
  operation-level history is noise without extraction — applies to Epoch's
  Phase 2 as much as to Delta. Session-gated capture is safer and less magical;
  it does not by itself solve signal-to-noise.
- **Implementation asymmetry.** Delta is Rust compiled to WebAssembly with
  WebGL rendering. Epoch is a TypeScript prototype. No performance claim should
  be made against Delta on any surface.
- **Nomenclature pressure.** Adding Space to a vocabulary that already carries
  View, Workspace, Sandbox, Change, and Change Graph is a real cost. ADR-0042
  must state what a Space is *not* as prominently as what it is.
- **Delta's gaps are dated, not permanent.** Every safety limitation quoted
  here is described by Zed as a roadmap item. The differentiator in §5 Phase 5
  has a shelf life, and that is an argument for sequencing it early rather than
  for assuming it will keep.
