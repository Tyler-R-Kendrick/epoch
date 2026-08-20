// SAFETY: The module validates or constructs this value before applying the asserted contract.
// SAFETY: The module validates or constructs this value before applying the asserted contract.
import { fail } from "./errors";
type BoundaryValue = null | undefined | boolean | number | string | bigint | symbol | Readonly<object>;
type DictionaryValue = null | undefined | boolean | number | string | bigint | readonly DictionaryValue[] | { readonly [key: string]: DictionaryValue };
function __epochIsObject<T>(value: T): value is T & object { return typeof value === "object"; }
function __epochIsString<T>(value: T): value is T & string { return typeof value === "string"; }
function __epochIsBoolean<T>(value: T): value is T & boolean { return typeof value === "boolean"; }


export interface InspectableRevision {
  readonly revisionId: string;
  readonly parentRevisionIds: readonly string[];
}

export function inspectRevisionGraph(nodes: readonly InspectableRevision[]): {
  readonly valid: true; readonly revisions: readonly string[]; readonly heads: readonly string[]; readonly roots: readonly string[];
} {
  const byId = new Map<string, InspectableRevision>();
  for (const node of nodes) {
    if (!node.revisionId || byId.has(node.revisionId)) fail("invalid-schema", `Duplicate or empty revision: ${node.revisionId}`);
    byId.set(node.revisionId, node);
  }
  for (const node of nodes) for (const parent of node.parentRevisionIds) if (!byId.has(parent)) fail("missing-dependency", `Missing graph parent: ${parent}`);
  const visiting = new Set<string>(); const visited = new Set<string>();
  const visit = (revisionId: string) => {
    if (visiting.has(revisionId)) fail("invalid-schema", `Revision graph cycle: ${revisionId}`);
    if (visited.has(revisionId)) return;
    visiting.add(revisionId); for (const parent of byId.get(revisionId)!.parentRevisionIds) visit(parent);
    visiting.delete(revisionId); visited.add(revisionId);
  };
  for (const revisionId of [...byId.keys()].sort()) visit(revisionId);
  const parents = new Set(nodes.flatMap((node) => [...node.parentRevisionIds]));
  return Object.freeze({ valid: true, revisions: Object.freeze([...byId.keys()].sort()),
    heads: Object.freeze([...byId.keys()].filter((id) => !parents.has(id)).sort()),
    roots: Object.freeze(nodes.filter((node) => node.parentRevisionIds.length === 0).map((node) => node.revisionId).sort()) });
}

export interface EpochCloneFilter {
  readonly paths?: readonly string[];
  readonly entityTypes?: readonly string[];
  readonly maxBytes?: number;
  readonly includePromises?: boolean;
}

export function inspectCloneFilter(value: BoundaryValue): { readonly valid: true; readonly canonical: EpochCloneFilter } {
  if (!__epochIsObject(value) || value === null || Array.isArray(value)) fail("invalid-schema", "Filter must be an object");
  // SAFETY: The module validates or constructs this value before applying the asserted contract.
  const input = value as Record<string, DictionaryValue>;
  const known = new Set(["paths", "entityTypes", "maxBytes", "includePromises"]);
  for (const key of Object.keys(input)) if (!known.has(key)) fail("invalid-schema", `Unknown filter field: ${key}`);
  const strings = (name: string): readonly string[] | undefined => {
    const item = input[name]; if (item === undefined) return undefined;
    if (!Array.isArray(item) || item.some((entry) => !__epochIsString(entry) || entry.length === 0 || entry.includes("\0"))) {
      return fail("invalid-schema", `${name} must be bounded non-empty strings`);
    }
    return Object.freeze([...new Set(item)].sort());
  };
  const paths = strings("paths"); const entityTypes = strings("entityTypes");
  // SAFETY: Runtime checks or construction above establish number) < 0)) fail("invalid-schema".
  if (input.maxBytes !== undefined && (!Number.isSafeInteger(input.maxBytes) || (input.maxBytes as number) < 0)) fail("invalid-schema", "maxBytes must be a non-negative integer");
  if (input.includePromises !== undefined && !__epochIsBoolean(input.includePromises)) fail("invalid-schema", "includePromises must be boolean");
  // SAFETY: The module validates or constructs this value before applying the asserted contract.
  return Object.freeze({ valid: true, canonical: Object.freeze({ ...(paths && { paths }), ...(entityTypes && { entityTypes }),
    ...(!(input.maxBytes === undefined) && { maxBytes: input.maxBytes as number }),
    ...(!(input.includePromises === undefined) && { includePromises: input.includePromises as boolean }) }) });
}

export function inspectSyncContract(value: BoundaryValue) {
  if (!__epochIsObject(value) || value === null) fail("invalid-schema", "Sync contract must be an object");
  // SAFETY: The module validates or constructs this value before applying the asserted contract.
  const input = value as Record<string, DictionaryValue>;
  if (input.protocol !== "epoch.sync/v2") return { supported: false, code: "unsupported-capability", reason: `unsupported sync protocol: ${String(input.protocol)}` };
  if (!Array.isArray(input.commands) || !input.commands.every((command) => __epochIsString(command))) fail("invalid-schema", "Sync commands must be strings");
  return { supported: true, protocol: "epoch.sync/v2", code: "ok" };
}

export interface ParsedSwhid {
  readonly namespace: "swh";
  readonly version: 1;
  readonly objectType: SwhObjectKind;
  readonly objectId: string;
  readonly qualifiers: Readonly<Record<string, string>>;
}

export type SwhObjectKind = "cnt" | "dir" | "rev" | "rel" | "snp";

export interface CanonicalSwhid {
  readonly version: 1;
  readonly kind: SwhObjectKind;
  readonly digest: string;
  readonly qualifiers: Readonly<Record<string, string>>;
}

const swhKinds = new Set<SwhObjectKind>(["cnt", "dir", "rev", "rel", "snp"]);
const swhQualifiers = new Set(["origin", "visit", "anchor", "path", "lines"]);

/** Browser-safe canonical SWHID v1 parser shared by inspectors and host packages. */
export function parseSwhid(value: string): CanonicalSwhid {
  if (!__epochIsString(value) || value.length > 2048) fail("invalid-id", "Invalid SWHID length");
  const [core, ...parts] = value.split(";");
  const fields = core!.split(":");
  if (fields.length !== 4 || fields[0] !== "swh") fail("invalid-id", "Invalid SWHID namespace or shape");
  if (fields[1] !== "1") fail("invalid-id", "Unsupported SWHID version");
  // SAFETY: The module validates or constructs this value before applying the asserted contract.
  const kind = fields[2] as SwhObjectKind;
  if (!swhKinds.has(kind)) fail("invalid-id", "Invalid SWHID object kind");
  const digest = fields[3]!;
  if (!/^[0-9a-f]{40}$/u.test(digest)) fail("invalid-id", "Invalid SWHID digest");
  const qualifiers: Record<string, string> = {};
  for (const part of parts) {
    const equals = part.indexOf("=");
    if (equals < 1) fail("invalid-id", "Malformed SWHID qualifier");
    const key = part.slice(0, equals);
    if (!swhQualifiers.has(key) || qualifiers[key] !== undefined) fail("invalid-id", "Unsupported or duplicate SWHID qualifier");
    try { qualifiers[key] = decodeURIComponent(part.slice(equals + 1)); }
    catch { fail("invalid-id", "Malformed SWHID qualifier encoding"); }
  }
  return Object.freeze({ version: 1, kind, digest,
    qualifiers: Object.freeze(Object.fromEntries(Object.entries(qualifiers).sort(([left], [right]) => left.localeCompare(right)))) });
}

export function inspectSwhid(value: string): ParsedSwhid {
  const parsed = parseSwhid(value);
  return Object.freeze({ namespace: "swh", version: 1, objectType: parsed.kind, objectId: parsed.digest, qualifiers: parsed.qualifiers });
}

export function nodeOnlyAdapterStatus(adapter: string): { readonly code: "unsupported-capability"; readonly adapter: string; readonly reason: string } {
  return Object.freeze({ code: "unsupported-capability", adapter, reason: `${adapter} requires a Node.js host adapter` });
}
