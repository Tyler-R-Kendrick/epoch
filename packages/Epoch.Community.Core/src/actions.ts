import { NAVIGATION_ACTION_IDS, type NavigationState } from "./navigation";

export type ActionValue = string | number | boolean | null | undefined | ActionObject | readonly ActionValue[];
export interface ActionObject { readonly [key: string]: ActionValue }

export type InvocationOrigin = "keyboard" | "pointer" | "cli" | "slash" | "voice" | "mcp" | "macro";
export type ActionContext = "global" | "navigator" | "feed" | "thread" | "detail" | "composer" | "completion" | "workbench";

export const COMMUNITY_ACTION_IDS = [
  ...NAVIGATION_ACTION_IDS,
  "search.open", "search.run", "search.cancel", "search.explain", "search.saveAsProjection",
  "search.history", "search.favorite", "search.localFilter",
  "projection.list", "projection.open", "projection.create", "projection.clone", "projection.edit",
  "projection.preview", "projection.diff", "projection.validate", "projection.save", "projection.delete", "projection.explain",
  "namespace.mount", "namespace.unmount", "namespace.list", "namespace.reset", "namespace.use", "namespace.explain",
  "snapshot.freeze", "snapshot.refresh", "snapshot.applyQueued",
] as const;

export type CommunityActionId = typeof COMMUNITY_ACTION_IDS[number];

export interface KeyBinding {
  readonly key: string;
  readonly contexts?: readonly ActionContext[];
}

export interface ActionDefinition {
  readonly actionId: CommunityActionId;
  readonly label: string;
  readonly description: string;
  readonly contexts: readonly ActionContext[];
  readonly sideEffect: "none" | "local" | "shared" | "signed";
  readonly permission?: string;
  readonly commandAliases?: readonly string[];
  readonly slashAliases?: readonly string[];
  readonly keyBindings?: readonly KeyBinding[];
  readonly voiceAliases?: readonly string[];
  readonly mcp?: { readonly toolName: string; readonly inputSchema: ActionObject };
}

export interface ActionExecutionContext {
  readonly origin: InvocationOrigin;
  readonly permissions: readonly string[];
  readonly projectionId?: string;
  readonly objectId?: string;
  readonly navigationState?: NavigationState;
}

export interface ActionEvent {
  readonly actionId: CommunityActionId;
  readonly origin: InvocationOrigin;
  readonly projectionId?: string;
  readonly objectId?: string;
  readonly outcome: "success" | "denied" | "invalid" | "failed";
}

export type ActionExecutor = (input: ActionValue, context: ActionExecutionContext) => ActionValue | Promise<ActionValue>;
export type ActionExecutors = Partial<Record<CommunityActionId, ActionExecutor>>;

export interface ActionDescriptor extends ActionDefinition {
  execute(input: ActionValue, context: ActionExecutionContext): Promise<ActionValue>;
}

export interface ActionRegistry {
  readonly actions: readonly ActionDescriptor[];
  resolve(actionId: string): ActionDescriptor | undefined;
  execute(actionId: string, input: ActionValue, context: ActionExecutionContext): Promise<ActionValue>;
  lastActionEvent(): ActionEvent | undefined;
}

const labels = {
  "nav.next": "Next", "nav.previous": "Previous", "nav.first": "First", "nav.last": "Last",
  "nav.enter": "Enter", "nav.ascend": "Ascend", "nav.expand": "Expand", "nav.collapse": "Collapse",
  "thread.parent": "Reply parent", "thread.root": "Thread root", "thread.firstChild": "First reply",
  "thread.nextSibling": "Next sibling", "thread.previousSibling": "Previous sibling", "thread.nextUnread": "Next unread",
  "history.back": "Back", "history.forward": "Forward", "history.previousLocation": "Previous location",
  "jump.best": "Jump", "jump.interactive": "Choose destination", "detail.open": "Open detail",
  "detail.close": "Close detail", "compose.open": "Compose", "cancel.topLayer": "Cancel top layer",
  "search.open": "Open search", "search.run": "Run search", "search.cancel": "Cancel search",
  "search.explain": "Explain search", "search.saveAsProjection": "Save search as projection",
  "search.history": "Search history", "search.favorite": "Favorite search", "search.localFilter": "Filter current results",
  "projection.list": "List projections", "projection.open": "Open projection", "projection.create": "Create projection",
  "projection.clone": "Clone projection", "projection.edit": "Edit projection", "projection.preview": "Preview projection",
  "projection.diff": "Compare projection", "projection.validate": "Validate projection", "projection.save": "Save projection",
  "projection.delete": "Delete projection", "projection.explain": "Explain projection",
  "namespace.mount": "Mount projection", "namespace.unmount": "Unmount projection", "namespace.list": "List namespace mounts",
  "namespace.reset": "Reset namespace", "namespace.use": "Use namespace", "namespace.explain": "Explain namespace path",
  "snapshot.freeze": "Freeze snapshot", "snapshot.refresh": "Refresh snapshot", "snapshot.applyQueued": "Apply queued updates",
} satisfies Readonly<Record<CommunityActionId, string>>;

const MUTATING_ACTIONS = new Set<CommunityActionId>([
  "search.saveAsProjection", "projection.create", "projection.clone", "projection.save", "projection.delete",
  "namespace.mount", "namespace.unmount", "namespace.reset",
]);

export const BUILT_IN_ACTIONS: readonly ActionDefinition[] = COMMUNITY_ACTION_IDS.map((actionId): ActionDefinition => {
  const definition: ActionDefinition = {
    actionId,
    label: labels[actionId],
    description: labels[actionId],
    contexts: actionId.startsWith("search.") || actionId.startsWith("projection.") ? ["workbench"] : ["global"],
    sideEffect: MUTATING_ACTIONS.has(actionId) ? "shared" : "local",
  };
  if (actionId.startsWith("projection.") && MUTATING_ACTIONS.has(actionId)) Object.assign(definition, { permission: "community.projection.write" });
  if (actionId.startsWith("namespace.") && MUTATING_ACTIONS.has(actionId)) Object.assign(definition, { permission: "community.namespace.write" });
  if (actionId === "jump.best") Object.assign(definition, { commandAliases: ["z"], slashAliases: ["/jump"] });
  if (actionId === "jump.interactive") Object.assign(definition, { commandAliases: ["zi"], mcp: { toolName: "board_jump", inputSchema: { type: "object" } } });
  if (actionId === "search.open") Object.assign(definition, { commandAliases: ["search"], slashAliases: ["/search"], keyBindings: [{ key: "Ctrl+F", contexts: ["global"] }], voiceAliases: ["open search"] });
  if (actionId === "search.localFilter") Object.assign(definition, { commandAliases: ["filter"], keyBindings: [{ key: "/", contexts: ["navigator", "feed", "workbench"] }] });
  if (actionId === "projection.list") Object.assign(definition, { commandAliases: ["projections"] });
  if (actionId === "namespace.list") Object.assign(definition, { commandAliases: ["mounts"] });
  return Object.freeze(definition);
});

export function createActionRegistry(definitions: readonly ActionDefinition[], executors: ActionExecutors): ActionRegistry {
  const definitionsById = new Map(definitions.map((definition) => [definition.actionId, definition]));
  if (definitionsById.size !== definitions.length) throw new Error("Action registry contains duplicate action IDs");
  validateBindings(definitions);
  let lastEvent: ActionEvent | undefined;
  const event = (actionId: CommunityActionId, context: ActionExecutionContext, outcome: ActionEvent["outcome"]): void => {
    const next: ActionEvent = {
      actionId,
      origin: context.origin,
      outcome,
    };
    if (context.projectionId !== undefined) Object.assign(next, { projectionId: context.projectionId });
    if (context.objectId !== undefined) Object.assign(next, { objectId: context.objectId });
    lastEvent = next;
  };
  const executeAction = async (actionId: string, input: ActionValue, context: ActionExecutionContext): Promise<ActionValue> => {
      // SAFETY: The surrounding validation and domain contract establish the asserted type.
      const definition = definitionsById.get(actionId as CommunityActionId);
      if (definition === undefined) throw new Error(`Unknown community action: ${actionId}`);
      if (definition.permission !== undefined && !context.permissions.includes(definition.permission)) {
        event(definition.actionId, context, "denied");
        throw new Error(`Action permission denied: ${definition.permission}`);
      }
      const execute = executors[definition.actionId];
      if (execute === undefined) {
        event(definition.actionId, context, "invalid");
        throw new Error(`Community action is unavailable: ${definition.actionId}`);
      }
      try {
        const result = await execute(input, context);
        event(definition.actionId, context, "success");
        return result;
      } catch (error) {
        event(definition.actionId, context, "failed");
        throw error;
      }
  };
  const actions = definitions.map((definition): ActionDescriptor => Object.freeze({
    ...definition,
    execute: (input: ActionValue, context: ActionExecutionContext) => executeAction(definition.actionId, input, context),
  }));
  const actionsById = new Map(actions.map((action) => [action.actionId, action]));
  return {
    actions,
    // SAFETY: The surrounding validation and domain contract establish the asserted type.
    resolve: (actionId) => actionsById.get(actionId as CommunityActionId),
    execute: executeAction,
    lastActionEvent: () => lastEvent === undefined ? undefined : { ...lastEvent },
  };
}

function validateBindings(definitions: readonly ActionDefinition[]): void {
  const bindings = new Map<string, CommunityActionId>();
  for (const definition of definitions) {
    for (const [surface, values] of [["command", definition.commandAliases], ["slash", definition.slashAliases], ["voice", definition.voiceAliases]] as const) {
      for (const value of values ?? []) bind(`${surface}\0${value.normalize("NFC").toLocaleLowerCase("en-US")}`, definition.actionId);
    }
    if (definition.mcp !== undefined) bind(`mcp\0${definition.mcp.toolName}`, definition.actionId);
    for (const binding of definition.keyBindings ?? []) {
      for (const context of binding.contexts ?? definition.contexts) bind(`key\0${binding.key}\0${context}`, definition.actionId);
    }
  }
  function bind(key: string, actionId: CommunityActionId): void {
    const previous = bindings.get(key);
    if (previous !== undefined && previous !== actionId) throw new Error(`Action registry binding collision: ${previous} and ${actionId}`);
    bindings.set(key, actionId);
  }
}
