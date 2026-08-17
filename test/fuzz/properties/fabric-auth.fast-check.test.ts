/**
 * Property tests for complementary fabric auth (ADR-0054 / ADR-0052 short lane).
 * Guards: blank secrets deny; ACL mapping never invents wide defaults; session
 * fabric:human is subscribe-only on platform events.
 */
import assert from "node:assert/strict";
import fc from "fast-check";
import {
  createAuthCalloutHandler,
  createPlatformAuthValidator,
  evaluateAuthCallout,
  permissionsForScopes,
} from "@epoch/nats";
import { shortFcParams } from "../arbitraries/parsers";

const API_SCOPES = [
  "live:write",
  "live:read",
  "platform.events:write",
  "platform.events:read",
  "community.stream:write",
  "community.stream:read",
  "unrelated:scope",
] as const;

async function main(): Promise<void> {
  const params = shortFcParams();

  await fc.assert(
    fc.asyncProperty(
      fc.constantFrom("", " ", "\t", "\n", "  \n\t  "),
      async (blank) => {
        const validator = createPlatformAuthValidator({
          verifyFabricCredential: () => {
            throw new Error("verifier must not run for blank secrets");
          },
        });
        const decision = await evaluateAuthCallout({ authToken: blank }, validator);
        assert.equal(decision.type, "deny");
      },
    ),
    params,
  );

  await fc.assert(
    fc.asyncProperty(fc.array(fc.constantFrom(...API_SCOPES), { maxLength: 6 }), async (scopes) => {
      const perms = permissionsForScopes(scopes, "api-token");
      for (const subject of perms.publish) {
        assert.match(subject, /^epoch\.(live|platform\.events|community\.stream)\.>$/);
      }
      for (const subject of perms.subscribe) {
        assert.match(subject, /^epoch\.(live|platform\.events|community\.stream)\.>$/);
      }
      // Never grant epoch.> or SYS subjects from scopes.
      assert.ok(!perms.publish.includes("epoch.>"));
      assert.ok(!perms.subscribe.includes("epoch.>"));
      assert.ok(!perms.publish.some((s) => s.startsWith("$SYS")));
    }),
    params,
  );

  await fc.assert(
    fc.asyncProperty(fc.boolean(), async (includeHuman) => {
      const scopes = includeHuman ? ["fabric:human"] : ["noise"];
      const perms = permissionsForScopes(scopes, "session");
      if (includeHuman) {
        assert.ok(perms.publish.includes("epoch.live.>"));
        assert.ok(perms.subscribe.includes("epoch.platform.events.>"));
        assert.ok(!perms.publish.includes("epoch.platform.events.>"));
      } else {
        assert.equal(perms.publish.length + perms.subscribe.length, 0);
      }
    }),
    params,
  );

  await fc.assert(
    fc.asyncProperty(
      fc.string({ minLength: 1, maxLength: 64 }).filter((s) => s.trim().length > 0),
      fc.integer({ min: 1_000, max: 60_000 }),
      fc.boolean(),
      async (secret, ttlMs, expired) => {
        const expiresAt = expired ? Date.now() - ttlMs : Date.now() + ttlMs;
        const validator = createPlatformAuthValidator({
          verifyFabricCredential: () => ({
            id: "fuzz",
            kind: "session",
            subjectRef: "user:fuzz",
            scopes: ["fabric:human"],
            expiresAt,
          }),
        });
        const decision = await evaluateAuthCallout({ authToken: secret }, validator);
        if (expired) {
          assert.equal(decision.type, "deny");
        } else {
          assert.equal(decision.type, "allow");
          assert.ok(decision.permissions);
        }
      },
    ),
    { ...params, numRuns: Math.min(params.numRuns, 64) },
  );

  await fc.assert(
    fc.asyncProperty(fc.string({ minLength: 1, maxLength: 32 }), async (token) => {
      const handler = createAuthCalloutHandler(
        createPlatformAuthValidator({
          verifyFabricCredential: () => null,
        }),
      );
      const decision = await handler({ authToken: token });
      assert.equal(decision.type, "deny");
      assert.equal(typeof decision.reason, "string");
    }),
    params,
  );

  console.log("fabric-auth fast-check properties passed");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
