#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { CRDTRegistry, DefaultAuthor, dumpEntity, EntityType, EpochRepository, JsonEncoding, loadEntity } from "@epoch/core";
import { CliCommand, CliOption, CliSyntax, CliText, ParsedArgsSchema } from "./domain";

interface ParsedArgs {
  repo: string;
  command?: string;
  args: string[];
}

export function main(argv = process.argv.slice(2)): number {
  try {
    run(argv);
    return 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

function run(argv: string[]): void {
  const parsed = parseGlobalArgs(argv);
  if (parsed.command === undefined) {
    throw new Error(CliText.usage);
  }

  const repo = new EpochRepository(parsed.repo);
  switch (parsed.command) {
    case CliCommand.init: {
      const { author } = parseOptions(parsed.args, { author: DefaultAuthor });
      repo.init(author);
      console.log(`initialized Epoch repository at ${repo.epochDir}`);
      return;
    }
    case CliCommand.record: {
      const options = parseOptions(parsed.args, { type: EntityType.octetStream });
      if (options.positionals.length !== 1) throw new Error(`usage: epoch ${parsed.command} [--type MIME] PATH`);
      console.log(repo.recordFile(options.positionals[0], options.type).id);
      return;
    }
    case CliCommand.intent: {
      const options = parseOptions(parsed.args, { type: EntityType.octetStream });
      if (options.positionals.length !== 1) throw new Error(CliText.intentUsage);
      console.log(repo.intentFile(options.positionals[0], options.type).id);
      return;
    }
    case CliCommand.events:
      for (const event of repo.events()) {
        console.log(`${event.id} ${event.type} ${JSON.stringify(event.payload)}`);
      }
      return;
    case CliCommand.verify: {
      const problems = repo.verify();
      if (problems.length > 0) {
        for (const problem of problems) console.error(problem);
        throw new Error(CliText.verificationFailed);
      }
      console.log(CliText.ok);
      return;
    }
    case CliCommand.sync: {
      if (parsed.args.length !== 1) throw new Error(`usage: epoch ${parsed.command} PEER_REPO`);
      const result = repo.sync(parsed.args[0]);
      console.log(`synced ${result.eventsCopied} events and ${result.blobsCopied} blobs`);
      return;
    }
    case CliCommand.import: {
      if (parsed.args.length !== 1) throw new Error(`usage: epoch ${parsed.command} GIT_REPO`);
      const events = repo.importFromGit(parsed.args[0]);
      console.log(`imported ${events.length} files`);
      return;
    }
    case CliCommand.export: {
      if (parsed.args.length !== 1) throw new Error(`usage: epoch ${parsed.command} GIT_REPO`);
      const paths = repo.exportToGit(parsed.args[0]);
      console.log(`exported ${paths.length} files`);
      return;
    }
    case CliCommand.merge:
      if (parsed.args.length !== 1) throw new Error(CliText.mergeUsage);
      console.log(repo.mergeIntent(parsed.args[0]).id);
      return;
    case CliCommand.reject: {
      const options = parseOptions(parsed.args, { reason: "" });
      if (options.positionals.length !== 1) throw new Error(CliText.rejectUsage);
      console.log(repo.rejectIntent(options.positionals[0], options.reason).id);
      return;
    }
    case CliCommand.status:
      for (const decision of repo.policy().intents) {
        console.log(`${decision.intent.id} ${decision.status} merges=${decision.merges.join(",")} rejections=${decision.rejections.join(",")}`);
      }
      return;
    case CliCommand.main:
      for (const intent of repo.mainIntentIds()) {
        console.log(intent);
      }
      return;
    case CliCommand.resolve: {
      const options = parseOptions(parsed.args, { type: "" });
      if (options.type === "" || options.positionals.length !== 3) {
        throw new Error(CliText.resolveUsage);
      }
      const [base, left, right] = options.positionals.map((path) => loadEntity(options.type, readFileSync(path, JsonEncoding)));
      process.stdout.write(dumpEntity(options.type, CRDTRegistry.defaults().merge(options.type, base, left, right)));
      return;
    }
    case CliCommand.rollback: {
      if (parsed.args.length !== 1) throw new Error(CliText.rollbackUsage);
      console.log(repo.rollback(parsed.args[0]).id);
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

if (require.main === module) {
  process.exitCode = main();
}
