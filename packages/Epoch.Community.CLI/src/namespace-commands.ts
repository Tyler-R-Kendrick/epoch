import {
  CommunityError,
  type CommunityActionId,
  type NamespaceMount,
  type NamespaceMountMode,
  type NamespacePage,
  type NamespaceResetResult,
  type NamespaceScope,
  type ProjectionExplanation,
} from "@epoch/community-core";
import {
  failure,
  assertAllowedOptions,
  integerOption,
  invalidInput,
  optionalString,
  parseCliArguments,
  success,
  type CommunityCliCommandResult,
} from "./query-commands";

export const NAMESPACE_CLI_COMMANDS: readonly {
  readonly command: string;
  readonly actionId: CommunityActionId;
  readonly usage: string;
}[] = Object.freeze([
  { command: "namespace mounts", actionId: "namespace.list", usage: "namespace mounts [--json]" },
  { command: "namespace mount", actionId: "namespace.mount", usage: "namespace mount PROJECTION PATH --mode MODE --scope SCOPE [--json]" },
  { command: "namespace unmount", actionId: "namespace.unmount", usage: "namespace unmount MOUNT_ID [--json]" },
  { command: "namespace reset", actionId: "namespace.reset", usage: "namespace reset --scope SCOPE [--json]" },
  { command: "namespace ls", actionId: "namespace.list", usage: "namespace ls PATH [--first N] [--after CURSOR] [--json]" },
  { command: "namespace explain", actionId: "namespace.explain", usage: "namespace explain PATH [--json]" },
]);

type MutableNamespaceScope = Exclude<NamespaceScope, "builtin" | "community">;

export interface NamespaceCommandServices {
  mounts(): Promise<readonly NamespaceMount[]>;
  mount(input: {
    readonly projectionId: string;
    readonly mountPath: string;
    readonly mode: NamespaceMountMode;
    readonly scope: MutableNamespaceScope;
  }): Promise<NamespaceMount>;
  unmount(mountId: string): Promise<boolean>;
  reset(scope: MutableNamespaceScope): Promise<NamespaceResetResult>;
  list(input: { readonly path: string; readonly first: number; readonly after?: string; readonly signal?: AbortSignal }): Promise<NamespacePage>;
  explain(input: { readonly path: string; readonly signal?: AbortSignal }): Promise<ProjectionExplanation>;
}

export async function runNamespaceCommand(
  args: readonly string[],
  services: NamespaceCommandServices,
  execution: { readonly signal?: AbortSignal } = {},
): Promise<CommunityCliCommandResult> {
  try {
    if (execution.signal?.aborted === true) throw new DOMException("Command cancelled", "AbortError");
    const parsed = parseCliArguments(args);
    const [command, ...positional] = parsed.positional;
    const json = parsed.options.json === true;
    switch (command) {
      case "mounts": {
        assertAllowedOptions(parsed, ["json"]);
        requirePositionals(positional, 0, "namespace mounts");
        const mounts = [...await services.mounts()].sort(compareMount);
        return success(json ? { schema: "epoch.community.cli.namespace-mounts.v1", mounts } : formatMounts(mounts), json);
      }
      case "mount": {
        assertAllowedOptions(parsed, ["json", "mode", "scope"]);
        requirePositionals(positional, 2, "namespace mount PROJECTION PATH --mode MODE --scope SCOPE");
        const mode = mountMode(optionalString(parsed, "mode"));
        const scope = mutableScope(optionalString(parsed, "scope"));
        const mount = await services.mount({ projectionId: positional[0]!, mountPath: positional[1]!, mode, scope });
        return success(json ? { schema: "epoch.community.cli.namespace-mount.v1", mount } : formatMounts([mount]), json);
      }
      case "unmount": {
        assertAllowedOptions(parsed, ["json"]);
        requirePositionals(positional, 1, "namespace unmount MOUNT_ID");
        const removed = await services.unmount(positional[0]!);
        return success(json ? { schema: "epoch.community.cli.namespace-unmount.v1", mountId: positional[0], removed } : `${positional[0]}\t${removed ? "unmounted" : "not-found"}\n`, json);
      }
      case "reset": {
        assertAllowedOptions(parsed, ["json", "scope"]);
        requirePositionals(positional, 0, "namespace reset --scope SCOPE");
        const scope = mutableScope(optionalString(parsed, "scope"));
        const reset = await services.reset(scope);
        return success(json ? { schema: "epoch.community.cli.namespace-reset.v1", reset } : `${scope}\tremoved:${reset.removedMountIds.join(",") || "none"}\n`, json);
      }
      case "ls": {
        assertAllowedOptions(parsed, ["json", "first", "after"]);
        requirePositionals(positional, 1, "namespace ls PATH");
        const first = integerOption(parsed, "first", 50, 1, 1000);
        const after = optionalString(parsed, "after");
        const page = await services.list({ path: positional[0]!, first, ...(!(after === undefined) && { after }), ...(!(execution.signal === undefined) && { signal: execution.signal }) });
        const envelope = { schema: "epoch.community.cli.namespace-list.v1", path: positional[0], entries: page.entries, pageInfo: page.pageInfo, freshness: page.freshness, shadowed: page.shadowed, componentOrder: page.componentOrder };
        return success(json ? envelope : formatPage(page), json);
      }
      case "explain": {
        assertAllowedOptions(parsed, ["json"]);
        requirePositionals(positional, 1, "namespace explain PATH");
        const explanation = await services.explain({ path: positional[0]!, ...(!(execution.signal === undefined) && { signal: execution.signal }) });
        return success(json ? explanation : `${explanation.path}\t${explanation.detail}\ncomponents\t${explanation.componentOrder.join(",") || "none"}\n`, json);
      }
      default: throw invalidInput("Unknown namespace command");
    }
  } catch (error) {
    return failure(error);
  }
}

function mountMode(value: string | undefined): NamespaceMountMode {
  if (value === "replace" || value === "before" || value === "after") return value;
  throw new CommunityError("NAMESPACE_MOUNT_CONFLICT", "Namespace mount mode must be replace, before, or after");
}

function mutableScope(value: string | undefined): MutableNamespaceScope {
  if (value === "user" || value === "workspace" || value === "session") return value;
  throw new CommunityError("NAMESPACE_RECOVERY_PROTECTED", "Only user, workspace, and session namespace scopes may be changed");
}

function formatMounts(mounts: readonly NamespaceMount[]): string {
  return `${mounts.map((mount) => `${mount.mountId}\t${mount.scope}\t${mount.mode}\t${mount.mountPath}\t${mount.projectionId}${mount.writable ? "\twritable" : ""}`).join("\n")}\n`;
}

function formatPage(page: NamespacePage): string {
  const entries = page.entries.map((entry) => `${entry.logicalPath}\t${entry.kind}\t${entry.target.objectId}`);
  entries.push(`freshness\t${page.freshness.status}`);
  if (page.pageInfo.endCursor !== undefined) entries.push(`cursor\t${page.pageInfo.endCursor}`);
  return `${entries.join("\n")}\n`;
}

function compareMount(left: NamespaceMount, right: NamespaceMount): number {
  return left.scope.localeCompare(right.scope, "en") || left.order - right.order || left.mountId.localeCompare(right.mountId, "en");
}

function requirePositionals(values: readonly string[], expected: number, usage: string): void {
  if (values.length !== expected) throw invalidInput(`Usage: epoch-community ${usage}`);
}
