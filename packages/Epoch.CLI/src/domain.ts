import { z } from "zod";

export const CliCommand = {
  init: "init",
  record: "record",
  intent: "intent",
  events: "events",
  verify: "verify",
  merge: "merge",
  reject: "reject",
  status: "status",
  main: "main",
  resolve: "resolve",
  sync: "sync",
  rollback: "rollback",
  import: "import",
  export: "export",
} as const;

export const CliOption = {
  author: "author",
  type: "type",
  reason: "reason",
  repo: "--repo",
} as const;

export const CliSyntax = {
  repositoryDefault: ".",
  optionPrefix: "--",
} as const;

export const CliText = {
  ok: "ok",
  verificationFailed: "verification failed",
  usage: "usage: epoch [--repo PATH] <init|record|intent|events|verify|merge|reject|status|main|resolve|sync|rollback|import|export>",
  intentUsage: "usage: epoch intent [--type MIME] PATH",
  mergeUsage: "usage: epoch merge INTENT_ID",
  rejectUsage: "usage: epoch reject [--reason TEXT] INTENT_ID",
  resolveUsage: "usage: epoch resolve --type MIME BASE LEFT RIGHT",
  rollbackUsage: "usage: epoch rollback EVENT_ID",
} as const;

export const ParsedArgsSchema = z.object({
  repo: z.string().min(1),
  command: z.string().optional(),
  args: z.array(z.string()),
});
