import { z } from "zod";

export const Symbols = {
  eventId: Symbol("epoch.eventId"),
  repositoryPath: Symbol("epoch.repositoryPath"),
} as const;

export type EventId = string & { readonly [Symbols.eventId]: true };
export type RepositoryPath = string & { readonly [Symbols.repositoryPath]: true };

export const StorageName = {
  epoch: ".epoch",
  events: "events",
  blobs: "blobs",
  users: "users",
  heads: "heads.json",
  identity: "identity.json",
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
  record: "record",
  intent: "intent",
  intentMerge: "intent.merge",
  intentReject: "intent.reject",
  rollback: "rollback",
} as const;

export const IntentStatus = {
  merged: "merged",
  rejected: "rejected",
  pending: "pending",
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
  sync: "repository.sync",
} as const;

export const Git = {
  binary: "git",
  workTreeOption: "-C",
  nulTerminated: "-z",
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

export const SignatureText = {
  missingSignature: "missing signature",
  missingPublicKey: "missing public key",
  invalidSignature: "invalid signature",
} as const;

export const GIT_AUTHOR_NAME = "epoch";
export const GIT_AUTHOR_EMAIL = "epoch@example.invalid";

export const DefaultAuthor = "local";
export const JsonEncoding = "utf8";
export const JsonFileExtension = ".json";

export const FileExtension = {
  css: ".css",
  csv: ".csv",
  htm: ".htm",
  html: ".html",
  javascript: ".js",
  json: JsonFileExtension,
  jsx: ".jsx",
  markdownLong: ".markdown",
  markdown: ".md",
  toml: ".toml",
  typescript: ".ts",
  tsx: ".tsx",
  text: ".txt",
  xml: ".xml",
  yaml: ".yaml",
  yml: ".yml",
} as const;

export const TextToken = {
  empty: "",
  newline: "\n",
  comma: ",",
  dot: ".",
  pathSeparator: "/",
  parentPath: "..",
  nul: "\0",
} as const;

export const CryptoSpec = {
  eventHash: "sha256",
  hashDigest: "hex",
  signingAlgorithm: "ed25519",
  publicKeyType: "spki",
  privateKeyType: "pkcs8",
  keyFormat: "pem",
  signatureEncoding: "base64",
} as const;

export const FsFlag = {
  exclusiveWrite: "wx",
  exists: "EEXIST",
} as const;

export const RepositoryText = {
  recordFile: "record file",
  readPath: "read path",
  writePath: "write path",
  repositoryRoot: "repository root",
  gitRepository: "Git repository",
  invalidFileRecordPayload: "invalid file record payload",
} as const;

export const MergeText = {
  conflictName: "MergeConflictError",
  jsonPathRoot: "$",
  textTypeError: "text/plain merges require string values",
} as const;

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
  intentPayload: z.object({
    base: z.array(z.string().min(1)),
    patches: z.array(z.object({
      path: z.string().min(1),
      entity_type: z.string().min(1),
      blob_sha256: z.string().regex(/^[a-f0-9]{64}$/u),
      size: z.number().int().nonnegative(),
    })).min(1),
  }),
  intentMergePayload: z.object({
    intent: z.string().min(1),
  }),
  intentRejectPayload: z.object({
    intent: z.string().min(1),
    reason: z.string(),
  }),
  heads: z.array(z.string().min(1)),
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
export type IntentPayload = z.infer<typeof Schemas.intentPayload>;
export type IntentMergePayload = z.infer<typeof Schemas.intentMergePayload>;
export type IntentRejectPayload = z.infer<typeof Schemas.intentRejectPayload>;
