import { copyFile, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import type { WorkspaceCapability, WorkspaceCapabilityName, WorkspaceProvider } from "./workspace";
import { requireWorkspaceCapability } from "./workspace";

const unsupported = (reason: string): WorkspaceCapability => ({ status: "unsupported", reason });
const supported = (mode: string): WorkspaceCapability => ({ status: "supported", mode });

function child(root: string, path: string): string {
  if (!path || path.includes("\0")) throw new Error("Workspace path is invalid");
  const target = resolve(root, path);
  const rel = relative(root, target);
  if (!rel || rel === ".." || rel.startsWith("../") || rel.startsWith("..\\")) {
    throw new Error("Workspace path must remain below the provider root");
  }
  return target;
}

export class FileSystemWorkspaceProvider implements WorkspaceProvider {
  readonly id: string;
  readonly root: string;
  readonly capabilities: Readonly<Record<WorkspaceCapabilityName, WorkspaceCapability>>;

  constructor(root: string, options: { readonly id?: string; readonly reflink?: boolean } = {}) {
    this.root = resolve(root);
    this.id = options.id ?? "filesystem";
    this.capabilities = Object.freeze({
      read: supported("filesystem"), write: supported("filesystem"), remove: supported("filesystem"),
      watch: unsupported("filesystem watch is not implemented by this provider"),
      reflink: options.reflink === true ? supported("copyfile-ficlone") : unsupported("reflink support was not positively probed"),
      execute: unsupported("filesystem provider does not execute workspace code"), persistent: supported("filesystem"),
    });
  }

  async read(path: string): Promise<Buffer> { return readFile(child(this.root, path)); }
  async write(path: string, bytes: Uint8Array): Promise<void> {
    const target = child(this.root, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, bytes);
  }
  async remove(path: string): Promise<void> {
    const target = child(this.root, path);
    if (target === this.root) throw new Error("Refusing to remove workspace provider root");
    await rm(target, { recursive: true, force: true });
  }
  async reflink(source: string, target: string): Promise<void> {
    requireWorkspaceCapability(this, "reflink");
    const destination = child(this.root, target);
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(child(this.root, source), destination, constants.COPYFILE_FICLONE_FORCE);
  }
  async manifest(paths: readonly string[]): Promise<readonly { path: string; size: number; mode: number }[]> {
    const out = [];
    for (const path of [...paths].sort()) {
      const info = await stat(child(this.root, path));
      if (info.isFile()) out.push({ path, size: info.size, mode: info.mode & 0o777 });
    }
    return out;
  }
}

export interface RiftWorkspaceOptions {
  readonly enabled: boolean;
  readonly executable?: string;
  readonly arguments?: readonly string[];
}

export interface RiftLaunchSpec {
  readonly executable: string;
  readonly arguments: readonly string[];
  readonly hooks: false;
  readonly sandbox: { readonly isolated: false; readonly mode: "in-process" };
}

export function createRiftLaunchSpec(options: RiftWorkspaceOptions): RiftLaunchSpec {
  if (!options.enabled) throw new Error("Rift workspace execution requires explicit opt-in");
  const executable = options.executable ?? "rift";
  if (!/^[A-Za-z0-9._/-]+$/u.test(executable)) throw new Error("Rift executable is unsafe");
  const arguments_ = [...(options.arguments ?? [])];
  for (const argument of arguments_) {
    if (argument.includes("\0") || argument.includes("\n") || argument.includes("\r")) throw new Error("Rift argument is unsafe");
  }
  const spec: RiftLaunchSpec = {
    executable, arguments: Object.freeze(arguments_), hooks: false,
    sandbox: { isolated: false, mode: "in-process" },
  };
  return Object.freeze(spec);
}

export interface BrowserWorkspaceCapabilities {
  readonly opfs: boolean;
  readonly indexedDb: boolean;
}

export function browserWorkspaceCapabilities(probe: BrowserWorkspaceCapabilities): Readonly<Record<WorkspaceCapabilityName, WorkspaceCapability>> {
  const persistence = probe.opfs ? supported("opfs") : probe.indexedDb ? supported("indexeddb")
    : unsupported("neither OPFS nor IndexedDB is available");
  return Object.freeze({
    read: supported(probe.opfs ? "opfs" : probe.indexedDb ? "indexeddb" : "memory"),
    write: supported(probe.opfs ? "opfs" : probe.indexedDb ? "indexeddb" : "memory"),
    remove: supported(probe.opfs ? "opfs" : probe.indexedDb ? "indexeddb" : "memory"),
    watch: unsupported("browser workspace watch is not implemented"),
    reflink: unsupported("browser storage has no reflink primitive"),
    execute: unsupported("browser workspace execution is unavailable"),
    persistent: persistence,
  });
}

export interface WorkspaceStateManifest {
  readonly protocol: "epoch.workspace-manifest/v1";
  readonly providerId: string;
  readonly storageMode: string;
  readonly residency: "resident" | "partial" | "virtual";
  readonly materialization: "materialized" | "virtual";
  readonly execution: "disabled" | "in-process" | "isolated";
}

export function createWorkspaceStateManifest(
  provider: WorkspaceProvider,
  state: Omit<WorkspaceStateManifest, "protocol" | "providerId" | "storageMode">,
): WorkspaceStateManifest {
  const persistent = provider.capabilities.persistent;
  const storageMode = persistent.status === "supported" ? persistent.mode : "memory";
  if (state.execution === "isolated" && provider.capabilities.execute.status !== "supported") {
    throw new Error("Workspace provider cannot claim isolated execution");
  }
  return Object.freeze({ protocol: "epoch.workspace-manifest/v1", providerId: provider.id, storageMode, ...state });
}
