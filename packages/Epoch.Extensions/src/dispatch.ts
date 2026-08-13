import { isAbsolute, join, relative, sep } from "node:path";
import type { DiscoveredExtension } from "./discovery";
import { EXTENSION_API_VERSION } from "./manifest";
import {
  evaluateTrust,
  type ExtensionTrustPolicy,
  type ManifestSignatureVerifier,
  type TrustDecision,
} from "./trust";

/**
 * External subcommand dispatch (ADR-0037).
 *
 * The invocation is built as a value rather than spawned here, so the contract
 * is testable without executing anything and the CLI keeps sole ownership of
 * process creation.
 */

export type SubcommandResolution =
  | { readonly kind: "builtin"; readonly name: string }
  | { readonly kind: "extension"; readonly name: string; readonly extension: DiscoveredExtension; readonly trust: TrustDecision }
  | { readonly kind: "untrusted"; readonly name: string; readonly extension: DiscoveredExtension; readonly trust: TrustDecision }
  | { readonly kind: "unknown"; readonly name: string };

export interface SubcommandResolutionOptions {
  readonly builtins: readonly string[];
  readonly extensions: readonly DiscoveredExtension[];
  readonly policy?: ExtensionTrustPolicy;
  readonly verifySignature?: ManifestSignatureVerifier;
}

/**
 * Resolve a subcommand name.
 *
 * Builtins always win, so adding a builtin shadows an installed extension of
 * the same name. That shadowing is reported by `epoch ext list` rather than
 * hidden, which is the mitigation for a large native surface preempting
 * community work (ADR-0039).
 */
export function resolveSubcommand(name: string, options: SubcommandResolutionOptions): SubcommandResolution {
  if (options.builtins.includes(name)) return { kind: "builtin", name };

  const extension = options.extensions.find((candidate) => candidate.name === name);
  if (extension === undefined) return { kind: "unknown", name };

  const trust = evaluateTrust(name, extension.manifest, options.policy, {
    verifySignature: options.verifySignature,
    executableSha256: extension.executableSha256,
  });
  return trust.trusted
    ? { kind: "extension", name, extension, trust }
    : { kind: "untrusted", name, extension, trust };
}

/** Extensions that a builtin of the same name is currently shadowing. */
export function shadowedExtensions(
  builtins: readonly string[],
  extensions: readonly DiscoveredExtension[],
): readonly DiscoveredExtension[] {
  return extensions.filter((extension) => builtins.includes(extension.name));
}

export interface InvocationContext {
  readonly repositoryRoot: string;
  readonly workingDirectory?: string;
  /** Serialized attenuated grant for this invocation (ADR-0034). */
  readonly grant?: string;
  readonly baseEnvironment?: Readonly<Record<string, string | undefined>>;
}

export interface ExternalInvocation {
  readonly executable: string;
  readonly args: readonly string[];
  readonly env: Record<string, string>;
}

/**
 * Path from the repository root to the invocation directory, POSIX-style.
 *
 * Uses real path resolution rather than a prefix test, so a sibling directory
 * such as `/repo-other` or a traversal such as `/repo/../other` yields an empty
 * prefix instead of a bogus one.
 */
function prefixOf(repositoryRoot: string, workingDirectory: string | undefined): string {
  if (workingDirectory === undefined || workingDirectory === repositoryRoot) return "";
  const within = relative(repositoryRoot, workingDirectory);
  if (within.length === 0 || isAbsolute(within) || within === ".." || within.startsWith(`..${sep}`)) return "";
  return within.split(/[\\/]/u).join("/");
}

/**
 * Build the child-process invocation for a trusted external subcommand.
 *
 * The environment contract is stable and documented, so an extension author
 * can rely on it the way `git-foo` authors rely on `GIT_DIR`.
 */
export function buildExternalInvocation(
  extension: DiscoveredExtension,
  args: readonly string[],
  context: InvocationContext,
): ExternalInvocation {
  const base: Record<string, string> = {};
  for (const [key, value] of Object.entries(context.baseEnvironment ?? process.env)) {
    if (value !== undefined) base[key] = value;
  }

  return {
    executable: extension.executable,
    args: [...args],
    env: {
      ...base,
      EPOCH_EXTENSION_API: String(EXTENSION_API_VERSION),
      EPOCH_DIR: join(context.repositoryRoot, ".epoch"),
      EPOCH_ROOT: context.repositoryRoot,
      EPOCH_PREFIX: prefixOf(context.repositoryRoot, context.workingDirectory),
      EPOCH_EXTENSION_NAME: extension.name,
      EPOCH_EXTENSION_GRANT: context.grant ?? "",
    },
  };
}
