/**
 * PR-time mutation oracles for NATS discovery/callout (not Stryker).
 * If a mutant deletes the open-posture gate, source-server prefix, or timeout
 * deny path, these fail. Full Stryker remains out of band like Jazzer campaigns.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  ServiceDiscoveryDeniedError,
  createInMemoryServiceDirectory,
  permissionsForScopes,
} from "@epoch/nats";

export function runNatsMutationOracleTests(): void {
  sourceStillContainsDiscoveryGates();
  openPostureMutantWouldGrantSvc();
  sourceServerPrefixMutantWouldCrossOperators();
  emptyDirectoryMutantWouldAdvertiseWithoutName();
}

function sourceStillContainsDiscoveryGates(): void {
  const acl = readFileSync("packages/Epoch.Nats/src/acl.ts", "utf8");
  const discovery = readFileSync("packages/Epoch.Nats/src/service-discovery.ts", "utf8");
  const callout = readFileSync("packages/Epoch.Nats/src/callout-service.ts", "utf8");
  assert.equal(acl.includes("allowServiceDiscovery") && acl.includes("epoch.svc."), true);
  assert.equal(acl.includes("options.allowServiceDiscovery === true"), true);
  assert.equal(discovery.includes("ServiceDiscoveryDeniedError"), true);
  assert.equal(callout.includes("callout timeout"), true);
}

function openPostureMutantWouldGrantSvc(): void {
  const open = permissionsForScopes(["fabric:human", "svc:discover"], "session", {
    allowServiceDiscovery: false,
  });
  assert.equal(open.publish.some((subject) => subject.startsWith("epoch.svc.")), false);
  const hosted = permissionsForScopes(["fabric:human"], "session", { allowServiceDiscovery: true });
  assert.equal(hosted.publish.includes("epoch.svc.>"), true);
}

function sourceServerPrefixMutantWouldCrossOperators(): void {
  const a = permissionsForScopes(["svc:discover"], "api-token", {
    allowServiceDiscovery: true,
    sourceServer: "a",
  });
  const b = permissionsForScopes(["svc:discover"], "api-token", {
    allowServiceDiscovery: true,
    sourceServer: "b",
  });
  assert.deepEqual([...a.publish], ["epoch.svc.a.>"]);
  assert.deepEqual([...b.publish], ["epoch.svc.b.>"]);
  assert.equal(a.publish.includes("epoch.svc.b.>"), false);
}

function emptyDirectoryMutantWouldAdvertiseWithoutName(): void {
  const directory = createInMemoryServiceDirectory({
    allowServiceDiscovery: true,
    communityId: "civic",
  });
  assert.throws(
    () => directory.advertise({ name: "  ", endpoint: "epoch.live.civic.>" }),
    (error) => error instanceof ServiceDiscoveryDeniedError,
  );
  assert.throws(
    () => directory.advertise({ name: "live", endpoint: "nats://relay" }),
    (error) => error instanceof ServiceDiscoveryDeniedError,
  );
}
