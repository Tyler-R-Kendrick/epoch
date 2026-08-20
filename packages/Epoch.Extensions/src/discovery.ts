import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { delimiter, extname, join } from "node:path";
import {
  extensionManifestFile,
  parseExtensionManifest,
  type ExtensionManifest,
} from "./manifest";

/**
 * External subcommand discovery (ADR-0037).
 *
 * `epoch foo` resolves to `epoch-foo` from the repository extension directory,
 * then the user extension directory, then `$PATH`. Discovery deliberately does
 * not decide whether the extension may run — that is the trust policy's job.
 */

export const EXTENSION_PREFIX = "epoch-";

export type ExtensionSource = "repository" | "user" | "path";

export interface DiscoveredExtension {
  readonly name: string;
  readonly executable: string;
  readonly directory: string;
  readonly source: ExtensionSource;
  readonly manifest?: ExtensionManifest;
  /** Why the manifest was rejected, when it was. Reported, never swallowed. */
  readonly manifestError?: string;
  /** SHA-256 of the executable, used to bind a signature to the binary. */
  readonly executableSha256?: string;
}

/** Filesystem seam, injected so discovery is testable without real binaries. */
export interface ExtensionFileSystem {
  listDirectory(directory: string): readonly string[];
  isExecutableFile(path: string): boolean;
  readTextFile(path: string): string | undefined;
  /** SHA-256 of a file's bytes, lowercase hex, or undefined when unreadable. */
  fileDigest?(path: string): string | undefined;
}

/**
 * Extensions Windows treats as directly launchable, in `PATHEXT` precedence
 * order. The order is load-bearing: it decides which of `epoch-foo.exe` and
 * `epoch-foo.cmd` wins when a directory holds both.
 */
const WINDOWS_EXECUTABLE_EXTENSIONS = [".exe", ".com", ".bat", ".cmd"] as const;
const LAUNCH_SUFFIX = /\.(exe|com|cmd|bat)$/iu;

/** Rank of an entry's launch suffix; a bare name sorts last, as on Windows. */
function suffixRank(entry: string): number {
  const suffix = LAUNCH_SUFFIX.exec(entry)?.[0].toLowerCase();
  if (suffix === undefined) return WINDOWS_EXECUTABLE_EXTENSIONS.length;
  // SAFETY: The module validates or constructs this value before applying the asserted contract.
  return WINDOWS_EXECUTABLE_EXTENSIONS.indexOf(suffix as (typeof WINDOWS_EXECUTABLE_EXTENSIONS)[number]);
}

/**
 * Directory entries in a stable, platform-independent order.
 *
 * Entries are grouped by the name they normalize to, so suffix precedence only
 * ever breaks a tie between two spellings of the same extension.
 */
function orderedEntries(entries: readonly string[]): readonly string[] {
  return [...entries].sort((left, right) => {
    const leftName = left.replace(LAUNCH_SUFFIX, "");
    const rightName = right.replace(LAUNCH_SUFFIX, "");
    if (leftName !== rightName) return leftName < rightName ? -1 : 1;
    return suffixRank(left) - suffixRank(right) || (left < right ? -1 : 1);
  });
}

export const nodeExtensionFileSystem: ExtensionFileSystem = {
  listDirectory(directory: string): readonly string[] {
    try {
      return readdirSync(directory);
    } catch {
      return [];
    }
  },
  isExecutableFile(path: string): boolean {
    try {
      const stats = statSync(path);
      if (!stats.isFile()) return false;
      if (process.platform === "win32") {
        // Windows does not carry POSIX execute bits; launchability comes from
        // the file extension, so mode checking would reject every real .exe.
        // SAFETY: The module validates or constructs this value before applying the asserted contract.
        return (WINDOWS_EXECUTABLE_EXTENSIONS as readonly string[]).includes(extname(path).toLowerCase());
      }
      // Any execute bit is enough; Epoch does not run it without trust anyway.
      return (stats.mode & 0o111) !== 0;
    } catch {
      return false;
    }
  },
  readTextFile(path: string): string | undefined {
    try {
      return existsSync(path) ? readFileSync(path, "utf8") : undefined;
    } catch {
      return undefined;
    }
  },
  fileDigest(path: string): string | undefined {
    try {
      return createHash("sha256").update(readFileSync(path)).digest("hex");
    } catch {
      return undefined;
    }
  },
};

export interface DiscoveryOptions {
  readonly repositoryRoot?: string;
  readonly homeDirectory?: string;
  readonly pathEntries?: readonly string[];
  readonly fileSystem?: ExtensionFileSystem;
}

function searchDirectories(options: DiscoveryOptions): readonly { directory: string; source: ExtensionSource }[] {
  const directories: { directory: string; source: ExtensionSource }[] = [];
  if (options.repositoryRoot !== undefined) {
    directories.push({ directory: join(options.repositoryRoot, ".epoch", "ext", "bin"), source: "repository" });
  }
  if (options.homeDirectory !== undefined) {
    directories.push({ directory: join(options.homeDirectory, ".epoch", "ext", "bin"), source: "user" });
  }
  const pathEntries = options.pathEntries ?? (process.env.PATH ?? "").split(delimiter);
  for (const entry of pathEntries) {
    if (entry.length > 0) directories.push({ directory: entry, source: "path" });
  }
  return directories;
}

/**
 * Discover installed extensions.
 *
 * First match by name wins, in repository → user → `$PATH` order, so a
 * repository-local extension can override a globally installed one.
 */
export function discoverExtensions(options: DiscoveryOptions = {}): readonly DiscoveredExtension[] {
  const fileSystem = options.fileSystem ?? nodeExtensionFileSystem;
  const found = new Map<string, DiscoveredExtension>();

  for (const { directory, source } of searchDirectories(options)) {
    // `readdirSync` order is filesystem-dependent, and several entries can
    // normalize to one name (`epoch-foo.exe`, `epoch-foo.com`, `epoch-foo.cmd`).
    // Sorting first, then preferring the launch-suffix order Windows itself
    // uses, makes the winner a property of the names rather than of the
    // directory's on-disk layout — the same determinism the capability registry
    // promises for providers.
    for (const entry of orderedEntries(fileSystem.listDirectory(directory))) {
      if (!entry.startsWith(EXTENSION_PREFIX)) continue;
      // Every extension `isExecutableFile` accepts on Windows must be strippable
      // here, or `epoch-foo.com` would be discovered under the name `foo.com`
      // and never match the subcommand `foo`.
      const name = entry.slice(EXTENSION_PREFIX.length).replace(LAUNCH_SUFFIX, "");
      if (name.length === 0 || found.has(name)) continue;
      const executable = join(directory, entry);
      if (!fileSystem.isExecutableFile(executable)) continue;

      // The manifest is named for its extension, so several `epoch-*` binaries
      // can coexist in one bin directory and each still declare itself.
      const manifestName = extensionManifestFile(name);
      const manifestText = fileSystem.readTextFile(join(directory, manifestName));
      let manifest: ExtensionManifest | undefined;
      let manifestError: string | undefined;
      if (manifestText === undefined) {
        manifestError = `no ${manifestName} beside ${executable}`;
      } else {
        try {
          const parsed = parseExtensionManifest(manifestText);
          if (parsed.name !== name) {
            manifestError = `manifest declares '${parsed.name}' but the executable is '${entry}'`;
          } else {
            manifest = parsed;
          }
        } catch (error) {
          manifestError = error instanceof Error ? error.message : String(error);
        }
      }

      found.set(name, {
        name,
        executable,
        directory,
        source,
        manifest,
        manifestError,
        executableSha256: fileSystem.fileDigest?.(executable),
      });
    }
  }

  return [...found.values()].sort((left, right) => left.name.localeCompare(right.name));
}
