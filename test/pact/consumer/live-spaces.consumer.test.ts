import assert from "node:assert/strict";
import { MatchersV3 } from "@pact-foundation/pact";
import { createRemoteLiveSpacePort } from "@epoch/cli";
import { EpochCommandError } from "@epoch/community-runtime";
import { createConsumerPact, PactConsumers, PactProviders } from "../helpers";

/**
 * Consumer-driven contract: the CLI's Live Space port → Epoch.Community.API.
 *
 * The terminal owns no Live Space state; it forwards each command and prints
 * whatever the deployment decided. That makes the wire shape the whole
 * agreement, and these cases pin the parts a surface would silently misread:
 * where the receipt lives, that a refusal is a 403 carrying its own reason,
 * and that a media credential has no CLI-reachable route at all.
 *
 * The real `createRemoteLiveSpacePort` drives every case — a hand-rolled
 * request here would verify a client nobody ships.
 *
 * @see https://docs.pact.io/implementation_guides/javascript/docs/consumer
 */
export async function runLiveSpacesConsumerContractTests(): Promise<void> {
  await cliReadsASessionSnapshot();
  await cliForwardsACommandAndAdoptsTheReceipt();
  await cliSurfacesAPolicyRefusalWithItsReason();
  await cliRefusesMediaCredentialsWithoutAskingTheDeployment();
}

const PRINCIPAL = "principal-cli-host";
const SESSION = "livesession-pact";

function portFor(url: string): ReturnType<typeof createRemoteLiveSpacePort> {
  return createRemoteLiveSpacePort({
    baseUrl: url,
    fetch: (request) => fetch(request),
    principalId: PRINCIPAL,
  });
}

async function cliReadsASessionSnapshot(): Promise<void> {
  const provider = createConsumerPact({
    consumer: PactConsumers.cliLiveSpaces,
    provider: PactProviders.communityApi,
  });

  provider
    .given("live session livesession-pact is live")
    .uponReceiving("a GET of one live session")
    .withRequest({
      method: "GET",
      path: `/community/live/sessions/${SESSION}`,
      headers: { "X-Epoch-Principal": PRINCIPAL },
    })
    .willRespondWith({
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: {
        schemaVersion: MatchersV3.integer(1),
        receipt: {
          // The CLI reads `receipt.data` and nothing else on the success path.
          data: MatchersV3.like({ sessionId: SESSION, lifecycle: "live" }),
          policy: MatchersV3.like({ decision: "allow" }),
        },
      },
    });

  await provider.executeTest(async (mockServer) => {
    const outcome = await portFor(mockServer.url).showSession(SESSION);
    assert.notEqual(outcome.data, null, "a session read must surface the receipt's data");
  });
}

async function cliForwardsACommandAndAdoptsTheReceipt(): Promise<void> {
  const provider = createConsumerPact({
    consumer: PactConsumers.cliLiveSpaces,
    provider: PactProviders.communityApi,
  });

  provider
    .given("live session livesession-pact is live")
    .uponReceiving("a POST of one live command")
    .withRequest({
      method: "POST",
      path: `/community/live/sessions/${SESSION}/commands`,
      headers: {
        "Content-Type": "application/json",
        "X-Epoch-Principal": PRINCIPAL,
      },
      // The kind travels in the body; the deployment's bus, not the path,
      // decides what the command is.
      body: { kind: "live.presentation.status", input: {}, confirmed: true },
    })
    .willRespondWith({
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: {
        schemaVersion: MatchersV3.integer(1),
        receipt: {
          data: MatchersV3.like({ quarantined: 0 }),
          eventIds: MatchersV3.eachLike("event-pact", 0),
          policy: MatchersV3.like({ decision: "allow" }),
        },
      },
    });

  await provider.executeTest(async (mockServer) => {
    const outcome = await portFor(mockServer.url).status(SESSION);
    assert.notEqual(outcome.data, null, "a command must surface the receipt's data");
  });
}

async function cliSurfacesAPolicyRefusalWithItsReason(): Promise<void> {
  const provider = createConsumerPact({
    consumer: PactConsumers.cliLiveSpaces,
    provider: PactProviders.communityApi,
  });

  const reason = "publishing is not permitted for this participant";

  provider
    .given("live session livesession-pact refuses publication from this principal")
    .uponReceiving("a POST of a live command the deployment refuses")
    .withRequest({
      method: "POST",
      path: `/community/live/sessions/${SESSION}/commands`,
      headers: {
        "Content-Type": "application/json",
        "X-Epoch-Principal": PRINCIPAL,
      },
      body: {
        kind: "live.presentation.publish",
        input: { actionId: "view.open", args: { view: "board" } },
        confirmed: true,
      },
    })
    .willRespondWith({
      // A refusal is an answer, not a transport failure, and it carries the
      // reason the operator would read on any other surface.
      status: 403,
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: {
        schemaVersion: MatchersV3.integer(1),
        error: { code: "policy-denied", detail: MatchersV3.string(reason) },
      },
    });

  await provider.executeTest(async (mockServer) => {
    const port = portFor(mockServer.url);
    let refusal: EpochCommandError | undefined;
    try {
      await port.publish({ sessionId: SESSION, actor: PRINCIPAL, actionId: "view.open", args: { view: "board" } });
    } catch (error) {
      if (error instanceof EpochCommandError) refusal = error;
    }
    assert.equal(refusal?.code, "policy-denied", "the CLI must report the deployment's refusal, not a transport error");
    assert.equal(refusal?.message, reason, "and must print the deployment's own reason rather than inventing one");
  });
}

/**
 * The absence of a request is the contract here.
 *
 * A terminal cannot hold a media credential safely — shell history, scrollback
 * and process listings all outlive the token — so the port refuses locally.
 * Pact verifies that by declaring no interaction at all: if the port ever
 * reached for the route, the mock server would record an unexpected request
 * and fail the test.
 */
async function cliRefusesMediaCredentialsWithoutAskingTheDeployment(): Promise<void> {
  const provider = createConsumerPact({
    consumer: PactConsumers.cliLiveSpaces,
    provider: PactProviders.communityApi,
  });

  provider
    .given("live session livesession-pact is live")
    .uponReceiving("a GET of one live session before the media refusal")
    .withRequest({
      method: "GET",
      path: `/community/live/sessions/${SESSION}`,
      headers: { "X-Epoch-Principal": PRINCIPAL },
    })
    .willRespondWith({
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: {
        schemaVersion: MatchersV3.integer(1),
        receipt: { data: MatchersV3.like({ sessionId: SESSION }) },
      },
    });

  await provider.executeTest(async (mockServer) => {
    const port = portFor(mockServer.url);
    await port.showSession(SESSION);

    let refusal: EpochCommandError | undefined;
    try {
      await port.issueMediaToken({ sessionId: SESSION, actor: PRINCIPAL, requestedSources: ["camera"] });
    } catch (error) {
      if (error instanceof EpochCommandError) refusal = error;
    }
    assert.equal(refusal?.code, "policy-denied", "a terminal must never be issued a media credential");
    assert.match(refusal?.message ?? "", /not issued to the CLI/u);
  });
}
