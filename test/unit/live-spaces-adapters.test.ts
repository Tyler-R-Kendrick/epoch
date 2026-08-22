import assert from "node:assert/strict";
import {
  communityRuntimeUsage,
  createCommunityRuntime,
  createLiveSpaceClient,
  createLiveSpaceCommandExtensions,
  createLocalLiveSpacePort,
  createWebMcpTools,
  DEFAULT_WEBMCP_EXCLUDED_KINDS,
  executeCommunityRuntimeCommand,
  isCommunityRuntimeInvocation,
  toolName,
  type CommunityRuntime,
  type LiveSessionSnapshot,
  type LiveSpaceApplicationPort,
} from "@epoch/community-runtime";

/**
 * Adapter parity.
 *
 * The CLI, the SDK, WebMCP, and the browser are four spellings of one command
 * bus. These tests hold them to that: the same policy decision, the same
 * confirmation rule, the same receipt schema, and — where it matters most —
 * the same refusals. A surface that could do something the others cannot would
 * be a second implementation of the product.
 */
export async function runLiveSpacesAdapterTests(): Promise<void> {
  await liveCommandsAreRoutedFromTheCli();
  await cliRefusesUnconfirmedIrreversibleCommands();
  await cliWithoutARemoteReportsHonestly();
  await sdkClientAndCliProduceEquivalentReceipts();
  webMcpWithholdsSecretBearingToolsWithoutWeakeningAuthority();
  await webMcpAgentGetsTheSameRefusalAsAPerson();
}

const HOST = "principal-host";

function runtimeWith(port: LiveSpaceApplicationPort | undefined): CommunityRuntime {
  return createCommunityRuntime({
    namespace: "adapters",
    actor: HOST,
    policies: { capabilities: ["*"] },
    now: () => "2026-08-22T00:00:00.000Z",
    extensions: createLiveSpaceCommandExtensions(port, () => HOST),
  });
}

function localPort(): LiveSpaceApplicationPort {
  let now = 0;
  return createLocalLiveSpacePort({
    now: () => { now += 10; return now; },
    sessionSalt: "adapter-entropy",
    resolveSpace: (spaceId) => spaceId === "space-1" ? { viewRef: "views/present" } : undefined,
  });
}

const CREATE_ARGS = [
  "live", "create",
  "--space", "space-1",
  "--view", "views/present",
  "--visibility", "community",
  "--path", "packages/app/**",
  "--action", "view.open",
  "--action", "diff.show",
] as const;

async function liveCommandsAreRoutedFromTheCli(): Promise<void> {
  assert.equal(isCommunityRuntimeInvocation(["live", "list"]), true);
  assert.match(communityRuntimeUsage, /epoch live create --space SPACE/u);
  // The usage text says plainly that live commands need a deployment.
  assert.match(communityRuntimeUsage, /configured Community remote/u);
  // No CLI verb mints or ingests a media credential.
  assert.equal(/epoch live (media|token)/u.test(communityRuntimeUsage), false);
  assert.equal(communityRuntimeUsage.includes("issueToken"), false);

  const runtime = runtimeWith(localPort());
  const created = await executeCommunityRuntimeCommand(runtime, [...CREATE_ARGS, "--json"]);
  assert.equal(created.ok, true);
  const receipt = created.receipt;
  if (receipt === undefined) throw new Error("expected a receipt");
  assert.equal(receipt.source, "cli");
  assert.equal(receipt.policy.decision, "allow");
  // SAFETY: live.session.create returns a session snapshot.
  const sessionId = (receipt.data as LiveSessionSnapshot).sessionId;

  // Repeated flags accumulate into the allow-list rather than overwriting.
  const shown = await executeCommunityRuntimeCommand(runtime, ["live", "show", sessionId, "--json"]);
  // SAFETY: live.session.show returns a session snapshot.
  const snapshot = shown.receipt?.data as LiveSessionSnapshot;
  assert.equal(snapshot.presentationViewRef, "views/present");
  assert.equal(snapshot.visibility, "community");

  // Human output is a formatter over the receipt, not a second rendering path.
  const human = await executeCommunityRuntimeCommand(runtime, ["live", "show", sessionId]);
  assert.match(human.output, /^live\.session\.show\t/u);
  assert.match(human.output, /\tallow/u);

  // An unknown live verb prints usage instead of guessing.
  const unknown = await executeCommunityRuntimeCommand(runtime, ["live", "teleport", sessionId]);
  assert.equal(unknown.ok, false);
  assert.match(unknown.output, /epoch live create/u);
}

async function cliRefusesUnconfirmedIrreversibleCommands(): Promise<void> {
  const runtime = runtimeWith(localPort());
  const created = await executeCommunityRuntimeCommand(runtime, [...CREATE_ARGS, "--json"]);
  // SAFETY: live.session.create returns a session snapshot.
  const sessionId = (created.receipt?.data as LiveSessionSnapshot).sessionId;
  await executeCommunityRuntimeCommand(runtime, ["live", "consent", sessionId, "--scope", "semantic-capture"]);
  await executeCommunityRuntimeCommand(runtime, ["live", "lobby", sessionId]);

  const unconfirmed = await executeCommunityRuntimeCommand(runtime, ["live", "start", sessionId]);
  assert.equal(unconfirmed.ok, false);
  assert.match(unconfirmed.output, /confirmation required — re-run with --confirm/u);
  assert.equal(unconfirmed.receipt?.policy.decision, "confirm");

  const confirmed = await executeCommunityRuntimeCommand(runtime, ["live", "start", sessionId, "--confirm", "--json"]);
  assert.equal(confirmed.ok, true);
  // SAFETY: live.session.start returns a session snapshot.
  assert.equal((confirmed.receipt?.data as LiveSessionSnapshot).lifecycle, "live");
}

async function cliWithoutARemoteReportsHonestly(): Promise<void> {
  const runtime = runtimeWith(undefined);
  const result = await executeCommunityRuntimeCommand(runtime, ["live", "list", "--json"]);
  const receipt = result.receipt;
  if (receipt === undefined) throw new Error("expected a receipt");
  // The command still runs and still returns a receipt; it simply reports that
  // this host has nowhere to run Live Spaces.
  assert.equal(receipt.policy.decision, "allow");
  assert.equal(receipt.validation.state, "invalid");
  // SAFETY: an unavailable port returns the refusal record.
  const data = receipt.data as { readonly refused: string; readonly reason: string };
  assert.equal(data.refused, "unavailable");
  assert.match(data.reason, /no Live Space application port/u);
}

async function sdkClientAndCliProduceEquivalentReceipts(): Promise<void> {
  const port = localPort();
  const runtime = runtimeWith(port);
  const client = createLiveSpaceClient(runtime);

  const viaSdk = await client.create({
    spaceId: "space-1",
    policy: {
      presentationViewRef: "views/present",
      visibility: "community",
      allowedPathPatterns: ["packages/app/**"],
      allowedActionIds: ["view.open", "diff.show"],
    },
  });
  assert.equal(viaSdk.source, "sdk");
  assert.equal(viaSdk.policy.decision, "allow");

  const viaCli = await executeCommunityRuntimeCommand(runtime, [...CREATE_ARGS, "--json"]);
  const cliReceipt = viaCli.receipt;
  if (cliReceipt === undefined) throw new Error("expected a receipt");

  // Different sources, identical contract: same policy evidence, same shape.
  assert.equal(cliReceipt.policy.decision, viaSdk.policy.decision);
  assert.equal(cliReceipt.policy.capability, viaSdk.policy.capability);
  assert.equal(cliReceipt.confirmation.required, viaSdk.confirmation.required);
  assert.deepEqual(Object.keys(cliReceipt).sort(), Object.keys(viaSdk).sort());
  assert.deepEqual(
    Object.keys(cliReceipt.data ?? {}).sort(),
    Object.keys(viaSdk.data).sort(),
    "both surfaces return the same session snapshot shape",
  );

  // The SDK holds the same confirmation line as every other adapter.
  await client.consent(viaSdk.data.sessionId, ["semantic-capture"]);
  await client.openLobby(viaSdk.data.sessionId);
  const unconfirmed = await client.start(viaSdk.data.sessionId);
  assert.equal(unconfirmed.policy.decision, "confirm");
  const started = await client.start(viaSdk.data.sessionId, { confirmed: true });
  assert.equal(started.data.lifecycle, "live");

  // A request for authority is still not authority, whichever surface asks.
  const requested = await client.requestGrant(viaSdk.data.sessionId, "live.presentation.publish");
  // SAFETY: requestGrant returns the recorded request.
  assert.equal((requested.data as { readonly granted: boolean }).granted, false);
}

function webMcpWithholdsSecretBearingToolsWithoutWeakeningAuthority(): void {
  const runtime = runtimeWith(localPort());
  const tools = createWebMcpTools(runtime);
  const names = new Set(tools.map((tool) => tool.name));

  // Session and presentation commands are available to an agent...
  assert.equal(names.has(toolName("live.session.create")), true);
  assert.equal(names.has(toolName("live.presentation.forkAt")), true);
  // ...while the credential-bearing provider commands are not advertised.
  for (const kind of DEFAULT_WEBMCP_EXCLUDED_KINDS) {
    assert.equal(names.has(toolName(kind)), false, `${kind} must not be registered by default`);
  }
  // Withholding is presentation, not enforcement: the bus still knows them.
  assert.equal(runtime.commands.describe("live.media.issueToken").capability, "live.media.subscribe");

  // Untrusted-content and read-only hints come from the descriptors themselves.
  const status = tools.find((tool) => tool.name === toolName("live.presentation.status"));
  assert.equal(status?.annotations.readOnlyHint, true);
  const publish = tools.find((tool) => tool.name === toolName("live.presentation.publish"));
  assert.equal(publish?.annotations.readOnlyHint, false);

  // An operator can widen or narrow the withheld set explicitly.
  const everything = createWebMcpTools(runtime, { excludeKinds: [] });
  assert.equal(everything.some((tool) => tool.name === toolName("live.media.issueToken")), true);
}

async function webMcpAgentGetsTheSameRefusalAsAPerson(): Promise<void> {
  const runtime = runtimeWith(localPort());
  const tools = createWebMcpTools(runtime);
  const create = tools.find((tool) => tool.name === toolName("live.session.create"));
  const start = tools.find((tool) => tool.name === toolName("live.session.start"));
  if (create === undefined || start === undefined) throw new Error("expected live tools");

  const created = JSON.parse(await create.execute({
    spaceId: "space-1",
    policy: {
      presentationViewRef: "views/present",
      visibility: "community",
      allowedPathPatterns: ["packages/app/**"],
      allowedActionIds: ["view.open"],
    },
  }));
  assert.equal(created.decision, "allow");
  const sessionId = created.data.sessionId;

  const consent = tools.find((tool) => tool.name === toolName("live.session.consent"));
  const lobby = tools.find((tool) => tool.name === toolName("live.session.openLobby"));
  await consent?.execute({ sessionId, scopes: ["semantic-capture"] });
  await lobby?.execute({ sessionId });

  // An agent that simply asks does not get an irreversible action.
  const refused = JSON.parse(await start.execute({ sessionId }));
  assert.equal(refused.decision, "confirm");
  assert.equal(refused.confirmationRequired, true);

  // A host that satisfied confirmation through real interaction may pass it on.
  const confirmedTools = createWebMcpTools(runtime, { confirmedKinds: ["live.session.start"] });
  const confirmedStart = confirmedTools.find((tool) => tool.name === toolName("live.session.start"));
  const allowed = JSON.parse(await (confirmedStart?.execute({ sessionId }) ?? Promise.resolve("{}")));
  assert.equal(allowed.decision, "allow");
  assert.equal(allowed.data.lifecycle, "live");
}
