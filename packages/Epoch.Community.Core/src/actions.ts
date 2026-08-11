import { NAVIGATION_ACTION_IDS, type NavigationActionId, type NavigationState } from "./navigation";

export type InvocationOrigin = "keyboard" | "pointer" | "cli" | "slash" | "voice" | "mcp" | "macro";
export type ActionContext = "global" | "navigator" | "feed" | "thread" | "detail" | "composer" | "completion";

export interface KeyBinding {
  readonly key: string;
  readonly contexts?: readonly ActionContext[];
}

export interface ActionDefinition {
  readonly actionId: NavigationActionId;
  readonly label: string;
  readonly description: string;
  readonly contexts: readonly ActionContext[];
  readonly sideEffect: "none" | "local" | "shared" | "signed";
  readonly permission?: string;
  readonly commandAliases?: readonly string[];
  readonly slashAliases?: readonly string[];
  readonly keyBindings?: readonly KeyBinding[];
  readonly voiceAliases?: readonly string[];
  readonly mcp?: { readonly toolName: string; readonly inputSchema: Record<string, unknown> };
}

export interface ActionExecutionContext {
  readonly origin: InvocationOrigin;
  readonly permissions: readonly string[];
  readonly projectionId?: string;
  readonly objectId?: string;
  readonly navigationState?: NavigationState;
}

export interface ActionEvent {
  readonly actionId: NavigationActionId;
  readonly origin: InvocationOrigin;
  readonly projectionId?: string;
  readonly objectId?: string;
  readonly outcome: "success" | "denied" | "invalid" | "failed";
}

export type ActionExecutor = (input: unknown, context: ActionExecutionContext) => unknown | Promise<unknown>;
export type ActionExecutors = Partial<Record<NavigationActionId, ActionExecutor>>;

export interface ActionDescriptor extends ActionDefinition {
  execute(input: unknown, context: ActionExecutionContext): Promise<unknown>;
}

export interface ActionRegistry {
  readonly actions: readonly ActionDescriptor[];
  resolve(actionId: string): ActionDescriptor | undefined;
  execute(actionId: string, input: unknown, context: ActionExecutionContext): Promise<unknown>;
  lastActionEvent(): ActionEvent | undefined;
}

const labels: Readonly<Record<NavigationActionId, string>> = {
  "nav.next": "Next", "nav.previous": "Previous", "nav.first": "First", "nav.last": "Last",
  "nav.enter": "Enter", "nav.ascend": "Ascend", "nav.expand": "Expand", "nav.collapse": "Collapse",
  "thread.parent": "Reply parent", "thread.root": "Thread root", "thread.firstChild": "First reply",
  "thread.nextSibling": "Next sibling", "thread.previousSibling": "Previous sibling", "thread.nextUnread": "Next unread",
  "history.back": "Back", "history.forward": "Forward", "history.previousLocation": "Previous location",
  "view.open": "Open view", "view.filter": "Filter view", "view.save": "Save view", "view.delete": "Delete view",
  "jump.best": "Jump", "jump.interactive": "Choose destination", "detail.open": "Open detail",
  "detail.close": "Close detail", "compose.open": "Compose", "cancel.topLayer": "Cancel top layer",
};

export const BUILT_IN_ACTIONS: readonly ActionDefinition[] = NAVIGATION_ACTION_IDS.map((actionId): ActionDefinition => Object.freeze({
  actionId,
  label: labels[actionId],
  description: labels[actionId],
  contexts: ["global" as const],
  sideEffect: actionId === "view.delete" ? "shared" : "local",
  ...(actionId === "view.delete" ? { permission: "community.view.delete" } : {}),
  ...(actionId === "jump.best" ? { commandAliases: ["z"], slashAliases: ["/jump"] } : {}),
  ...(actionId === "jump.interactive"
    ? { commandAliases: ["zi"], mcp: { toolName: "board_jump", inputSchema: { type: "object" } } }
    : {}),
}));

export function createActionRegistry(definitions: readonly ActionDefinition[], executors: ActionExecutors): ActionRegistry {
  const definitionsById = new Map(definitions.map((definition) => [definition.actionId, definition]));
  if (definitionsById.size !== definitions.length) throw new Error("Action registry contains duplicate action IDs");
  let lastEvent: ActionEvent | undefined;
  const event = (actionId: NavigationActionId, context: ActionExecutionContext, outcome: ActionEvent["outcome"]): void => {
    lastEvent = {
      actionId,
      origin: context.origin,
      ...(context.projectionId === undefined ? {} : { projectionId: context.projectionId }),
      ...(context.objectId === undefined ? {} : { objectId: context.objectId }),
      outcome,
    };
  };
  const executeAction = async (actionId: string, input: unknown, context: ActionExecutionContext): Promise<unknown> => {
      const definition = definitionsById.get(actionId as NavigationActionId);
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
    execute: (input: unknown, context: ActionExecutionContext) => executeAction(definition.actionId, input, context),
  }));
  const actionsById = new Map(actions.map((action) => [action.actionId, action]));
  return {
    actions,
    resolve: (actionId) => actionsById.get(actionId as NavigationActionId),
    execute: executeAction,
    lastActionEvent: () => lastEvent === undefined ? undefined : { ...lastEvent },
  };
}
