export type ForgeObjectKind = "issue" | "change" | "comment" | "release";
export interface ForgeObject {
  readonly kind: ForgeObjectKind; readonly objectId: string; readonly repositoryId: string;
  readonly title: string; readonly body: string; readonly state: string; readonly authorId: string;
  readonly createdAt: number; readonly updatedAt: number; readonly visibility: "public" | "shared" | "private";
  readonly revision: string; readonly labels?: readonly string[];
}
export interface CodecLoss { readonly path: string; readonly reason: string; readonly severity: "info" | "warning" | "error" }

export const FORGE_CAPABILITIES = Object.freeze({
  schemaVersion: 1, accessedAt: "2026-08-11",
  f3: { specVersion: "4.0", source: "https://f3.forgefriends.org/", transport: "archive", subset: ["issue", "change", "comment", "release"] },
  forgefed: { specVersion: "Branch Snapshot, 18 June 2025", source: "https://forgefed.org/", transport: "none", subset: ["Ticket", "MergeRequest"] },
  nip34: { specVersion: "NIP-34", source: "https://github.com/nostr-protocol/nips/blob/master/34.md", transport: "codec-only" },
  radicle: { specVersion: "codec-boundary-v1", source: "https://radicle.xyz/", transport: "codec-only" },
});

function object(value: unknown): Record<string, unknown> { if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("malformed forge record"); return value as Record<string, unknown>; }
function text(value: unknown, name: string): string { if (typeof value !== "string" || !value) throw new Error(`malformed ${name}`); return value; }
function number(value: unknown, name: string): number { if (!Number.isSafeInteger(value) || (value as number) < 0) throw new Error(`malformed ${name}`); return value as number; }
function assertPublic(value: ForgeObject): void { if (value.visibility !== "public") throw new Error("private or shared content cannot be exported"); }
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`).join(",")}}`;
  return JSON.stringify(value);
}
function parseForge(value: unknown): ForgeObject {
  const row = object(value); const kind = text(row.kind, "kind") as ForgeObjectKind;
  if (!["issue", "change", "comment", "release"].includes(kind)) throw new Error("unsupported forge object kind");
  const visibility = text(row.visibility, "visibility") as ForgeObject["visibility"];
  if (!["public", "shared", "private"].includes(visibility)) throw new Error("malformed visibility");
  const parsed: ForgeObject = { kind, objectId: text(row.objectId, "objectId"), repositoryId: text(row.repositoryId, "repositoryId"),
    title: text(row.title, "title"), body: typeof row.body === "string" ? row.body : "", state: text(row.state, "state"),
    authorId: text(row.authorId, "authorId"), createdAt: number(row.createdAt, "createdAt"), updatedAt: number(row.updatedAt, "updatedAt"),
    visibility, revision: text(row.revision, "revision") };
  return Array.isArray(row.labels) ? { ...parsed, labels: row.labels.map((item) => text(item, "label")) } : parsed;
}

export function encodeF3Archive(values: readonly ForgeObject[]): { readonly bytes: string; readonly losses: readonly CodecLoss[] } {
  for (const value of values) assertPublic(value);
  const ordered = [...values].sort((a, b) => a.objectId.localeCompare(b.objectId));
  return { bytes: stable({ f3Version: "4.0", objects: ordered }), losses: [] };
}
export function decodeF3Archive(bytes: string): { readonly objects: readonly ForgeObject[]; readonly quarantine: readonly unknown[]; readonly losses: readonly CodecLoss[] } {
  let root: Record<string, unknown>; try { root = object(JSON.parse(bytes)); } catch { throw new Error("malformed F3 archive"); }
  if (root.f3Version !== "4.0" || !Array.isArray(root.objects)) throw new Error("unsupported F3 archive");
  const objects: ForgeObject[] = []; const quarantine: unknown[] = []; const losses: CodecLoss[] = []; const ids = new Set<string>();
  root.objects.forEach((item, index) => { try { const parsed = parseForge(item); if (ids.has(parsed.objectId)) { losses.push({ path: `objects[${index}]`, reason: "duplicate-id", severity: "warning" }); return; } ids.add(parsed.objectId); objects.push(parsed); } catch { quarantine.push(item); losses.push({ path: `objects[${index}]`, reason: "quarantined-malformed-or-unsupported", severity: "error" }); } });
  return { objects, quarantine, losses };
}

export function encodeForgeFed(value: ForgeObject): { readonly document: Record<string, unknown>; readonly losses: readonly CodecLoss[] } {
  assertPublic(value);
  if (value.kind !== "issue" && value.kind !== "change") throw new Error(`unsupported ForgeFed kind: ${value.kind}`);
  const losses: CodecLoss[] = [];
  if (value.labels?.length) losses.push({ path: "labels", reason: "not-in-declared-subset", severity: "warning" });
  return { document: { "@context": "https://www.w3.org/ns/activitystreams", type: value.kind === "change" ? "MergeRequest" : "Ticket", id: value.objectId,
    context: value.repositoryId, name: value.title, content: value.body, attributedTo: value.authorId, published: value.createdAt, updated: value.updatedAt,
    state: value.state, revision: value.revision }, losses };
}
export function decodeForgeFed(value: unknown): { readonly object: ForgeObject; readonly losses: readonly CodecLoss[] } {
  const row = object(value); const type = text(row.type, "ForgeFed type"); if (type !== "Ticket" && type !== "MergeRequest") throw new Error("unsupported ForgeFed type");
  return { object: parseForge({ kind: type === "MergeRequest" ? "change" : "issue", objectId: row.id, repositoryId: row.context,
    title: row.name, body: row.content, state: row.state, authorId: row.attributedTo, createdAt: row.published, updatedAt: row.updated,
    visibility: "public", revision: row.revision }), losses: [] };
}

export interface Nip34Event { readonly id: string; readonly pubkey: string; readonly created_at: number; readonly kind: number; readonly tags: readonly (readonly string[])[]; readonly content: string }
export function encodeNip34(value: ForgeObject, meta: { eventId: string; pubkey: string; createdAt: number; expiresAt: number; audience: readonly string[] }): { event: Nip34Event; losses: readonly CodecLoss[] } {
  assertPublic(value); return { event: { id: meta.eventId, pubkey: meta.pubkey, created_at: meta.createdAt, kind: value.kind === "issue" ? 1621 : 1617,
    tags: [["d", value.objectId], ["a", value.repositoryId], ["expiration", String(meta.expiresAt)], ...meta.audience.map((item) => ["aud", item]), ["revision", value.revision]],
    content: stable(value) }, losses: [] };
}
export function decodeNip34(value: unknown, options?: { now?: number; audience?: string; seen?: Set<string>; maxBytes?: number }): { object: ForgeObject; losses: readonly CodecLoss[] } {
  const row = object(value); const id = text(row.id, "NIP-34 event id"); text(row.pubkey, "NIP-34 pubkey"); number(row.created_at, "NIP-34 created_at");
  if (!Array.isArray(row.tags) || typeof row.content !== "string") throw new Error("malformed NIP-34 event");
  if (new TextEncoder().encode(row.content).length > (options?.maxBytes ?? 65_536)) throw new Error("NIP-34 size limit exceeded");
  const tags = row.tags as unknown[][]; const tag = (name: string) => tags.filter((item) => item[0] === name).map((item) => String(item[1] ?? ""));
  const expires = Number(tag("expiration")[0]); if (!Number.isSafeInteger(expires)) throw new Error("malformed NIP-34 expiration");
  if ((options?.now ?? Math.floor(Date.now() / 1000)) >= expires) throw new Error("NIP-34 event expired");
  if (options?.audience && !tag("aud").includes(options.audience)) throw new Error("NIP-34 audience denied");
  if (options?.seen?.has(id)) throw new Error("NIP-34 replay detected");
  const parsed = parseForge(JSON.parse(row.content)); if (parsed.visibility !== "public") throw new Error("private content rejected"); options?.seen?.add(id);
  return { object: parsed, losses: [] };
}

export interface RadicleRecord { readonly radicleId: string; readonly signedRef: string; readonly patchId: string; readonly sequence: number; readonly revision: string; readonly payload: ForgeObject }
export function encodeRadicle(value: ForgeObject, meta: { radicleId: string; signedRef: string; sequence: number }): { record: RadicleRecord; losses: readonly CodecLoss[] } {
  assertPublic(value); if (!/^rad:/u.test(meta.radicleId) || !/^refs\/rad\/sigrefs\//u.test(meta.signedRef)) throw new Error("malformed Radicle identity or signed ref");
  return { record: { ...meta, patchId: value.objectId, revision: value.revision, payload: value }, losses: value.kind === "change" ? [] : [{ path: "kind", reason: "mapped-to-patch", severity: "info" }] };
}
export function decodeRadicle(value: unknown, options?: { lastSequence?: number }): { object: ForgeObject; losses: readonly CodecLoss[] } {
  const row = object(value); const sequence = number(row.sequence, "Radicle sequence"); if (sequence <= (options?.lastSequence ?? -1)) throw new Error("stale Radicle replay");
  text(row.radicleId, "Radicle id"); text(row.signedRef, "Radicle signed ref"); return { object: parseForge(row.payload), losses: [] };
}

export * from "./mirror";
