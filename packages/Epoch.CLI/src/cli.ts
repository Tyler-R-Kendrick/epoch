#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { CRDTRegistry, DefaultAuthor, disasterRecoveryPlan, dumpEntity, EntityType, EpochRepository, JsonEncoding, loadEntity } from "@epoch/core";
import type { EventMetadata } from "@epoch/core";
import { CliCommand, CliOption, CliSyntax, CliText, ParsedArgsSchema } from "./domain";

interface ParsedArgs {
  repo: string;
  command?: string;
  args: string[];
}

export interface CliIO {
  stdout: { write(message: string): unknown };
  stderr: { write(message: string): unknown };
}

const processCliIO: CliIO = { stdout: process.stdout, stderr: process.stderr };

export function main(argv = process.argv.slice(2), io: CliIO = processCliIO): number {
  try {
    run(argv, io);
    return 0;
  } catch (error) {
    io.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

function run(argv: string[], io: CliIO): void {
  const parsed = parseGlobalArgs(argv);
  if (parsed.command === undefined) {
    throw new Error(CliText.usage);
  }

  const repo = new EpochRepository(parsed.repo);
  switch (parsed.command) {
    case CliCommand.init: {
      const { author } = parseOptions(parsed.args, { author: DefaultAuthor });
      repo.init(author);
      writeLine(io, `initialized Epoch repository at ${repo.epochDir}`);
      return;
    }
    case CliCommand.record: {
      const options = parseOptions(parsed.args, { type: EntityType.octetStream });
      if (options.positionals.length !== 1) throw new Error(`usage: epoch ${parsed.command} [--type MIME] PATH`);
      const event = repo.recordFile(options.positionals[0], options.type);
      writeLine(io, event.id);
      recordCliOperation(repo, "record", { eventId: event.id, path: options.positionals[0] });
      return;
    }
    case CliCommand.intent: {
      const options = parseOptions(parsed.args, { author: repo.identity(), type: EntityType.octetStream, title: "", description: "", label: "" });
      if (options.positionals.length !== 1) throw new Error(CliText.intentUsage);
      const event = repo.intentFile(options.positionals[0], options.type, options.author, metadataFromOptions(options));
      writeLine(io, event.id);
      recordCliOperation(repo, "intent", { eventId: event.id, path: options.positionals[0] });
      return;
    }
    case CliCommand.events:
      for (const event of repo.events()) {
        writeLine(io, `${event.id} ${event.type} ${JSON.stringify(event.payload)}`);
      }
      return;
    case CliCommand.verify: {
      const problems = repo.verify();
      if (problems.length > 0) {
        for (const problem of problems) writeErrorLine(io, problem);
        throw new Error(CliText.verificationFailed);
      }
      writeLine(io, CliText.ok);
      return;
    }
    case CliCommand.sync: {
      if (parsed.args.length !== 1) throw new Error(`usage: epoch ${parsed.command} PEER_REPO`);
      const result = repo.sync(parsed.args[0]);
      writeLine(io, `synced ${result.eventsCopied} events and ${result.blobsCopied} blobs`);
      recordCliOperation(repo, "sync", { peer: parsed.args[0], eventsCopied: result.eventsCopied, blobsCopied: result.blobsCopied });
      return;
    }
    case CliCommand.import: {
      if (parsed.args.length !== 1) throw new Error(`usage: epoch ${parsed.command} GIT_REPO`);
      const events = repo.importFromGit(parsed.args[0]);
      writeLine(io, `imported ${events.length} files`);
      recordCliOperation(repo, "import", { gitRepo: parsed.args[0], eventIds: events.map((event) => event.id) });
      return;
    }
    case CliCommand.export: {
      if (parsed.args.length !== 1) throw new Error(`usage: epoch ${parsed.command} GIT_REPO`);
      const paths = repo.exportToGit(parsed.args[0]);
      writeLine(io, `exported ${paths.length} files`);
      recordCliOperation(repo, "export", { gitRepo: parsed.args[0], paths });
      return;
    }
    case CliCommand.merge: {
      const options = parseOptions(parsed.args, { author: repo.identity(), title: "", description: "", reason: "", label: "" });
      if (options.positionals.length !== 1) throw new Error(CliText.mergeUsage);
      const event = repo.mergeIntent(options.positionals[0], options.author, metadataFromOptions(options));
      writeLine(io, event.id);
      recordCliOperation(repo, "merge", { eventId: event.id, intentId: options.positionals[0] });
      return;
    }
    case CliCommand.reject: {
      const options = parseOptions(parsed.args, { author: repo.identity(), title: "", description: "", reason: "", label: "" });
      if (options.positionals.length !== 1) throw new Error(CliText.rejectUsage);
      const event = repo.rejectIntent(options.positionals[0], options.reason, options.author, metadataFromOptions(options));
      writeLine(io, event.id);
      recordCliOperation(repo, "reject", { eventId: event.id, intentId: options.positionals[0] });
      return;
    }
    case CliCommand.comment: {
      const options = parseOptions(parsed.args, { author: repo.identity(), intent: "", title: "", description: "", label: "" });
      if (options.positionals.length !== 1) throw new Error(CliText.commentUsage);
      const event = repo.comment(options.positionals[0], options.intent === "" ? undefined : options.intent, options.author, metadataFromOptions(options));
      writeLine(io, event.id);
      recordCliOperation(repo, "comment", { eventId: event.id, intentId: options.intent });
      return;
    }
    case CliCommand.issue: {
      const options = parseOptions(parsed.args, { author: repo.identity(), title: "" });
      if (options.title === "" || options.positionals.length !== 1) throw new Error(CliText.issueUsage);
      const event = repo.createIssue(options.title, options.positionals[0], options.author);
      writeLine(io, `${event.id} ${event.type}`);
      recordCliOperation(repo, "issue", { eventId: event.id, title: options.title });
      return;
    }
    case CliCommand.review: {
      const options = parseOptions(parsed.args, { author: repo.identity(), state: "", body: "" });
      if (options.state === "" || options.body === "" || options.positionals.length !== 1) throw new Error(CliText.reviewUsage);
      const event = repo.reviewIntent(options.positionals[0], options.state, options.body, options.author);
      writeLine(io, `${event.id} ${event.type}`);
      recordCliOperation(repo, "review", { eventId: event.id, intentId: options.positionals[0], state: options.state });
      return;
    }
    case CliCommand.ciRecord: {
      const options = parseOptions(parsed.args, { author: repo.identity(), name: "", status: "" });
      if (options.name === "" || options.status === "" || options.positionals.length !== 1) throw new Error(CliText.ciRecordUsage);
      const event = repo.recordCI(options.name, options.status, options.positionals[0], options.author);
      writeLine(io, `${event.id} ${event.type}`);
      recordCliOperation(repo, "ci-record", { eventId: event.id, intentId: options.positionals[0], name: options.name, status: options.status });
      return;
    }
    case CliCommand.gateStatus: {
      const options = parseOptions(parsed.args, { review: "", ci: "" });
      if (options.positionals.length !== 1) throw new Error(CliText.gateStatusUsage);
      const gate = repo.gateStatus(options.positionals[0], {
        requiredReviewState: options.review === "" ? undefined : options.review,
        requiredCi: options.ci === "" ? [] : splitCsv(options.ci),
      });
      writeLine(io, gate.passed ? "gate passed" : `gate blocked: ${gate.blockers.join(", ")}`);
      return;
    }
    case CliCommand.opLog:
      for (const operation of repo.operations()) {
        writeLine(io, `${operation.id} ${operation.command} ${operation.status}`);
      }
      return;
    case CliCommand.opShow: {
      if (parsed.args.length !== 1) throw new Error(CliText.opShowUsage);
      const operation = repo.operations().find((candidate) => candidate.id === parsed.args[0]);
      if (operation === undefined) throw new Error(`operation not found: ${parsed.args[0]}`);
      writeLine(io, JSON.stringify(operation, null, 2));
      return;
    }
    case CliCommand.redact: {
      const options = parseOptions(parsed.args, { author: repo.identity(), reason: "" });
      if (options.positionals.length !== 1) throw new Error(CliText.redactUsage);
      const event = repo.redactBlob(options.positionals[0], options.reason, options.author);
      writeLine(io, `${event.id} ${event.type}`);
      recordCliOperation(repo, "redact", { eventId: event.id, blobSha256: options.positionals[0] });
      return;
    }
    case CliCommand.redactPlan: {
      if (parsed.args.length !== 1) throw new Error(CliText.redactPlanUsage);
      const plan = repo.planRedaction(parsed.args[0]);
      writeLine(io, JSON.stringify({ ...plan, affectedEvents: plan.eventIds }, null, 2));
      return;
    }
    case CliCommand.status:
      for (const decision of repo.policy().intents) {
        writeLine(io, `${decision.intent.id} ${decision.status} merges=${decision.merges.join(",")} rejections=${decision.rejections.join(",")}`);
      }
      return;
    case CliCommand.main:
      for (const intent of repo.mainIntentIds()) {
        writeLine(io, intent);
      }
      return;
    case CliCommand.resolve: {
      const options = parseOptions(parsed.args, { type: "", path: "", "record-resolution": "" });
      if (options.type === "" || options.positionals.length !== 3) {
        throw new Error(CliText.resolveUsage);
      }
      const [base, left, right] = options.positionals.map((path) => loadEntity(options.type, readFileSync(path, JsonEncoding)));
      if (options["record-resolution"] !== "") {
        const resolved = loadEntity(options.type, readFileSync(options["record-resolution"], JsonEncoding));
        const event = repo.recordConflictResolution({
          path: options.path === "" ? options["record-resolution"] : options.path,
          entityType: options.type,
          base,
          left,
          right,
          resolved,
        });
        writeLine(io, event.id);
        recordCliOperation(repo, "resolve-record", { eventId: event.id, path: options.path, entityType: options.type });
        return;
      }
      const merged = options.path === ""
        ? CRDTRegistry.defaults().merge(options.type, base, left, right)
        : repo.mergeEntity(options.path, options.type, base, left, right);
      io.stdout.write(dumpEntity(options.type, merged));
      return;
    }
    case CliCommand.rollback: {
      if (parsed.args.length !== 1) throw new Error(CliText.rollbackUsage);
      writeLine(io, repo.rollback(parsed.args[0]).id);
      return;
    }
    case CliCommand.drPlan:
      writeLine(io, disasterRecoveryPlan());
      return;
    case CliCommand.viewCreate: {
      const options = parseOptions(parsed.args, { rule: "{\"type\":\"all\"}", parent: "" });
      if (options.positionals.length !== 1) throw new Error(CliText.viewCreateUsage);
      const event = repo.createView(options.positionals[0], JSON.parse(options.rule), options.parent === "" ? undefined : options.parent);
      writeLine(io, event.id);
      return;
    }
    case CliCommand.views:
      for (const view of repo.listViews()) {
        const current = view.name === repo.currentView() ? "*" : " ";
        writeLine(io, `${current} ${view.name} ${JSON.stringify(view.rule)}`);
      }
      return;
    case CliCommand.checkout: {
      if (parsed.args.length !== 1) throw new Error(CliText.checkoutUsage);
      const state = repo.checkoutView(parsed.args[0]);
      writeLine(io, `checked out ${state.name} (${state.intentIds.length} intents)`);
      recordCliOperation(repo, "checkout", { view: parsed.args[0], intentIds: state.intentIds });
      return;
    }
    case CliCommand.viewDelete: {
      if (parsed.args.length !== 1) throw new Error(CliText.viewDeleteUsage);
      repo.deleteView(parsed.args[0]);
      recordCliOperation(repo, "view-delete", { view: parsed.args[0] });
      return;
    }
    case CliCommand.viewDiff: {
      if (parsed.args.length !== 2) throw new Error(CliText.viewDiffUsage);
      writeLine(io, JSON.stringify(repo.diffViews(parsed.args[0], parsed.args[1]), null, 2));
      return;
    }
    case CliCommand.viewPromote: {
      if (parsed.args.length !== 2) throw new Error(CliText.viewPromoteUsage);
      const event = repo.promoteToView(parsed.args[0], parsed.args[1]);
      writeLine(io, event.id);
      recordCliOperation(repo, "view-promote", { eventId: event.id, source: parsed.args[0], target: parsed.args[1] });
      return;
    }
    default:
      throw new Error(`unknown command: ${parsed.command}`);
  }
}

function parseGlobalArgs(argv: string[]): ParsedArgs {
  const args = [...argv];
  let repo: string = CliSyntax.repositoryDefault;
  while (args[0]?.startsWith(CliSyntax.optionPrefix)) {
    const option = args.shift();
    if (option === CliOption.repo) {
      repo = requiredValue(option, args.shift());
    } else {
      throw new Error(`unknown option: ${option}`);
    }
  }
  return ParsedArgsSchema.parse({ repo, command: args.shift(), args });
}

function parseOptions<T extends Record<string, string>>(args: string[], defaults: T): T & { positionals: string[] } {
  const values: Record<string, string | string[]> = { ...defaults, positionals: [] };
  const remaining = [...args];
  while (remaining.length > 0) {
    const token = remaining.shift() as string;
    if (!token.startsWith(CliSyntax.optionPrefix)) {
      (values.positionals as string[]).push(token);
      continue;
    }
    const key = token.slice(2);
    if (!(key in defaults)) throw new Error(`unknown option: ${token}`);
    values[key] = requiredValue(token, remaining.shift());
  }
  return values as T & { positionals: string[] };
}

function requiredValue(option: string, value: string | undefined): string {
  if (value === undefined) throw new Error(`${option} requires a value`);
  return value;
}

function metadataFromOptions(options: { title?: string; description?: string; reason?: string; label?: string }): EventMetadata {
  const metadata: EventMetadata = {};
  if (options.title !== undefined && options.title.length > 0) metadata.title = options.title;
  if (options.description !== undefined && options.description.length > 0) metadata.description = options.description;
  if (options.reason !== undefined && options.reason.length > 0) metadata.reason = options.reason;
  if (options.label !== undefined && options.label.length > 0) {
    metadata.labels = options.label.split(",").map((label) => label.trim()).filter((label) => label.length > 0);
  }
  return metadata;
}

function splitCsv(value: string): string[] {
  return value.split(",").map((item) => item.trim()).filter((item) => item.length > 0);
}

function recordCliOperation(repo: EpochRepository, command: string, detail: Record<string, unknown>): void {
  repo.appendOperation(command, "succeeded", detail);
}

function writeLine(io: CliIO, message: string): void {
  io.stdout.write(`${message}\n`);
}

function writeErrorLine(io: CliIO, message: string): void {
  io.stderr.write(`${message}\n`);
}

if (require.main === module) {
  process.exitCode = main();
}
