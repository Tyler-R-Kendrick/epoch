import type { BrowserEpoch } from "@epoch/integration-core";
type BoundaryValue = null | undefined | boolean | number | string | bigint | symbol | Readonly<object>;
type DictionaryValue = null | undefined | boolean | number | string | bigint | readonly DictionaryValue[] | { readonly [key: string]: DictionaryValue };
function __epochIsFunction<T>(value: T): value is T & ((...args: never[]) => BoundaryValue) { return typeof value === "function"; }


export interface EpochReduxAction {
  readonly type: string;
}

export interface EpochReduxStore<State> {
  getState(): State;
}

export type EpochReduxNext<Action> = (action: Action) => Action;
export type EpochReduxActionMatcher<Action extends EpochReduxAction> = readonly string[] | ((action: Action) => boolean);

export interface EpochReduxMiddlewareOptions<State, Action extends EpochReduxAction> {
  readonly epoch: BrowserEpoch;
  readonly entity: string;
  readonly source: string;
  readonly actions?: EpochReduxActionMatcher<Action>;
  readonly select: (state: State, action: Action) => BoundaryValue;
  readonly summary?: (action: Action, state: State) => string;
  readonly metadata?: (action: Action, state: State) => Record<string, DictionaryValue> | undefined;
}

export function createEpochReduxMiddleware<State, Action extends EpochReduxAction>(
  options: EpochReduxMiddlewareOptions<State, Action>,
) {
  return (store: EpochReduxStore<State>) => (next: EpochReduxNext<Action>) => (action: Action): Action => {
    const result = next(action);
    if (!matchesAction(options.actions, action)) return result;
    const state = store.getState();
    options.epoch.trackChange({
      entity: options.entity,
      surface: "redux",
      source: options.source,
      summary: options.summary?.(action, state) ?? action.type,
      payload: options.select(state, action),
      metadata: {
        actionType: action.type,
        ...options.metadata?.(action, state),
      },
    });
    return result;
  };
}

function matchesAction<Action extends EpochReduxAction>(
  matcher: EpochReduxActionMatcher<Action> | undefined,
  action: Action,
): boolean {
  if (matcher === undefined) return true;
  if (__epochIsFunction(matcher)) return matcher(action);
  return matcher.includes(action.type);
}
