#!/usr/bin/env node
import type {
  CommunityClient,
  CommunityReviewDecision,
  ConvergenceWorkbenchSnapshot,
  PartialMergePlan,
} from "@epoch/community-core";
import { NAMESPACE_CLI_COMMANDS, runNamespaceCommand, type NamespaceCommandServices } from "./namespace-commands";
import { PROJECTION_CLI_COMMANDS, runProjectionCommand, type ProjectionCommandServices } from "./projection-commands";
import { QUERY_CLI_COMMANDS, formatCommunityCliHelp, runQueryCommand, type QueryCommandServices } from "./query-commands";
import { createHttpCommunityCliContext } from "./http-context";

export * from "./namespace-commands";
export * from "./projection-commands";
export * from "./query-commands";
export * from "./http-context";

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
  readonly search?: QueryCommandServices;
  readonly projections?: ProjectionCommandServices;
  readonly namespace?: NamespaceCommandServices;
}

export interface CommunityCliEnvironment {
  readonly EPOCH_COMMUNITY_API_URL?: string;
  readonly EPOCH_COMMUNITY_API_TOKEN?: string;
  readonly EPOCH_COMMUNITY_URL?: string;
}

const workflowUsage = [
  "Usage:",
  "  epoch-community [--remote URL] COMMAND",
  "",
  "  epoch-community repositories",
  "  epoch-community issues open REPOSITORY --title TITLE --author AUTHOR [--body BODY] [--label LABEL]",
  "  epoch-community changes create REPOSITORY --title TITLE --author AUTHOR --source-view VIEW --target-view VIEW [--body BODY]",
  "  epoch-community changes review REPOSITORY CHANGE --reviewer AUTHOR --decision approved|changes-requested|commented [--body BODY]",
  "  epoch-community graph show",
  "  epoch-community bundle review",
  "  epoch-community merge preview CHANGE",
  "",
  "The remote comes from --remote, then EPOCH_COMMUNITY_API_URL, then EPOCH_COMMUNITY_URL.",
].join("\n");
const usage = `${workflowUsage}\n${formatCommunityCliHelp([...QUERY_CLI_COMMANDS, ...PROJECTION_CLI_COMMANDS, ...NAMESPACE_CLI_COMMANDS]).replace(/^Usage:\n/u, "")}`.trimEnd();

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

    return await run(rest, io, context ?? bootstrapContext(remote, environment));
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
 *
 * The context is the full one — search, projections, and namespace included —
 * because a binary that can reach the remote but only for some of its own
 * commands is a worse answer than one that cannot start.
 */
export function bootstrapContext(
  remote: string | undefined,
  environment: CommunityCliEnvironment = process.env,
): CommunityCliContext {
  const baseUrl = remote ?? environment.EPOCH_COMMUNITY_API_URL ?? environment.EPOCH_COMMUNITY_URL;
  if (baseUrl === undefined || baseUrl.trim().length === 0) {
    throw new Error("No Community remote configured. Pass --remote URL or set EPOCH_COMMUNITY_API_URL.");
  }

  return createHttpCommunityCliContext({
    baseUrl: baseUrl.trim(),
    authorizationToken: environment.EPOCH_COMMUNITY_API_TOKEN,
  });
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
): Promise<number> {
  const [command, subcommand, ...rest] = argv;
  if (command === undefined || command === "help" || command === "--help") {
    io.stdout(`${usage}\n`);
    return 0;
  }

  if (command === "search") return output(await runQueryCommand([subcommand, ...rest].filter((value): value is string => value !== undefined), requireService(context.search, "Search")), io);
  if (command === "projections") return output(await runProjectionCommand([subcommand, ...rest].filter((value): value is string => value !== undefined), requireService(context.projections, "Projection")), io);
  if (command === "namespace") return output(await runNamespaceCommand([subcommand, ...rest].filter((value): value is string => value !== undefined), requireService(context.namespace, "Namespace")), io);

  if (command === "repositories") {
    const repositories = await context.client.listRepositories();
    for (const repository of repositories) {
      io.stdout(`${repository.slug}\t${repository.displayName}\n`);
    }
    return 0;
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
    return 0;
  }

  if (command === "changes" && subcommand === "create") {
    const [slug, ...args] = rest;
    if (slug === undefined) throw new Error("changes create requires a repository slug");
    const options = parseOptions(args);
    const repository = await context.client.createChange(slug, {
      title: requiredOption(options, "title"),
      author: requiredOption(options, "author"),
      sourceView: requiredOption(options, "source-view"),
      targetView: requiredOption(options, "target-view"),
      body: options.body,
    });
    io.stdout(`${repository.slug}\t${repository.changes.at(-1)?.id ?? ""}\n`);
    return 0;
  }

  if (command === "changes" && subcommand === "review") {
    const [slug, changeId, ...args] = rest;
    if (slug === undefined || changeId === undefined) {
      throw new Error("changes review requires a repository slug and change id");
    }

    const options = parseOptions(args);
    const repository = await context.client.reviewChange(slug, changeId, {
      reviewer: requiredOption(options, "reviewer"),
      decision: parseDecision(requiredOption(options, "decision")),
      body: options.body,
    });
    io.stdout(`${repository.slug}\t${changeId}\t${repository.changes.find((change) => change.id === changeId)?.status ?? ""}\n`);
    return 0;
  }

  if (command === "graph" && subcommand === "show") {
    const snapshot = requireConvergence(context).getSnapshot();
    for (const change of snapshot.changes) {
      io.stdout(`${change.changeId}\t${change.currentRevisionIds.join("+")}\tdepends:${change.dependsOn.join(",") || "root"}\n`);
    }
    return 0;
  }

  if (command === "bundle" && subcommand === "review") {
    const snapshot = requireConvergence(context).getSnapshot();
    for (const change of snapshot.changes) {
      const gates = snapshot.gates.filter((gate) => gate.changeId === change.changeId);
      io.stdout(`${change.changeId}\t${gates.map((gate) => `${gate.label}:${gate.state}`).join(",") || "gates:missing"}\n`);
    }
    return 0;
  }

  if (command === "merge" && subcommand === "preview") {
    const changeId = rest[0];
    if (changeId === undefined) throw new Error("merge preview requires a change id");
    const preview = requireConvergence(context).planPartialMerge(changeId);
    io.stdout(`${preview.included.join(",")}\tconfirmation-required\t${preview.explanation}\n`);
    return 0;
  }

  throw new Error(usage);
}

function output(result: { readonly exitCode: number; readonly stdout: string; readonly stderr: string }, io: CommunityCliIO): number {
  if (result.stdout) io.stdout(result.stdout);
  if (result.stderr) io.stderr(result.stderr);
  return result.exitCode;
}

function requireService<T>(service: T | undefined, name: string): T {
  if (service === undefined) throw new Error(`${name} services are not configured for this Community CLI context`);
  return service;
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
