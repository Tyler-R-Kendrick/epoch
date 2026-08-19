import { fail } from "./errors";

/** Per-community trust posture (ADR-0055). Open is the default for the general community. */
export type TrustPosture = "hosted" | "private" | "open";

export type PublicArtifactPlane = "atproto" | "none";

export type InterNodeTransport = "xmpp-s2s" | "gossip" | "none";

/**
 * Evaluated capability gates for a community. `allowCrossCommunityFabric` is
 * always false (I-2). Unknown or contradictory config fails closed (I-4).
 */
export interface PosturePolicy {
  readonly posture: TrustPosture;
  /** Hosted/private only. Open cannot enable this. */
  readonly allowServiceDiscovery: boolean;
  /** Always false — NATS never crosses operators. */
  readonly allowCrossCommunityFabric: boolean;
  readonly publicArtifactPlane: PublicArtifactPlane;
  readonly interNodeTransport: InterNodeTransport;
  /** Hosted/private true; open is local watermark unless explicitly opted in. */
  readonly serverTrackedReadState: boolean;
}

export const TRUST_POSTURES = Object.freeze(["hosted", "private", "open"] as const);

/** Absent config for the general community: open with extras off. */
export const OPEN_POSTURE_DEFAULTS: PosturePolicy = Object.freeze({
  posture: "open",
  allowServiceDiscovery: false,
  allowCrossCommunityFabric: false,
  publicArtifactPlane: "atproto",
  interNodeTransport: "gossip",
  serverTrackedReadState: false,
});

/** Gated capabilities denied when posture is unknown or malformed (I-4). */
export const DENIED_POSTURE_POLICY: PosturePolicy = Object.freeze({
  posture: "open",
  allowServiceDiscovery: false,
  allowCrossCommunityFabric: false,
  publicArtifactPlane: "none",
  interNodeTransport: "none",
  serverTrackedReadState: false,
});

const POSTURE_SET = new Set<string>(TRUST_POSTURES);

/**
 * Evaluate a posture config. Fail closed on unknown/malformed values (I-4).
 * Nested `[community.posture]` TOML tables and camelCase/snake_case keys are accepted.
 */
export function evaluatePosture(config: unknown): PosturePolicy {
  if (config === undefined || config === null) {
    return { ...OPEN_POSTURE_DEFAULTS };
  }
  if (typeof config !== "object" || Array.isArray(config)) {
    fail("policy-denied", "Malformed trust posture config");
  }
  const row = flattenPostureConfig(config as Record<string, unknown>);
  if (row === undefined) {
    return { ...OPEN_POSTURE_DEFAULTS };
  }

  const postureRaw = firstString(row, ["posture", "trust_posture", "trustPosture"]);
  if (postureRaw === undefined) {
    fail("policy-denied", "Unknown trust posture: (missing)");
  }
  if (!POSTURE_SET.has(postureRaw)) {
    fail("policy-denied", `Unknown trust posture: ${postureRaw}`);
  }
  const posture = postureRaw as TrustPosture;

  const allowServiceDiscovery = optionalBoolean(row, ["allowServiceDiscovery", "allow_service_discovery"]);
  const allowCrossCommunityFabric = optionalBoolean(row, ["allowCrossCommunityFabric", "allow_cross_community_fabric"]);
  const serverTrackedReadState = optionalBoolean(row, ["serverTrackedReadState", "server_tracked_read_state"]);
  const publicArtifactPlane = optionalEnum(row, ["publicArtifactPlane", "public_artifact_plane"], ["atproto", "none"] as const);
  const interNodeTransport = optionalEnum(
    row,
    ["interNodeTransport", "inter_node_transport"],
    ["xmpp-s2s", "gossip", "none"] as const,
  );
  const allowlist = optionalStringArray(row, ["s2sAllowlist", "s2s_allowlist"]);

  if (allowCrossCommunityFabric === true) {
    fail("policy-denied", "cross-community fabric is never allowed");
  }

  if (posture === "open" && allowServiceDiscovery === true) {
    fail("policy-denied", "open posture cannot enable service discovery");
  }

  if (interNodeTransport === "xmpp-s2s" && (allowlist === undefined || allowlist.length === 0) && posture === "open") {
    fail("policy-denied", "open xmpp-s2s requires an explicit s2s allowlist");
  }

  if (posture === "hosted") {
    return {
      posture,
      allowServiceDiscovery: allowServiceDiscovery ?? true,
      allowCrossCommunityFabric: false,
      publicArtifactPlane: publicArtifactPlane ?? "atproto",
      interNodeTransport: interNodeTransport ?? "none",
      serverTrackedReadState: serverTrackedReadState ?? true,
    };
  }

  if (posture === "private") {
    return {
      posture,
      allowServiceDiscovery: allowServiceDiscovery ?? true,
      allowCrossCommunityFabric: false,
      publicArtifactPlane: publicArtifactPlane ?? "none",
      interNodeTransport: interNodeTransport ?? "none",
      serverTrackedReadState: serverTrackedReadState ?? true,
    };
  }

  return {
    posture: "open",
    allowServiceDiscovery: false,
    allowCrossCommunityFabric: false,
    publicArtifactPlane: publicArtifactPlane ?? "atproto",
    interNodeTransport: interNodeTransport ?? "gossip",
    serverTrackedReadState: serverTrackedReadState ?? false,
  };
}

function flattenPostureConfig(config: Record<string, unknown>): Record<string, unknown> | undefined {
  const community = config.community;
  if (isRecord(community) && isRecord(community.posture)) {
    return community.posture;
  }
  if (isRecord(config.posture) && typeof config.posture.posture === "string") {
    return config.posture;
  }
  if (typeof config.posture === "string" || typeof config.trust_posture === "string" || typeof config.trustPosture === "string") {
    return config;
  }
  if (Object.keys(config).length === 0) return undefined;
  if (isRecord(community) && Object.keys(community).length === 0) return undefined;
  if ("posture" in config || "trust_posture" in config || "trustPosture" in config) return config;
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function firstString(row: Record<string, unknown>, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string") return value;
  }
  return undefined;
}

function optionalBoolean(row: Record<string, unknown>, keys: readonly string[]): boolean | undefined {
  for (const key of keys) {
    const value = row[key];
    if (value === undefined) continue;
    if (typeof value === "boolean") return value;
    fail("policy-denied", `Malformed posture boolean: ${key}`);
  }
  return undefined;
}

function optionalEnum<T extends string>(
  row: Record<string, unknown>,
  keys: readonly string[],
  allowed: readonly T[],
): T | undefined {
  for (const key of keys) {
    const value = row[key];
    if (value === undefined) continue;
    if (typeof value === "string" && (allowed as readonly string[]).includes(value)) return value as T;
    fail("policy-denied", `Unknown posture enum: ${key}=${String(value)}`);
  }
  return undefined;
}

function optionalStringArray(row: Record<string, unknown>, keys: readonly string[]): readonly string[] | undefined {
  for (const key of keys) {
    const value = row[key];
    if (value === undefined) continue;
    if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.length === 0)) {
      fail("policy-denied", `Malformed posture allowlist: ${key}`);
    }
    return value as readonly string[];
  }
  return undefined;
}
