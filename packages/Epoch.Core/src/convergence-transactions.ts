import { mkdirSync, readFileSync, renameSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { ProtocolError } from "@epoch/protocol";

export interface ParentEvent {
  readonly eventId: string;
  readonly type: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly author: string;
  readonly parents: readonly string[];
  readonly lamport: number;
  readonly transactionId: string;
}

export interface AppendWithParentsOptions {
  readonly eventId: string;
  readonly author: string;
  readonly parents: readonly string[];
  readonly expectedHeads: readonly string[];
  readonly transactionId: string;
}

export class ExplicitParentEventLog {
  readonly #events = new Map<string, ParentEvent>();
  readonly #transactions = new Set<string>();

  constructor(events: readonly ParentEvent[] = []) {
    for (const event of events) this.addExisting(event);
  }

  heads(): readonly string[] {
    const parents = new Set([...this.#events.values()].flatMap((event) => [...event.parents]));
    return [...this.#events.keys()].filter((eventId) => !parents.has(eventId)).sort();
  }

  appendWithParents(
    type: string,
    payload: Readonly<Record<string, unknown>>,
    options: AppendWithParentsOptions,
  ): ParentEvent {
    if (this.#transactions.has(options.transactionId)) throw error("transaction-failed", "Transaction replay rejected");
    if (this.#events.has(options.eventId)) throw error("transaction-failed", "Duplicate event or cycle rejected");
    const parents = unique(options.parents, "parent");
    for (const parent of parents) if (!this.#events.has(parent)) throw error("missing-dependency", `Missing parent: ${parent}`);
    const expected = [...new Set(options.expectedHeads)].sort();
    if (!same(expected, this.heads())) throw error("stale-head", "Expected heads do not match current heads");
    const lamport = parents.length === 0 ? 0 : Math.max(...parents.map((parent) => this.#events.get(parent)!.lamport)) + 1;
    const event = Object.freeze({ type, payload: structuredClone(payload), ...options, parents, lamport });
    this.#events.set(event.eventId, event);
    this.#transactions.add(event.transactionId);
    return event;
  }

  private addExisting(event: ParentEvent): void {
    if (this.#events.has(event.eventId) || this.#transactions.has(event.transactionId)) throw error("transaction-failed", "Duplicate seed event");
    for (const parent of event.parents) if (!this.#events.has(parent)) throw error("missing-dependency", `Missing seed parent: ${parent}`);
    this.#events.set(event.eventId, Object.freeze({ ...event, parents: [...event.parents], payload: structuredClone(event.payload) }));
    this.#transactions.add(event.transactionId);
  }
}

export interface AtomicRepositoryState {
  readonly objects: Readonly<Record<string, string>>;
  readonly events: Readonly<Record<string, string>>;
  readonly indexes: Readonly<Record<string, string>>;
  readonly heads: readonly string[];
}

type Boundary = "prepared" | "objects" | "events" | "indexes" | "heads";
interface Journal { readonly schemaVersion: 1; readonly transactionId: string; readonly phase: "prepared" | "committed"; readonly previous: AtomicRepositoryState; readonly next: AtomicRepositoryState }

const emptyState = (heads: readonly string[] = []): AtomicRepositoryState => ({ objects: {}, events: {}, indexes: {}, heads: [...heads] });

export class QuarantineTransaction {
  readonly #statePath: string;
  readonly #journalPath: string;
  #next?: AtomicRepositoryState;

  constructor(readonly root: string, readonly transactionId: string, initial: Pick<AtomicRepositoryState, "heads">) {
    mkdirSync(root, { recursive: true });
    this.#statePath = join(root, "state.json");
    this.#journalPath = join(root, `${transactionId}.transaction.json`);
    if (!existsSync(this.#statePath)) atomicWrite(this.#statePath, emptyState(initial.heads));
  }

  stage(next: AtomicRepositoryState): void {
    if (existsSync(this.#journalPath)) throw error("transaction-failed", "Transaction already staged");
    this.#next = cloneState(next);
    const journal: Journal = { schemaVersion: 1, transactionId: this.transactionId, phase: "prepared", previous: readState(this.#statePath), next: this.#next };
    atomicWrite(this.#journalPath, journal);
  }

  publish(options: { readonly failAfter?: Boundary } = {}): void {
    if (this.#next === undefined) throw error("transaction-failed", "Transaction has not been staged");
    if (options.failAfter === "prepared") throw error("transaction-failed", "Injected failure after prepared boundary");
    const journal = readJournal(this.#journalPath);
    atomicWrite(this.#journalPath, { ...journal, phase: "committed" });
    for (const boundary of ["objects", "events", "indexes"] as const) {
      atomicWrite(join(this.root, `${this.transactionId}.${boundary}.quarantine.json`), this.#next[boundary]);
      if (options.failAfter === boundary) throw error("transaction-failed", `Injected failure after ${boundary} boundary`);
    }
    atomicWrite(this.#statePath, this.#next);
    if (options.failAfter === "heads") throw error("transaction-failed", "Injected failure after heads boundary");
    cleanup(this.root, this.transactionId);
  }
}

export function recoverQuarantineTransaction(root: string, transactionId: string): void {
  const journalPath = join(root, `${transactionId}.transaction.json`);
  if (!existsSync(journalPath)) return;
  const journal = readJournal(journalPath);
  atomicWrite(join(root, "state.json"), journal.phase === "committed" ? journal.next : journal.previous);
  cleanup(root, transactionId);
}

export interface OperationRecord {
  readonly schemaVersion?: 1;
  readonly operationId: string;
  readonly parents: readonly string[];
  readonly command: string;
  readonly args: readonly string[];
  readonly timestamp: number;
  readonly restores?: string;
}

type StoredOperation = Omit<OperationRecord, "schemaVersion"> & { readonly schemaVersion: 1 };
interface OperationFile { readonly schemaVersion: 1; readonly operations: readonly StoredOperation[] }

export class OperationDag {
  readonly #path: string;
  readonly #operations = new Map<string, StoredOperation>();

  constructor(root: string) {
    const directory = join(root, ".epoch", "operations");
    mkdirSync(directory, { recursive: true });
    this.#path = join(directory, "operations-v1.json");
    if (existsSync(this.#path)) {
      const stored = JSON.parse(readFileSync(this.#path, "utf8")) as OperationFile;
      if (stored.schemaVersion !== 1 || !Array.isArray(stored.operations)) throw error("invalid-schema", "Unsupported operation DAG file");
      for (const operation of stored.operations) this.add(operation, false);
    }
  }

  record(input: OperationRecord): OperationRecord {
    const operation = this.add(input, true);
    this.persist();
    return operation;
  }

  get(operationId: string): OperationRecord | undefined { return this.#operations.get(operationId); }

  heads(): readonly string[] {
    const parents = new Set([...this.#operations.values()].flatMap((operation) => [...operation.parents]));
    return [...this.#operations.keys()].filter((id) => !parents.has(id)).sort();
  }

  restore(targetOperationId: string, operationId: string, timestamp: number): OperationRecord {
    if (!this.#operations.has(targetOperationId)) throw error("missing-dependency", `Missing operation: ${targetOperationId}`);
    return this.record({ operationId, parents: this.heads(), command: "restore", args: [], timestamp, restores: targetOperationId });
  }

  private add(input: OperationRecord, sanitize: boolean) {
    if (this.#operations.has(input.operationId)) throw error("transaction-failed", "Duplicate operation");
    for (const parent of input.parents) if (!this.#operations.has(parent)) throw error("missing-dependency", `Missing operation parent: ${parent}`);
    const operation = Object.freeze({ ...input, schemaVersion: 1 as const, parents: unique(input.parents, "operation parent"), args: sanitize ? redactArgs(input.args) : [...input.args] });
    this.#operations.set(operation.operationId, operation);
    return operation;
  }

  private persist(): void { atomicWrite(this.#path, { schemaVersion: 1, operations: [...this.#operations.values()] }); }
}

function redactArgs(args: readonly string[]): readonly string[] {
  const result: string[] = [];
  let redactNext = false;
  for (const argument of args) {
    if (redactNext) { result.push("[REDACTED]"); redactNext = false; continue; }
    if (/^--(?:token|api-key|password|secret)$/u.test(argument)) { result.push(argument); redactNext = true; continue; }
    result.push(argument.replace(/^(--(?:token|api-key|password|secret))=.*/u, "$1=[REDACTED]"));
  }
  return result;
}

function readState(path: string): AtomicRepositoryState { return cloneState(JSON.parse(readFileSync(path, "utf8")) as AtomicRepositoryState); }
function readJournal(path: string): Journal {
  const value = JSON.parse(readFileSync(path, "utf8")) as Journal;
  if (value.schemaVersion !== 1 || !["prepared", "committed"].includes(value.phase)) throw error("invalid-schema", "Invalid transaction journal");
  return value;
}
function cloneState(value: AtomicRepositoryState): AtomicRepositoryState { return structuredClone(value); }
function atomicWrite(path: string, value: unknown): void { const temporary = `${path}.tmp`; writeFileSync(temporary, `${JSON.stringify(value)}\n`, "utf8"); renameSync(temporary, path); }
function cleanup(root: string, transactionId: string): void {
  for (const suffix of ["transaction.json", "objects.quarantine.json", "events.quarantine.json", "indexes.quarantine.json"]) rmSync(join(root, `${transactionId}.${suffix}`), { force: true });
}
function unique(values: readonly string[], label: string): readonly string[] { const result = [...new Set(values)]; if (result.length !== values.length) throw error("transaction-failed", `Duplicate ${label}`); return result; }
function same(left: readonly string[], right: readonly string[]): boolean { return left.length === right.length && left.every((value, index) => value === right[index]); }
function error(code: ConstructorParameters<typeof ProtocolError>[0], message: string): ProtocolError { return new ProtocolError(code, `${code}: ${message}`); }
