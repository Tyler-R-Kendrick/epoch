import { fail } from "./errors";

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

export interface FrontierFilter {
  readonly paths?: readonly string[];
  readonly entityTypes?: readonly string[];
  readonly maxBytes?: number;
  readonly includePromises?: boolean;
}

export function inspectFrontierFilter(value: unknown): { readonly valid: true; readonly canonical: FrontierFilter } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) fail("invalid-schema", "Filter must be an object");
  const input = value as Record<string, unknown>;
  const known = new Set(["paths", "entityTypes", "maxBytes", "includePromises"]);
  for (const key of Object.keys(input)) if (!known.has(key)) fail("invalid-schema", `Unknown filter field: ${key}`);
  const strings = (name: string): readonly string[] | undefined => {
    const item = input[name]; if (item === undefined) return undefined;
    if (!Array.isArray(item) || item.some((entry) => typeof entry !== "string" || entry.length === 0 || entry.includes("\0"))) {
      return fail("invalid-schema", `${name} must be bounded non-empty strings`);
    }
    return Object.freeze([...new Set(item)].sort());
  };
  const paths = strings("paths"); const entityTypes = strings("entityTypes");
  if (input.maxBytes !== undefined && (!Number.isSafeInteger(input.maxBytes) || (input.maxBytes as number) < 0)) fail("invalid-schema", "maxBytes must be a non-negative integer");
  if (input.includePromises !== undefined && typeof input.includePromises !== "boolean") fail("invalid-schema", "includePromises must be boolean");
  return Object.freeze({ valid: true, canonical: Object.freeze({ ...(paths ? { paths } : {}), ...(entityTypes ? { entityTypes } : {}),
    ...(input.maxBytes === undefined ? {} : { maxBytes: input.maxBytes as number }),
    ...(input.includePromises === undefined ? {} : { includePromises: input.includePromises as boolean }) }) });
}

export function inspectSyncContract(value: unknown): { readonly supported: boolean; readonly protocol?: string; readonly code: "ok" | "unsupported-capability"; readonly reason?: string } {
  if (typeof value !== "object" || value === null) fail("invalid-schema", "Sync contract must be an object");
  const input = value as Record<string, unknown>;
  if (input.protocol !== "epoch.sync/v2") return { supported: false, code: "unsupported-capability", reason: `unsupported sync protocol: ${String(input.protocol)}` };
  if (!Array.isArray(input.commands) || !input.commands.every((command) => typeof command === "string")) fail("invalid-schema", "Sync commands must be strings");
  return { supported: true, protocol: "epoch.sync/v2", code: "ok" };
}

export interface ParsedSwhid {
  readonly namespace: "swh";
  readonly version: 1;
  readonly objectType: "cnt" | "dir" | "rev" | "rel" | "snp" | "ori";
  readonly objectId: string;
  readonly qualifiers: Readonly<Record<string, string>>;
}

export function inspectSwhid(value: string): ParsedSwhid {
  if (value.length > 2048 || !value.startsWith("swh:1:")) fail("invalid-id", "Invalid SWHID prefix or length");
  const [core, ...rawQualifiers] = value.split(";"); const parts = core!.split(":");
  const objectType = parts[2]; const objectId = parts[3];
  if (parts.length !== 4 || !["cnt", "dir", "rev", "rel", "snp", "ori"].includes(objectType ?? "") || !/^[a-f0-9]{40}$/u.test(objectId ?? "")) {
    return fail("invalid-id", "Invalid SWHID object identity");
  }
  const qualifiers: Record<string, string> = {};
  for (const qualifier of rawQualifiers) {
    const separator = qualifier.indexOf("="); if (separator <= 0) fail("invalid-id", "Invalid SWHID qualifier");
    const key = qualifier.slice(0, separator); const item = qualifier.slice(separator + 1);
    if (!/^[a-z_]+$/u.test(key) || !item || key in qualifiers) fail("invalid-id", "Invalid or duplicate SWHID qualifier");
    qualifiers[key] = item;
  }
  return Object.freeze({ namespace: "swh", version: 1, objectType: objectType as ParsedSwhid["objectType"], objectId: objectId!,
    qualifiers: Object.freeze(Object.fromEntries(Object.entries(qualifiers).sort(([left], [right]) => left.localeCompare(right)))) });
}

export function nodeOnlyAdapterStatus(adapter: string): { readonly code: "unsupported-capability"; readonly adapter: string; readonly reason: string } {
  return Object.freeze({ code: "unsupported-capability", adapter, reason: `${adapter} requires a Node.js host adapter` });
}
