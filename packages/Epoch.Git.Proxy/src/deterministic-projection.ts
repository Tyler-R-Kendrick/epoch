import { createHash } from "node:crypto";

export type GitObjectType = "blob" | "tree" | "commit";
export interface GitObject { readonly type: GitObjectType; readonly oid: string; readonly bytes: Buffer }

function object(type: GitObjectType, body: Uint8Array): GitObject {
  const bytes = Buffer.concat([Buffer.from(`${type} ${body.length}\0`), Buffer.from(body)]);
  return Object.freeze({ type, oid: createHash("sha1").update(bytes).digest("hex"), bytes });
}
export function gitBlob(bytes: Uint8Array): GitObject { return object("blob", bytes); }

export interface GitTreeEntry {
  readonly mode: "100644" | "100755" | "120000" | "160000" | "040000";
  readonly name: string;
  readonly oid: string;
}

export function gitTree(entries: readonly GitTreeEntry[]): GitObject {
  const sorted = [...entries].sort((left, right) => Buffer.from(left.name).compare(Buffer.from(right.name)));
  const body: Buffer[] = [];
  for (const entry of sorted) {
    if (!entry.name || entry.name.includes("/") || entry.name.includes("\0") || !/^[a-f0-9]{40}$/u.test(entry.oid)) {
      throw new Error("Invalid deterministic Git tree entry");
    }
    body.push(Buffer.from(`${entry.mode} ${entry.name}\0`), Buffer.from(entry.oid, "hex"));
  }
  return object("tree", Buffer.concat(body));
}

export interface GitIdentity {
  readonly name: string;
  readonly email: string;
  readonly timestamp: number;
  readonly timezone: `${"+" | "-"}${string}`;
}

export interface GitCommitInput {
  readonly tree: string;
  readonly parents: readonly string[];
  readonly author: GitIdentity;
  readonly committer: GitIdentity;
  readonly message: string;
  readonly notes?: Readonly<Record<string, string>>;
}

function identity(value: GitIdentity): string {
  if (!value.name || /[<>\n\r]/u.test(value.name) || !value.email || /[<>\n\r]/u.test(value.email) ||
      !Number.isSafeInteger(value.timestamp) || !/^[+-]\d{4}$/u.test(value.timezone)) throw new Error("Invalid deterministic Git identity");
  return `${value.name} <${value.email}> ${value.timestamp} ${value.timezone}`;
}

export function gitCommit(input: GitCommitInput): GitObject {
  if (!/^[a-f0-9]{40}$/u.test(input.tree) || input.parents.some((parent) => !/^[a-f0-9]{40}$/u.test(parent))) {
    throw new Error("Invalid Git commit graph identity");
  }
  const trailers = Object.entries(input.notes ?? {}).sort(([left], [right]) => left.localeCompare(right));
  for (const [key, value] of trailers) {
    if (!/^[A-Za-z0-9-]+$/u.test(key) || /[\n\r]/u.test(value)) throw new Error("Invalid Git commit note");
  }
  const header = [`tree ${input.tree}`, ...input.parents.map((parent) => `parent ${parent}`),
    `author ${identity(input.author)}`, `committer ${identity(input.committer)}`];
  const message = input.message.replace(/\r\n?/gu, "\n").replace(/\n*$/u, "");
  const body = `${header.join("\n")}\n\n${message}${trailers.length ? `\n\n${trailers.map(([key, value]) => `${key}: ${value}`).join("\n")}` : ""}\n`;
  return object("commit", Buffer.from(body));
}

export interface GitProjectionManifestV1 {
  readonly protocol: "epoch.git-projection/v1";
  readonly hash: "sha1";
  readonly defaultRef: string;
  readonly refs: Readonly<Record<string, string>>;
  readonly customRefs: Readonly<Record<string, string>>;
  readonly objects: readonly { readonly type: GitObjectType; readonly oid: string; readonly size: number }[];
}

function refs(input: Readonly<Record<string, string>>): Readonly<Record<string, string>> {
  return Object.freeze(Object.fromEntries(Object.entries(input).sort(([left], [right]) => left.localeCompare(right)).map(([ref, oid]) => {
    if (!/^refs\/[A-Za-z0-9._/-]+$/u.test(ref) || ref.includes("..") || !/^[a-f0-9]{40}$/u.test(oid)) throw new Error("Invalid Git projection ref");
    return [ref, oid];
  })));
}

export function createProjectionManifest(input: Omit<GitProjectionManifestV1, "protocol" | "hash" | "objects"> & { readonly objects: readonly GitObject[] }): GitProjectionManifestV1 {
  const projectedRefs = refs(input.refs);
  const customRefs = refs(input.customRefs);
  if (!(input.defaultRef in projectedRefs)) throw new Error("Default Git ref is not projected");
  return Object.freeze({ protocol: "epoch.git-projection/v1", hash: "sha1", defaultRef: input.defaultRef,
    refs: projectedRefs, customRefs,
    objects: Object.freeze([...input.objects].sort((a, b) => a.oid.localeCompare(b.oid)).map(({ type, oid, bytes }) => ({ type, oid, size: bytes.length }))),
  });
}

export function projectGitGraph(manifest: GitProjectionManifestV1): { readonly commits: readonly GitProjectionManifestV1["objects"][number][]; readonly refs: Readonly<Record<string, string>> } {
  return Object.freeze({ commits: manifest.objects.filter((entry) => entry.type === "commit"), refs: Object.freeze({ ...manifest.refs, ...manifest.customRefs }) });
}

export function analyzeGitIngestLoss(features: { readonly hasSubmodules: boolean; readonly hasReplaceRefs: boolean; readonly hasSignedCommits: boolean }): { readonly lossless: boolean; readonly unsupported: readonly string[] } {
  const unsupported = [features.hasSignedCommits && "signed-commit-attestation", features.hasSubmodules && "submodule-link",
    features.hasReplaceRefs && "replace-ref"].filter((value): value is string => Boolean(value)).sort();
  return Object.freeze({ lossless: unsupported.length === 0, unsupported });
}
