import { z } from "zod";

export const Symbols = {
  eventId: Symbol("epoch.eventId"),
  branchName: Symbol("epoch.branchName"),
  repositoryPath: Symbol("epoch.repositoryPath"),
} as const;

export type EventId = string & { readonly [Symbols.eventId]: true };
export type BranchName = string & { readonly [Symbols.branchName]: true };
export type RepositoryPath = string & { readonly [Symbols.repositoryPath]: true };

export const StorageName = {
  epoch: ".epoch",
  events: "events",
  blobs: "blobs",
  users: "users",
  heads: "heads.json",
  identity: "identity.json",
  branches: "branches.json",
} as const;

export const EntityType = {
  octetStream: "application/octet-stream",
  css: "text/css",
  csv: "text/csv",
  html: "text/html",
  javascript: "application/javascript",
  json: "application/json",
  jsx: "application/javascript",
  markdown: "text/plain",
  plainText: "text/plain",
  toml: "text/plain",
  typescript: "application/typescript",
  tsx: "application/typescript",
  xml: "text/plain",
  yaml: "text/plain",
} as const;

export const EventType = {
  commit: "commit",
  branch: "branch",
  rollback: "rollback",
  mergeRejected: "merge.rejected",
  legacyRecord: "record",
} as const;

export const CliCommand = {
  init: "init",
  commit: "commit",
  record: "record",
  log: "log",
  verify: "verify",
  merge: "merge",
  mergeAbort: "merge-abort",
  pull: "pull",
  push: "push",
  sync: "sync",
  branch: "branch",
  rollback: "rollback",
  import: "import",
  export: "export",
  gitImport: "git-import",
  gitExport: "git-export",
  gossip: "gossip",
  antiEntropy: "anti-entropy",
} as const;

export const CliOption = {
  author: "author",
  type: "type",
  reason: "reason",
  repo: "--repo",
} as const;

export const ActorCommand = {
  init: "repository.init",
  append: "repository.append",
  recordFile: "repository.recordFile",
  read: "repository.read",
  events: "repository.events",
  heads: "repository.heads",
  verify: "repository.verify",
  syncFrom: "repository.syncFrom",
  pull: "repository.pull",
  push: "repository.push",
  sync: "repository.sync",
  gossip: "repository.gossip",
  antiEntropy: "repository.antiEntropy",
} as const;

export const Git = {
  binary: "git",
  initDefaultBranch: "init.defaultBranch=main",
  userName: "user.name=epoch",
  userEmail: "user.email=epoch@example.invalid",
  lsFiles: "ls-files",
  init: "init",
  add: "add",
  status: "status",
  porcelain: "--porcelain",
  commit: "commit",
  message: "-m",
  config: "-c",
  repository: ".git",
  exportMessage: "Export from Epoch",
} as const;

export const GIT_AUTHOR_NAME = "epoch";
export const GIT_AUTHOR_EMAIL = "epoch@example.invalid";

export const DefaultAuthor = "local";
export const JsonEncoding = "utf8";
export const JsonFileExtension = ".json";

export const Schemas = {
  eventPayload: z.record(z.string(), z.unknown()),
  identity: z.object({
    author: z.string().min(1),
    publicKey: z.string().min(1),
    privateKey: z.string().min(1),
  }),
  unsignedEvent: z.object({
    type: z.string().min(1),
    author: z.string().min(1),
    lamport: z.number().int().nonnegative(),
    parents: z.array(z.string().min(1)),
    payload: z.record(z.string(), z.unknown()),
    timestamp: z.number().int().nonnegative(),
    authorPublicKey: z.string(),
  }),
  recordPayload: z.object({
    path: z.string().min(1),
    entity_type: z.string().min(1),
    blob_sha256: z.string().regex(/^[a-f0-9]{64}$/u),
    size: z.number().int().nonnegative(),
  }),
  branches: z.record(z.string().min(1), z.array(z.string().min(1))),
  heads: z.array(z.string().min(1)),
  parsedArgs: z.object({
    repo: z.string().min(1),
    command: z.string().optional(),
    args: z.array(z.string()),
  }),
  syncResult: z.object({
    eventsCopied: z.number().int().nonnegative(),
    blobsCopied: z.number().int().nonnegative(),
  }),
} as const;

export const EventDataSchema = Schemas.unsignedEvent.extend({
  id: z.string().min(1),
  signature: z.string(),
});

export const LegacyIdentitySchema = Schemas.identity.partial({ publicKey: true, privateKey: true }).required({ author: true });

export type EventData = z.infer<typeof EventDataSchema>;
export type EventPayload = z.infer<typeof Schemas.eventPayload>;
export type IdentityData = z.infer<typeof Schemas.identity>;
export type Branches = z.infer<typeof Schemas.branches>;
