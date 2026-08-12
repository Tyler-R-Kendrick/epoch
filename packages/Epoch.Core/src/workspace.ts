export type WorkspaceCapabilityName = "read" | "write" | "remove" | "watch" | "reflink" | "execute" | "persistent";
export type WorkspaceCapability =
  | { readonly status: "supported"; readonly mode: string }
  | { readonly status: "unsupported"; readonly reason: string };

export interface WorkspaceProvider {
  readonly id: string;
  readonly capabilities: Readonly<Record<WorkspaceCapabilityName, WorkspaceCapability>>;
  read(path: string): Promise<Buffer>;
  write(path: string, bytes: Uint8Array): Promise<void>;
  remove(path: string): Promise<void>;
}
const DEFAULT_CAPABILITIES: Readonly<Record<WorkspaceCapabilityName, WorkspaceCapability>> = Object.freeze({
  read: { status: "supported", mode: "memory" },
  write: { status: "supported", mode: "memory" },
  remove: { status: "supported", mode: "memory" },
  watch: { status: "unsupported", reason: "provider does not implement change observation" },
  reflink: { status: "unsupported", reason: "provider does not implement copy-on-write clones" },
  execute: { status: "unsupported", reason: "provider is storage only" },
  persistent: { status: "unsupported", reason: "provider state is process-local" },
});

function safePath(path: string): string {
  const normalized = path.replace(/\\/gu, "/").replace(/^\.\//u, "");
  if (!normalized || normalized.startsWith("/") || normalized.split("/").some((part) => part === ".." || part === "")) {
    throw new Error("Workspace path must be a non-empty relative path without traversal");
  }
  return normalized;
}

export class MemoryWorkspaceProvider implements WorkspaceProvider {
  readonly id: string;
  readonly capabilities: Readonly<Record<WorkspaceCapabilityName, WorkspaceCapability>>;
  readonly #files = new Map<string, Buffer>();

  constructor(id = "memory", capabilities: Partial<Record<WorkspaceCapabilityName, WorkspaceCapability>> = {}) {
    if (!id.trim()) throw new Error("Workspace provider ID is required");
    this.id = id;
    this.capabilities = Object.freeze({ ...DEFAULT_CAPABILITIES, ...capabilities });
  }

  async read(path: string): Promise<Buffer> {
    const value = this.#files.get(safePath(path));
    if (value === undefined) throw new Error(`Workspace path not found: ${path}`);
    return Buffer.from(value);
  }

  async write(path: string, bytes: Uint8Array): Promise<void> {
    requireWorkspaceCapability(this, "write");
    this.#files.set(safePath(path), Buffer.from(bytes));
  }

  async remove(path: string): Promise<void> {
    requireWorkspaceCapability(this, "remove");
    const key = safePath(path);
    for (const candidate of this.#files.keys()) {
      if (candidate === key || candidate.startsWith(`${key}/`)) this.#files.delete(candidate);
    }
  }
}

export function requireWorkspaceCapability(provider: WorkspaceProvider, name: WorkspaceCapabilityName): WorkspaceCapability & { readonly status: "supported" } {
  const capability = provider.capabilities[name];
  if (capability.status === "unsupported") throw new Error(`${name} is unsupported: ${capability.reason}`);
  return capability;
}

export class WorkspaceProviderRegistry {
  readonly #providers = new Map<string, WorkspaceProvider>();

  register(provider: WorkspaceProvider): void {
    if (this.#providers.has(provider.id)) throw new Error(`Workspace provider already registered: ${provider.id}`);
    this.#providers.set(provider.id, provider);
  }

  get(id: string): WorkspaceProvider | undefined { return this.#providers.get(id); }
  list(): readonly WorkspaceProvider[] { return [...this.#providers.values()]; }
}
