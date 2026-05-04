#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { CRDTRegistry, dumpEntity, EpochRepository, loadEntity } from "./index";
import { CliCommand, CliOption, DefaultAuthor, EntityType, JsonEncoding, Schemas } from "./domain";

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
    throw new Error(`usage: epoch [${CliOption.repo} PATH] <init|commit|log|verify|merge|merge-abort|pull|push|sync|branch|rollback|import|export>`);
  }

  const repo = new EpochRepository(parsed.repo);
  switch (parsed.command) {
    case CliCommand.init: {
      const { author } = parseOptions(parsed.args, { [CliOption.author]: DefaultAuthor });
      repo.init(author);
      console.log(`initialized Epoch repository at ${repo.epochDir}`);
      return;
    }
    case CliCommand.commit:
    case CliCommand.record: {
      const options = parseOptions(parsed.args, { [CliOption.type]: EntityType.octetStream });
      if (options.positionals.length !== 1) throw new Error(`usage: epoch ${parsed.command} [--type MIME] PATH`);
      console.log(repo.recordFile(options.positionals[0], options.type).id);
      return;
    }
    case CliCommand.log:
      for (const event of repo.events()) {
        console.log(`${event.id} ${event.type} ${JSON.stringify(event.payload)}`);
      }
      return;
    case CliCommand.verify: {
      const problems = repo.verify();
      if (problems.length > 0) {
        for (const problem of problems) console.error(problem);
        throw new Error("verification failed");
      }
      console.log("ok");
      return;
    }
    case CliCommand.pull:
    case CliCommand.push:
    case CliCommand.sync:
    case CliCommand.gossip:
    case CliCommand.antiEntropy: {
      if (parsed.args.length !== 1) throw new Error(`usage: epoch ${parsed.command} PEER_REPO`);
      const result = syncByCommand(repo, parsed.command, parsed.args[0]);
      console.log(`synced ${result.eventsCopied} events and ${result.blobsCopied} blobs`);
      return;
    }
    case CliCommand.import:
    case CliCommand.gitImport: {
      if (parsed.args.length !== 1) throw new Error(`usage: epoch ${parsed.command} GIT_REPO`);
      const events = repo.importFromGit(parsed.args[0]);
      console.log(`imported ${events.length} files`);
      return;
    }
    case CliCommand.export:
    case CliCommand.gitExport: {
      if (parsed.args.length !== 1) throw new Error(`usage: epoch ${parsed.command} GIT_REPO`);
      const paths = repo.exportToGit(parsed.args[0]);
      console.log(`exported ${paths.length} files`);
      return;
    }
    case CliCommand.merge: {
      const options = parseOptions(parsed.args, { [CliOption.type]: "" });
      if (options.type === "" || options.positionals.length !== 3) {
        throw new Error("usage: epoch merge --type MIME BASE LEFT RIGHT");
      }
      const [base, left, right] = options.positionals.map((path) => loadEntity(options.type, readFileSync(path, JsonEncoding)));
      process.stdout.write(dumpEntity(options.type, CRDTRegistry.defaults().merge(options.type, base, left, right)));
      return;
    }
    case CliCommand.mergeAbort: {
      const { reason } = parseOptions(parsed.args, { [CliOption.reason]: "" });
      console.log(repo.rejectMerge(reason).id);
      return;
    }
    case CliCommand.branch: {
      if (parsed.args.length === 0) {
        for (const [name, heads] of Object.entries(repo.branches()).sort(([left], [right]) => left.localeCompare(right))) {
          console.log(`${name} ${heads.join(",")}`);
        }
        return;
      }
      if (parsed.args.length !== 1) throw new Error("usage: epoch branch [NAME]");
      console.log(repo.branch(parsed.args[0]).id);
      return;
    }
    case CliCommand.rollback: {
      if (parsed.args.length !== 1) throw new Error("usage: epoch rollback EVENT_ID");
      console.log(repo.rollback(parsed.args[0]).id);
      return;
    }
    default:
      throw new Error(`unknown command: ${parsed.command}`);
  }
}

function syncByCommand(repo: EpochRepository, command: string, peerRoot: string) {
  if (command === CliCommand.pull) return repo.pull(peerRoot);
  if (command === CliCommand.push) return repo.push(peerRoot);
  return repo.sync(peerRoot);
}

function parseGlobalArgs(argv: string[]): ParsedArgs {
  const args = [...argv];
  let repo = ".";
  while (args[0]?.startsWith("--")) {
    const option = args.shift();
    if (option === CliOption.repo) {
      repo = requiredValue(option, args.shift());
    } else {
      throw new Error(`unknown option: ${option}`);
    }
  }
  return Schemas.parsedArgs.parse({ repo, command: args.shift(), args });
}

function parseOptions<T extends Record<string, string>>(args: string[], defaults: T): T & { positionals: string[] } {
  const values: Record<string, string | string[]> = { ...defaults, positionals: [] };
  const remaining = [...args];
  while (remaining.length > 0) {
    const token = remaining.shift() as string;
    if (!token.startsWith("--")) {
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
