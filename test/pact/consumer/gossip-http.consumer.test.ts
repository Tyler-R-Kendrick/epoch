import assert from "node:assert/strict";
import { MatchersV3 } from "@pact-foundation/pact";
import { HttpGossipPeer, type MemoryEpochTransportSnapshot } from "@epoch/core";
import { createConsumerPact, PactConsumers, PactProviders } from "../helpers";

/**
 * Consumer-driven contract: Epoch.Core gossip client → Epoch.Core.GossipHttp
 * Exercises the real HttpGossipPeer against a Pact mock provider.
 *
 * Response matchers are structural: after exchange the provider returns its
 * post-merge snapshot (events/blobs/heads), not a fixed empty body.
 *
 * @see https://docs.pact.io/implementation_guides/javascript/docs/consumer
 */
export async function runGossipHttpConsumerContractTests(): Promise<void> {
  await gossipClientExchangesSnapshotWithPeer();
}

const sampleSnapshot: MemoryEpochTransportSnapshot = {
  events: [],
  blobs: {},
  heads: ["head-a"],
};

async function gossipClientExchangesSnapshotWithPeer(): Promise<void> {
  const provider = createConsumerPact({
    consumer: PactConsumers.epochCoreGossip,
    provider: PactProviders.gossipHttp,
  });

  provider
    .given("gossip peer repository is initialized")
    .uponReceiving("a POST snapshot exchange on /epoch/gossip")
    .withRequest({
      method: "POST",
      path: "/epoch/gossip",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: sampleSnapshot,
    })
    .willRespondWith({
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: {
        // Structural contract: snapshot shape only (provider may include its own events).
        events: MatchersV3.like([]),
        blobs: MatchersV3.like({}),
        heads: MatchersV3.eachLike("deadbeef", 0),
      },
    });

  await provider.executeTest(async (mockServer) => {
    const peer = new HttpGossipPeer(mockServer.url);
    const remote = await peer.exchange(sampleSnapshot);
    assert.ok(Array.isArray(remote.events));
    assert.equal(typeof remote.blobs, "object");
    assert.ok(Array.isArray(remote.heads));
  });
}
