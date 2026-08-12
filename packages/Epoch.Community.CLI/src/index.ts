#!/usr/bin/env node
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

const usage = [
  "Usage:",
  "  epoch-community repositories",
  "  epoch-community issues open REPOSITORY --title TITLE --author AUTHOR [--body BODY] [--label LABEL]",
  "  epoch-community changes propose REPOSITORY --title TITLE --author AUTHOR --source-view VIEW --target-view VIEW [--body BODY]",
  "  epoch-community changes review REPOSITORY PROPOSAL --reviewer AUTHOR --decision approved|changes-requested|commented [--body BODY]",
  "  epoch-community stack graph",
  "  epoch-community review weave",
  "  epoch-community merge preview CHANGE",
].join("\n");

export async function main(
  argv = process.argv.slice(2),
  io: CommunityCliIO = processCliIO,
  context?: CommunityCliContext,
): Promise<number> {
  try {
    await run(argv, io, requireContext(context));
    return 0;
  } catch (error) {
    io.stderr(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
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

  if (command === "stack" && subcommand === "graph") {
    const snapshot = requireConvergence(context).getSnapshot();
    for (const change of snapshot.changes) {
      io.stdout(`${change.changeId}\t${change.currentRevisionIds.join("+")}\tdepends:${change.dependsOn.join(",") || "root"}\n`);
    }
    return;
  }

  if (command === "review" && subcommand === "weave") {
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

function requireContext(context: CommunityCliContext | undefined): CommunityCliContext {
  if (context === undefined) {
    throw new Error("Epoch Community CLI requires a Community Core client context");
  }

  return context;
}

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
