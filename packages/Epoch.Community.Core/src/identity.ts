export const VERSION = "community-core/1";

export type CommunityObjectKind =
  | "message"
  | "thread"
  | "channel"
  | "dm"
  | "notification"
  | "saved-view"
  | "project"
  | "issue"
  | "change"
  | "member"
  | "agent"
  | "artifact"
  | "tombstone";

export interface CommunityObjectRef {
  readonly objectId: string;
  readonly kind: CommunityObjectKind;
  readonly atUri?: string;
  readonly revision?: string;
}

export interface ObjectUrlOptions {
  readonly projectionId?: string;
  readonly revision?: string;
  readonly origin?: string;
}

export interface ParsedObjectUrl {
  readonly objectId: string;
  readonly projectionId?: string;
  readonly revision?: string;
}

const kinds = new Set<CommunityObjectKind>([
  "message", "thread", "channel", "dm", "notification", "saved-view", "project",
  "issue", "change", "member", "agent", "artifact", "tombstone",
]);
const opaqueId = /^[A-Za-z0-9][A-Za-z0-9._~-]{0,127}$/u;

export function validateObjectRef(value: unknown): CommunityObjectRef {
  if (typeof value !== "object" || value === null) throw new Error("Community object reference must be an object");
  const ref = value as Partial<CommunityObjectRef>;
  if (typeof ref.objectId !== "string" || !opaqueId.test(ref.objectId)) {
    throw new Error("Community objectId must be an opaque URL-safe identifier");
  }
  if (typeof ref.kind !== "string" || !kinds.has(ref.kind as CommunityObjectKind)) {
    throw new Error(`Unsupported community object kind: ${String(ref.kind)}`);
  }
  if (ref.atUri !== undefined && !/^at:\/\/[^/]+\/[^/]+\/[^/]+$/u.test(ref.atUri)) {
    throw new Error("Federated object identity must be a valid AT URI");
  }
  if (ref.revision !== undefined && (ref.revision.length === 0 || ref.revision.length > 512)) {
    throw new Error("Community object revision must be a non-empty bounded value");
  }
  return Object.freeze({
    objectId: ref.objectId,
    kind: ref.kind as CommunityObjectKind,
    ...(ref.atUri === undefined ? {} : { atUri: ref.atUri }),
    ...(ref.revision === undefined ? {} : { revision: ref.revision }),
  });
}

export function validateProjectionId(projectionId: string): string {
  if (!opaqueId.test(projectionId)) throw new Error("Projection ID must be an opaque URL-safe identifier");
  return projectionId;
}

export function objectUrl(ref: CommunityObjectRef, options: ObjectUrlOptions = {}): string {
  const valid = validateObjectRef(ref);
  const params = new URLSearchParams();
  if (options.projectionId === undefined) {
    params.set("object", valid.objectId);
  } else {
    params.set("projection", validateProjectionId(options.projectionId));
    params.set("focus", valid.objectId);
  }
  const revision = options.revision;
  if (revision !== undefined) {
    if (revision.length === 0) throw new Error("Exact object links require a revision");
    params.set("revision", revision);
  }
  const relative = `/board.html?${params.toString()}`;
  return options.origin === undefined ? relative : new URL(relative, options.origin).toString();
}

export function parseObjectUrl(input: string): ParsedObjectUrl | undefined {
  let url: URL;
  try {
    url = new URL(input, "https://epoch.invalid");
  } catch {
    return undefined;
  }
  if (url.pathname !== "/board.html") return undefined;
  const projectionId = url.searchParams.get("projection") ?? undefined;
  const objectId = url.searchParams.get(projectionId === undefined ? "object" : "focus") ?? undefined;
  if (objectId === undefined || !opaqueId.test(objectId)) return undefined;
  if (projectionId !== undefined && !opaqueId.test(projectionId)) return undefined;
  const revision = url.searchParams.get("revision") ?? undefined;
  return {
    objectId,
    ...(projectionId === undefined ? {} : { projectionId }),
    ...(revision === undefined ? {} : { revision }),
  };
}
