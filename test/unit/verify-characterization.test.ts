/**
 * Characterization / snapshot tests (Verify-style). Goldens live in
 * test/verify/verified/. Refresh with EPOCH_UPDATE_VERIFIED=1.
 */
import { DENIED_POSTURE_POLICY, OPEN_POSTURE_DEFAULTS, evaluatePosture } from "@epoch/protocol";
import {
  EPOCH_NATS_SUBJECTS,
  EPOCH_STREAM_SPECS,
  createAuthCalloutHandler,
  createPlatformAuthValidator,
  permissionsForScopes,
} from "@epoch/nats";
import { assertVerified } from "../verify/assert-verified";

export async function runVerifyCharacterizationTests(): Promise<void> {
  natsStreamAndSubjectContract();
  posturePolicyContract();
  fabricAclContract();
  await authCalloutAllowShapeContract();
}

function natsStreamAndSubjectContract(): void {
  assertVerified("nats-subjects", { ...EPOCH_NATS_SUBJECTS });
  assertVerified(
    "nats-stream-specs",
    EPOCH_STREAM_SPECS.map((spec) => ({
      name: spec.name,
      subjects: [...spec.subjects],
      retention: spec.retention,
      maxAgeSeconds: spec.maxAgeSeconds ?? null,
    })),
  );
}

function posturePolicyContract(): void {
  assertVerified("posture-defaults", {
    open: OPEN_POSTURE_DEFAULTS,
    denied: DENIED_POSTURE_POLICY,
    hosted: evaluatePosture({ posture: "hosted" }),
    private: evaluatePosture({ posture: "private" }),
    openEvaluated: evaluatePosture({}),
  });
}

function fabricAclContract(): void {
  assertVerified("nats-acl-matrices", {
    sessionOpen: permissionsForScopes(["fabric:human"], "session"),
    sessionHosted: permissionsForScopes(["fabric:human"], "session", { allowServiceDiscovery: true }),
    sessionOpenWithDiscoverScope: permissionsForScopes(["fabric:human", "svc:discover"], "session", {
      allowServiceDiscovery: false,
    }),
    tokenSvcOpen: permissionsForScopes(["svc:discover"], "api-token"),
    tokenSvcHosted: permissionsForScopes(["svc:discover"], "api-token", {
      allowServiceDiscovery: true,
      sourceServer: "server-a",
    }),
  });
}

async function authCalloutAllowShapeContract(): Promise<void> {
  const handler = createAuthCalloutHandler(
    createPlatformAuthValidator({
      verifyFabricCredential: () => ({
        id: "c",
        kind: "session",
        subjectRef: "maya",
        scopes: ["fabric:human"],
        expiresAt: Date.now() + 60_000,
        allowServiceDiscovery: false,
      }),
    }),
  );
  const allowed = await handler({ authToken: "secret" });
  assertVerified("nats-auth-callout-allow-open", {
    type: allowed.type,
    user: allowed.user,
    keys: Object.keys(allowed).sort(),
    hasJwt: "jwt" in allowed,
    permissions: allowed.permissions,
  });
}
