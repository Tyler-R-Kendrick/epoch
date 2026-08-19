/**
 * Property tests for posture-gated NATS service discovery (ADR-0052 short lane).
 */
import assert from "node:assert/strict";
import fc from "fast-check";
import {
  ServiceDiscoveryDeniedError,
  createInMemoryServiceDirectory,
  permissionsForScopes,
} from "@epoch/nats";
import { shortFcParams } from "../arbitraries/parsers";

async function main(): Promise<void> {
  const params = shortFcParams();

  await fc.assert(
    fc.property(fc.boolean(), fc.boolean(), (allow, includeDiscover) => {
      const scopes = includeDiscover ? ["svc:discover"] : ["live:read"];
      const perms = permissionsForScopes(scopes, "api-token", { allowServiceDiscovery: allow });
      const granted = [...perms.publish, ...perms.subscribe].some((subject) => subject.startsWith("epoch.svc."));
      assert.equal(granted, allow === true && includeDiscover === true);
    }),
    params,
  );

  await fc.assert(
    fc.property(fc.boolean(), (allow) => {
      const perms = permissionsForScopes(["fabric:human", "svc:discover"], "session", {
        allowServiceDiscovery: allow,
      });
      assert.equal(perms.publish.includes("epoch.svc.>"), allow === true);
    }),
    params,
  );

  await fc.assert(
    fc.property(
      fc.string({ minLength: 1, maxLength: 24 }).filter((name) => name.trim().length > 0),
      (name) => {
        const directory = createInMemoryServiceDirectory({
          allowServiceDiscovery: false,
          communityId: "civic",
        });
        assert.throws(
          () => directory.advertise({ name, endpoint: "epoch.live.civic.>" }),
          (error: unknown) => error instanceof ServiceDiscoveryDeniedError,
        );
      },
    ),
    params,
  );

  await fc.assert(
    fc.property(
      fc.string({ minLength: 1, maxLength: 16 }).filter((name) => /^[a-zA-Z0-9_-]+$/u.test(name)),
      (name) => {
        const directory = createInMemoryServiceDirectory({
          allowServiceDiscovery: true,
          communityId: "civic",
        });
        directory.advertise({ name, endpoint: "epoch.live.civic.>" });
        assert.equal(directory.lookup(name).length, 1);
        assert.deepEqual(directory.lookup(`${name}-missing`), []);
      },
    ),
    params,
  );

  console.log("service-discovery fast-check properties passed");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
