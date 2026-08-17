import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createAuthenticatedNatsLiveProvider,
  createLiveStore,
  createNatsLiveProvider,
} from "@epoch/live";
import {
  connectGatedNatsBus,
  createAuthCalloutHandler,
  createInMemoryNatsBus,
  createPlatformAuthValidator,
  openAuthenticatedNatsLiveChannel,
} from "../dist/index.js";

const VALID_SECRET = "fabric-ok";
const REPO_ID = "live-auth-demo";

function createGatedConnect() {
  const shared = createInMemoryNatsBus();
  const validator = createPlatformAuthValidator({
    verifyFabricCredential: (secret) => {
      if (secret !== VALID_SECRET) return null;
      return {
        id: "cred-live",
        kind: "session",
        subjectRef: "user:live",
        scopes: ["fabric:human"],
        expiresAt: Date.now() + 60_000,
      };
    },
  });
  const handler = createAuthCalloutHandler(validator);
  const gate = async (token) => {
    const decision = await handler({ authToken: token });
    return decision.type === "allow";
  };
  return {
    shared,
    connect: (secret) => connectGatedNatsBus(() => shared, gate, secret),
  };
}

test("nats live auth: two valid secrets converge over gated bus", async () => {
  const { shared, connect } = createGatedConnect();
  const aliceOpened = await openAuthenticatedNatsLiveChannel({
    repoId: REPO_ID,
    fabricSecret: VALID_SECRET,
    connect,
  });
  assert.equal(aliceOpened.providerId, `nats:${REPO_ID}`);

  const alice = createLiveStore({ entity: "shared", author: "alice", initialState: {} });
  const bob = createLiveStore({ entity: "shared", author: "bob", initialState: {} });
  alice.connect(createNatsLiveProvider(aliceOpened.channel, aliceOpened.providerId));
  const bobProvider = await createAuthenticatedNatsLiveProvider({
    repoId: REPO_ID,
    fabricSecret: VALID_SECRET,
    connect: async (secret) =>
      openAuthenticatedNatsLiveChannel({
        repoId: REPO_ID,
        fabricSecret: secret,
        connect,
      }),
  });
  bob.connect(bobProvider);
  assert.equal(bobProvider.id, `nats:${REPO_ID}`);
  assert.equal(bobProvider.status(), "online");

  alice.dispatch({ type: "set", payload: { title: "hello-fabric" } });
  assert.equal(bob.getState().title, "hello-fabric");

  aliceOpened.stop();
  bobProvider.disconnect();
  shared.close();
});

test("nats live auth: invalid secret cannot receive sync", async () => {
  const { shared, connect } = createGatedConnect();
  const aliceOpened = await openAuthenticatedNatsLiveChannel({
    repoId: REPO_ID,
    fabricSecret: VALID_SECRET,
    connect,
  });
  const alice = createLiveStore({ entity: "shared", author: "alice", initialState: {} });
  const mallory = createLiveStore({ entity: "shared", author: "mallory", initialState: {} });
  alice.connect(createNatsLiveProvider(aliceOpened.channel, aliceOpened.providerId));

  await assert.rejects(
    () =>
      openAuthenticatedNatsLiveChannel({
        repoId: REPO_ID,
        fabricSecret: "not-a-credential",
        connect,
      }),
    /nats connect denied/,
  );
  await assert.rejects(
    () =>
      openAuthenticatedNatsLiveChannel({
        repoId: REPO_ID,
        fabricSecret: "",
        connect,
      }),
    /nats connect denied/,
  );
  await assert.rejects(
    () =>
      openAuthenticatedNatsLiveChannel({
        repoId: REPO_ID,
        fabricSecret: "   ",
        connect,
      }),
    /nats connect denied/,
  );
  await assert.rejects(
    () =>
      openAuthenticatedNatsLiveChannel({
        repoId: "",
        fabricSecret: VALID_SECRET,
        connect,
      }),
    /nats connect denied/,
  );
  await assert.rejects(
    () =>
      createAuthenticatedNatsLiveProvider({
        repoId: REPO_ID,
        fabricSecret: "",
        connect: async () => {
          throw new Error("connect must not run for an empty secret");
        },
      }),
    /nats connect denied/,
  );
  await assert.rejects(
    () =>
      createAuthenticatedNatsLiveProvider({
        repoId: REPO_ID,
        fabricSecret: "not-a-credential",
        connect: async (secret) =>
          openAuthenticatedNatsLiveChannel({
            repoId: REPO_ID,
            fabricSecret: secret,
            connect,
          }),
      }),
    /nats connect denied/,
  );

  alice.dispatch({ type: "set", payload: { title: "classified" } });
  assert.equal(alice.getState().title, "classified");
  assert.equal(mallory.getState().title, undefined, "unauthenticated peer never received sync");

  aliceOpened.stop();
  shared.close();
});
