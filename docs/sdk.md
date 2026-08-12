# Epoch Core SDK Reference

Use the SDK docs when an application needs direct programmatic access to Epoch
repositories, signed events, CRDT state, lifecycle hooks, sync, trusted host
Git compatibility, browser-safe React state history, or the initial
Epoch.Platform headless management and web console APIs.

## Package And Imports

- Workspace package: `@epoch/core`
- React package: `@epoch/wasm-react`
- Integration defaults package: `@epoch/integration-core`
- React integration package: `@epoch/react`
- Generated UI integration package: `@epoch/gen-ui`
- Redux integration package: `@epoch/redux`
- XState integration package: `@epoch/xstate`
- Platform Core package: `@epoch/platform-core`
- Platform SDK package: `@epoch/platform-sdk`
- Platform Web package: `@epoch/platform-web`
- Community packages: `@epoch/community-api`, `@epoch/community-core`,
  `@epoch/community-cli`, and `@epoch/community-web`
- Root package export: `epoch`
- Git compatibility export: `epoch/Epoch.Core.Git`
- Browser integration root exports: `epoch/Epoch.Integration.Core`,
  `epoch/Epoch.React`, `epoch/Epoch.GenUI`, `epoch/Epoch.Redux`, and
  `epoch/Epoch.XState`
- Platform and Community root exports: `epoch/Epoch.Platform.Core`,
  `epoch/Epoch.Platform.Sdk`, `epoch/Epoch.Platform.Web`,
  `epoch/Epoch.Community.API`, `epoch/Epoch.Community.Core`,
  `epoch/Epoch.Community.CLI`, and `epoch/Epoch.Community.Web`

Primary exports include `EpochRepository`, `EpochActorSystem`, `CRDTRegistry`,
CRDT helpers, lifecycle hook types, backup/compact helpers, seed-node helpers,
Git compatibility classes, and Community Web site materialization helpers.

## Repository Lifecycle

1. Create a repository with `EpochRepository.create(root, options)`, open or
   create one with `openOrCreate(root, options)`, or construct
   `EpochRepository` and call `init(author?)`.
2. Record data with `recordFile(path, mimeType)`, push existing assets with
   `push(paths, options)`, track working-tree lifecycle with `track`,
   `movePath`, `copyPath`, `deletePath`, and `forgetPath`, or create review flow events
   with `intentFile`, `mergeIntent`, `rejectIntent`, and `comment`.
3. Create deployable versions with `createVersion()` and materialize them with
   `materializeVersion()`.
4. Verify integrity with `verify()` before trusting or distributing state.
5. Exchange events and blobs with `sync(peerPath)` or `syncFrom(peerPath)`.

```ts
import { EpochRepository } from "epoch";

const repository = new EpochRepository("./repo");
await repository.init("alice");
await repository.recordFile("README.md", "text/markdown");

const problems = await repository.verify();
```

Create from existing assets and materialize a signed version:

```ts
const repository = EpochRepository.openOrCreate("./site", { author: "alice" });

const pushed = repository.push(["dist"], {
  author: "alice",
  version: "initial-site",
});

repository.materializeVersion(pushed.version!.id, {
  outDir: "./deploy",
});
```

Track native working-tree lifecycle:

```ts
repository.track("notes/draft.md", { includeIgnored: true });
repository.movePath("notes/draft.md", "notes/final.md");
repository.copyPath("notes/final.md", "notes/template.md");
repository.deletePath("notes/template.md");
repository.forgetPath("local-only.toml");

const ignored = repository.checkIgnore("dist/app.js");
const maxBytes = repository.configValue("working_tree.max_new_file_bytes");
```

### Virtual Working Tree And Sparse Checkout

`init` defaults `[working_tree] materialization` to `"virtual"`, so
`checkoutView(name, options)` writes only files whose blob differs from a base
view (the view's parent by default) and leaves the rest virtual. The result
extends `ViewState` with `materialization`, `written`, `virtualPaths`, the parsed
`manifest`, and an optional `patchPath`. The object store is untouched and
`verify()` still passes.

```ts
const checkout = repository.checkoutView("feature");
checkout.written;       // paths written to disk (changed vs base)
checkout.virtualPaths;  // paths left virtual

repository.previewPatch({ view: "feature", base: "main" }); // rolling base->view unified diff
repository.hydrate(["docs/keep.md"]);                        // realize virtual files from blobs
repository.hydrate();                                        // realize all remaining virtual files
repository.checkoutView("feature", { materialization: "full" }); // whole-tree escape hatch

const manifest = repository.readVirtualCheckout();           // .epoch/checkout.json (or undefined)
repository.readRollingPatch("feature");                      // .epoch/patches/<hash>.patch text
repository.virtualCheckoutStale(manifest!);                  // true once the frontier advances
repository.refreshVirtualManifest("feature");                // recompute + rewrite the cache

repository.materializeVersion(versionId, { outDir: "./out", base: "v1" }); // sparse export
```

The manifest, rolling patch, and `epoch-virtual.json` are regenerable local
caches; they are never signed and are excluded from `verify()`.

## Async Actor API

Use the XState-backed actor API when coordinating event-driven applications or
multiple local users. `EpochActorSystem` serializes repository commands, while
per-user actors attach stable authorship and signing identities to writes.

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

Stop actor systems when work is complete to release XState resources.

## CRDT Workflow

Use operation-based CRDT events for shared agent state that changes frequently.
Append map/register or sequence-text operations with the actor API, then
materialize state with `materialize(entity)`.

```ts
const alice = repository.user("alice");
const bob = repository.user("bob");

await Promise.all([
  alice.appendCRDTOperation({
    kind: "map-set",
    entity: "tasks",
    key: "alice",
    value: { status: "draft" },
  }),
  bob.appendCRDTOperation({
    kind: "map-set",
    entity: "tasks",
    key: "bob",
    value: { status: "review" },
  }),
]);

const tasks = await repository.materialize("tasks");
```

Use `CRDTRegistry.defaults()` for built-in text, JSON, and row-keyed CSV merges.
Use `EntityRegistry.defaults()` when callers need the richer entity adapter
surface: merge, diff, validation, redaction, and display hooks. Register custom
definitions for application-specific entity types when three-way merge is not
enough.

## Collaboration, Gates, And Operations

Signed collaboration objects are stored in the same event log as repository
history.

```ts
const issue = repository.createIssue("Track gate pipeline", "Use signed gates");
const intent = repository.intentFile("policy.txt", "text/plain");

repository.reviewIntent(intent.id, "approved", "Looks deterministic", "bob");
repository.recordCI("unit", "passed", intent.id, "ci-bot");

const gate = repository.gateStatus(intent.id, {
  requiredReviewState: "approved",
  requiredCi: ["unit"],
});
```

Use `appendOperation(command, status, detail?)` when command history should be
represented in the signed event log rather than in local-only metadata.

## Transports And Serialization

`EpochTransport` is the transport contract. `exportToMemoryTransport()` and
`syncWithTransport()` exchange events, heads, and blobs through an explicit
packet while preserving `verify()` as the trust boundary. `BundleEpochTransport`
persists the same packet as a hash-checked bundle file for offline handoff.

Repositories accept an `EpochSerializationProvider` for event file encoding.
JSON is the default, but callers can substitute another serializer and
extension while event IDs and signatures remain canonical.

```ts
const sourcePacket = source.exportToMemoryTransport();
target.syncWithTransport(sourcePacket);

BundleEpochTransport.write("./sync.bundle", sourcePacket);
target.syncWithTransport(BundleEpochTransport.read("./sync.bundle"));

const toonRepository = new EpochRepository("./repo", {
  serializer: {
    format: "toon",
    extension: ".toon",
    serialize: (value) => `toon\n${JSON.stringify(value)}\n`,
    deserialize: (text) => JSON.parse(text.split("\n").slice(1).join("\n")),
  },
});
```

## Conflict Resolutions And Redactions

Reusable conflict resolutions are signed exact-match events:

```ts
repository.recordConflictResolution({
  path: "config.json",
  entityType: "application/json",
  base: { flag: 0 },
  left: { flag: 1 },
  right: { flag: 2 },
  resolved: { flag: 3 },
});
```

Use `redactBlob(blobHash, reason)` to record that local storage may remove a
sensitive blob while keeping signed audit evidence that a redaction occurred.
Use `planRedaction(blobHash)` first when an operator needs affected event IDs,
local blob presence, and whether a prior redaction exists.

To include CRDT state in a deployable version, name the entities:

```ts
const version = repository.createVersion({
  name: "agent-state",
  entities: ["tasks"],
});
```

## React Integration

Use the integration packages when a browser app wants Epoch to work with a
small explicit boundary instead of hand-wiring storage, VFS setup, repository
creation, and version ledgers. `createBrowserEpoch()` uses `localStorage` in a
browser and falls back to memory storage elsewhere. Adapters only record what
the app explicitly wraps.

```ts
import { trackGeneratedUiChange } from "@epoch/gen-ui";
import { createBrowserEpoch } from "@epoch/integration-core";

const epoch = createBrowserEpoch({ namespace: "ops-dashboard", author: "agent" });

const result = trackGeneratedUiChange(epoch, {
  entity: "dashboard",
  source: "prompt",
  summary: "add revenue card",
  renderer: "json-render",
  components: [{ id: "component:revenue", spec: { label: "Revenue" } }],
});

epoch.versionLedger("dashboard");
epoch.readTrackedEntity("dashboard");
result.event.id;
```

React apps can provide one Epoch instance and render tracked entities or
version ledgers through hooks:

```tsx
import { EpochProvider, useEpochTrackedEntity, useEpochVersionLedger } from "@epoch/react";

function Dashboard() {
  const dashboard = useEpochTrackedEntity("dashboard");
  const versions = useEpochVersionLedger("dashboard");
  return <output>{versions.length}:{dashboard?.revision ?? 0}</output>;
}

<EpochProvider epoch={epoch}>
  <Dashboard />
</EpochProvider>;
```

Redux and XState integrations are also explicit. Configure the actions,
selectors, events, or machine updates that should become Epoch history; ignored
application state stays ephemeral.

```ts
import { createEpochReduxMiddleware } from "@epoch/redux";
import { createEpochXStateObserver } from "@epoch/xstate";

const middleware = createEpochReduxMiddleware({
  epoch,
  entity: "redux:counter",
  source: "counter-store",
  actions: ["counter/increment"],
  select: (state) => ({ count: state.counter }),
});

const observer = createEpochXStateObserver({
  epoch,
  entity: "xstate:checkout",
  source: "checkout-machine",
  events: ["paid"],
  select: (snapshot) => snapshot.context,
});
```

Use `@epoch/wasm-react` when a browser-hosted React app needs local,
append-only state history without assuming native filesystem access.

```ts
import { createEpochReactStore, useEpochState } from "@epoch/wasm-react";

const counterStore = createEpochReactStore({
  entity: "counter",
  initialState: { count: 0 },
  storageKey: "epoch:counter",
  storage: localStorage,
});

function Counter() {
  const [state, setState, epoch] = useEpochState(counterStore);

  return (
    <button onClick={() => setState({ count: state.count + 1 })}>
      {state.count}
    </button>
  );
}

counterStore.rewind(1);
epoch.materialize("latest");
```

For live browser repository state, use the VFS-backed surface:

```ts
import {
  createEpochLiveRepository,
  createMemoryEpochVfs,
  useEpochEntity,
  useEpochHistory,
  useEpochView,
} from "@epoch/wasm-react";

const vfs = createMemoryEpochVfs();
const live = createEpochLiveRepository({ vfs, author: "browser" });

live.append("counter", { count: 1 });
live.append("counter", { count: 2 });

function Counter() {
  const history = useEpochHistory(live);
  const counter = useEpochEntity(live, "counter");
  const view = useEpochView(live);
  return <output>{history.length}:{counter.count}</output>;
}
```

See the [Self-Evolving Canvas sample](../samples/self-evolving-canvas/README.md)
for a minimal Node-backed web app that stores JSON-render widget changes in a
backend Epoch repository while the browser keeps a local live repository and
replicates through VFS-backed gossip.
See the [Self-Evolving Dashboard sample](../samples/self-evolving-dashboard/README.md)
for a browser-only generated UI workflow that records json-render-shaped
component changes as automatic Epoch versions through the integration adapters.
See the [Hello World CLI sample](../samples/hello-world-cli/README.md) for a
minimal command-line app that creates, records, versions, and verifies an Epoch
repository with the Core SDK.

## Hooks

Hooks observe repository lifecycle steps for init, append, record, CRDT
operation/materialization, read, event listing, heads, verify, sync, and gossip
operations.

```ts
import { EpochRepository } from "epoch";

const repository = new EpochRepository("./repo", {
  hooks: [
    (event) => {
      console.log(event.name, event.detail);
    },
  ],
});
```

## Git-Compatible Core Surface

`epoch/Epoch.Core.Git` exposes host-filesystem Git compatibility helpers.
Native Git operations are for trusted host environments and should not be
assumed to work in WASM.

## Frontier Protocol And Core APIs

`@epoch/protocol` is the canonical browser-safe contract package. It exports
stable IDs and typed errors plus `parseRevset`, `evaluateRevset`,
`inspectRevisionGraph`, `inspectFrontierFilter`, `inspectSyncContract`,
`inspectSwhid`, and `nodeOnlyAdapterStatus`.

`createCanonicalId(kind, random?)` requires exactly 256 random bits and emits
lowercase unpadded base32. `RevisionId` is a branded signed `EventId`, validated
with `assertRevisionId`; it is intentionally not an `epoch:revision:*`
canonical object ID. Protocol also owns the browser-safe SWHID parser used by
`inspectSwhid` and wrapped by `@epoch/software-heritage`, so both surfaces
accept the same kinds, qualifiers, percent encoding, and malformed-input rules.

`@epoch/core` re-exports the protocol-facing domain and adds host-capable
implementations from `convergence-changes`, `convergence-transactions`,
`object-store`, `chunks`, `promises`, `sync-protocol-v2`, `sync-v2`,
`workspace`, and `workspace-providers`. Important boundaries are:

- explicit parent sets and expected heads are validated atomically;
- full object SHA-256 is always computed over complete bytes;
- promised absence is distinct from resident corruption;
- range fetch requires a manifest that proves chunk boundaries;
- received state remains quarantined until verification;
- AI/provider proposals are non-authoritative until accepted; and
- memory/browser reference providers do not imply durable or isolated hosting.

`@epoch/wasm` and `@epoch/platform-sdk` expose the same inspection and revset
functions through thin browser-safe wrappers. Node-only adapters return
`unsupported-capability`; their implementation is not bundled into the browser.

Host packages add explicit seams:

- `@epoch/git-proxy`: deterministic Git projection, protocol-v2 capability
  profile, quarantine receive, and remote-helper foundation;
- `@epoch/forge`: public-only codecs and injected mirror reconciliation;
- `@epoch/identity`: principals, grants, budget reservations, and receipts with
  injected durability required for production authority; and
- `@epoch/software-heritage`: SWHID v1.2 plus injected Save Code Now transport.

See [Frontier VCS Convergence](frontier-vcs-convergence.md) for migrations,
fidelity/loss matrices, security boundaries, and escape paths.

## Epoch.Platform Core and SDK

Use `@epoch/platform-core` when embedding the platform domain service directly
and `@epoch/platform-sdk` when writing headless automation against that service.
Use the separate `@epoch/community-*` packages for Community API, client, CLI,
and web behavior. Use `createInMemoryPlatformCore()` for short-lived embedded
flows and `createFileSystemPlatformCore()` when the control plane needs durable
local state, verified backup artifacts, and backup-artifact restore. The current
implementation does not yet provide networking, real runners, infrastructure
adapters, SSO handshakes, clustered scheduling, or a production
database/queue/search stack for the platform control plane.

```ts
import { createFileSystemPlatformCore } from "@epoch/platform-core";
import { EpochPlatformSdk } from "@epoch/platform-sdk";

const sdk = new EpochPlatformSdk(
  createFileSystemPlatformCore({
    dataDir: "/srv/epoch/platform",
    communityEnabled: false,
  }),
);

const organization = sdk.organizations.create({
  slug: "acme",
  displayName: "Acme",
});
const project = sdk.projects.create({
  organizationId: organization.id,
  slug: "platform",
  displayName: "Platform",
});
const repository = sdk.repositories.create({
  projectId: project.id,
  slug: "api",
  visibility: "private",
});
const environment = sdk.environments.create({
  projectId: project.id,
  name: "production",
  type: "production",
  protected: true,
});
const deployable = sdk.deployables.create({
  projectId: project.id,
  name: "api-web",
  kind: "app",
  source: { repositoryId: repository.id },
});

const plan = sdk.deployments.createPlan({
  deployableId: deployable.id,
  environmentId: environment.id,
});

sdk.deployments.approvePlan(plan.id, { actor: "ops-lead" });
const deployment = sdk.deployments.executePlan(plan.id);
```

Current platform SDK surfaces include capability discovery, organizations,
projects, repositories, environments, deployables, deploy plans, protected
deployment approvals, identity/RBAC, issues, review intents, packages, search,
observability, runners, infrastructure targets, resources, deployable templates,
configuration validation, backup destination readiness, backup verification,
restore dry-runs, HA failover drills, secret references and rotation,
deployment jobs and logs, incident diagnosis, rollback, AI action plans,
AI context packs, AI tool authorization, API correlation/idempotency helpers,
webhooks, event streams, compliance/audit export, tenant export/delete,
Community enablement, visibility policy review, showcase publication, public
profiles, follows, stars, bookmarks, discussions, personalized feeds,
moderation triage, legal holds, worker status, snapshots, and audit inspection.

```ts
const alice = sdk.identity.createUser({ handle: "alice", displayName: "Alice" });
const approvers = sdk.identity.createTeam({
  organizationId: organization.id,
  name: "release-managers",
});
sdk.identity.addUserToTeam({ userId: alice.id, teamId: approvers.id });
sdk.identity.grantTeamRole({
  teamId: approvers.id,
  role: "environment-approver",
  resourceType: "environment",
  resourceId: environment.id,
});

sdk.deployments.approvePlan(plan.id, { actor: "alice" });
const deployment = sdk.deployments.executePlan(plan.id);
sdk.packages.publish({
  name: "api-web",
  version: "1.0.0",
  deploymentId: deployment.id,
});

const results = sdk.search.query("api");
const snapshot = sdk.snapshots.export();
```

Community package example:

```ts
import { createInMemoryCommunityApi } from "@epoch/community-api";
import { createCommunityClient } from "@epoch/community-core";
import {
  createCommunityWebApp,
  materializeCommunityWebSiteWithEpoch,
} from "@epoch/community-web";

const communityClient = createCommunityClient(createInMemoryCommunityApi({
  repositories: [{
    slug: "epoch/epoch",
    displayName: "Epoch",
    description: "Signed repository history.",
    maintainers: ["alice"],
  }],
}));
const community = await createCommunityWebApp({ client: communityClient });

materializeCommunityWebSiteWithEpoch(community, {
  repositoryRoot: "/tmp/epoch-community-site",
  outputDirectory: "./deploy",
});
```

Enterprise and operations-oriented examples:

```ts
const serviceAccount = sdk.identity.createServiceAccount({
  organizationId: organization.id,
  name: "terraform",
  scopes: ["projects:write", "deployments:write"],
});
const token = sdk.identity.issueApiToken({
  serviceAccountId: serviceAccount.id,
  name: "iac-token",
});

sdk.api.openRequest({
  correlationId: "req-1",
  idempotencyKey: "deploy-plan-1",
});
const dryRun = sdk.deployments.createPlan({
  deployableId: deployable.id,
  environmentId: environment.id,
  dryRun: true,
  idempotencyKey: "deploy-plan-1",
});
sdk.deployments.editPlan(dryRun.id, {
  runtimeVariables: { PORT: "3000" },
});

const context = sdk.ai.createContextPack({
  actor: "admin",
  projectId: project.id,
  sources: ["logs", "checks", "secrets"],
});
const bundle = sdk.operations.supportBundle();
const backup = sdk.backups.start({ name: "nightly" });
const verifiedBackup = sdk.backups.verify(backup.id);
sdk.restores.dryRun({ backupId: backup.id });

sdk.identity.revokeApiToken(token.id);
```

Filesystem-backed Core writes `platform-state.json` as a hash-verified state
envelope and refuses to boot from tampered state. Backup runs include
`artifactPath` and `manifestHash` when the Core has a data directory:

```ts
import { createFileSystemPlatformCore, signWebhookPayload } from "@epoch/platform-core";
import { EpochPlatformSdk } from "@epoch/platform-sdk";

const restoredSdk = new EpochPlatformSdk(
  createFileSystemPlatformCore({
    dataDir: "/srv/epoch/platform-restore",
    restoreFromBackupArtifact: verifiedBackup.artifactPath,
  }),
);

const payload = JSON.stringify({ event: "deployment.executed" });
const signature = signWebhookPayload("whsec", payload);
restoredSdk.api.verifyWebhook({ endpointName: "ops", payload, signature });
```

## Epoch.Platform Web Console

Use `@epoch/platform-web` when a browser-hosted surface needs the current
operations-first console foundation.

```ts
import { renderPlatformConsole } from "@epoch/platform-web";

renderPlatformConsole(document.getElementById("root"), {
  role: "operator",
  productionReady: true,
  projectName: "platform",
  environmentName: "production",
  deployableName: "api-web",
  primaryAction: "Deploy to production",
  deploymentHealth: "healthy",
  communityEnabled: true,
  communityProjectPage: {
    publicSlug: "api-web",
    readme: "Deployable self-hosted API service.",
    deployStatusBadge: "healthy",
    contributionPrompt: "Start with the starter issues.",
    bookmarksCount: 3,
    discussionsCount: 2,
  },
  runnerCount: 1,
  latestDeploymentState: "succeeded",
  packageName: "api-web",
  packageVersion: "1.0.0",
  searchResults: [{ type: "repository", label: "api" }],
  mobileActions: ["Approve", "Rollback", "Ask AI"],
  homeModules: ["pending reviews", "risky deploys"],
  adminSections: ["identity and SSO", "upgrade and support bundle"],
  sdkEquivalent: "sdk.deployments.executePlan(plan.id)",
});
```

## Related Docs

- [Current Design](design.md)
- [CLI Reference](cli.md)
- [Feature Registry](features.md)
- [Frontier VCS Convergence](frontier-vcs-convergence.md)
- [Object Resolver And Native Sync](resolver-sync.md)
- [Workspace Providers](workspace-providers.md)
- [Forge Adapters](forge-adapters.md)
