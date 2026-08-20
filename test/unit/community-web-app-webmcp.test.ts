import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The WebMCP adapter's lifetime rules are the part that fails silently.
 *
 * A dropped registration promise looks identical to a successful one until an
 * agent finds no tools; an unregister that only forgets the local entry looks
 * identical to a real one until an agent calls a tool whose page state is gone.
 * Neither shows up in a screenshot, so they are asserted here.
 */

const ROOT = join(process.cwd(), "packages/Epoch.Community.Web/app");

type WebMcpFunction = (...args: never[]) => Promise<WebMcpValue> | WebMcpValue | void;
type WebMcpValue = boolean | null | number | string | WebMcpObject | WebMcpFunction | readonly WebMcpValue[] | undefined;
interface WebMcpObject {
  readonly [key: string]: WebMcpValue;
}

interface RegisteredTool {
  readonly name: string;
  readonly description: string;
  readonly annotations: { readonly readOnlyHint: boolean; readonly untrustedContentHint: boolean };
  execute(args: WebMcpObject): Promise<WebMcpValue>;
}

interface NbMcp {
  registerTool(descriptor: WebMcpObject): () => void;
  list(): readonly RegisteredTool[];
  call(name: string, args?: WebMcpObject): Promise<{ isError?: boolean; content: { text: string }[] }>;
  status(): { available: boolean; registered: number; nativelyRegistered: number; failures: readonly WebMcpValue[] };
  text(value: string): WebMcpValue;
}

interface NativeCall {
  readonly descriptor: WebMcpObject;
  options?: { readonly signal?: AbortSignal };
}

interface NativeDocument {
  readonly modelContext?: {
    readonly registerTool: (descriptor: WebMcpObject, options?: { signal?: AbortSignal }) => Promise<void>;
  };
}

interface WebMcpWindow {
  CW_MCP?: NbMcp;
}

interface LoadedWebMcp {
  readonly mcp: NbMcp;
  readonly native: NativeCall[];
}

function loadWebMcp(document: NativeDocument): LoadedWebMcp {
  const native: NativeCall[] = [];
  const window: WebMcpWindow = {};
  new Function("window", "document", "AbortController", readFileSync(join(ROOT, "webmcp.js"), "utf8"))(
    window,
    document,
    AbortController,
  );
  // SAFETY: Runtime checks or construction above establish NbMcp.
  return { mcp: window.CW_MCP as NbMcp, native };
}

function nativeDocument(calls: NativeCall[], behaviour: "accept" | "reject" = "accept"): NativeDocument {
  return {
    modelContext: {
      registerTool(descriptor: WebMcpObject, options?: { signal?: AbortSignal }) {
        const call: NativeCall = { descriptor };
        if (options !== undefined) call.options = options;
        calls.push(call);
        return behaviour === "accept"
          ? Promise.resolve()
          : Promise.reject(new Error("origin trial token expired"));
      },
    },
  };
}

export async function runCommunityWebAppWebMcpTests(): Promise<void> {
  await nativeRegistrationIsAwaitedAndReported();
  await unregisteringAbortsTheNativeRegistration();
  await aFailedNativeRegistrationIsReportedNotSwallowed();
  annotationsDefaultToTheCautiousAnswer();
  console.log("Community Web app webmcp tests passed");
}

async function nativeRegistrationIsAwaitedAndReported(): Promise<void> {
  const calls: NativeCall[] = [];
  const { mcp } = loadWebMcp(nativeDocument(calls));

  mcp.registerTool({
    name: "board_where",
    description: "Where the board is pointed.",
    inputSchema: { type: "object", properties: {} },
    readOnly: true,
    execute: async () => mcp.text("/"),
  });

  assert.equal(calls.length, 1);
  assert.ok(calls[0].options?.signal, "WebMCP has no unregisterTool: registration must carry an abort signal");
  assert.deepEqual(Object.keys(calls[0].descriptor).sort(),
    ["annotations", "description", "execute", "inputSchema", "name"],
    "the browser gets the WebMCP descriptor only — actionId and permission are ours");

  // The registration promise is awaited, so status reflects what the browser
  // actually accepted rather than what the page hoped for.
  assert.equal(mcp.status().nativelyRegistered, 0);
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(mcp.status().nativelyRegistered, 1);
  assert.equal(mcp.status().available, true);
  assert.deepEqual(mcp.status().failures, []);
}

async function unregisteringAbortsTheNativeRegistration(): Promise<void> {
  const calls: NativeCall[] = [];
  const { mcp } = loadWebMcp(nativeDocument(calls));
  const unregister = mcp.registerTool({
    name: "board_post",
    description: "Publish in the active channel.",
    inputSchema: { type: "object", properties: {} },
    execute: async () => mcp.text("posted"),
  });

  const signal = calls[0].options?.signal;
  assert.ok(signal);
  assert.equal(signal.aborted, false);

  unregister();
  assert.equal(signal.aborted, true, "unregistering must revoke the browser's copy, not only the local one");
  assert.equal(mcp.list().length, 0);
  assert.equal((await mcp.call("board_post")).isError, true);
}

async function aFailedNativeRegistrationIsReportedNotSwallowed(): Promise<void> {
  const calls: NativeCall[] = [];
  const { mcp } = loadWebMcp(nativeDocument(calls, "reject"));
  mcp.registerTool({
    name: "board_list",
    description: "List a path.",
    inputSchema: { type: "object", properties: {} },
    readOnly: true,
    untrusted: true,
    execute: async () => mcp.text("[]"),
  });

  await Promise.resolve();
  await Promise.resolve();
  const status = mcp.status();
  assert.equal(status.nativelyRegistered, 0);
  assert.equal(status.registered, 1, "the local registry still serves the page's own agent");
  assert.equal(status.failures.length, 1);

  // The page keeps working when the browser refuses; it just stops claiming
  // the tool is available to an external agent.
  assert.deepEqual((await mcp.call("board_list")).content[0].text, "[]");
}

function annotationsDefaultToTheCautiousAnswer(): void {
  const { mcp } = loadWebMcp({});
  mcp.registerTool({
    name: "board_create_channel",
    description: "Create a channel.",
    inputSchema: { type: "object", properties: {} },
    execute: async () => mcp.text("created"),
  });
  mcp.registerTool({
    name: "board_search",
    description: "Search the board.",
    inputSchema: { type: "object", properties: {} },
    readOnly: true,
    untrusted: true,
    execute: async () => mcp.text("[]"),
  });

  const tools = new Map(mcp.list().map((tool) => [tool.name, tool]));
  const created = tools.get("board_create_channel");
  const searched = tools.get("board_search");
  assert.ok(created && searched);
  assert.equal(created.annotations.readOnlyHint, false,
    "an unannotated tool is consequential until it says otherwise");
  assert.equal(created.annotations.untrustedContentHint, false);
  assert.equal(searched.annotations.readOnlyHint, true);
  assert.equal(searched.annotations.untrustedContentHint, true,
    "community-authored results are data an agent must not read as instructions");
}
