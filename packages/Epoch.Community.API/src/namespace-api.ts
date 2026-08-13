import {
  CommunityError,
  authorizationFingerprint,
  normalizeVirtualPath,
  validateObjectRef,
  type CommunityAuthorizationContext,
  type CommunityObjectRef,
  type CommunityRuntimeContext,
  type NamespaceMount,
  type NamespaceRuntime,
  type NamespaceScope,
  type PageRequest,
  type ProjectionDelta,
  type ProjectionExplanation,
  type VfsEntry,
  type VfsPage,
} from "@epoch/community-core";
import type { CommunityStateStore } from "./store";

type ResettableScope = Exclude<NamespaceScope, "builtin" | "community">;
export type NamespaceListResult = VfsPage & { readonly shadowed?: readonly unknown[]; readonly componentOrder?: readonly string[] };

export interface CommunityNamespaceApi {
  context(authorization: CommunityAuthorizationContext, snapshot?: string): Promise<{ readonly authorizationFingerprint: string; readonly snapshotId: string }>;
  list(path: string, page: PageRequest, authorization: CommunityAuthorizationContext, snapshot?: string): Promise<NamespaceListResult>;
  resolve(path: string, authorization: CommunityAuthorizationContext, snapshot?: string): Promise<VfsEntry | undefined>;
  locate(target: CommunityObjectRef, authorization: CommunityAuthorizationContext, snapshot?: string): Promise<readonly VfsEntry[]>;
  explain(path: string, authorization: CommunityAuthorizationContext, snapshot?: string): Promise<ProjectionExplanation>;
  watch(path: string, authorization: CommunityAuthorizationContext, signal: AbortSignal, snapshot?: string): AsyncIterable<ProjectionDelta>;
  mounts(authorization: CommunityAuthorizationContext): Promise<readonly NamespaceMount[]>;
  mount(input: Omit<NamespaceMount, "createdAt" | "updatedAt" | "ownerId">, authorization: CommunityAuthorizationContext): Promise<NamespaceMount>;
  unmount(mountId: string, authorization: CommunityAuthorizationContext): Promise<boolean>;
  reset(scope: NamespaceScope, authorization: CommunityAuthorizationContext): Promise<ReturnType<NamespaceRuntime["reset"]>>;
}

export function createCommunityNamespaceApi(input: {
  readonly store: CommunityStateStore;
  readonly runtime: CommunityRuntimeContext;
  readonly namespaceRuntime: NamespaceRuntime;
}): CommunityNamespaceApi {
  const execution = async (authorization: CommunityAuthorizationContext, snapshot?: string) => ({ authorizationFingerprint: await authorizationFingerprint(authorization), snapshotId: snapshot ?? input.runtime.nextId("snapshot") });
  const api: CommunityNamespaceApi = {
    context: execution,
    async list(path, page, authorization, snapshot) {
      validatePage(page);
      return input.namespaceRuntime.list(normalizeVirtualPath(path), page, await execution(authorization, snapshot));
    },
    async resolve(path, authorization, snapshot) { return input.namespaceRuntime.resolve(normalizeVirtualPath(path), await execution(authorization, snapshot)); },
    async locate(target, authorization, snapshot) { return input.namespaceRuntime.locate(validateObjectRef(target), await execution(authorization, snapshot)); },
    async explain(path, authorization, snapshot) { return input.namespaceRuntime.explain(normalizeVirtualPath(path), await execution(authorization, snapshot)); },
    async *watch(path, authorization, signal, snapshot) {
      if (signal.aborted) return;
      yield* input.namespaceRuntime.watch(normalizeVirtualPath(path), { ...await execution(authorization, snapshot), signal });
    },
    async mounts(authorization) {
      return Object.freeze(input.namespaceRuntime.mounts().filter((mount) => mount.scope === "builtin" || mount.scope === "community" || mount.ownerId === authorization.actorId));
    },
    async mount(value, authorization) {
      if (authorization.actorId === undefined) throw denied();
      if (value.scope === "builtin" || value.scope === "community") throw new CommunityError("NAMESPACE_RECOVERY_PROTECTED", "Builtin and community mounts require operator configuration");
      const now = input.runtime.now();
      const mount: NamespaceMount = { ...value, mountPath: normalizeVirtualPath(value.mountPath), ownerId: authorization.actorId, createdAt: now, updatedAt: now };
      input.namespaceRuntime.mount(mount);
      try { await input.store.write((transaction) => transaction.putMount(mount)); }
      catch (error) { input.namespaceRuntime.unmount(mount.mountId); throw error; }
      return mount;
    },
    async unmount(mountId, authorization) {
      const previous = await input.store.read((state) => state.mount(mountId));
      if (previous === undefined) return false;
      if (previous.ownerId !== authorization.actorId) throw denied();
      input.namespaceRuntime.unmount(mountId);
      try { await input.store.write((transaction) => transaction.deleteMount(mountId)); }
      catch (error) { input.namespaceRuntime.mount(previous); throw error; }
      return true;
    },
    async reset(scope, authorization) {
      if (scope === "builtin" || scope === "community") throw new CommunityError("NAMESPACE_RECOVERY_PROTECTED", `Namespace scope cannot be reset: ${scope}`);
      requireScopeOwner(scope, authorization);
      const previous = input.namespaceRuntime.mounts().filter((mount) => mount.scope === scope);
      const reset = input.namespaceRuntime.reset(scope as ResettableScope);
      try { await input.store.write((transaction) => { for (const mountId of reset.removedMountIds) transaction.deleteMount(mountId); }); }
      catch (error) { for (const mount of previous) input.namespaceRuntime.mount(mount); throw error; }
      return reset;
    },
  };
  return Object.freeze(api);
}

function validatePage(page: PageRequest): void {
  if (!Number.isSafeInteger(page.first) || page.first < 1 || page.first > 1000) throw new CommunityError("QUERY_COST_LIMIT", "Namespace page size must be between 1 and 1000");
}
function requireScopeOwner(scope: ResettableScope, authorization: CommunityAuthorizationContext): void {
  if (authorization.actorId === undefined) throw denied();
  if (scope === "workspace" && !authorization.permissions?.includes("object:state:write")) throw denied();
}
function denied(): CommunityError { return new CommunityError("AUTHORIZATION_DENIED", "Namespace mutation is not authorized"); }
