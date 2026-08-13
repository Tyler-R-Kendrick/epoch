import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { delimiter, join } from "node:path";
import {
  EXTENSION_MANIFEST_FILE,
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
}

/** Filesystem seam, injected so discovery is testable without real binaries. */
export interface ExtensionFileSystem {
  listDirectory(directory: string): readonly string[];
  isExecutableFile(path: string): boolean;
  readTextFile(path: string): string | undefined;
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
    for (const entry of fileSystem.listDirectory(directory)) {
      if (!entry.startsWith(EXTENSION_PREFIX)) continue;
      const name = entry.slice(EXTENSION_PREFIX.length).replace(/\.(exe|cmd|bat)$/iu, "");
      if (name.length === 0 || found.has(name)) continue;
      const executable = join(directory, entry);
      if (!fileSystem.isExecutableFile(executable)) continue;

      const manifestText = fileSystem.readTextFile(join(directory, EXTENSION_MANIFEST_FILE));
      let manifest: ExtensionManifest | undefined;
      let manifestError: string | undefined;
      if (manifestText === undefined) {
        manifestError = `no ${EXTENSION_MANIFEST_FILE} beside ${executable}`;
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

      found.set(name, { name, executable, directory, source, manifest, manifestError });
    }
  }

  return [...found.values()].sort((left, right) => left.name.localeCompare(right.name));
}
