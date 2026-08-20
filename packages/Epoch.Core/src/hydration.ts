/**
 * On-access hydration (ADR-0043 phase 4).
 *
 * ADR-0014's revisit criteria named "lazy, on-access hydration (a real virtual
 * filesystem handle)" as the thing missing from the virtual working tree. This
 * is that hydration at the **provider seam**: a read of a virtual path
 * materializes its bytes from a verified object source on demand.
 *
 * It is deliberately not described as a virtual filesystem. There is no kernel
 * mount here, so a tool that opens the file by path outside this provider sees
 * nothing until hydration runs. `materialization` reports `virtual` until the
 * path is realized and `materialized` afterwards, which is the honest version
 * of the claim rather than the flattering one.
 */
import { constants } from "node:fs";
import { copyFile, mkdir, mkdtemp, rm, stat, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import type { ObjectStore } from "./object-store";
import { objectIdFor, validateObjectId } from "./object-store";
import type { WorkspaceCapability, WorkspaceCapabilityName, WorkspaceProvider } from "./workspace";
import { requireWorkspaceCapability } from "./workspace";

const unsupported = (reason: string): WorkspaceCapability => ({ status: "unsupported", reason });
const supported = (mode: string): WorkspaceCapability => ({ status: "supported", mode });

export interface HydrationEntry {
  readonly path: string;
  readonly objectId: string;
  readonly size: number;
}

export type HydrationStatus = "virtual" | "materialized";

export interface HydrationReport {
  readonly path: string;
  readonly objectId: string;
  readonly status: HydrationStatus;
  readonly bytes: number;
  /** True when this call performed the materialization. */
  readonly hydrated: boolean;
}

export interface HydratingWorkspaceOptions {
  readonly id?: string;
  /** Retrieves promised bytes when the local store lacks them. */
  readonly fetchObject?: (objectId: string) => Promise<Uint8Array>;
}

function safeRelativePath(path: string): string {
  const normalized = path.replace(/\\/gu, "/").replace(/^\.\//u, "");
  if (!normalized || normalized.startsWith("/") || normalized.includes("\0")
    || normalized.split("/").some((part) => part === ".." || part === "" || part === ".")) {
    throw new Error("Workspace path must be a non-empty relative path without traversal");
  }
  return normalized;
}

/**
 * A workspace whose manifest is complete but whose bytes arrive on first read.
 *
 * Joining a Space is cheap because of this: a participant receives the full
 * shape of the tree immediately and pays for content only where they actually
 * look. That is residency, not copy-on-write, and the distinction is the whole
 * point of ADR-0043 §2.
 */
export class HydratingWorkspaceProvider implements WorkspaceProvider {
  readonly id: string;
  readonly root: string;
  readonly capabilities: Readonly<Record<WorkspaceCapabilityName, WorkspaceCapability>>;
  readonly #store: ObjectStore;
  readonly #entries = new Map<string, HydrationEntry>();
  readonly #materialized = new Set<string>();
  readonly #fetchObject: ((objectId: string) => Promise<Uint8Array>) | undefined;

  constructor(root: string, store: ObjectStore, entries: readonly HydrationEntry[], options: HydratingWorkspaceOptions = {}) {
    this.root = resolve(root);
    this.id = options.id ?? "hydrating";
    this.#store = store;
    this.#fetchObject = options.fetchObject;
    for (const entry of entries) {
      const path = safeRelativePath(entry.path);
      validateObjectId(entry.objectId);
      this.#entries.set(path, { ...entry, path });
    }
    this.capabilities = Object.freeze({
      read: supported("hydrate-on-read"),
      write: supported("filesystem"),
      remove: supported("filesystem"),
      watch: unsupported("hydrating workspace does not implement change observation"),
      reflink: unsupported("reflink is provided by the filesystem workspace, not the hydration layer"),
      // Stated plainly: hydration materializes bytes, it does not confine execution.
      execute: unsupported("hydrating workspace does not execute workspace code"),
      persistent: supported("filesystem"),
    });
  }

  /** Every path the workspace describes, hydrated or not. */
  manifest(): readonly HydrationEntry[] {
    return [...this.#entries.values()].sort((left, right) => left.path.localeCompare(right.path));
  }

  status(path: string): HydrationStatus {
    return this.#materialized.has(safeRelativePath(path)) ? "materialized" : "virtual";
  }

  /** Paths still described only by the manifest. */
  virtualPaths(): readonly string[] {
    return this.manifest().filter((entry) => !this.#materialized.has(entry.path)).map((entry) => entry.path);
  }

  /**
   * Read a path, materializing it first if it is still virtual.
   *
   * Bytes are verified against the manifest's object ID before they are
   * written, so a hydration source can supply content but never decide it.
   */
  async read(path: string): Promise<Buffer> {
    const key = safeRelativePath(path);
    const entry = this.#entries.get(key);
    if (entry === undefined) throw new Error(`Workspace path not found: ${path}`);
    await this.hydrate(key);
    const { readFile } = await import("node:fs/promises");
    return await readFile(join(this.root, key));
  }

  async write(path: string, bytes: Uint8Array): Promise<void> {
    requireWorkspaceCapability(this, "write");
    const key = safeRelativePath(path);
    const target = join(this.root, key);
    await mkdir(dirname(target), { recursive: true });
    const { writeFile } = await import("node:fs/promises");
    await writeFile(target, bytes);
    const objectId = objectIdFor(bytes);
    await this.#store.put(objectId, bytes);
    this.#entries.set(key, { path: key, objectId, size: bytes.byteLength });
    this.#materialized.add(key);
  }

  async remove(path: string): Promise<void> {
    requireWorkspaceCapability(this, "remove");
    const key = safeRelativePath(path);
    const target = join(this.root, key);
    if (target === this.root) throw new Error("Refusing to remove workspace provider root");
    await rm(target, { recursive: true, force: true });
    for (const candidate of [...this.#entries.keys()]) {
      if (candidate === key || candidate.startsWith(`${key}/`)) {
        this.#entries.delete(candidate);
        this.#materialized.delete(candidate);
      }
    }
  }

  /**
   * Materialize one path. Idempotent: an already-hydrated path reports
   * `hydrated: false` rather than re-fetching.
   */
  async hydrate(path: string): Promise<HydrationReport> {
    const key = safeRelativePath(path);
    const entry = this.#entries.get(key);
    if (entry === undefined) throw new Error(`Workspace path not found: ${path}`);
    const target = join(this.root, key);
    if (this.#materialized.has(key) && await exists(target)) {
      return { path: key, objectId: entry.objectId, status: "materialized", bytes: entry.size, hydrated: false };
    }
    let bytes = await this.#store.get(entry.objectId);
    if (bytes === undefined) {
      if (this.#fetchObject === undefined) {
        throw new Error(`Object is promised but absent and no source is configured: ${entry.objectId}`);
      }
      const fetched = Buffer.from(await this.#fetchObject(entry.objectId));
      // Verify before trusting: the source moves bytes, the digest decides.
      if (objectIdFor(fetched) !== entry.objectId) throw new Error(`Hydrated object hash mismatch: ${entry.objectId}`);
      await this.#store.put(entry.objectId, fetched);
      bytes = fetched;
    }
    if (bytes.byteLength !== entry.size) throw new Error(`Hydrated object size mismatch: ${entry.objectId}`);
    await mkdir(dirname(target), { recursive: true });
    const { writeFile } = await import("node:fs/promises");
    await writeFile(target, bytes);
    this.#materialized.add(key);
    return { path: key, objectId: entry.objectId, status: "materialized", bytes: entry.size, hydrated: true };
  }

  /** Materialize everything — the always-correct escape hatch from ADR-0014. */
  async hydrateAll(): Promise<readonly HydrationReport[]> {
    const reports: HydrationReport[] = [];
    for (const entry of this.manifest()) reports.push(await this.hydrate(entry.path));
    return reports;
  }

  /** Return a materialized path to virtual, freeing bytes but keeping the shape. */
  async dehydrate(path: string): Promise<HydrationReport> {
    const key = safeRelativePath(path);
    const entry = this.#entries.get(key);
    if (entry === undefined) throw new Error(`Workspace path not found: ${path}`);
    await rm(join(this.root, key), { force: true });
    this.#materialized.delete(key);
    return { path: key, objectId: entry.objectId, status: "virtual", bytes: entry.size, hydrated: false };
  }
}

async function exists(path: string): Promise<boolean> {
  try { await stat(path); return true; } catch { return false; }
}

export interface ReflinkProbe {
  readonly supported: boolean;
  readonly mode: string;
  readonly reason?: string;
}

/**
 * Probe reflink support by performing one.
 *
 * `FileSystemWorkspaceProvider` previously took reflink support as a
 * constructor flag, which meant the capability report repeated whatever the
 * caller asserted. This performs a real `FICLONE` copy in the target directory
 * and reports what the filesystem actually did.
 */
export async function probeReflink(directory: string): Promise<ReflinkProbe> {
  let scratch: string | undefined;
  try {
    scratch = await mkdtemp(join(resolve(directory), ".epoch-reflink-"));
    const source = join(scratch, "source");
    const clone = join(scratch, "clone");
    const { writeFile } = await import("node:fs/promises");
    await writeFile(source, "epoch-reflink-probe");
    await copyFile(source, clone, constants.COPYFILE_FICLONE_FORCE);
    await unlink(clone);
    return { supported: true, mode: "copyfile-ficlone" };
  } catch (error) {
    return {
      supported: false, mode: "copy",
      // SAFETY: Runtime checks or construction above establish Error).message.slice(0.
      reason: `filesystem refused a reflink clone: ${(error as Error).message.slice(0, 200)}`,
    };
  } finally {
    if (scratch !== undefined) await rm(scratch, { recursive: true, force: true });
  }
}

/** Probe against the OS temp directory when no workspace root is available yet. */
export async function probeReflinkDefault(): Promise<ReflinkProbe> {
  return await probeReflink(tmpdir());
}
