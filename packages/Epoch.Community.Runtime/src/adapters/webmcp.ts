import type { CommunityRuntime } from "../runtime";
import type { EpochCommandDescriptor, JsonSchema } from "../commands";
import type { EpochCommandReceipt } from "../receipts";
type DictionaryValue = null | undefined | boolean | number | string | bigint | readonly DictionaryValue[] | { readonly [key: string]: DictionaryValue };


/**
 * WebMCP adapter.
 *
 * Tools are a projection of the command catalog, never a second implementation:
 * an agent can do exactly what a person can do through the same bus, with the
 * same capability checks and the same receipt. Three consequences are
 * deliberate:
 *
 *  - `registerTool` is awaited. It returns a promise in Chrome's imperative API,
 *    and a floating registration silently drops tools when it rejects.
 *  - Unregistration is an `AbortSignal` passed in the options argument. WebMCP
 *    has no `unregisterTool`, so a tool whose page state is gone stays callable
 *    unless the signal aborts.
 *  - Results are compact. A tool returns identifiers and a one-line summary so
 *    an agent can follow up through another command, rather than a wall of
 *    page content it might mistake for instructions.
 *
 * `untrustedContentHint` is set from the command descriptor because community
 * text — posts, issue bodies, review comments — is a prompt-injection channel,
 * and an agent needs to be told which results are data rather than direction.
 */
export interface WebMcpToolAnnotations {
  readonly readOnlyHint: boolean;
  readonly untrustedContentHint: boolean;
}

export interface WebMcpToolDescriptor {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: JsonSchema;
  readonly annotations: WebMcpToolAnnotations;
  execute(input: Readonly<Record<string, DictionaryValue>>): Promise<string>;
}

export interface WebMcpRegistrationOptions {
  readonly signal?: { readonly aborted: boolean };
}

export interface WebMcpModelContext {
  registerTool(
    descriptor: WebMcpToolDescriptor,
    options?: WebMcpRegistrationOptions,
  ): void | Promise<void>;
}

export interface CreateWebMcpToolsOptions {
  /**
   * Commands whose confirmation requirement the host has satisfied through a
   * real user interaction. Anything not listed stays unconfirmed, so a merge or
   * a publish comes back as `confirm` rather than silently happening because an
   * agent asked.
   */
  readonly confirmedKinds?: readonly string[];
  readonly source?: "webmcp";
}

export function createWebMcpTools(
  runtime: CommunityRuntime,
  options: CreateWebMcpToolsOptions = {},
): readonly WebMcpToolDescriptor[] {
  const confirmed = new Set(options.confirmedKinds ?? []);
  return runtime.commands.catalog.map((descriptor) => ({
    name: toolName(descriptor.kind),
    description: descriptor.summary,
    inputSchema: descriptor.inputSchema,
    annotations: {
      readOnlyHint: descriptor.readOnly,
      untrustedContentHint: descriptor.untrustedContent,
    },
    execute: async (input) => {
      const receipt = await runtime.commands.execute({
        kind: descriptor.kind,
        input,
        source: options.source ?? "webmcp",
        confirmed: confirmed.has(descriptor.kind),
      });
      return summarizeReceipt(receipt);
    },
  }));
}

/**
 * Register every tool with the browser and return a disposer. The caller aborts
 * when the route, identity, or capability set changes; nothing else can revoke
 * a registration.
 */
export async function registerWebMcpTools(
  context: WebMcpModelContext,
  tools: readonly WebMcpToolDescriptor[],
  options: WebMcpRegistrationOptions = {},
): Promise<readonly string[]> {
  const registered: string[] = [];
  for (const tool of tools) {
    await context.registerTool(tool, options);
    registered.push(tool.name);
  }

  return registered;
}

export function toolName(kind: string): string {
  return `epoch_${kind.replace(/\./gu, "_").replace(/([a-z0-9])([A-Z])/gu, "$1_$2").toLowerCase()}`;
}

export function summarizeReceipt(receipt: EpochCommandReceipt): string {
  return JSON.stringify({
    commandId: receipt.commandId,
    kind: receipt.kind,
    decision: receipt.policy.decision,
    confirmationRequired: receipt.confirmation.required && !receipt.confirmation.granted,
    validation: receipt.validation.state,
    ...(!(receipt.baseRef === undefined) && { baseRef: receipt.baseRef }),
    ...(!(receipt.proposalRef === undefined) && { proposalRef: receipt.proposalRef }),
    eventIds: receipt.eventIds,
    data: receipt.data,
  });
}

export function describeCatalog(runtime: CommunityRuntime): readonly EpochCommandDescriptor[] {
  return runtime.commands.catalog;
}
