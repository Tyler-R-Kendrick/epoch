import type { LiveEvent } from "./log";
import { isRecord, stableJson } from "./util";
type BoundaryValue = null | undefined | boolean | number | string | bigint | symbol | Readonly<object>;
type DictionaryValue = null | undefined | boolean | number | string | bigint | readonly DictionaryValue[] | { readonly [key: string]: DictionaryValue };
function __epochIsNumber<T>(value: T): value is T & number { return typeof value === "number"; }
function __epochIsString<T>(value: T): value is T & string { return typeof value === "string"; }


export type LiveOp =
  | { readonly kind: "set"; readonly key: string; readonly value: unknown }
  | { readonly kind: "delete"; readonly key: string };

export type LiveTarget = "latest" | number | string;

export type LiveRollbackPayload = {
  readonly target: string;
  readonly reason: string;
  readonly previousHeads: readonly string[];
};

export type LiveOpPayload = {
  readonly op: LiveOp;
  readonly action: string;
  readonly summary: string;
};

/**
 * Materialize the latest converged state of an entity by folding its events in
 * the deterministic total order. A rollback event resets the accumulator to the
 * state at its target, after which later events reapply — so a rollback is a
 * first-class, replicated operation rather than a local rewind.
 */
export function materialize(events: readonly LiveEvent[], entity: string): Record<string, DictionaryValue> {
  const ordered = orderedForEntity(events, entity);
  return foldOrdered(ordered, ordered.length - 1);
}

/**
 * Ephemeral time-travel preview: fold a prefix of the entity's events up to a
 * target (event count or event id) without committing anything.
 */
export function materializeAt(
  events: readonly LiveEvent[],
  entity: string,
  target: LiveTarget,
): Record<string, DictionaryValue> {
  const ordered = orderedForEntity(events, entity);
  const cut = resolveCutIndex(ordered, target);
  return foldOrdered(ordered.slice(0, cut + 1), cut);
}

/** Resolve a rollback target to a stable op-event id so replication converges. */
export function resolveRollbackTargetId(
  events: readonly LiveEvent[],
  entity: string,
  target: LiveTarget,
): string {
  if (target === "genesis") return "genesis";
  const ops = orderedForEntity(events, entity).filter((event) => event.kind === "op");
  if (__epochIsNumber(target)) {
    if (target <= 0) return "genesis";
    const index = Math.min(Math.trunc(target), ops.length) - 1;
    return index < 0 ? "genesis" : ops[index].id;
  }
  if (target === "latest") {
    return ops.length === 0 ? "genesis" : ops[ops.length - 1].id;
  }
  const match = ops.find((event) => event.id === target);
  if (match === undefined) throw new Error(`Epoch Live rollback target '${target}' is not an op event of '${entity}'`);
  return match.id;
}

export function diffToOps(prev: Record<string, DictionaryValue>, next: Record<string, DictionaryValue>): readonly LiveOp[] {
  const ops: LiveOp[] = [];
  const keys = [...new Set([...Object.keys(prev), ...Object.keys(next)])].sort();
  for (const key of keys) {
    const present = key in next && next[key] !== undefined;
    if (!present) {
      if (key in prev) ops.push({ kind: "delete", key });
      continue;
    }
    if (!(key in prev) || stableJson(prev[key]) !== stableJson(next[key])) {
      ops.push({ kind: "set", key, value: next[key] });
    }
  }
  return ops;
}

export function orderedForEntity(events: readonly LiveEvent[], entity: string): readonly LiveEvent[] {
  return events.filter((event) => event.entity === entity);
}

function foldOrdered(ordered: readonly LiveEvent[], upTo: number): Record<string, DictionaryValue> {
  const memo = new Map<number, Record<string, DictionaryValue>>();
  const indexById = new Map<string, number>();
  ordered.forEach((event, index) => indexById.set(event.id, index));

  function stateAfter(index: number): Record<string, DictionaryValue> {
    if (index < 0) return {};
    const cached = memo.get(index);
    if (cached !== undefined) return cached;
    const event = ordered[index];
    const next = event.kind === "rollback"
      ? { ...stateAfter(rollbackTargetIndex(event, indexById, index)) }
      : applyOp({ ...stateAfter(index - 1) }, event);
    memo.set(index, next);
    return next;
  }

  return stateAfter(upTo);
}

function applyOp(state: Record<string, DictionaryValue>, event: LiveEvent): Record<string, DictionaryValue> {
  const op = event.payload.op;
  if (!isLiveOp(op)) return state;
  if (op.kind === "delete") {
    delete state[op.key];
  } else if ("value" in op) {
    // SAFETY: set operations store dictionary-serializable live values.
    state[op.key] = op.value as DictionaryValue;
  }
  return state;
}

function rollbackTargetIndex(
  event: LiveEvent,
  indexById: Map<string, number>,
  selfIndex: number,
): number {
  const target = event.payload.target;
  if (target === "genesis" || !__epochIsString(target)) return -1;
  const index = indexById.get(target);
  if (index === undefined || index >= selfIndex) return -1;
  return index;
}

function resolveCutIndex(ordered: readonly LiveEvent[], target: LiveTarget): number {
  if (target === "latest") return ordered.length - 1;
  if (__epochIsNumber(target)) {
    if (target <= 0) return -1;
    let seen = 0;
    for (let index = 0; index < ordered.length; index += 1) {
      if (ordered[index].kind === "op") {
        seen += 1;
        if (seen === Math.trunc(target)) return index;
      }
    }
    return ordered.length - 1;
  }
  const index = ordered.findIndex((event) => event.id === target);
  if (index === -1) throw new Error(`Epoch Live unknown event '${target}'`);
  return index;
}

function isLiveOp(value: BoundaryValue): value is LiveOp {
  if (!isRecord(value) || typeof value.key !== "string") return false;
  return value.kind === "set" || value.kind === "delete";
}
