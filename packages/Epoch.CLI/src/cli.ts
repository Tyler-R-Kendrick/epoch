#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import {
  CRDTRegistry,
  DefaultAuthor,
  disasterRecoveryPlan,
  dumpEntity,
  EntityType,
  EpochRepository,
  exportExitBundle,
  gossipWithUrl,
  importExitBundle,
  JsonEncoding,
  loadEntity,
  migrateCommunity,
  normalizeMaterializationMode,
  parseSelection,
  startGossipServer,
} from "@epoch/core";
import type { EventMetadata, MaterializationSetting } from "@epoch/core";
import { FederatedCommunity, MockPds } from "@epoch/atproto";
import { BUILTIN_COMMANDS, CliCommand, CliOption, CliSyntax, CliText, ParsedArgsSchema } from "./domain";
import { executeChangeGraphCommand, formatChangeGraphCommandEnvelope, isChangeGraphInvocation } from "./change-graph";
import { executeCommunityCli, isCommunityCliInvocation } from "./community";
import { interopDoctor } from "./interop-doctor";
import { dispatchExternalSubcommand, runExtensionCommand } from "./extensions";
import { runSemanticCommand } from "./semantic";

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
class CliHandledError extends Error {}

export function main(argv = process.argv.slice(2), io: CliIO = processCliIO): number | Promise<number> {
  try {
    const result = run(argv, io);
    if (result !== undefined && typeof (result as Promise<void>).then === "function") {
      return (result as Promise<void>).then(
        () => 0,
        (error: unknown) => {
          if (error instanceof CliHandledError) return 1;
          io.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
          return 1;
        },
      );
    }
    return 0;
  } catch (error) {
    if (error instanceof CliHandledError) return 1;
    io.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

/**
 * Tell the operator when a configuration file could not be read.
 *
 * A file that will not parse contributes nothing, and the settings in it —
 * including an extension `block` list — are simply not in effect. Reported
 * before the command runs, because the alternative is a repository that
 * behaves as though the file were empty and never says so (ADR-0048).
 *
 * The `ext` command and external dispatch report their own, richer degradation
 * and are skipped here so the same line is not printed twice.
 */
function reportConfigProblems(root: string, io: CliIO): void {
  try {
    for (const problem of new EpochRepository(root).readRepositoryConfig().problems) {
      io.stderr.write(`warning: ${problem.path}:${problem.line}:${problem.column}: ${problem.reason}\n`);
      io.stderr.write("warning: this file is ignored in full until it parses\n");
    }
  } catch {
    // Reporting must never be the reason a command fails.
  }
}

function run(argv: string[], io: CliIO): void | Promise<void> {
  const parsed = parseGlobalArgs(argv);
  if (parsed.command === undefined) {
    throw new Error(CliText.usage);
  }
  if (parsed.command !== CliCommand.ext && BUILTIN_COMMANDS.includes(parsed.command)) {
    reportConfigProblems(parsed.repo, io);
  }

  if (parsed.command === "help") {
    writeLine(io, CliText.usage);
    writeLine(io, "Change graph commands: new, change, log --revisions, op, graph, split, bundle, review record, merge-plan, conflict, workspace, clone/fetch/hydrate/backfill, mirror, principal/agent, forge, swhid, archive, interop doctor.");
    writeLine(io, "Authoritative/destructive actions require an explicit configured adapter; unavailable adapters return unsupported-capability.");
    writeLine(io, "Community product CLI is epoch-community (search, projections, namespace, community issues/changes).");
    return;
  }
  if (isCommunityCliInvocation(parsed.command, parsed.args)) {
    return executeCommunityCli(parsed.repo, parsed.command, parsed.args, {
      stdout: (message) => io.stdout.write(message),
      stderr: (message) => io.stderr.write(message),
    }).then((ok) => {
      if (!ok) throw new CliHandledError("community command failed");
    });
  }
  if (parsed.command === "interop" && parsed.args[0] === "doctor") {
    const json = parsed.args.includes("--json");
    return interopDoctor().then((report) => writeLine(io, json ? JSON.stringify(report) : formatDoctor(report)));
  }
  if (isChangeGraphInvocation(parsed.command, parsed.args)) {
    const json = parsed.args.includes("--json");
    const args = parsed.args.filter((argument) => argument !== "--json");
    return executeChangeGraphCommand(parsed.repo, [parsed.command, ...args]).then((envelope) => {
      const output = formatChangeGraphCommandEnvelope(envelope, json);
      (envelope.ok ? io.stdout : io.stderr).write(`${output}\n`);
      if (!envelope.ok) throw new CliHandledError(output);
    });
  }

  if (parsed.command === CliCommand.ext) {
    runExtensionCommand(parsed.repo, parsed.args, io);
    return;
  }
  if (parsed.command === CliCommand.semantic) {
    runSemanticCommand(parsed.args, io, parsed.repo);
    return;
  }

  // Git's rule is that any executable named `git-foo` on $PATH becomes a
  // command. Epoch keeps the reach but not the silent trust: an extension runs
  // only when the repository's trust policy admits it (ADR-0037).
  if (!BUILTIN_COMMANDS.includes(parsed.command)) {
    const dispatched = dispatchExternalSubcommand(parsed.repo, parsed.command, parsed.args, io);
    if (dispatched.handled) {
      if (dispatched.exitCode !== 0) throw new CliHandledError(parsed.command);
      return;
    }
  }

  const repo = new EpochRepository(parsed.repo);
  switch (parsed.command) {
    case CliCommand.create: {
      const options = parseOptions(parsed.args, { author: DefaultAuthor });
      if (options.positionals.length > 1) throw new Error(CliText.createUsage);
      const target = options.positionals[0] ?? parsed.repo;
      const created = EpochRepository.create(target, { author: options.author });
      writeLine(io, `created Epoch repository at ${created.epochDir} author=${created.identity()} events=${created.events().length}`);
      return;
    }
    case CliCommand.init: {
      const { author } = parseOptions(parsed.args, { author: DefaultAuthor });
      repo.init(author);
      writeLine(io, `initialized Epoch repository at ${repo.epochDir}`);
      return;
    }
    case CliCommand.push: {
      const options = parseOptions(parsed.args, { author: DefaultAuthor, version: "", message: "" }, [CliOption.noVersion]);
      const result = repo.push(options.positionals.length === 0 ? [CliSyntax.repositoryDefault] : options.positionals, {
        author: options.author,
        version: options.version === "" ? undefined : options.version,
        message: options.message === "" ? undefined : options.message,
        createVersion: !isFlagEnabled(options, CliOption.noVersion),
      });
      const versionName = typeof result.version?.payload.name === "string" ? result.version.payload.name : result.version?.id;
      writeLine(io, `pushed ${result.recorded.length} files${result.version === undefined ? "" : `; version ${versionName} ${result.version.id}`}`);
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
    case CliCommand.track: {
      const options = parseOptions(parsed.args, { author: repo.isInitialized() ? repo.identity() : DefaultAuthor, type: EntityType.octetStream }, [CliOption.includeIgnored]);
      if (options.positionals.length !== 1) throw new Error(CliText.trackUsage);
      const event = repo.track(options.positionals[0], {
        author: options.author,
        entityType: options.type === EntityType.octetStream ? undefined : options.type,
        includeIgnored: isFlagEnabled(options, CliOption.includeIgnored),
      });
      writeLine(io, `${event.id} tracked ${options.positionals[0]}`);
      recordCliOperation(repo, "track", { eventId: event.id, path: options.positionals[0] });
      return;
    }
    case CliCommand.forget: {
      const options = parseOptions(parsed.args, { author: repo.identity() });
      if (options.positionals.length !== 1) throw new Error(CliText.forgetUsage);
      const event = repo.forgetPath(options.positionals[0], options.author);
      writeLine(io, `${event.id} forgot ${options.positionals[0]}`);
      recordCliOperation(repo, "forget", { eventId: event.id, path: options.positionals[0] });
      return;
    }
    case CliCommand.mv: {
      const options = parseOptions(parsed.args, { author: repo.identity() });
      if (options.positionals.length !== 2) throw new Error(CliText.mvUsage);
      const event = repo.movePath(options.positionals[0], options.positionals[1], options.author);
      writeLine(io, `${event.id} moved ${options.positionals[0]} -> ${options.positionals[1]}`);
      recordCliOperation(repo, "mv", { eventId: event.id, from: options.positionals[0], to: options.positionals[1] });
      return;
    }
    case CliCommand.rm: {
      const options = parseOptions(parsed.args, { author: repo.identity() });
      if (options.positionals.length !== 1) throw new Error(CliText.rmUsage);
      const event = repo.deletePath(options.positionals[0], options.author);
      writeLine(io, `${event.id} deleted ${options.positionals[0]}`);
      recordCliOperation(repo, "rm", { eventId: event.id, path: options.positionals[0] });
      return;
    }
    case CliCommand.cp: {
      const options = parseOptions(parsed.args, { author: repo.identity() });
      if (options.positionals.length !== 2) throw new Error(CliText.cpUsage);
      const event = repo.copyPath(options.positionals[0], options.positionals[1], options.author);
      writeLine(io, `${event.id} copied ${options.positionals[0]} -> ${options.positionals[1]}`);
      recordCliOperation(repo, "cp", { eventId: event.id, from: options.positionals[0], to: options.positionals[1] });
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
      const options = parseOptions(parsed.args, { peer: "" });
      const peerUrl = options.peer === "" ? undefined : options.peer;
      if (peerUrl !== undefined) {
        return (async () => {
          const result = await gossipWithUrl(repo, peerUrl);
          writeLine(io, `synced peer ${peerUrl}: ${result.eventsCopied} events and ${result.blobsCopied} blobs`);
          recordCliOperation(repo, "sync", {
            peer: peerUrl,
            transport: "gossip-http",
            eventsCopied: result.eventsCopied,
            blobsCopied: result.blobsCopied,
          });
        })();
      }
      if (options.positionals.length !== 1) {
        throw new Error(`usage: epoch sync PEER_REPO | epoch sync --peer URL`);
      }
      const result = repo.sync(options.positionals[0]);
      writeLine(io, `synced ${result.eventsCopied} events and ${result.blobsCopied} blobs`);
      recordCliOperation(repo, "sync", {
        peer: options.positionals[0],
        eventsCopied: result.eventsCopied,
        blobsCopied: result.blobsCopied,
      });
      return;
    }
    case CliCommand.gossip: {
      const options = parseOptions(parsed.args, { peer: "", port: "0" }, [CliOption.serve]);
      if (isFlagEnabled(options, CliOption.serve)) {
        return (async () => {
          const port = Number(options.port || "0");
          const server = await startGossipServer(repo, { port });
          writeLine(io, `gossip server listening at ${server.url}`);
          writeLine(io, `POST ${server.url}/epoch/gossip`);
          await new Promise<void>((resolve) => {
            process.on("SIGINT", () => {
              server.close().finally(() => resolve());
            });
          });
        })();
      }
      if (options.peer === "" && options.positionals.length !== 1) {
        throw new Error(`usage: epoch gossip --peer URL | epoch gossip --serve [--port N] | epoch gossip PEER_REPO`);
      }
      if (options.peer !== "") {
        return (async () => {
          const result = await gossipWithUrl(repo, options.peer);
          writeLine(io, `gossip ${options.peer}: events=${result.eventsCopied} blobs=${result.blobsCopied}`);
          recordCliOperation(repo, "gossip", {
            peer: options.peer,
            transport: "gossip-http",
            eventsCopied: result.eventsCopied,
            blobsCopied: result.blobsCopied,
          });
        })();
      }
      const peerRoot = options.positionals[0];
      const pathResult = repo.gossip(peerRoot);
      writeLine(io, `gossip ${peerRoot}: events=${pathResult.eventsCopied} blobs=${pathResult.blobsCopied}`);
      recordCliOperation(repo, "gossip", {
        peer: peerRoot,
        eventsCopied: pathResult.eventsCopied,
        blobsCopied: pathResult.blobsCopied,
      });
      return;
    }
    case CliCommand.publishArtifacts: {
      const options = parseOptions(parsed.args, {
        did: "",
        visibility: "public",
        mode: "federated",
        peer: "",
      });
      if (options.positionals.length !== 1) {
        throw new Error(
          "usage: epoch publish-artifacts [--did DID] [--visibility public|private] [--mode federated|local-only|disabled] [--peer GOSSIP_URL] VERSION|EVENT_ID",
        );
      }
      return (async () => {
        const mode = options.mode as "federated" | "local-only" | "disabled";
        const visibility = options.visibility as "public" | "private";
        const did = options.did === "" ? "did:plc:local" : options.did;
        const gossipPeers = options.peer === "" ? [] : [options.peer];
        const community = new FederatedCommunity({
          mode,
          pds: new MockPds(),
          gossipPeers,
        });
        const published = await community.publishPublicArtifacts({
          repository: repo,
          versionOrEventId: options.positionals[0],
          ownerDid: did,
          visibility,
          gossipPeers,
        });
        writeLine(
          io,
          `published ${published.artifacts.length} artifacts release=${published.atUri ?? "local-only"} version=${published.release.versionId}`,
        );
        recordCliOperation(repo, "publish-artifacts", {
          versionId: published.release.versionId,
          atUri: published.atUri,
          artifactCount: published.artifacts.length,
          mode,
          visibility,
        });
      })();
    }
    case CliCommand.import: {
      const options = parseOptions(parsed.args, { version: "" });
      if (options.positionals.length !== 1) throw new Error(`usage: epoch ${parsed.command} [--version NAME] GIT_REPO`);
      const events = repo.importFromGit(options.positionals[0]);
      const version = options.version === "" ? undefined : repo.createVersion({ name: options.version });
      writeLine(io, `imported ${events.length} files${version === undefined ? "" : `; version ${version.payload.name as string} ${version.id}`}`);
      recordCliOperation(repo, "import", {
        gitRepo: options.positionals[0],
        eventIds: events.map((event) => event.id),
        versionId: version?.id,
      });
      return;
    }
    case CliCommand.export: {
      if (parsed.args.length !== 1) throw new Error(`usage: epoch ${parsed.command} GIT_REPO`);
      const paths = repo.exportToGit(parsed.args[0]);
      writeLine(io, `exported ${paths.length} files`);
      recordCliOperation(repo, "export", { gitRepo: parsed.args[0], paths });
      return;
    }
    case CliCommand.exportExit: {
      const options = parseOptions(parsed.args, { out: "" });
      const dest = options.out === "" ? options.positionals[0] : options.out;
      if (!dest) throw new Error("usage: epoch export-exit [--out FILE] FILE");
      const bundle = exportExitBundle(repo);
      writeFileSync(dest, `${JSON.stringify(bundle, null, 2)}\n`, JsonEncoding);
      writeLine(io, `exported exit bundle events=${bundle.manifest.eventCount} sha256=${bundle.manifest.sha256}`);
      return;
    }
    case CliCommand.importExit: {
      if (parsed.args.length !== 1) throw new Error("usage: epoch import-exit FILE");
      const bundle = JSON.parse(readFileSync(parsed.args[0], JsonEncoding)) as unknown;
      importExitBundle(repo, bundle);
      writeLine(io, "imported exit bundle");
      return;
    }
    case CliCommand.migrateCommunity: {
      const options = parseOptions(parsed.args, { from: "", to: "", fromPosture: "hosted", toPosture: "open" });
      if (options.from === "" || options.to === "") {
        throw new Error("usage: epoch migrate-community --from PATH --to PATH [--fromPosture hosted|private|open] [--toPosture open]");
      }
      const source = new EpochRepository(options.from);
      const dest = new EpochRepository(options.to);
      if (!dest.isInitialized()) dest.init(source.identity());
      const bundle = migrateCommunity({
        from: source,
        to: dest,
        fromPosture: { posture: options.fromPosture },
        toPosture: { posture: options.toPosture },
      });
      writeLine(io, `migrated community events=${bundle.manifest.eventCount} sha256=${bundle.manifest.sha256}`);
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
    case CliCommand.status: {
      const options = parseOptions(parsed.args, {}, [CliOption.ignored]);
      let wrotePolicy = false;
      if (repo.isInitialized()) {
        for (const decision of repo.policy().intents) {
          writeLine(io, `${decision.intent.id} ${decision.status} merges=${decision.merges.join(",")} rejections=${decision.rejections.join(",")}`);
          wrotePolicy = true;
        }
      }
      const entries = repo.statusEntries({ ignored: isFlagEnabled(options, CliOption.ignored) });
      for (const entry of entries) {
        if (wrotePolicy && entry.status === "untracked") continue;
        writeLine(io, `${entry.marker} ${entry.path}`);
      }
      return;
    }
    case CliCommand.checkIgnore: {
      if (parsed.args.length !== 1) throw new Error(CliText.checkIgnoreUsage);
      const match = repo.checkIgnore(parsed.args[0]);
      if (match === undefined) throw new Error(`path is not ignored: ${parsed.args[0]}`);
      writeLine(io, `${match.source}:${match.line}:${match.pattern} ${parsed.args[0]}`);
      return;
    }
    case CliCommand.config:
      runConfigCommand(repo, parsed.args, io);
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
      const options = parseOptions(parsed.args, { base: "", materialization: "", select: "" }, [CliOption.virtual, CliOption.full]);
      if (options.positionals.length !== 1) throw new Error(CliText.checkoutUsage);
      const virtual = isFlagEnabled(options, CliOption.virtual);
      const full = isFlagEnabled(options, CliOption.full);
      if (virtual && full) throw new Error(CliText.checkoutUsage);
      if (options.materialization !== "" && (virtual || full)) throw new Error(CliText.checkoutUsage);
      // --virtual/--full remain accepted spellings for --materialization delta/eager (ADR-0041).
      const requested = options.materialization !== ""
        ? options.materialization
        : full ? "full" : virtual ? "virtual" : undefined;
      if (requested !== undefined && normalizeMaterializationMode(requested) === undefined) {
        throw new Error(CliText.checkoutUsage);
      }
      const state = repo.checkoutView(options.positionals[0], {
        materialization: requested as MaterializationSetting | undefined,
        base: options.base === "" ? undefined : options.base,
        ...(options.select === "" ? {} : { selection: parseSelection(options.select) }),
      });
      const detail = ` [${state.materialization}: written=${state.written.length} virtual=${state.virtualPaths.length} excluded=${state.excludedPaths.length}]`;
      writeLine(io, `checked out ${state.name} (${state.intentIds.length} intents)${detail}`);
      recordCliOperation(repo, "checkout", { view: options.positionals[0], intentIds: state.intentIds });
      return;
    }
    case CliCommand.preview: {
      const options = parseOptions(parsed.args, { view: "", base: "", context: "" });
      if (options.positionals.length !== 0) throw new Error(CliText.previewUsage);
      const contextLines = options.context === "" ? undefined : Number.parseInt(options.context, 10);
      if (contextLines !== undefined && (!Number.isInteger(contextLines) || contextLines < 0)) throw new Error(CliText.previewUsage);
      io.stdout.write(repo.previewPatch({
        view: options.view === "" ? undefined : options.view,
        base: options.base === "" ? undefined : options.base,
        contextLines,
      }));
      return;
    }
    case CliCommand.hydrate: {
      const options = parseOptions(parsed.args, {});
      const hydrated = repo.hydrate(options.positionals.length > 0 ? options.positionals : undefined);
      writeLine(io, `hydrated ${hydrated.length} file${hydrated.length === 1 ? "" : "s"}`);
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
    case CliCommand.versions:
      for (const version of repo.versions()) {
        writeLine(io, `${version.id} ${typeof version.payload.name === "string" ? version.payload.name : ""} files=${Array.isArray(version.payload.files) ? version.payload.files.length : 0} entities=${Array.isArray(version.payload.entities) ? version.payload.entities.length : 0}`);
      }
      return;
    case CliCommand.version:
      runVersionCommand(repo, parsed.args, io);
      return;
    default:
      throw new Error(`unknown command: ${parsed.command}`);
  }
}

function formatDoctor(report: Awaited<ReturnType<typeof interopDoctor>>): string {
  return [report.git, ...report.optionalTools, report.copyOnWrite, ...report.adapters, report.swhid]
    .map((probe) => `${probe.id}: ${probe.status}${probe.version ? ` (${probe.version})` : ""}${probe.reason ? ` — ${probe.reason}` : ""}`)
    .join("\n");
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

function parseOptions<T extends Record<string, string>>(args: string[], defaults: T, flags: readonly string[] = []): T & { positionals: string[] } {
  const values: Record<string, string | string[]> = { ...defaults, positionals: [] };
  const remaining = [...args];
  while (remaining.length > 0) {
    const token = remaining.shift() as string;
    if (!token.startsWith(CliSyntax.optionPrefix)) {
      (values.positionals as string[]).push(token);
      continue;
    }
    const key = token.slice(2);
    if (flags.includes(key)) {
      values[key] = "true";
      continue;
    }
    if (!(key in defaults)) throw new Error(`unknown option: ${token}`);
    values[key] = requiredValue(token, remaining.shift());
  }
  return values as T & { positionals: string[] };
}

function runVersionCommand(repo: EpochRepository, args: string[], io: CliIO): void {
  const subcommand = args[0];
  switch (subcommand) {
    case "create": {
      const options = parseOptions(args.slice(1), { view: "", entity: "", description: "", author: "" });
      if (options.positionals.length > 1) throw new Error(CliText.versionCreateUsage);
      const version = repo.createVersion({
        name: options.positionals[0],
        view: options.view === "" ? undefined : options.view,
        entities: splitOption(options.entity),
        description: options.description === "" ? undefined : options.description,
        author: options.author === "" ? undefined : options.author,
      });
      writeLine(io, `version ${typeof version.payload.name === "string" ? version.payload.name : version.id} ${version.id}`);
      return;
    }
    case "show": {
      const options = parseOptions(args.slice(1), {});
      if (options.positionals.length !== 1) throw new Error(CliText.versionShowUsage);
      writeLine(io, JSON.stringify(repo.resolveVersion(options.positionals[0]).payload, null, 2));
      return;
    }
    case "materialize": {
      const options = parseOptions(args.slice(1), { out: "", base: "" }, [CliOption.force]);
      if (options.positionals.length !== 1 || options.out === "") throw new Error(CliText.versionMaterializeUsage);
      const result = repo.materializeVersion(options.positionals[0], {
        outDir: options.out,
        force: isFlagEnabled(options, CliOption.force),
        base: options.base === "" ? undefined : options.base,
      });
      const name = typeof result.version.payload.name === "string" ? result.version.payload.name : result.version.id;
      const suffix = result.virtualPaths === undefined ? "" : ` [virtual: written=${result.files.length} virtual=${result.virtualPaths.length}]`;
      writeLine(io, `materialized version ${name} to ${options.out}${suffix}`);
      return;
    }
    default:
      throw new Error(CliText.versionUsage);
  }
}

function runConfigCommand(repo: EpochRepository, args: string[], io: CliIO): void {
  const subcommand = args[0];
  switch (subcommand) {
    case "get": {
      const options = parseOptions(args.slice(1), {});
      if (options.positionals.length !== 1) throw new Error(CliText.configGetUsage);
      const value = repo.configValue(options.positionals[0]);
      if (value === undefined) throw new Error(`config key not found: ${options.positionals[0]}`);
      writeLine(io, typeof value === "object" ? JSON.stringify(value, null, 2) : String(value));
      return;
    }
    case "path": {
      const options = parseOptions(args.slice(1), { scope: "local" });
      if (options.positionals.length !== 0 || (options.scope !== "local" && options.scope !== "shared")) throw new Error(CliText.configPathUsage);
      writeLine(io, repo.configPath(options.scope));
      return;
    }
    default:
      throw new Error(CliText.configUsage);
  }
}

function splitOption(value: string): string[] {
  return value.split(",").map((item) => item.trim()).filter((item) => item.length > 0);
}

function isFlagEnabled(options: Record<string, unknown>, key: string): boolean {
  return options[key] === "true";
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
  const result = main();
  if (typeof result === "object" && result !== null && "then" in result) {
    void result.then((code) => {
      process.exitCode = code;
    });
  } else {
    process.exitCode = result;
  }
}

export { executeChangeGraphCommand, formatChangeGraphCommandEnvelope, isChangeGraphCommand, isChangeGraphInvocation } from "./change-graph";
export { interopDoctor } from "./interop-doctor";
export { createFileStorage, executeCommunityCli, isCommunityCliInvocation, openWorkspaceRuntime } from "./community";
export { dispatchExternalSubcommand, runExtensionCommand, trustedExtensionProviders } from "./extensions";
export { createSyntaxRegistry, nodeProviderModuleReader, repositorySyntaxRegistry, runSemanticCommand } from "./semantic";
