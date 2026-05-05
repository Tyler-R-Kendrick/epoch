import { z } from "zod";

export const CliCommand = {
  init: "init",
  record: "record",
  intent: "intent",
  events: "events",
  verify: "verify",
  merge: "merge",
  reject: "reject",
  comment: "comment",
  status: "status",
  main: "main",
  resolve: "resolve",
  sync: "sync",
  rollback: "rollback",
  viewCreate: "view-create",
  views: "views",
  checkout: "checkout",
  viewDelete: "view-delete",
  viewDiff: "view-diff",
  viewPromote: "view-promote",
  import: "import",
  export: "export",
} as const;

export const CliOption = {
  author: "author",
  type: "type",
  title: "title",
  description: "description",
  reason: "reason",
  label: "label",
  intent: "intent",
  rule: "rule",
  parent: "parent",
  repo: "--repo",
} as const;

export const CliSyntax = {
  repositoryDefault: ".",
  optionPrefix: "--",
} as const;

export const CliText = {
  ok: "ok",
  verificationFailed: "verification failed",
  usage: "usage: epoch [--repo PATH] <init|record|intent|events|verify|merge|reject|comment|status|main|resolve|sync|rollback|view-create|views|checkout|view-delete|view-diff|view-promote|import|export>",
  intentUsage: "usage: epoch intent [--author NAME] [--type MIME] [--title TEXT] [--description TEXT] [--label A,B] PATH",
  mergeUsage: "usage: epoch merge [--author NAME] [--title TEXT] [--description TEXT] [--reason TEXT] [--label A,B] INTENT_ID",
  rejectUsage: "usage: epoch reject [--author NAME] [--title TEXT] [--description TEXT] [--reason TEXT] [--label A,B] INTENT_ID",
  commentUsage: "usage: epoch comment [--author NAME] [--intent INTENT_ID] [--title TEXT] [--description TEXT] [--label A,B] BODY",
  resolveUsage: "usage: epoch resolve --type MIME BASE LEFT RIGHT",
  rollbackUsage: "usage: epoch rollback EVENT_ID",
  viewCreateUsage: "usage: epoch view-create [--rule JSON] [--parent VIEW] NAME",
  checkoutUsage: "usage: epoch checkout VIEW",
  viewDeleteUsage: "usage: epoch view-delete VIEW",
  viewDiffUsage: "usage: epoch view-diff FROM TO",
  viewPromoteUsage: "usage: epoch view-promote SOURCE TARGET",
} as const;

export const ParsedArgsSchema = z.object({
  repo: z.string().min(1),
  command: z.string().optional(),
  args: z.array(z.string()),
});
