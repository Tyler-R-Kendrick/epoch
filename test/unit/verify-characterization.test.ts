/**
 * Characterization / snapshot tests (Verify-style). Goldens live in
 * test/verify/verified/. Refresh with EPOCH_UPDATE_VERIFIED=1.
 */
import { readFileSync } from "node:fs";
import { CHANNEL_EVENT_SCHEMA } from "@epoch/community-core";
import { epochTokens } from "@epoch/design-tokens";
import {
  EPOCH_NATS_SUBJECTS,
  EPOCH_STREAM_SPECS,
  createAuthCalloutHandler,
  createPlatformAuthValidator,
  permissionsForScopes,
} from "@epoch/nats";
import { DENIED_POSTURE_POLICY, OPEN_POSTURE_DEFAULTS, PROTOCOL_CAPABILITIES, evaluatePosture } from "@epoch/protocol";
import {
  XMPP_FIDELITY_STATEMENT,
  conferenceRoutingJid,
  decodeChannelFanout,
  encodeChannelFanout,
} from "@epoch/xmpp";
import { assertVerified, verifiedFixture } from "../verify/assert-verified";

export async function runVerifyCharacterizationTests(): Promise<void> {
  natsStreamAndSubjectContract();
  posturePolicyContract();
  fabricAclContract();
  xmppFidelityAndFanoutContract();
  protocolCapabilityContract();
  designTokenColorContract();
  communityWebVoiceSelectorContract();
  communityWebActivityTerminalContract();
  await authCalloutAllowContract();
}

function natsStreamAndSubjectContract(): void {
  // SAFETY: NATS subject and stream fixtures are JSON-serializable characterization goldens.
  assertVerified("nats-subjects", verifiedFixture({ ...EPOCH_NATS_SUBJECTS }));
  assertVerified(
    "nats-stream-specs",
    verifiedFixture(EPOCH_STREAM_SPECS.map((spec) => ({
      name: spec.name,
      subjects: [...spec.subjects],
      retention: spec.retention,
      maxAgeSeconds: spec.maxAgeSeconds ?? null,
    }))),
  );
}

function posturePolicyContract(): void {
  assertVerified("posture-defaults", verifiedFixture({
    open: OPEN_POSTURE_DEFAULTS,
    denied: DENIED_POSTURE_POLICY,
    hosted: evaluatePosture({ posture: "hosted" }),
    private: evaluatePosture({ posture: "private" }),
    openEvaluated: evaluatePosture({}),
  }));
}

function fabricAclContract(): void {
  assertVerified("nats-acl-matrices", verifiedFixture({
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
  }));
}

function xmppFidelityAndFanoutContract(): void {
  assertVerified("xmpp-fidelity", verifiedFixture({ ...XMPP_FIDELITY_STATEMENT }));
  const channelId = `epoch:channel:${"c".repeat(52)}`;
  const event = {
    schemaVersion: 1 as const,
    type: "channel.message" as const,
    eventId: "m1",
    revisionId: "m1",
    body: {
      schema: CHANNEL_EVENT_SCHEMA,
      channelId,
      messageId: "m1",
      principalId: `epoch:principal:${"p".repeat(52)}`,
      bodyDigest: "a".repeat(64),
      visibility: "public" as const,
    },
  };
  const envelope = decodeChannelFanout(encodeChannelFanout(event, "a.example", channelId));
  assertVerified("xmpp-channel-fanout-envelope", {
    schema: envelope.schema,
    routing: envelope.routing,
    conferenceJid: conferenceRoutingJid(channelId, "a.example"),
    // SAFETY: Runtime checks or construction above establish { type: string }).type.
    eventType: (envelope.event as { type: string }).type,
    refusedMuc: XMPP_FIDELITY_STATEMENT.xeps.refused.includes("XEP-0045"),
  });
}

function protocolCapabilityContract(): void {
  assertVerified("protocol-capabilities", verifiedFixture(PROTOCOL_CAPABILITIES));
}

function designTokenColorContract(): void {
  assertVerified("design-token-colors", epochTokens.colors);
}

function communityWebVoiceSelectorContract(): void {
  const consoleSrc = readFileSync("packages/Epoch.Community.Web/app/console.js", "utf8");
  const appSrc = readFileSync("packages/Epoch.Community.Web/app/app.js", "utf8");
  const required = [
    "data-voice-tray",
    "data-voice-ptt",
    "data-voice-leave",
    "data-voice-goto",
    "data-voice-mute",
    "data-voice-deafen",
    "data-voice-join",
  ];
  assertVerified("community-web-voice-selectors", {
    boardStage: consoleSrc.includes("cn-board-stage"),
    required,
    present: required.filter((attr) => consoleSrc.includes(attr)),
    pttBlurReleases: /addEventListener\("blur", function \(\) \{\s*endVoicePtt\(\);/.test(appSrc),
  });
}

type CommunityWebMapSurface = {
  list(path: string): Array<{ name: string; kind?: string }> | null;
  isTerminalNavPath(path: string): boolean;
  navParentPath(path: string): string;
};

function communityWebActivityTerminalContract(): void {
  const root = "packages/Epoch.Community.Web/app";
  new Function(readFileSync(`${root}/value-kind.js`, "utf8"))();
  const host: Record<string, unknown> = {};
  new Function("window", readFileSync(`${root}/community-core-runtime.js`, "utf8"))(host);
  new Function("window", readFileSync(`${root}/data.js`, "utf8"))(host);
  new Function("window", readFileSync(`${root}/sitemap.js`, "utf8"))(host);
  // SAFETY: sitemap.js assigns CW_MAP with list/isTerminalNavPath/navParentPath after Core loads.
  const map = host.CW_MAP as CommunityWebMapSurface | undefined;
  if (!map) throw new Error("CW_MAP missing for Activity characterization");
  const filters = (map.list("/notifications") || []).map((entry) => ({
    name: entry.name,
    kind: entry.kind || null,
  }));
  const terminal = ["all", "mentions", "subscribed", "hooks"].map((name) => {
    const path = `/notifications/${name}`;
    return {
      path,
      terminal: map.isTerminalNavPath(path),
      navParent: map.navParentPath(path),
    };
  });
  assertVerified("community-web-activity-terminal", verifiedFixture({
    filters,
    terminal,
    mentionsListingIsContent: ((map.list("/notifications/mentions") || [])[0]?.kind) === "notification",
  }));
}

async function authCalloutAllowContract(): Promise<void> {
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
  assertVerified("nats-auth-callout-allow-open", verifiedFixture({
    type: allowed.type,
    user: allowed.user,
    keys: Object.keys(allowed).sort(),
    hasJwt: "jwt" in allowed,
    permissions: allowed.permissions,
  }));
}
