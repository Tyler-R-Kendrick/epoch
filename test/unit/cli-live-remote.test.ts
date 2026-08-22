import assert from "node:assert/strict";
import { createRemoteLiveSpacePort, resolveCommunityRemote } from "@epoch/cli";
import { EpochCommandError } from "@epoch/community-runtime";

/**
 * `epoch live …` forwards to the deployment that owns the session.
 *
 * The terminal holds no Live Space state, so every method here is a wire
 * translation and the interesting behavior is at the edges: which HTTP status
 * becomes which refusal, what a malformed body degrades to, and which commands
 * this port declines to spell at all. A remote that answers 403 with a policy
 * reason must reach the operator as that reason, not as a generic failure —
 * otherwise the CLI is a worse client than the browser against the same bus.
 *
 * Every request is served by an injected fetch, so nothing here opens a socket.
 */

interface RecordedRequest {
  readonly method: string;
  readonly url: string;
  readonly principal: string | null;
  readonly body: string;
}

interface StubReply {
  readonly status: number;
  /** Sent verbatim, so a test can hand over a body that is not JSON at all. */
  readonly body: string;
}

interface FetchStub {
  readonly fetch: (request: Request) => Promise<Response>;
  readonly requests: readonly RecordedRequest[];
}

function stubFetch(replies: readonly StubReply[]): FetchStub {
  const requests: RecordedRequest[] = [];
  let index = 0;
  return {
    requests,
    fetch: async (request) => {
      requests.push({
        method: request.method,
        url: request.url,
        principal: request.headers.get("X-Epoch-Principal"),
        body: await request.text(),
      });
      const reply = replies[Math.min(index, replies.length - 1)];
      index += 1;
      assert.ok(reply !== undefined, "the stub needs at least one reply");
      return new Response(reply.body, { status: reply.status });
    },
  };
}

function okReply(receipt: string): StubReply {
  return { status: 200, body: `{"receipt":${receipt}}` };
}

function portOver(replies: readonly StubReply[]) {
  const stub = stubFetch(replies);
  return {
    stub,
    port: createRemoteLiveSpacePort({
      // The trailing slash is the shape a person pastes out of a browser bar.
      baseUrl: "https://community.example/",
      fetch: stub.fetch,
      principalId: "did:example:maya",
    }),
  };
}

/** The remote is a flag, then the environment, then nothing. */
function remoteResolutionPrefersTheFlag(): void {
  assert.equal(
    resolveCommunityRemote(["live", "--remote", "https://flag.example"], { EPOCH_COMMUNITY_URL: "https://env.example" }),
    "https://flag.example",
    "an explicit --remote wins over the environment",
  );
  assert.equal(
    resolveCommunityRemote(["live"], { EPOCH_COMMUNITY_URL: "https://env.example" }),
    "https://env.example",
    "the environment is the fallback",
  );
  assert.equal(
    resolveCommunityRemote(["live"], {}),
    undefined,
    "with nothing configured there is no remote, and the CLI builds no port",
  );
  assert.equal(
    resolveCommunityRemote(["live"], { EPOCH_COMMUNITY_URL: "   " }),
    undefined,
    "a blank environment value is not a remote",
  );
  assert.equal(
    // `--remote --confirm` is a person who forgot the value, not a host named "--confirm".
    resolveCommunityRemote(["live", "--remote", "--confirm"], { EPOCH_COMMUNITY_URL: "https://env.example" }),
    "https://env.example",
    "a --remote with no value falls through rather than adopting the next flag",
  );
  assert.equal(
    resolveCommunityRemote(["live", "--remote"], {}),
    undefined,
    "a trailing --remote with nothing after it is not a host",
  );
}

/** Creating a session posts the policy as JSON and returns the receipt's data. */
async function createSessionForwardsPolicyAndPrincipal(): Promise<void> {
  const { port, stub } = portOver([okReply('{"data":{"sessionId":"live-1"},"eventIds":["evt-1","evt-2"]}')]);

  const outcome = await port.createSession({
    spaceId: "space-1",
    actor: "did:example:maya",
    policy: { visibility: "unlisted", allowedActionIds: ["view.switch"] },
  });

  assert.deepEqual(outcome.data, { sessionId: "live-1" });
  assert.deepEqual(outcome.eventIds, ["evt-1", "evt-2"]);

  const request = stub.requests[0];
  assert.ok(request !== undefined, "the port must have issued a request");
  assert.equal(request.method, "POST");
  assert.equal(
    request.url,
    "https://community.example/community/live/sessions",
    "the trailing slash on the base URL must not double up in the path",
  );
  assert.equal(request.principal, "did:example:maya", "the principal travels as a header, never in the path");
  assert.deepEqual(JSON.parse(request.body), {
    input: { spaceId: "space-1", policy: { visibility: "unlisted", allowedActionIds: ["view.switch"] } },
    confirmed: true,
  });
}

/** Session ids reach the path encoded, and reads stay GETs. */
async function readsAreGetsWithEncodedIds(): Promise<void> {
  const { port, stub } = portOver([okReply('{"data":{"lifecycle":"live"}}')]);

  const outcome = await port.showSession("live/../admin");

  assert.deepEqual(outcome.data, { lifecycle: "live" });
  const request = stub.requests[0];
  assert.ok(request !== undefined, "the port must have issued a request");
  assert.equal(request.method, "GET");
  assert.equal(
    request.url,
    "https://community.example/community/live/sessions/live%2F..%2Fadmin",
    "a session id must be encoded into the path, never spliced into it",
  );
  assert.equal(request.body, "", "a read carries no body");
}

/** Every command method funnels through one command route with its own kind. */
async function commandsCarryTheirKind(): Promise<void> {
  const { port, stub } = portOver([okReply('{"data":null}')]);

  await port.lifecycle({ sessionId: "live-1", actor: "did:example:maya", command: "pause" });

  const request = stub.requests[0];
  assert.ok(request !== undefined, "the port must have issued a request");
  assert.equal(request.url, "https://community.example/community/live/sessions/live-1/commands");
  assert.deepEqual(JSON.parse(request.body), { kind: "live.session.pause", input: {}, confirmed: true });
}

/** An optional anchor is omitted rather than sent as null. */
async function optionalPathsAreOmittedNotNulled(): Promise<void> {
  const { port, stub } = portOver([okReply('{"data":null}'), okReply('{"data":null}')]);

  await port.publish({ sessionId: "live-1", actor: "a", actionId: "view.switch", args: { view: "feed" } });
  await port.publish({ sessionId: "live-1", actor: "a", actionId: "view.switch", args: {}, path: "docs/design.md" });

  const withoutPath = stub.requests[0];
  const withPath = stub.requests[1];
  assert.ok(withoutPath !== undefined && withPath !== undefined, "both publishes must have been issued");
  assert.deepEqual(JSON.parse(withoutPath.body).input, { actionId: "view.switch", args: { view: "feed" } });
  assert.deepEqual(JSON.parse(withPath.body).input, { actionId: "view.switch", args: {}, path: "docs/design.md" });
}

/**
 * Status mapping is the whole reason this file exists: a refusal must arrive as
 * the deployment's own reason, and a 409 must tell the operator what to type.
 */
async function statusesBecomeTheRefusalsTheyMean(): Promise<void> {
  await assertRejection(
    [{ status: 404, body: "" }],
    "not-found",
    /Live session not found/u,
  );
  await assertRejection(
    [{ status: 403, body: '{"error":{"detail":"policy narrowed after consent"}}' }],
    "policy-denied",
    /policy narrowed after consent/u,
  );
  await assertRejection(
    [{ status: 403, body: '{"receipt":{"policy":{"reason":"observer may not publish"}}}' }],
    "policy-denied",
    /observer may not publish/u,
  );
  await assertRejection(
    [{ status: 403, body: "{}" }],
    "policy-denied",
    /refused by policy/u,
  );
  await assertRejection(
    [{ status: 409, body: "{}" }],
    "confirmation-required",
    /--confirm/u,
  );
  await assertRejection(
    [{ status: 500, body: "" }],
    "remote-error",
    /Live request failed \(500\)/u,
  );
  await assertRejection(
    [{ status: 500, body: '{"error":{"detail":"presentation log is quarantined"}}' }],
    "remote-error",
    /presentation log is quarantined/u,
  );
}

async function assertRejection(
  replies: readonly StubReply[],
  code: string,
  message: RegExp,
): Promise<void> {
  const { port } = portOver(replies);
  let rejection: EpochCommandError | null = null;
  try {
    await port.status("live-1");
  } catch (error) {
    if (error instanceof EpochCommandError) rejection = error;
  }
  assert.ok(rejection !== null, `a ${code} reply must reject with an EpochCommandError`);
  assert.equal(rejection.code, code);
  assert.match(rejection.message, message);
}

/**
 * A deployment that answers 200 with something unusable must not crash the
 * terminal. The receipt degrades to null data, which prints as "nothing to
 * show" rather than as a stack trace.
 */
async function unusableBodiesDegradeToNullData(): Promise<void> {
  for (const body of ["", "   ", "not json at all", "null", "[1,2,3]", '{"receipt":"not-an-object"}', "{}"]) {
    const { port } = portOver([{ status: 200, body }]);
    const outcome = await port.status("live-1");
    assert.equal(outcome.data, null, `a 200 carrying ${JSON.stringify(body)} must degrade to null data`);
    assert.equal(outcome.eventIds, undefined, "no receipt means no event ids to claim");
  }
}

/** Event ids are evidence, so anything that is not a string is dropped. */
async function nonStringEventIdsAreDropped(): Promise<void> {
  const { port } = portOver([okReply('{"data":null,"eventIds":["evt-1",7,null,{"id":"evt-2"},"evt-3"]}')]);
  const outcome = await port.status("live-1");
  assert.deepEqual(outcome.eventIds, ["evt-1", "evt-3"]);
}

/**
 * A media credential has no CLI spelling. This port refuses rather than
 * fetching one into a shell history, and refuses before any request is made.
 */
async function mediaCredentialsAreUnreachableFromTheTerminal(): Promise<void> {
  const { port, stub } = portOver([okReply('{"data":null}')]);

  for (const attempt of [
    async () => {
      await port.issueMediaToken({
        sessionId: "live-1",
        actor: "did:example:maya",
        requestedSources: ["microphone"],
      });
    },
    async () => {
      await port.recordProviderEvent({
        sessionId: "live-1",
        actor: "did:example:maya",
        providerKind: "livekit",
        eventKind: "room_started",
        roomRef: "epoch-abc",
        eventDigest: "sha256:abc",
      });
    },
  ]) {
    let rejection: EpochCommandError | null = null;
    try {
      await attempt();
    } catch (error) {
      if (error instanceof EpochCommandError) rejection = error;
    }
    assert.ok(rejection !== null, "a media command must reject with an EpochCommandError");
    assert.equal(rejection.code, "policy-denied");
  }

  assert.equal(stub.requests.length, 0, "a refused media command must never reach the network");
}

/** The remaining wire translations, asserted as one table so each one is named. */
async function everyCommandSpellsItsOwnKind(): Promise<void> {
  const { port, stub } = portOver([okReply('{"data":null}')]);

  await port.listSessions();
  await port.preflight("live-1");
  await port.configure({ sessionId: "live-1", actor: "a", policy: { visibility: "public" }, confirmed: true });
  await port.recordConsent({ sessionId: "live-1", actor: "a", scopes: ["semantic-capture", "audio"] });
  await port.seal({ sessionId: "live-1", actor: "a", completeness: "complete" });
  await port.join({ sessionId: "live-1", actor: "a" });
  await port.requestGrant({ sessionId: "live-1", actor: "a", capability: "live.presentation.publish" });
  await port.grant({ sessionId: "live-1", actor: "a", principalId: "did:example:sam", role: "collaborator" });
  await port.revoke({ sessionId: "live-1", actor: "a", principalId: "did:example:sam" });
  await port.lockJoins({ sessionId: "live-1", actor: "a", locked: true });
  await port.checkpoint({ sessionId: "live-1", actor: "a" });
  await port.bookmark({ sessionId: "live-1", actor: "a", checkpointId: "cp-1" });
  await port.annotate({ sessionId: "live-1", actor: "a", checkpointId: "cp-1", body: "here" });
  await port.annotate({ sessionId: "live-1", actor: "a", checkpointId: "cp-1", body: "here", path: "docs/x.md" });
  await port.forkAt({ sessionId: "live-1", actor: "a", checkpointId: "cp-1" });
  await port.report({ sessionId: "live-1", actor: "a", reason: "abuse" });

  const kinds = stub.requests
    .filter((request) => request.body !== "")
    .map((request) => JSON.parse(request.body).kind)
    .filter((kind) => kind !== undefined);

  assert.deepEqual(kinds, [
    "live.session.list",
    "live.session.preflight",
    "live.session.configure",
    "live.session.consent",
    "live.session.seal",
    "live.participant.requestGrant",
    "live.participant.grant",
    "live.participant.revoke",
    "live.participant.lockJoins",
    "live.presentation.checkpoint",
    "live.presentation.bookmark",
    "live.presentation.annotate",
    "live.presentation.annotate",
    "live.presentation.forkAt",
    "live.moderation.report",
  ]);

  const joinRequest = stub.requests.find((request) =>
    request.url.endsWith("/community/live/sessions/live-1/join"));
  assert.ok(joinRequest !== undefined, "join has its own route rather than a command kind");
  assert.equal(joinRequest.method, "POST");
}

export async function runCliLiveRemoteTests(): Promise<void> {
  remoteResolutionPrefersTheFlag();
  await createSessionForwardsPolicyAndPrincipal();
  await readsAreGetsWithEncodedIds();
  await commandsCarryTheirKind();
  await optionalPathsAreOmittedNotNulled();
  await statusesBecomeTheRefusalsTheyMean();
  await unusableBodiesDegradeToNullData();
  await nonStringEventIdsAreDropped();
  await mediaCredentialsAreUnreachableFromTheTerminal();
  await everyCommandSpellsItsOwnKind();
  console.log("CLI live remote port tests passed");
}
