import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { EpochRepository } from "@epoch/core";
import {
  buildExternalInvocation,
  descriptorPath,
  discoverExtensions,
  ed25519ManifestVerifier,
  EMPTY_TRUST_STORE,
  grantTrust,
  nodeExtensionFileSystem,
  parseTrustStore,
  readTrustPolicy,
  readTrustPolicyReport,
  resolveSubcommand,
  revokeTrust,
  serializeTrustStore,
  shadowedExtensions,
  withRecordedConsent,
  type DiscoveredExtension,
  type ExtensionFileSystem,
  type ExternalInvocation,
  evaluatePublisher,
  isExtensionName,
  loadSyntaxProviders,
  launchVerificationFor,
  planLaunch,
  revocationSigningPayload,
  successorSigningPayload,
  withPublisherStatements,
  type ExtensionTrustPolicy,
  type ProviderLoadResult,
  type ProviderModuleReader,
  type PublisherRevocation,
  type SuccessorStatement,
  type TrustStore,
} from "@epoch/extensions";
import { BUILTIN_COMMANDS, CliText } from "./domain";

/**
 * CLI surface for the extension mechanism (ADR-0037).
 *
 * `epoch foo` falls through to `epoch-foo` only when the trust policy admits
 * it. Discovery without trust is reported, which is the deliberate departure
 * from Git's rule that any `git-foo` on `$PATH` simply runs.
 */

export interface ExtensionCliIO {
  stdout: { write(message: string): unknown };
  stderr: { write(message: string): unknown };
}

/** Process launch, injected so dispatch is testable without real binaries. */
export type ExtensionSpawn = (invocation: ExternalInvocation, expectedSha256?: string) => number;

/**
 * Launch the bytes that were verified (ADR-0042).
 *
 * Where the platform can name an open descriptor as a path, the executable is
 * opened once, hashed through that descriptor, and executed through the same
 * descriptor — so the file that runs is the file that was hashed by
 * construction rather than by timing. The descriptor is handed to the child in
 * the `stdio` array so it survives into the child's file table, and `#!`
 * scripts work because the kernel resolves the interpreter from it too.
 *
 * Everywhere else the pre-launch re-read stands and the residual is reported
 * rather than hidden.
 */
function spawnVerified(invocation: ExternalInvocation, expectedSha256: string | undefined): number {
  let descriptor: number | undefined;
  try {
    if (descriptorPath(process.platform) !== undefined) {
      descriptor = openSync(invocation.executable, "r");
      // Hashing through the descriptor, not the path: this is the read whose
      // result the exec is bound to.
      const digest = createHash("sha256").update(readFileSync(descriptor)).digest("hex");
      if (expectedSha256 !== undefined && digest !== expectedSha256) {
        throw new Error(
          `extension '${invocation.env.EPOCH_EXTENSION_NAME}' changed between the trust check and launch; refusing to run it`,
        );
      }
    }

    const plan = planLaunch(invocation, { platform: process.platform, descriptorAvailable: descriptor !== undefined });
    if (plan.kind === "refused") throw new Error(plan.reason);

    const stdio: ("inherit" | number)[] = ["inherit", "inherit", "inherit"];
    if (plan.descriptorSlot !== undefined && descriptor !== undefined) {
      // Slots below the requested one must already be filled, which `stdio`
      // guarantees: index 3 of this array is the child's fd 3.
      stdio[plan.descriptorSlot] = descriptor;
    }

    const result = spawnSync(plan.executable, [...plan.args], {
      env: invocation.env,
      stdio,
      windowsVerbatimArguments: plan.verbatimArguments === true,
    });
    if (result.error !== undefined) throw result.error;
    return result.status ?? 1;
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
}

const defaultSpawn: ExtensionSpawn = (invocation, expectedSha256) => spawnVerified(invocation, expectedSha256);

export interface ExtensionCliDependencies {
  readonly homeDirectory?: string;
  readonly pathEntries?: readonly string[];
  readonly spawn?: ExtensionSpawn;
  readonly fileSystem?: ExtensionFileSystem;
}

/** Where recorded consent lives. Machine-owned, never hand-edited. */
function trustStorePath(root: string): string {
  return join(root, ".epoch", "ext", "trust.json");
}

/**
 * Read recorded consent.
 *
 * The parse failure is carried rather than collapsed, so the operator is told
 * what is wrong with the file instead of being advised to delete consent they
 * may still want.
 */
function readTrustStore(root: string): { readonly store: TrustStore } | { readonly error: string } {
  const path = trustStorePath(root);
  if (!existsSync(path)) return { store: EMPTY_TRUST_STORE };
  try {
    return { store: parseTrustStore(readFileSync(path, "utf8")) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

/** The effective policy, and everything that stopped it from being complete. */
interface EffectivePolicy {
  readonly policy: ExtensionTrustPolicy;
  /**
   * Reasons the policy could not be read *in full*, so it cannot be relied on
   * to deny anything: a config that will not parse, an `[extensions]` value
   * that is not a table, an unreadable consent store. Any entry here refuses
   * every launch.
   */
  readonly degraded: readonly string[];
  /**
   * Things worth telling the operator that do not weaken a denial: an
   * unrecognised key, a `trust` value that fell back to `explicit`. The policy
   * was still read in full, and the `block` list in it is intact, so these are
   * reported and then obeyed rather than treated as a reason to refuse
   * everything.
   */
  readonly warnings: readonly string[];
}

/**
 * Resolve the effective policy: hand-authored configuration plus recorded
 * consent.
 *
 * Every failure path here yields the closed default rather than an open one. A
 * corrupt store in particular must not degrade to "no entries", because that
 * would silently drop its `block` list — damage to the file would widen the
 * policy instead of narrowing it.
 *
 * Degradation is carried rather than swallowed. Falling back to the closed
 * default is safe for the *configured* half of the policy but not for the
 * recorded half: a config that will not parse takes its `block` list with it
 * while stored grants keep working, which is a net loss of protection unless
 * someone is told (ADR-0046).
 */
function policyFor(root: string): EffectivePolicy {
  const degraded: string[] = [];
  const read = readTrustStore(root);
  if (!("store" in read)) {
    return {
      policy: readTrustPolicy(undefined),
      degraded: [`recorded consent could not be read: ${read.error}`],
      warnings: [],
    };
  }

  let table: Record<string, unknown> | undefined;
  try {
    const config = new EpochRepository(root).readRepositoryConfig();
    for (const problem of config.problems) {
      degraded.push(`${problem.path}:${problem.line}:${problem.column}: ${problem.reason}`);
    }
    const extensions: unknown = config.config.extensions;
    if (extensions !== undefined && (typeof extensions !== "object" || extensions === null || Array.isArray(extensions))) {
      degraded.push("[extensions] is not a table, so no trust policy could be read from it");
    } else {
      table = extensions as Record<string, unknown> | undefined;
    }
  } catch (error) {
    degraded.push(`configuration could not be read: ${error instanceof Error ? error.message : String(error)}`);
  }

  const policy = readTrustPolicyReport(table);
  // Per-key diagnostics are warnings, not degradation. An unknown key inside
  // `[extensions]` — a typo, a subtable, a key from a newer Epoch — loses no
  // part of the operator's `block` list, so treating it as a reason to refuse
  // every launch would turn a harmless typo into a repository-wide outage.
  const warnings = policy.diagnostics.map((diagnostic) => `[extensions] ${diagnostic.key} ${diagnostic.message}`);
  const withStatements = withPublisherStatements(policy.policy, replicatedStatements(root));
  return { policy: withRecordedConsent(withStatements, read.store), degraded, warnings };
}

/** Command names the publisher statements are recorded under. */
const SUCCESSOR_COMMAND = "ext-publisher-succeed";
const REVOCATION_COMMAND = "ext-publisher-revoke";

/**
 * Publisher statements this repository has seen, from its own event log.
 *
 * They arrive by ordinary sync, which is exactly the asymmetry ADR-0044 is
 * built on: consent must not travel, because it only adds authority, while a
 * revocation should, because it only removes it. Every statement carries its
 * own signature and is verified where it is used, so replication moves
 * evidence rather than trust.
 */
function replicatedStatements(root: string): {
  readonly successors: readonly SuccessorStatement[];
  readonly revocations: readonly PublisherRevocation[];
} {
  const successors: SuccessorStatement[] = [];
  const revocations: PublisherRevocation[] = [];
  try {
    for (const operation of new EpochRepository(root).operations()) {
      const detail = operation.detail;
      if (typeof detail !== "object" || detail === null) continue;
      if (operation.command === SUCCESSOR_COMMAND) successors.push(detail as unknown as SuccessorStatement);
      if (operation.command === REVOCATION_COMMAND) revocations.push(detail as unknown as PublisherRevocation);
    }
  } catch {
    // A repository with no event log yet has seen no statements. That is not
    // the same as "no statements apply": the operator's own `revoked_publishers`
    // is read separately and is unaffected.
  }
  return { successors, revocations };
}

/**
 * Read a publisher statement from a file and check it before recording it.
 *
 * Verification happens again at every use, so this check is not what makes the
 * statement safe — it is what keeps the event log from accumulating statements
 * that will never do anything, which an operator would otherwise read as
 * having taken effect.
 */
function readPublisherStatement(action: "succeed" | "revoke", path: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(
      `cannot read publisher statement ${path}: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`publisher statement ${path} must be a JSON object`);
  }
  const record = parsed as Record<string, unknown>;

  if (action === "succeed") {
    const statement = record as unknown as SuccessorStatement;
    for (const field of ["predecessor", "successor", "issuedAt", "signature"] as const) {
      if (typeof statement[field] !== "string") throw new Error(`successor statement needs a string '${field}'`);
    }
    const verified = ed25519ManifestVerifier({
      payload: successorSigningPayload(statement),
      signature: statement.signature,
      publisher: statement.predecessor,
    });
    if (!verified) {
      // The retiring key is the only thing that can name a successor. A
      // statement it did not sign is an assertion by a stranger.
      throw new Error("successor statement is not signed by the key it retires; refusing to record it");
    }
    return { ...record };
  }

  const revocation = record as unknown as PublisherRevocation;
  for (const field of ["publisher", "effectiveAt", "signature"] as const) {
    if (typeof revocation[field] !== "string") throw new Error(`revocation statement needs a string '${field}'`);
  }
  const verified = ed25519ManifestVerifier({
    payload: revocationSigningPayload(revocation),
    signature: revocation.signature ?? "",
    publisher: revocation.publisher,
  });
  if (!verified) {
    throw new Error(
      "revocation is not signed by the key it revokes; to revoke a key out of band, "
      + "add it to revoked_publishers in .epoch/config.toml",
    );
  }
  return { ...record };
}

function reportNotes(notes: readonly string[], io: ExtensionCliIO): void {
  for (const note of notes) io.stderr.write(`warning: ${note}\n`);
}

/**
 * Replace the store atomically.
 *
 * The temporary file is flushed before the rename, so a power loss cannot
 * leave a file that exists but is truncated. Truncation would fail the parse
 * and close the policy, which is safe, but it would also silently discard
 * recorded revocations that the operator expects to persist.
 */
function writeTrustStore(root: string, store: TrustStore): void {
  const path = trustStorePath(root);
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  const handle = openSync(temporary, "w");
  try {
    writeFileSync(handle, serializeTrustStore(store), "utf8");
    fsyncSync(handle);
  } finally {
    closeSync(handle);
  }
  renameSync(temporary, path);
}

function discover(root: string, dependencies: ExtensionCliDependencies): readonly DiscoveredExtension[] {
  return discoverExtensions({
    repositoryRoot: resolve(root),
    homeDirectory: dependencies.homeDirectory ?? homedir(),
    pathEntries: dependencies.pathEntries,
    fileSystem: dependencies.fileSystem,
  });
}

function describe(extension: DiscoveredExtension, policy: ExtensionTrustPolicy, builtins: readonly string[]): string {
  const resolution = resolveSubcommand(extension.name, { builtins, extensions: [extension], policy });
  const state = resolution.kind === "builtin"
    ? "shadowed by builtin"
    : resolution.kind === "extension"
      ? "trusted"
      : `untrusted (${resolution.kind === "untrusted" ? resolution.trust.reason : "unknown"})`;
  const capabilities = extension.manifest?.capabilities.join(",") ?? "-";
  const version = extension.manifest?.version ?? "-";
  return `${extension.name}\t${state}\t${extension.source}\t${version}\t${capabilities}\t${extension.executable}`;
}

/** `epoch ext <list|show|trust|untrust>`. */
export function runExtensionCommand(
  root: string,
  args: readonly string[],
  io: ExtensionCliIO,
  dependencies: ExtensionCliDependencies = {},
): void {
  const action = args[0] ?? "list";
  const effective = policyFor(root);
  const policy = effective.policy;
  const extensions = discover(root, dependencies);
  reportNotes([...effective.degraded, ...effective.warnings], io);

  if (action === "list") {
    if (extensions.length === 0) {
      io.stdout.write("no extensions discovered\n");
      return;
    }
    io.stdout.write("name\tstate\tsource\tversion\tcapabilities\texecutable\n");
    for (const extension of extensions) {
      io.stdout.write(`${describe(extension, policy, BUILTIN_COMMANDS)}\n`);
    }
    const shadowed = shadowedExtensions(BUILTIN_COMMANDS, extensions);
    for (const extension of shadowed) {
      // Reported rather than hidden: a native capability preempting an
      // extension must be visible (ADR-0039).
      io.stdout.write(`note: builtin '${extension.name}' shadows ${extension.executable}\n`);
    }
    return;
  }

  if (action === "show") {
    const name = args[1];
    if (name === undefined) throw new Error(CliText.extUsage);
    const extension = extensions.find((candidate) => candidate.name === name);
    if (extension === undefined) throw new Error(`no extension named '${name}' is installed`);
    const resolution = resolveSubcommand(name, { builtins: BUILTIN_COMMANDS, extensions, policy });
    io.stdout.write(`${JSON.stringify({
      name: extension.name,
      source: extension.source,
      executable: extension.executable,
      manifest: extension.manifest ?? null,
      manifestError: extension.manifestError ?? null,
      resolution: resolution.kind,
      // The guarantee is named, not assumed: `descriptor` means the executed
      // bytes are the hashed bytes by construction, `path` means by timing
      // (ADR-0042).
      launchVerification: launchVerificationFor(process.platform),
      // Which key verified this, whether it was reached directly or through a
      // rotation, and whether a revocation is on file. A trust decision an
      // operator cannot inspect is one they cannot audit (ADR-0044).
      publisher: extension.manifest?.publisher === undefined ? null : {
        key: extension.manifest.publisher,
        notAfter: extension.manifest.notAfter ?? null,
        status: evaluatePublisher(extension.manifest.publisher, policy.allowPublishers, policy.lifecycle),
      },
      trust: resolution.kind === "extension" || resolution.kind === "untrusted" ? resolution.trust : null,
      // Named rather than omitted: an empty policy shown as though it were the
      // operator's intent is the failure ADR-0046 exists to end.
      policyDegraded: effective.degraded,
      policyWarnings: effective.warnings,
    }, null, 2)}\n`);
    return;
  }

  if (action === "publisher") {
    const verb = args[1];
    const path = args[2];
    if ((verb !== "succeed" && verb !== "revoke") || path === undefined) throw new Error(CliText.extUsage);
    const statement = readPublisherStatement(verb, path);
    const command = verb === "succeed" ? SUCCESSOR_COMMAND : REVOCATION_COMMAND;
    new EpochRepository(resolve(root)).appendOperation(command, "succeeded", statement);
    io.stdout.write(
      verb === "succeed"
        ? `recorded succession ${String(statement.predecessor)} -> ${String(statement.successor)}\n`
        : `recorded revocation of ${String(statement.publisher)}\n`,
    );
    return;
  }

  if (action === "trust" || action === "untrust") {
    const name = args[1];
    if (name === undefined) throw new Error(CliText.extUsage);
    // The name reaches a file path and an audit record, so it is validated
    // before either. The store itself is JSON and needs no escaping, but a name
    // outside the grammar could never match a discovered extension anyway.
    if (!isExtensionName(name)) {
      throw new Error(`invalid extension name '${name}'; names are lowercase letters, digits, and hyphens`);
    }
    const absolute = resolve(root);
    const read = readTrustStore(absolute);
    if (!("store" in read)) {
      throw new Error(`refusing to edit ${trustStorePath(absolute)}: ${read.error}`);
    }

    let next: TrustStore;
    let bound = "";
    if (action === "trust") {
      // Consent binds to a binary, so there has to be a binary to bind to.
      // Trusting a name that is not installed, or whose executable cannot be
      // read, would otherwise record a grant with nothing to check a future
      // binary against — consent to a name, which is exactly what this store
      // exists to avoid.
      const found = discover(absolute, dependencies).find((extension) => extension.name === name);
      if (found === undefined) {
        throw new Error(
          `cannot trust '${name}': no extension by that name is installed. `
          + `Install it first, then trust the binary you inspected.`,
        );
      }
      if (found.executableSha256 === undefined) {
        throw new Error(`cannot trust '${name}': ${found.executable} could not be read to bind consent to it`);
      }
      next = grantTrust(read.store, name, found.executableSha256);
      bound = ` (${found.executableSha256.slice(0, 12)}…)`;
    } else {
      next = revokeTrust(read.store, name);
    }
    writeTrustStore(absolute, next);

    // Recorded only once the write has landed. `succeeded` has to mean it
    // succeeded, or a refusal is stamped into history as a completed grant.
    new EpochRepository(absolute).appendOperation(`ext-${action}`, "succeeded", { extension: name });
    io.stdout.write(`${action === "trust" ? "trusted" : "untrusted"} extension '${name}'${bound}\n`);
    return;
  }

  throw new Error(CliText.extUsage);
}


/**
 * Providers shipped by extensions this repository trusts (ADR-0043).
 *
 * Trust is the same decision Tier 1 dispatch makes, taken by the same policy:
 * a provider runs inside an operation that produces signed evidence, so an
 * extension the operator has not consented to must not supply one. A degraded
 * policy loads nothing, for the reason it refuses to launch anything — the
 * half that survives an unreadable config is the half that permits.
 */
export function trustedExtensionProviders(
  root: string,
  options: { readonly reader: ProviderModuleReader } & ExtensionCliDependencies,
): ProviderLoadResult {
  const effective = policyFor(root);
  if (effective.degraded.length > 0) {
    return {
      providers: [],
      failures: effective.degraded.map((reason) => ({ extension: "-", module: "-", reason })),
    };
  }
  const extensions = discover(root, options);
  return loadSyntaxProviders(extensions, {
    reader: options.reader,
    isTrusted: (extension) =>
      resolveSubcommand(extension.name, {
        builtins: [],
        extensions: [extension],
        policy: effective.policy,
      }).kind === "extension",
  });
}

export interface ExternalDispatchResult {
  readonly handled: boolean;
  readonly exitCode: number;
}

/**
 * Dispatch an unknown subcommand to `epoch-<name>` when policy allows.
 *
 * Returns `handled: false` for a name no extension provides, so the caller
 * still reports an unknown command rather than a confusing trust message.
 */
export function dispatchExternalSubcommand(
  root: string,
  command: string,
  args: readonly string[],
  io: ExtensionCliIO,
  dependencies: ExtensionCliDependencies = {},
): ExternalDispatchResult {
  const effective = policyFor(root);
  const extensions = discover(root, dependencies);
  const resolution = resolveSubcommand(command, {
    builtins: BUILTIN_COMMANDS,
    extensions,
    policy: effective.policy,
  });

  if (resolution.kind === "unknown" || resolution.kind === "builtin") {
    return { handled: false, exitCode: 1 };
  }

  // Launching is the one thing a degraded policy must not do. The half of the
  // policy that survives a broken config is the half that *permits* — recorded
  // grants — while the `block` list the operator hand-wrote is exactly what
  // went missing, so proceeding would run code on the strength of an incomplete
  // denial (ADR-0046).
  reportNotes(effective.warnings, io);
  if (effective.degraded.length > 0) {
    reportNotes(effective.degraded, io);
    io.stderr.write(
      `refusing to run extension '${command}': the trust policy could not be read in full, `
      + "so it cannot be relied on to deny anything\n",
    );
    return { handled: true, exitCode: 1 };
  }

  if (resolution.kind === "untrusted") {
    io.stderr.write(`${resolution.trust.detail}\n`);
    io.stderr.write(`extension executable: ${resolution.extension.executable}\n`);
    return { handled: true, exitCode: 1 };
  }

  // The digest that earned trust was read during discovery, and the binary is
  // launched some milliseconds later. Re-reading it here does not close that
  // window — only exec-by-descriptor would, which Node does not offer — but it
  // shrinks the race to the syscall boundary instead of the whole command, and
  // a swap that loses the race is refused rather than run.
  const digest = (dependencies.fileSystem ?? nodeExtensionFileSystem).fileDigest?.(resolution.extension.executable);
  if (digest === undefined) {
    // Comparing two absent digests would compare equal and wave the launch
    // through, so an unavailable digest has to be its own refusal rather than a
    // silent pass.
    io.stderr.write(`extension '${command}' could not be digested before launch; refusing to run it\n`);
    return { handled: true, exitCode: 1 };
  }
  if (digest !== resolution.extension.executableSha256) {
    io.stderr.write(`extension '${command}' changed on disk while it was being checked; refusing to run it\n`);
    return { handled: true, exitCode: 1 };
  }

  const invocation = buildExternalInvocation(resolution.extension, args, {
    repositoryRoot: resolve(root),
    workingDirectory: process.cwd(),
  });
  const spawn = dependencies.spawn ?? defaultSpawn;
  return { handled: true, exitCode: spawn(invocation, resolution.extension.executableSha256) };
}
