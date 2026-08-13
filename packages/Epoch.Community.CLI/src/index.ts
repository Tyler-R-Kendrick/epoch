#!/usr/bin/env node
import { createHttpCommunityClient } from "@epoch/community-core";
import type {
  CommunityClient,
  CommunityReviewDecision,
  ConvergenceWorkbenchSnapshot,
  PartialMergePlan,
} from "@epoch/community-core";

export interface CommunityCliIO {
  stdout(message: string): void;
  stderr(message: string): void;
}

export interface CommunityCliContext {
  readonly client: CommunityClient;
  readonly convergence?: {
    getSnapshot(): ConvergenceWorkbenchSnapshot;
    planPartialMerge(changeId: string): PartialMergePlan;
  };
}

export interface CommunityCliEnvironment {
  readonly EPOCH_COMMUNITY_URL?: string;
}

const usage = [
  "Usage:",
  "  epoch-community [--remote URL] COMMAND",
  "",
  "  epoch-community repositories",
  "  epoch-community issues open REPOSITORY --title TITLE --author AUTHOR [--body BODY] [--label LABEL]",
  "  epoch-community changes propose REPOSITORY --title TITLE --author AUTHOR --source-view VIEW --target-view VIEW [--body BODY]",
  "  epoch-community changes review REPOSITORY PROPOSAL --reviewer AUTHOR --decision approved|changes-requested|commented [--body BODY]",
  "  epoch-community graph show",
  "  epoch-community bundle review",
  "  epoch-community merge preview CHANGE",
  "",
  "The remote comes from --remote, then EPOCH_COMMUNITY_URL.",
].join("\n");

export async function main(
  argv = process.argv.slice(2),
  io: CommunityCliIO = processCliIO,
  context?: CommunityCliContext,
  environment: CommunityCliEnvironment = process.env,
): Promise<number> {
  try {
    const { remote, rest } = takeRemoteOption(argv);
    const command = rest[0];
    // Help must work before a remote is configured — it is how you find out
    // that a remote is what you are missing.
    if (command === undefined || command === "help" || command === "--help") {
      io.stdout(`${usage}\n`);
      return 0;
    }

    await run(rest, io, context ?? bootstrapContext(remote, environment));
    return 0;
  } catch (error) {
    io.stderr(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

/**
 * Build a context when the host did not inject one.
 *
 * The executable entry point calls `main()` with no arguments, so requiring an
 * injected context made the published `epoch-community` binary throw before it
 * could parse a single command. A CLI has to be able to configure itself: an
 * explicit `--remote`, then the environment, then a message that says which
 * knob to turn.
 */
export function bootstrapContext(
  remote: string | undefined,
  environment: CommunityCliEnvironment = process.env,
): CommunityCliContext {
  const baseUrl = remote ?? environment.EPOCH_COMMUNITY_URL;
  if (baseUrl === undefined || baseUrl.trim().length === 0) {
    throw new Error("No Community remote configured. Pass --remote URL or set EPOCH_COMMUNITY_URL.");
  }

  return { client: createHttpCommunityClient({ baseUrl: baseUrl.trim() }) };
}

function takeRemoteOption(argv: readonly string[]): { remote?: string; rest: readonly string[] } {
  const index = argv.indexOf("--remote");
  if (index === -1) return { rest: argv };
  const value = argv[index + 1];
  if (value === undefined || value.startsWith("--")) throw new Error("Missing value for --remote");
  return { remote: value, rest: [...argv.slice(0, index), ...argv.slice(index + 2)] };
}

async function run(
  argv: readonly string[],
  io: CommunityCliIO,
  context: CommunityCliContext,
): Promise<void> {
  const [command, subcommand, ...rest] = argv;
  if (command === undefined || command === "help" || command === "--help") {
    io.stdout(`${usage}\n`);
    return;
  }

  if (command === "repositories") {
    const repositories = await context.client.listRepositories();
    for (const repository of repositories) {
      io.stdout(`${repository.slug}\t${repository.displayName}\n`);
    }
    return;
  }

  if (command === "issues" && subcommand === "open") {
    const [slug, ...args] = rest;
    if (slug === undefined) throw new Error("issues open requires a repository slug");
    const options = parseOptions(args);
    const repository = await context.client.openIssue(slug, {
      title: requiredOption(options, "title"),
      author: requiredOption(options, "author"),
      body: options.body,
      labels: options.label === undefined ? [] : [options.label],
    });
    io.stdout(`${repository.slug}\t${repository.issues.at(-1)?.id ?? ""}\n`);
    return;
  }

  if (command === "changes" && subcommand === "propose") {
    const [slug, ...args] = rest;
    if (slug === undefined) throw new Error("changes propose requires a repository slug");
    const options = parseOptions(args);
    const repository = await context.client.proposeChange(slug, {
      title: requiredOption(options, "title"),
      author: requiredOption(options, "author"),
      sourceView: requiredOption(options, "source-view"),
      targetView: requiredOption(options, "target-view"),
      body: options.body,
    });
    io.stdout(`${repository.slug}\t${repository.changeProposals.at(-1)?.id ?? ""}\n`);
    return;
  }

  if (command === "changes" && subcommand === "review") {
    const [slug, proposalId, ...args] = rest;
    if (slug === undefined || proposalId === undefined) {
      throw new Error("changes review requires a repository slug and proposal id");
    }

    const options = parseOptions(args);
    const repository = await context.client.reviewChange(slug, proposalId, {
      reviewer: requiredOption(options, "reviewer"),
      decision: parseDecision(requiredOption(options, "decision")),
      body: options.body,
    });
    io.stdout(`${repository.slug}\t${proposalId}\t${repository.changeProposals.find((proposal) => proposal.id === proposalId)?.status ?? ""}\n`);
    return;
  }

  if (command === "graph" && subcommand === "show") {
    const snapshot = requireConvergence(context).getSnapshot();
    for (const change of snapshot.changes) {
      io.stdout(`${change.changeId}\t${change.currentRevisionIds.join("+")}\tdepends:${change.dependsOn.join(",") || "root"}\n`);
    }
    return;
  }

  if (command === "bundle" && subcommand === "review") {
    const snapshot = requireConvergence(context).getSnapshot();
    for (const change of snapshot.changes) {
      const gates = snapshot.gates.filter((gate) => gate.changeId === change.changeId);
      io.stdout(`${change.changeId}\t${gates.map((gate) => `${gate.label}:${gate.state}`).join(",") || "gates:missing"}\n`);
    }
    return;
  }

  if (command === "merge" && subcommand === "preview") {
    const changeId = rest[0];
    if (changeId === undefined) throw new Error("merge preview requires a change id");
    const preview = requireConvergence(context).planPartialMerge(changeId);
    io.stdout(`${preview.included.join(",")}\tconfirmation-required\t${preview.explanation}\n`);
    return;
  }

  throw new Error(usage);
}

function requireConvergence(context: CommunityCliContext): NonNullable<CommunityCliContext["convergence"]> {
  if (context.convergence === undefined) throw new Error("Convergence workbench is not configured for this Community client context");
  return context.convergence;
}

const processCliIO: CommunityCliIO = {
  stdout: (message) => process.stdout.write(message),
  stderr: (message) => process.stderr.write(message),
};

function parseOptions(args: readonly string[]): Record<string, string> {
  const options: Record<string, string> = {};
  for (let index = 0; index < args.length; index += 1) {
    const key = args[index];
    if (key === undefined || !key.startsWith("--")) {
      throw new Error(`Unexpected argument: ${key ?? ""}`);
    }

    const value = args[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Missing value for ${key}`);
    }

    options[key.slice(2)] = value;
    index += 1;
  }

  return options;
}

function requiredOption(options: Readonly<Record<string, string>>, key: string): string {
  const value = options[key];
  if (value === undefined) {
    throw new Error(`Missing required option --${key}`);
  }

  return value;
}

function parseDecision(value: string): CommunityReviewDecision {
  if (value === "approved" || value === "changes-requested" || value === "commented") {
    return value;
  }

  throw new Error(`Unsupported review decision: ${value}`);
}

if (require.main === module) {
  main().then((exitCode) => {
    process.exitCode = exitCode;
  });
}
