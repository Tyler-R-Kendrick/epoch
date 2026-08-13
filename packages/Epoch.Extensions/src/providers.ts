import type { SyntaxProvider } from "@epoch/semantic";
import type { DiscoveredExtension } from "./discovery";
import type { ProviderDeclaration } from "./manifest";
import { instantiateWasmSyntaxModule, wasmSyntaxProvider, WasmProviderError, type WasmProviderLimits } from "./wasm";

/**
 * Loading capability providers an extension ships (ADR-0041).
 *
 * This is the wiring that makes the Tier 2 claim true rather than available:
 * `wasm.ts` can run a module, but until a declared module is found beside its
 * manifest, bound to a digest, and handed to the registry, no shipped
 * extension can displace a builtin.
 *
 * Every refusal here is reported rather than swallowed. A provider that quietly
 * fails to load leaves the builtin in place and produces a *different* diff on
 * one machine than another — the failure mode content addressing exists to
 * rule out.
 */

/** Reading a module's bytes, injected so loading is testable without files. */
export interface ProviderModuleReader {
  /** Module bytes, or undefined when the file is missing or unreadable. */
  readModule(path: string): Uint8Array | undefined;
  /** SHA-256 of the same bytes, lowercase hex. */
  digest(bytes: Uint8Array): string;
  /** Join a directory and a file name for this platform. */
  resolve(directory: string, name: string): string;
}

export interface LoadedProvider {
  readonly extension: string;
  readonly declaration: ProviderDeclaration;
  readonly provider: SyntaxProvider;
  /** The digest the module actually had, which is the one that ran. */
  readonly moduleSha256: string;
}

export interface ProviderLoadFailure {
  readonly extension: string;
  readonly module: string;
  readonly reason: string;
}

export interface ProviderLoadResult {
  readonly providers: readonly LoadedProvider[];
  readonly failures: readonly ProviderLoadFailure[];
}

export interface LoadProvidersOptions {
  readonly reader: ProviderModuleReader;
  readonly limits?: WasmProviderLimits;
  /**
   * Whether this extension's providers may be loaded at all.
   *
   * Providers run inside a decision that produces signed evidence, so an
   * extension the operator has not consented to must not supply one — the same
   * rule Tier 1 dispatch applies, checked by the same policy.
   */
  readonly isTrusted: (extension: DiscoveredExtension) => boolean;
}

/**
 * Load every `syntax` provider the trusted extensions declare.
 *
 * The identifier a loaded provider registers under is namespaced by the
 * extension, so two extensions shipping a JSON grammar are two providers the
 * registry can rank rather than one silently overwriting the other.
 */
export function loadSyntaxProviders(
  extensions: readonly DiscoveredExtension[],
  options: LoadProvidersOptions,
): ProviderLoadResult {
  const providers: LoadedProvider[] = [];
  const failures: ProviderLoadFailure[] = [];

  for (const extension of extensions) {
    const declared = extension.manifest?.provides ?? [];
    if (declared.length === 0) continue;
    if (!options.isTrusted(extension)) {
      for (const declaration of declared) {
        failures.push({
          extension: extension.name,
          module: declaration.module,
          reason: `extension '${extension.name}' is not trusted, so its providers were not loaded`,
        });
      }
      continue;
    }

    for (const declaration of declared) {
      if (declaration.capability !== "syntax") continue;
      const path = options.reader.resolve(extension.directory, declaration.module);
      const bytes = options.reader.readModule(path);
      if (bytes === undefined) {
        failures.push({ extension: extension.name, module: declaration.module, reason: `${path} could not be read` });
        continue;
      }
      // The digest is checked against the manifest the operator consented to,
      // so a module swapped after installation is refused rather than run.
      const actual = options.reader.digest(bytes);
      if (actual !== declaration.moduleSha256) {
        failures.push({
          extension: extension.name,
          module: declaration.module,
          reason: `module digest ${actual.slice(0, 12)}… does not match the ${declaration.moduleSha256.slice(0, 12)}… its manifest declares`,
        });
        continue;
      }
      try {
        const module = instantiateWasmSyntaxModule(bytes, options.limits);
        providers.push({
          extension: extension.name,
          declaration,
          moduleSha256: actual,
          provider: wasmSyntaxProvider({
            id: `${extension.name}.${declaration.capability}.${declaration.language}`,
            language: declaration.language,
            extensions: declaration.extensions ?? [],
            mimeTypes: declaration.mimeTypes,
          }, module),
        });
      } catch (error) {
        failures.push({
          extension: extension.name,
          module: declaration.module,
          reason: error instanceof WasmProviderError
            ? `${error.code}: ${error.message}`
            : error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  return { providers, failures };
}
