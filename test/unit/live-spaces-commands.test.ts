import assert from "node:assert/strict";
import {
  createCommunityRuntime,
  createLiveSpaceCommandExtensions,
  createLocalLiveSpacePort,
  EpochCommandError,
  type CommunityRuntime,
  type LiveSessionSnapshot,
  type LiveSpaceApplicationPort,
} from "@epoch/community-runtime";

/**
 * Live Space commands ride the one shared bus: same capability checks, same
 * confirmation rules, same receipt schema as every other Epoch command, from
 * every adapter source. A missing port yields an honest receipt, not a crash.
 */
export async function runLiveSpacesCommandTests(): Promise<void> {
  await capabilityAndConfirmationGatesApplyToLiveCommands();
  await semanticOnlyHostLoopWorksEndToEnd();
  await adapterSourcesYieldEquivalentReceipts();
  await unavailablePortReturnsHonestReceipt();
  await participantAuthorityIsEnforcedByThePort();
}

const HOST = "principal-host";

function portOf(): LiveSpaceApplicationPort {
  let now = 0;
  return createLocalLiveSpacePort({
    now: () => { now += 10; return now; },
    sessionSalt: "test-entropy",
    resolveSpace: (spaceId) => spaceId === "space-1" ? { viewRef: "views/present" } : undefined,
  });
}

function runtimeWith(port: LiveSpaceApplicationPort | undefined, capabilities: readonly string[]): CommunityRuntime {
  return createCommunityRuntime({
    namespace: "test",
    actor: HOST,
    policies: { capabilities },
    now: () => "2026-08-22T00:00:00.000Z",
    extensions: createLiveSpaceCommandExtensions(port, () => HOST),
  });
}

const CREATE_INPUT = {
  spaceId: "space-1",
  policy: {
    visibility: "community",
    presentationViewRef: "views/present",
    allowedPathPatterns: ["packages/app/**"],
    allowedActionIds: ["view.open", "diff.show"],
  },
} as const;

async function capabilityAndConfirmationGatesApplyToLiveCommands(): Promise<void> {
  const restricted = runtimeWith(portOf(), ["workspace.read"]);
  const denied = await restricted.commands.execute({ kind: "live.session.create", input: CREATE_INPUT });
  assert.equal(denied.policy.decision, "deny");
  assert.deepEqual(denied.data, { refused: "capability" });

  const runtime = runtimeWith(portOf(), ["*"]);
  const created = await runtime.commands.execute<LiveSessionSnapshot>({ kind: "live.session.create", input: CREATE_INPUT });
  assert.equal(created.policy.decision, "allow");
  const sessionId = created.data.sessionId;
  await runtime.commands.execute({ kind: "live.session.openLobby", input: { sessionId } });
  await runtime.commands.execute({ kind: "live.session.consent", input: { sessionId, scopes: ["semantic-capture"] } });
  // Irreversible commands require explicit confirmation before the port runs.
  const unconfirmed = await runtime.commands.execute({ kind: "live.session.start", input: { sessionId } });
  assert.equal(unconfirmed.policy.decision, "confirm");
  assert.deepEqual(unconfirmed.data, { refused: "confirmation" });
  const show = await runtime.commands.execute<LiveSessionSnapshot>({ kind: "live.session.show", input: { sessionId } });
  assert.equal(show.data.lifecycle, "lobby");
  const started = await runtime.commands.execute<LiveSessionSnapshot>({
    kind: "live.session.start", input: { sessionId }, confirmed: true,
  });
  assert.equal(started.data.lifecycle, "live");
}

interface StatusData {
  readonly session: LiveSessionSnapshot;
  readonly quarantined: number;
  readonly envelopes: readonly { readonly sequence: number; readonly actionId: string }[];
}

async function semanticOnlyHostLoopWorksEndToEnd(): Promise<void> {
  const runtime = runtimeWith(portOf(), ["*"]);
  const created = await runtime.commands.execute<LiveSessionSnapshot>({ kind: "live.session.create", input: CREATE_INPUT });
  const sessionId = created.data.sessionId;
  // Start refuses while preflight fails: no consent recorded yet.
  await runtime.commands.execute({ kind: "live.session.openLobby", input: { sessionId } });
  await assert.rejects(
    runtime.commands.execute({ kind: "live.session.start", input: { sessionId }, confirmed: true }),
    (error: Error) => error instanceof EpochCommandError && /preflight/u.test(error.message),
  );
  const preflight = await runtime.commands.execute<{ startAllowed: boolean }>({
    kind: "live.session.preflight", input: { sessionId },
  });
  assert.equal(preflight.data.startAllowed, false);
  assert.equal(preflight.validation.state, "invalid");
  await runtime.commands.execute({ kind: "live.session.consent", input: { sessionId, scopes: ["semantic-capture"] } });
  await runtime.commands.execute({ kind: "live.session.start", input: { sessionId }, confirmed: true });

  // Publish a stream-safe action; a secret-bearing one drops with a reason code.
  const published = await runtime.commands.execute<{ decision: { kind: string }; releasedNow: number }>({
    kind: "live.presentation.publish",
    input: { sessionId, actionId: "view.open", args: { view: "board" }, path: "packages/app/board.ts" },
  });
  assert.equal(published.data.decision.kind, "queued");
  assert.equal(published.data.releasedNow, 1);
  const leaked = await runtime.commands.execute<{ decision: { kind: string; reason?: string } }>({
    kind: "live.presentation.publish",
    input: { sessionId, actionId: "view.open", args: { config: { apiKey: "sk-123" } } },
  });
  assert.deepEqual(leaked.data.decision, { kind: "dropped", reason: "immutable-deny" });

  const status = await runtime.commands.execute<StatusData>({ kind: "live.presentation.status", input: { sessionId } });
  assert.equal(status.data.envelopes.length, 1);
  assert.equal(status.data.quarantined, 1);
  // No secret value survives anywhere in the receipt.
  assert.equal(JSON.stringify(status.data).includes("sk-123"), false);

  // Checkpoint → bookmark → annotate → fork, all through the bus.
  const checkpoint = await runtime.commands.execute<{ checkpointId: string }>({
    kind: "live.presentation.checkpoint", input: { sessionId },
  });
  const checkpointId = checkpoint.data.checkpointId;
  await runtime.commands.execute({ kind: "live.presentation.bookmark", input: { sessionId, checkpointId } });
  const annotated = await runtime.commands.execute<{ annotationId: string }>({
    kind: "live.presentation.annotate",
    input: { sessionId, checkpointId, body: "the rail is too wide here", path: "packages/app/board.ts" },
  });
  assert.match(annotated.data.annotationId, /^liveanno_/u);
  const fork = await runtime.commands.execute<{ forkId: string; provenance: { checkpointId: string } }>({
    kind: "live.presentation.forkAt", input: { sessionId, checkpointId },
  });
  assert.equal(fork.data.provenance.checkpointId, checkpointId);
  // A fork against a fabricated checkpoint (a media timestamp) is refused.
  await assert.rejects(
    runtime.commands.execute({ kind: "live.presentation.forkAt", input: { sessionId, checkpointId: "t=00:12:31" } }),
    (error: Error) => error instanceof EpochCommandError && error.code === "policy-denied",
  );

  // End then seal, and the sealed session refuses further configuration.
  await runtime.commands.execute({ kind: "live.session.end", input: { sessionId }, confirmed: true });
  const sealed = await runtime.commands.execute<{ manifest: { completeness: string } }>({
    kind: "live.session.seal", input: { sessionId, completeness: "semantic-only" }, confirmed: true,
  });
  assert.equal(sealed.data.manifest.completeness, "semantic-only");
  await assert.rejects(
    runtime.commands.execute({ kind: "live.session.configure", input: { sessionId, policy: CREATE_INPUT.policy }, confirmed: true }),
    (error: Error) => error instanceof EpochCommandError && error.code === "policy-denied",
  );
}

async function adapterSourcesYieldEquivalentReceipts(): Promise<void> {
  const port = portOf();
  const runtime = runtimeWith(port, ["*"]);
  const fromWeb = await runtime.commands.execute<LiveSessionSnapshot>({
    kind: "live.session.create", input: CREATE_INPUT, source: "web",
  });
  const fromCli = await runtime.commands.execute<LiveSessionSnapshot>({
    kind: "live.session.list", input: {}, source: "cli",
  });
  const fromMcp = await runtime.commands.execute<LiveSessionSnapshot>({
    kind: "live.session.show", input: { sessionId: fromWeb.data.sessionId }, source: "webmcp",
  });
  // Same policy evidence, same receipt schema, same underlying state.
  for (const receipt of [fromWeb, fromCli, fromMcp]) {
    assert.equal(receipt.policy.decision, "allow");
    assert.equal(receipt.confirmation.required, false);
    assert.match(receipt.commandId, /^cmd_/u);
  }
  assert.deepEqual(fromMcp.data, fromWeb.data);
  const catalog = runtime.commands.catalog.filter((descriptor) => descriptor.kind.startsWith("live."));
  assert.ok(catalog.length >= 20);
  for (const descriptor of catalog) {
    assert.ok(descriptor.capability.startsWith("live."), `${descriptor.kind} capability`);
    assert.equal(descriptor.inputSchema.type, "object");
  }
}

async function unavailablePortReturnsHonestReceipt(): Promise<void> {
  const runtime = runtimeWith(undefined, ["*"]);
  const receipt = await runtime.commands.execute<{ refused: string; reason: string }>({
    kind: "live.session.list", input: {},
  });
  assert.equal(receipt.policy.decision, "allow");
  assert.equal(receipt.data.refused, "unavailable");
  assert.equal(receipt.validation.state, "invalid");
  assert.match(receipt.data.reason, /no Live Space application port/u);
}

async function participantAuthorityIsEnforcedByThePort(): Promise<void> {
  const port = portOf();
  const created = await port.createSession({ spaceId: "space-1", actor: HOST, policy: CREATE_INPUT.policy });
  // SAFETY: the local port returns LiveSessionSnapshot data for createSession.
  const sessionId = (created.data as LiveSessionSnapshot).sessionId;
  await port.recordConsent({ sessionId, actor: HOST, scopes: ["semantic-capture"] });
  await port.lifecycle({ sessionId, actor: HOST, command: "openLobby" });
  await port.lifecycle({ sessionId, actor: HOST, command: "start" });

  // Joining grants observation only; observers cannot publish.
  await port.join({ sessionId, actor: "principal-guest" });
  await assert.rejects(async () => { await port.publish({ sessionId, actor: "principal-guest", actionId: "view.open", args: {} }); },
    (error: Error) => error instanceof EpochCommandError && error.code === "policy-denied");
  // A grant request is recorded but grants nothing.
  const requested = await port.requestGrant({ sessionId, actor: "principal-guest", capability: "live.presentation.publish" });
  // SAFETY: the local port returns the request record for requestGrant.
  assert.equal((requested.data as { granted: boolean }).granted, false);
  await assert.rejects(async () => { await port.publish({ sessionId, actor: "principal-guest", actionId: "view.open", args: {} }); },
    (error: Error) => error instanceof EpochCommandError && error.code === "policy-denied");
  // An explicit scoped grant works; revocation wins over the stale client.
  await port.grant({ sessionId, actor: HOST, principalId: "principal-guest", role: "collaborator" });
  const published = await port.publish({
    sessionId, actor: "principal-guest", actionId: "view.open",
    args: { view: "board" }, path: "packages/app/board.ts",
  });
  // SAFETY: the local port returns publish decision data.
  assert.equal((published.data as { decision: { kind: string } }).decision.kind, "queued");
  await port.revoke({ sessionId, actor: HOST, principalId: "principal-guest" });
  await assert.rejects(async () => { await port.publish({ sessionId, actor: "principal-guest", actionId: "view.open", args: {} }); },
    (error: Error) => error instanceof EpochCommandError && error.code === "policy-denied");
  // Locking joins refuses new joiners but keeps existing participants.
  await port.lockJoins({ sessionId, actor: HOST, locked: true });
  await assert.rejects(async () => { await port.join({ sessionId, actor: "principal-late" }); },
    (error: Error) => error instanceof EpochCommandError && error.code === "policy-denied");
  // Non-owners hold no management authority.
  await assert.rejects(async () => { await port.lifecycle({ sessionId, actor: "principal-guest", command: "end" }); },
    (error: Error) => error instanceof EpochCommandError && error.code === "policy-denied");
}
