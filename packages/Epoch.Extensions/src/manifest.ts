/**
 * Extension manifests (ADR-0037).
 *
 * Git's rule is that any executable named `git-x` on `$PATH` becomes a Git
 * command, with no declaration and no consent. Epoch requires a manifest so
 * that discovery and execution can be separate decisions.
 */

import { parseTomlDocument, TomlError } from "@epoch/core";

export const EXTENSION_API_VERSION = 1;

/**
 * Manifest file name for one extension.
 *
 * The manifest is per-executable, not per-directory: a manifest carries a
 * single required `name`, so one shared file could only ever describe one of
 * the `epoch-*` binaries sitting in a `$PATH` bin directory.
 */
export function extensionManifestFile(name: string): string {
  return `epoch-${name}.toml`;
}

export const CAPABILITY_KINDS = [
  "command",
  "syntax",
  "diff",
  "merge",
  "compression",
  "view",
  "codec",
  "hook",
] as const;

export type CapabilityKind = (typeof CAPABILITY_KINDS)[number];

/**
 * A provider marked `advisory` may inform a human but may never contribute to
 * signed state. This generalizes the ADR-0031 boundary around AI conflict
 * proposals to every provider.
 */
export type DeterminismClass = "deterministic" | "advisory";

/**
 * One capability provider an extension ships as a WebAssembly module.
 *
 * The module is an artifact beside the manifest, so it inherits the trust
 * mechanism already built: `module_sha256` binds it the way
 * `executable_sha256` binds the subcommand, and the canonical manifest covers
 * both, so signing the manifest transitively binds every module (ADR-0041).
 */
export interface ProviderDeclaration {
  readonly capability: CapabilityKind;
  /** Module file name, resolved beside the manifest. Never a path. */
  readonly module: string;
  readonly language: string;
  /** SHA-256 of the module, lowercase hex. Required: an unbound module is untrusted. */
  readonly moduleSha256: string;
  readonly extensions?: readonly string[];
  readonly mimeTypes?: readonly string[];
}

export interface ExtensionManifest {
  readonly name: string;
  readonly api: number;
  readonly version: string;
  readonly description?: string;
  readonly publisher?: string;
  readonly capabilities: readonly CapabilityKind[];
  readonly determinism: DeterminismClass;
  /**
   * SHA-256 of the extension executable, in lowercase hex.
   *
   * Required whenever a signature is present. The signature covers the
   * canonical manifest, and the canonical manifest covers this digest, so
   * signing transitively binds the binary. Without it a valid signed manifest
   * could be paired with a swapped executable.
   */
  readonly executableSha256?: string;
  /**
   * RFC 3339 instant after which the signature is treated as absent.
   *
   * Inside the signed payload, so it cannot be added, moved, or removed by
   * anyone but the signer. Optional: a manifest without one behaves exactly as
   * before, which is why adding this breaks no existing signature (ADR-0042).
   */
  readonly notAfter?: string;
  /** Capability providers this extension supplies, from `[[provides]]`. */
  readonly provides?: readonly ProviderDeclaration[];
  readonly signature?: string;
}

export type ManifestErrorCode = "invalid-syntax" | "invalid-field" | "unsupported-api";

export class ExtensionManifestError extends Error {
  constructor(readonly code: ManifestErrorCode, message: string) {
    super(message);
    this.name = "ExtensionManifestError";
  }
}

const PRINCIPAL_PATTERN = /^epoch:principal:[A-Za-z0-9_-]+$/u;
const RFC3339_PATTERN = /^\d{4}-\d{2}-\d{2}[Tt]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:[Zz]|[+-]\d{2}:\d{2})$/u;
const DIGEST_PATTERN = /^[a-f0-9]{64}$/u;
/** A bare file name: no separators, no traversal, no absolute path. */
const MODULE_NAME_PATTERN = /^[A-Za-z0-9._-]+$/u;
const NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/u;

/**
 * Whether a string is a well-formed extension name.
 *
 * The grammar is deliberately narrow — lowercase kebab-case — so a name is
 * safe to interpolate into a subcommand, a file name, and a TOML string
 * without escaping. Callers that write a name into configuration must check
 * this first; the grammar admits no quote, newline, `#`, or bracket, which is
 * what keeps a name from closing one TOML value and opening another.
 */
export function isExtensionName(value: string): boolean {
  return NAME_PATTERN.test(value);
}

/**
 * Read a manifest with the complete TOML reader (ADR-0044).
 *
 * This file used to carry a second partial parser, and the shortcut it took was
 * not a small one: it skipped every `[table]` header and flattened the keys
 * beneath it into the top level. `[[provides]]` therefore produced nothing at
 * all, and a `name` inside any section silently became the extension's name.
 * That is a security-relevant surface — this table decides `publisher`,
 * `executable_sha256`, and which modules an extension may load — so it reads
 * the same TOML everything else does rather than a subset of its own.
 */
function parseTable(text: string): Record<string, unknown> {
  try {
    return parseTomlDocument(text);
  } catch (error) {
    if (error instanceof TomlError) {
      throw new ExtensionManifestError("invalid-syntax", `invalid manifest at line ${error.line}: ${error.reason}`);
    }
    throw error;
  }
}

function requireString(table: Record<string, unknown>, field: string): string {
  const value = table[field];
  if (typeof value !== "string" || value.length === 0) {
    throw new ExtensionManifestError("invalid-field", `manifest field '${field}' must be a non-empty string`);
  }
  return value;
}

/**
 * Parse and validate an `epoch-extension.toml`.
 *
 * Validation is fail-closed: an unparsable or incomplete manifest yields no
 * extension rather than a partially trusted one.
 */
export function parseExtensionManifest(text: string): ExtensionManifest {
  const table = parseTable(text);

  const name = requireString(table, "name");
  if (!NAME_PATTERN.test(name)) {
    throw new ExtensionManifestError("invalid-field", `manifest name must be lowercase kebab-case: ${name}`);
  }

  const api = table.api;
  if (typeof api !== "number") throw new ExtensionManifestError("invalid-field", "manifest field 'api' must be a number");
  if (api !== EXTENSION_API_VERSION) {
    throw new ExtensionManifestError("unsupported-api", `unsupported extension API version ${api}; expected ${EXTENSION_API_VERSION}`);
  }

  const rawCapabilities = table.capabilities ?? [];
  if (!Array.isArray(rawCapabilities)) {
    throw new ExtensionManifestError("invalid-field", "manifest field 'capabilities' must be an array");
  }
  const capabilities = rawCapabilities.map((entry) => {
    if (typeof entry !== "string" || !(CAPABILITY_KINDS as readonly string[]).includes(entry)) {
      throw new ExtensionManifestError("invalid-field", `unknown capability: ${String(entry)}`);
    }
    return entry as CapabilityKind;
  });
  if (capabilities.length === 0) {
    throw new ExtensionManifestError("invalid-field", "manifest must declare at least one capability");
  }

  const determinism = table.determinism ?? "deterministic";
  if (determinism !== "deterministic" && determinism !== "advisory") {
    throw new ExtensionManifestError("invalid-field", `manifest field 'determinism' must be 'deterministic' or 'advisory'`);
  }

  const publisher = table.publisher;
  if (publisher !== undefined && (typeof publisher !== "string" || !PRINCIPAL_PATTERN.test(publisher))) {
    throw new ExtensionManifestError("invalid-field", "manifest field 'publisher' must be an epoch:principal identifier");
  }

  const description = table.description;
  const provides = parseProvides(table.provides);
  const notAfter = table.not_after;
  // The shape is checked before the instant. `Date.parse` accepts inputs whose
  // meaning is implementation-defined — `"2026"`, `"Mar 1 2026"` — and this
  // field sits inside the signed payload, so a lenient format is a way for two
  // verifiers to disagree about whether the same signature has expired.
  if (notAfter !== undefined
    && (typeof notAfter !== "string" || !RFC3339_PATTERN.test(notAfter) || Number.isNaN(Date.parse(notAfter)))) {
    throw new ExtensionManifestError("invalid-field", "manifest field 'not_after' must be an RFC 3339 timestamp");
  }
  const signature = table.signature;
  const executableSha256 = table.executable_sha256;
  if (executableSha256 !== undefined && (typeof executableSha256 !== "string" || !/^[a-f0-9]{64}$/u.test(executableSha256))) {
    throw new ExtensionManifestError("invalid-field", "manifest field 'executable_sha256' must be a lowercase hex SHA-256");
  }
  if (typeof signature === "string" && typeof executableSha256 !== "string") {
    // A signature that does not cover the binary is worse than no signature,
    // because it looks like a guarantee.
    throw new ExtensionManifestError("invalid-field", "a signed manifest must declare 'executable_sha256'");
  }

  return {
    name,
    api,
    version: requireString(table, "version"),
    description: typeof description === "string" ? description : undefined,
    publisher: publisher as string | undefined,
    capabilities,
    determinism,
    executableSha256: typeof executableSha256 === "string" ? executableSha256 : undefined,
    notAfter: typeof notAfter === "string" ? notAfter : undefined,
    provides: provides.length === 0 ? undefined : provides,
    signature: typeof signature === "string" ? signature : undefined,
  };
}

/**
 * Read the `[[provides]]` table.
 *
 * A module is named, never pathed: it is resolved beside the manifest, so a
 * declaration cannot reach outside the extension's own directory. Every field
 * is required, including the digest — a provider whose bytes are not bound is
 * a provider nobody consented to, and shaping signed evidence is exactly what
 * it would be doing (ADR-0041).
 */
function parseProvides(value: unknown): readonly ProviderDeclaration[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new ExtensionManifestError("invalid-field", "manifest field 'provides' must be an array of tables");
  }
  return value.map((entry) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      throw new ExtensionManifestError("invalid-field", "each 'provides' entry must be a table");
    }
    const record = entry as Record<string, unknown>;
    const capability = record.capability;
    if (typeof capability !== "string" || !(CAPABILITY_KINDS as readonly string[]).includes(capability)) {
      throw new ExtensionManifestError("invalid-field", `unknown provided capability: ${String(capability)}`);
    }
    if (capability === "command") {
      // Tier 1 and Tier 2 are separated on exactly this line: a subcommand's
      // job is to have effects, and a sandbox that permits that is not one.
      throw new ExtensionManifestError("invalid-field", "'command' is a Tier 1 capability and cannot be provided as a module");
    }
    const module = record.module;
    if (typeof module !== "string" || !MODULE_NAME_PATTERN.test(module)) {
      throw new ExtensionManifestError("invalid-field", "a 'provides' entry needs a 'module' file name beside the manifest");
    }
    const language = record.language;
    if (typeof language !== "string" || language.length === 0) {
      throw new ExtensionManifestError("invalid-field", `provider '${module}' must declare the 'language' it parses`);
    }
    const moduleSha256 = record.module_sha256;
    if (typeof moduleSha256 !== "string" || !DIGEST_PATTERN.test(moduleSha256)) {
      throw new ExtensionManifestError(
        "invalid-field",
        `provider '${module}' must declare 'module_sha256'; an unbound module cannot be trusted`,
      );
    }
    const strings = (key: string): readonly string[] | undefined => {
      const raw = record[key];
      if (raw === undefined) return undefined;
      if (!Array.isArray(raw) || raw.some((item) => typeof item !== "string")) {
        throw new ExtensionManifestError("invalid-field", `provider '${module}' field '${key}' must be an array of strings`);
      }
      return raw as readonly string[];
    };
    return {
      capability: capability as CapabilityKind,
      module,
      language,
      moduleSha256,
      extensions: strings("extensions"),
      mimeTypes: strings("mime_types"),
    };
  });
}

/**
 * Stable serialization of the manifest fields that bind its identity.
 *
 * The host digests this to produce the `manifestDigest` recorded alongside any
 * signed state a provider contributed to.
 */
export function canonicalManifest(manifest: ExtensionManifest): string {
  return JSON.stringify({
    api: manifest.api,
    capabilities: [...manifest.capabilities].sort(),
    determinism: manifest.determinism,
    executableSha256: manifest.executableSha256 ?? null,
    name: manifest.name,
    // Omitted entirely when absent rather than serialized as null, so a
    // manifest that declares neither expiry nor providers produces the bytes it
    // produced before either existed, and its signature keeps verifying
    // (ADR-0041, ADR-0042).
    ...(manifest.notAfter === undefined ? {} : { notAfter: manifest.notAfter }),
    ...(manifest.provides === undefined ? {} : {
      // Sorted so declaration order in the file cannot change the signed bytes,
      // and complete so a signature binds every module the extension ships.
      provides: [...manifest.provides]
        .map((provider) => ({
          capability: provider.capability,
          extensions: provider.extensions === undefined ? null : [...provider.extensions],
          language: provider.language,
          mimeTypes: provider.mimeTypes === undefined ? null : [...provider.mimeTypes],
          module: provider.module,
          moduleSha256: provider.moduleSha256,
        }))
        .sort((left, right) => left.module.localeCompare(right.module)),
    }),
    publisher: manifest.publisher ?? null,
    version: manifest.version,
  });
}
