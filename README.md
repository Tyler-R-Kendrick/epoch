# Epoch

**Epoch** is a minimal, event-driven Distributed Version Control System (DVCS) with pluggable CRDT entity-level merging. It retains Git's proven strengths — offline-first operation and content-addressed history — while replacing mutable-pointer collaboration with signed intent events and a Radicle-inspired patch inclusion policy.

---

## Why Epoch?

| Limitation in Git | Epoch's Answer |
|---|---|
| Line-level merge conflicts | Per-entity CRDT definitions (automatic, conflict-free merges for registered types) |
| Central forge dependency | Event-based P2P — no server required |
| Email-based, unverified identity | Self-sovereign Ed25519 keypairs |
| No real-time collaboration | Event-driven append-only log; peers sync within seconds |
| No tamper detection | Every event is signed; chain integrity is verifiable |
| Mutable history (rebase, forced rewrite) | Append-only event log; history cannot be silently altered |

---

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────┐
│                        Epoch Node                        │
│                                                          │
│  CLI / API / Web UI / Editor Integration                 │
│                     │                                    │
│  ┌──────────────────▼──────────────────────────────┐    │
│  │  Event Engine  │  Merge Engine  │  CRDT Registry │   │
│  └──────────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────────┐    │
│  │   Content-Addressed Object Store (SHA-256)       │    │
│  └──────────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────────┐    │
│  │   Identity / Keystore (Ed25519)                  │    │
│  └──────────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────────┐    │
│  │   Sync Layer: Event Sync │ Convergence Repair │ Gossip       │    │
│  └──────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
         │                  │                │
    ┌────▼───┐         ┌────▼───┐      ┌────▼────┐
    │ Peer A │         │ Peer B │      │  Seed   │
    └────────┘         └────────┘      └─────────┘
```

---

## Key Features

- **Immutable Event Log** — every change is a signed, append-only event; full history is always auditable
- **Ed25519 Identity** — self-sovereign cryptographic identity; no central user registry
- **Pluggable CRDT Merging** — register CRDT definitions per file type for automatic, conflict-free merges
- **Three-Way Merge Default** — works out of the box without any CRDT configuration
- **Content-Addressed Storage** — SHA-256 addressed blobs and trees; automatic deduplication
- **Event Sync Distribution** — no central server required; events propagate across peers automatically
- **Convergence Repair** — background reconciliation ensures all peers converge
- **Offline First** — record, inspect, resolve, and sign intent merges with zero network access
- **Tamper Detection** — forked or modified event logs are detectable by any peer
- **Git Compatibility** — import from and export to standard Git repositories

---

## Design Philosophy

1. **Immutability by Default** — events are never mutated; history is always complete and verifiable
2. **Identity Without Authority** — cryptographic keys, not central registries, establish who you are
3. **Offline First** — sync is an enhancement, not a requirement
4. **Progressive Enhancement** — three-way merge works immediately; CRDT definitions add capability incrementally
5. **No Unnecessary Complexity** — no blockchain, no certificate authorities, no heavy operational dependencies
6. **Extensibility** — CRDT definitions, hooks, and storage adapters are first-class extension points

---

## Documentation

### Design and Planning
| Document | Description |
|---|---|
| [`docs/design.md`](docs/design.md) | Comprehensive design document: architecture, data model, extension API, comparisons |
| [`docs/features.md`](docs/features.md) | Full feature registry with IDs, descriptions, and acceptance criteria |
| [`docs/user-stories.md`](docs/user-stories.md) | Complete user stories organized by persona |

### Inspiration Research
Epoch synthesizes lessons from eight systems studied during design:

| System | What We Learned |
|---|---|
| [`.inspiration/weave-crdt`](.inspiration/weave-crdt/README.md) | Sequence CRDT algorithm; tombstone model; identifier-based element addressing |
| [`.inspiration/goatdb`](.inspiration/goatdb/README.md) | Ed25519 signing; Git-like commit DAG; three-way merge; React-native local-first DB |
| [`.inspiration/manyana`](.inspiration/manyana/README.md) | Event sourcing; CQRS; event log as single source of truth |
| [`.inspiration/git-warp`](.inspiration/git-warp/README.md) | DAG object model; timestamp restoration; content-addressed history |
| [`.inspiration/radicle`](.inspiration/radicle/README.md) | Event Sync; cryptographic identities; append-only decentralized forge |
| [`.inspiration/roshi`](.inspiration/roshi/README.md) | OR-Set CRDT; convergence repair; high-throughput distributed sets |
| [`.inspiration/solgit`](.inspiration/solgit/README.md) | Blockchain VCS; what to avoid: gas costs, immutable sensitive data |
| [`.inspiration/bda-svc`](.inspiration/bda-svc/README.md) | IPFS + Hyperledger Fabric; what to avoid: extreme operational complexity |

---

## Status

Epoch now includes a **TypeScript prototype built with Microsoft TypeScript Native Preview (`tsgo`)**, the Go-native TypeScript toolchain preview from [`microsoft/typescript-go`](https://github.com/microsoft/typescript-go). It implements the first executable slice of the design:

- Ed25519-backed repository identities and signed immutable events
- filesystem-backed `.epoch/` event and blob storage
- event log, signature, DAG, head, and blob verification for tamper detection
- pluggable CRDT registry
- built-in text and JSON entity merge definitions
- filesystem event sync between local repositories
- Git import/export compatibility for tracked files
- Radicle-inspired intent events and signed merge/rejection policy events for patch inclusion
- XState-backed asynchronous repository and per-user actors for event-driven multi-user workflows
- separate `Epoch.Core`, `Epoch.CLI`, and `Epoch.WASM` package projects
- CLI commands for `init`, `record`, `intent`, `events`, `verify`, `merge`, `reject`, `status`, `main`, `resolve`, `sync`, `rollback`, `import`, and `export`
- Gherkin feature coverage for repository and CRDT behavior

See [`docs/design.md`](docs/design.md) for the full design specification.

---

## Prototype Usage

Install dependencies and build with `tsgo`:

```bash
npm install
npm run build
```

Run the CLI host after building:

```bash
node packages/Epoch.CLI/dist/cli.js init --author alice
node packages/Epoch.CLI/dist/cli.js record README.md --type text/plain
node packages/Epoch.CLI/dist/cli.js events
node packages/Epoch.CLI/dist/cli.js verify
```

Converge two local Epoch repositories by exchanging missing events and blobs:

```bash
node packages/Epoch.CLI/dist/cli.js --repo ./peer-a sync ./peer-b
```

Import tracked files from Git and export the latest recorded blobs back to a Git repository:

```bash
node packages/Epoch.CLI/dist/cli.js --repo ./epoch import ./git-project
node packages/Epoch.CLI/dist/cli.js --repo ./epoch export ./git-output
```

Create an intent and have maintainers sign inclusion or rejection events:

```bash
node packages/Epoch.CLI/dist/cli.js intent README.md --type text/plain
node packages/Epoch.CLI/dist/cli.js merge INTENT_ID
node packages/Epoch.CLI/dist/cli.js reject INTENT_ID --reason "needs tests"
node packages/Epoch.CLI/dist/cli.js status
node packages/Epoch.CLI/dist/cli.js main
```

Resolve three versions of a supported entity type through the CRDT registry:

```bash
node packages/Epoch.CLI/dist/cli.js resolve --type application/json base.json left.json right.json
node packages/Epoch.CLI/dist/cli.js resolve --type text/plain base.txt left.txt right.txt
```

Run the Gherkin feature suite:

```bash
npm test
```

The feature files live in [`features/`](features/) and are executed with Cucumber against the compiled TypeScript output.

If installed as a package, the CLI is exposed as `epoch`:

```bash
epoch verify
```

Use the asynchronous XState actor API when coordinating event-driven applications or multiple local users:

```ts
import { EpochActorSystem } from "epoch";

const repository = new EpochActorSystem("./repo");
await repository.init("alice");

await Promise.all([
  repository.user("alice").recordFile("alice.txt", "text/plain"),
  repository.user("bob").recordFile("bob.txt", "text/plain"),
]);

const problems = await repository.verify();
repository.stop();
```

---

## License

See [LICENSE](LICENSE).
