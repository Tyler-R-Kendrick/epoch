/**
 * Chaos / fault-injection for intra-community NATS service discovery.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ServiceDiscoveryDeniedError,
  createInMemoryServiceDirectory,
} from "../dist/index.js";

test("chaos: clock jump drops advertisements", () => {
  let now = 5_000;
  const directory = createInMemoryServiceDirectory({
    allowServiceDiscovery: true,
    communityId: "civic",
    ttlMs: 50,
    now: () => now,
  });
  directory.advertise({ name: "live", endpoint: "epoch.live.civic.>" });
  now += 51;
  assert.deepEqual(directory.lookup("live"), []);
});

test("chaos: concurrent advertised names stay isolated", () => {
  const directory = createInMemoryServiceDirectory({
    allowServiceDiscovery: true,
    communityId: "civic",
  });
  directory.advertise({ name: "live", endpoint: "epoch.live.civic.>" });
  directory.advertise({ name: "stream", endpoint: "epoch.community.stream.civic.>" });
  assert.equal(directory.lookup("live").length, 1);
  assert.equal(directory.lookup("stream").length, 1);
  assert.deepEqual(directory.lookup("missing"), []);
});

test("chaos: shared snapshot cannot leak across source servers", () => {
  const a = createInMemoryServiceDirectory({
    allowServiceDiscovery: true,
    communityId: "civic",
    sourceServer: "server-a",
  });
  a.advertise({ name: "live", endpoint: "epoch.live.server-a.>" });
  const b = createInMemoryServiceDirectory({
    allowServiceDiscovery: true,
    communityId: "civic",
    sourceServer: "server-b",
    share: a.exportSnapshot(),
  });
  assert.deepEqual(b.lookup("live"), []);
});

test("chaos: open posture stays denied after hosted ads exist elsewhere", () => {
  const hosted = createInMemoryServiceDirectory({
    allowServiceDiscovery: true,
    communityId: "civic",
  });
  hosted.advertise({ name: "live", endpoint: "epoch.live.civic.>" });
  const open = createInMemoryServiceDirectory({
    allowServiceDiscovery: false,
    communityId: "civic",
    share: hosted.exportSnapshot(),
  });
  assert.throws(
    () => open.lookup("live"),
    (error) => error instanceof ServiceDiscoveryDeniedError,
  );
});
