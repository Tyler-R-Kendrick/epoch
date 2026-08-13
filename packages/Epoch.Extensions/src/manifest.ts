/**
 * Extension manifests (ADR-0037).
 *
 * Git's rule is that any executable named `git-x` on `$PATH` becomes a Git
 * command, with no declaration and no consent. Epoch requires a manifest so
 * that discovery and execution can be separate decisions.
 */

export const EXTENSION_API_VERSION = 1;

export const EXTENSION_MANIFEST_FILE = "epoch-extension.toml";

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

export interface ExtensionManifest {
  readonly name: string;
  readonly api: number;
  readonly version: string;
  readonly description?: string;
  readonly publisher?: string;
  readonly capabilities: readonly CapabilityKind[];
  readonly determinism: DeterminismClass;
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
const NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/u;

function parseValue(raw: string): unknown {
  const value = raw.trim();
  if (value.startsWith("\"") && value.endsWith("\"") && value.length >= 2) return value.slice(1, -1);
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?\d+$/u.test(value)) return Number.parseInt(value, 10);
  if (value.startsWith("[") && value.endsWith("]")) {
    const body = value.slice(1, -1).trim();
    if (body.length === 0) return [];
    return body.split(",").map((item) => parseValue(item));
  }
  throw new ExtensionManifestError("invalid-syntax", `unsupported manifest value: ${raw}`);
}

function parseTable(text: string): Record<string, unknown> {
  const table: Record<string, unknown> = {};
  for (const rawLine of text.split(/\r?\n/u)) {
    const line = rawLine.split("#")[0].trim();
    if (line.length === 0) continue;
    if (/^\[[^\]]+\]$/u.test(line)) continue;
    const assignment = /^([A-Za-z0-9_.-]+)\s*=\s*(.+)$/u.exec(line);
    if (assignment === null) throw new ExtensionManifestError("invalid-syntax", `invalid manifest line: ${rawLine}`);
    table[assignment[1]] = parseValue(assignment[2]);
  }
  return table;
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
  const signature = table.signature;

  return {
    name,
    api,
    version: requireString(table, "version"),
    description: typeof description === "string" ? description : undefined,
    publisher: publisher as string | undefined,
    capabilities,
    determinism,
    signature: typeof signature === "string" ? signature : undefined,
  };
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
    name: manifest.name,
    publisher: manifest.publisher ?? null,
    version: manifest.version,
  });
}
