export const VERSION = "community-core/1";

export type CommunityObjectKind =
  | "message"
  | "thread"
  | "channel"
  | "dm"
  | "notification"
  | "projection"
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

interface CommunityObjectRefBuilder {
  objectId: string;
  kind: CommunityObjectKind;
  atUri?: string;
  revision?: string;
}

interface ParsedObjectUrlBuilder {
  objectId: string;
  projectionId?: string;
  revision?: string;
}

const kinds = new Set<CommunityObjectKind>([
  "message", "thread", "channel", "dm", "notification", "projection", "project",
  "issue", "change", "member", "agent", "artifact", "tombstone",
]);
const opaqueId = /^[A-Za-z0-9][A-Za-z0-9._~-]{0,127}$/u;
const MAX_REVISION_LENGTH = 512;

function validateRevision<Value>(value: Value): string {
  if (!isString(value) || value.length === 0 || value.length > MAX_REVISION_LENGTH) {
    throw new Error("Community object revision must be a non-empty bounded value");
  }
  return value;
}

export function validateObjectRef<Value>(value: Value): CommunityObjectRef {
  if (!isNonNullObject(value)) throw new Error("Community object reference must be an object");
  // SAFETY: The surrounding validation and domain contract establish the asserted type.
  const ref = value as Partial<CommunityObjectRef>;
  if (!isString(ref.objectId) || !opaqueId.test(ref.objectId)) {
    throw new Error("Community objectId must be an opaque URL-safe identifier");
  }
  // SAFETY: The surrounding validation and domain contract establish the asserted type.
  if (!isCommunityObjectKind(ref.kind)) {
    throw new Error(`Unsupported community object kind: ${String(ref.kind)}`);
  }
  if (ref.atUri !== undefined && (!isString(ref.atUri) || !/^at:\/\/[^/]+\/[^/]+\/[^/]+$/u.test(ref.atUri))) {
    throw new Error("Federated object identity must be a valid AT URI");
  }
  if (ref.revision !== undefined) validateRevision(ref.revision);
  const validated: CommunityObjectRefBuilder = {
    objectId: ref.objectId,
    kind: ref.kind,
  };
  if (ref.atUri !== undefined) validated.atUri = ref.atUri;
  if (ref.revision !== undefined) validated.revision = validateRevision(ref.revision);
  return Object.freeze(validated);
}

export function validateProjectionId(projectionId: string): string {
  if (!opaqueId.test(projectionId)) {
    throw new Error("Projection ID must be an opaque URL-safe identifier");
  }
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
    params.set("revision", validateRevision(revision));
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
  if (revision !== undefined) {
    try {
      validateRevision(revision);
    } catch {
      return undefined;
    }
  }
  const parsed: ParsedObjectUrlBuilder = { objectId };
  if (projectionId !== undefined) parsed.projectionId = projectionId;
  if (revision !== undefined) parsed.revision = revision;
  return parsed;
}

function isString<Value>(value: Value): value is Value & string {
  return typeof value === "string";
}

function isNonNullObject<Value>(value: Value): value is Value & object {
  return typeof value === "object" && value !== null;
}

function isCommunityObjectKind(value: CommunityObjectKind | undefined): value is CommunityObjectKind {
  return typeof value === "string" && kinds.has(value);
}
