import { z } from "zod";

export const CliCommand = {
  init: "init",
  record: "record",
  events: "events",
  verify: "verify",
  merge: "merge",
  sync: "sync",
  branch: "branch",
  rollback: "rollback",
  import: "import",
  export: "export",
} as const;

export const CliOption = {
  author: "author",
  type: "type",
  repo: "--repo",
} as const;

export const CliSyntax = {
  repositoryDefault: ".",
  optionPrefix: "--",
  branchSeparator: ",",
} as const;

export const CliText = {
  ok: "ok",
  verificationFailed: "verification failed",
  usage: "usage: epoch [--repo PATH] <init|record|events|verify|merge|sync|branch|rollback|import|export>",
  mergeUsage: "usage: epoch merge --type MIME BASE LEFT RIGHT",
  branchUsage: "usage: epoch branch [NAME]",
  rollbackUsage: "usage: epoch rollback EVENT_ID",
} as const;

export const ParsedArgsSchema = z.object({
  repo: z.string().min(1),
  command: z.string().optional(),
  args: z.array(z.string()),
});
