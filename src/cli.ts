#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { CRDTRegistry, dumpEntity, EpochRepository, loadEntity } from "./index";

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
      throw new Error("usage: epoch [--repo PATH] <init|record|log|verify|merge|gossip|anti-entropy|git-import|git-export|view-create|views|checkout|view-delete|view-diff|view-promote>");
  }

  const repo = new EpochRepository(parsed.repo);
  switch (parsed.command) {
    case "init": {
      const { author } = parseOptions(parsed.args, { author: "local" });
      repo.init(author);
      console.log(`initialized Epoch repository at ${repo.epochDir}`);
      return;
    }
    case "record": {
      const options = parseOptions(parsed.args, { type: "" });
      if (options.positionals.length !== 1) throw new Error("usage: epoch record [--type MIME] PATH");
      console.log(repo.recordFile(options.positionals[0], options.type).id);
      return;
    }
    case "view-create": {
      const options = parseOptions(parsed.args, { rule: "{\"type\":\"all\"}", parent: "" });
      if (options.positionals.length !== 1) throw new Error("usage: epoch view-create [--rule JSON] [--parent VIEW] NAME");
      const event = repo.createView(options.positionals[0], JSON.parse(options.rule), options.parent === "" ? undefined : options.parent);
      console.log(event.id);
      return;
    }
    case "views":
      for (const view of repo.listViews()) {
        const current = view.name === repo.currentView() ? "*" : " ";
        console.log(`${current} ${view.name} ${JSON.stringify(view.rule)}`);
      }
      return;
    case "checkout": {
      if (parsed.args.length !== 1) throw new Error("usage: epoch checkout VIEW");
      const state = repo.checkoutView(parsed.args[0]);
      console.log(`checked out ${state.name} (${state.proposalIds.length} proposals)`);
      return;
    }
    case "view-delete": {
      if (parsed.args.length !== 1) throw new Error("usage: epoch view-delete VIEW");
      repo.deleteView(parsed.args[0]);
      return;
    }
    case "view-diff": {
      if (parsed.args.length !== 2) throw new Error("usage: epoch view-diff FROM TO");
      console.log(JSON.stringify(repo.diffViews(parsed.args[0], parsed.args[1]), null, 2));
      return;
    }
    case "view-promote": {
      if (parsed.args.length !== 2) throw new Error("usage: epoch view-promote SOURCE TARGET");
      console.log(repo.promoteToView(parsed.args[0], parsed.args[1]).id);
      return;
    }
    case "log":
      for (const event of repo.events()) {
        console.log(`${event.id} ${event.type} ${JSON.stringify(event.payload)}`);
      }
      return;
    case "verify": {
      const problems = repo.verify();
      if (problems.length > 0) {
        for (const problem of problems) console.error(problem);
        throw new Error("verification failed");
      }
      console.log("ok");
      return;
    }
    case "gossip":
    case "anti-entropy": {
      if (parsed.args.length !== 1) throw new Error(`usage: epoch ${parsed.command} PEER_REPO`);
      const result = parsed.command === "gossip" ? repo.gossip(parsed.args[0]) : repo.antiEntropy(parsed.args[0]);
      console.log(`synced ${result.eventsCopied} events and ${result.blobsCopied} blobs`);
      return;
    }
    case "git-import": {
      if (parsed.args.length !== 1) throw new Error("usage: epoch git-import GIT_REPO");
      const events = repo.importFromGit(parsed.args[0]);
      console.log(`imported ${events.length} files`);
      return;
    }
    case "git-export": {
      if (parsed.args.length !== 1) throw new Error("usage: epoch git-export GIT_REPO");
      const paths = repo.exportToGit(parsed.args[0]);
      console.log(`exported ${paths.length} files`);
      return;
    }
    case "merge": {
      const options = parseOptions(parsed.args, { type: "" });
      if (options.type === "" || options.positionals.length !== 3) {
        throw new Error("usage: epoch merge --type MIME BASE LEFT RIGHT");
      }
      const [base, left, right] = options.positionals.map((path) => loadEntity(options.type, readFileSync(path, "utf8")));
      process.stdout.write(dumpEntity(options.type, CRDTRegistry.defaults().merge(options.type, base, left, right)));
      return;
    }
    default:
      throw new Error(`unknown command: ${parsed.command}`);
  }
}

function parseGlobalArgs(argv: string[]): ParsedArgs {
  const args = [...argv];
  let repo = ".";
  while (args[0]?.startsWith("--")) {
    const option = args.shift();
    if (option === "--repo") {
      repo = requiredValue(option, args.shift());
    } else {
      throw new Error(`unknown option: ${option}`);
    }
  }
  return { repo, command: args.shift(), args };
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
