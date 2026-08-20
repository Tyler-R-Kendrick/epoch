
function __epochIsString<T>(value: T): value is T & string { return typeof value === "string"; }
/**
 * In-memory JetStream stand-in for unit tests and local demos without nats-server.
 * Cursor is the 1-based stream sequence.
 */

export interface JetStreamEntry {
  readonly seq: number;
  readonly subject: string;
  readonly data: Uint8Array;
  readonly headers?: Readonly<Record<string, string>>;
  readonly timestamp: number;
}

export interface JetStreamAppendResult {
  readonly seq: number;
  readonly subject: string;
}

export interface JetStreamReadOptions {
  readonly startSeq?: number;
  readonly maxMessages?: number;
  readonly subject?: string;
}

export class MemoryJetStream {
  readonly #entries: JetStreamEntry[] = [];
  readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  get lastSeq(): number {
    return this.#entries.length;
  }

  publish(subject: string, data: Uint8Array | string, headers?: Record<string, string>): JetStreamAppendResult {
    const bytes = __epochIsString(data) ? new TextEncoder().encode(data) : data;
    const seq = this.#entries.length + 1;
    this.#entries.push({
      seq,
      subject,
      data: bytes,
      headers: headers ? Object.freeze({ ...headers }) : undefined,
      timestamp: Date.now(),
    });
    return { seq, subject };
  }

  read(options: JetStreamReadOptions = {}): readonly JetStreamEntry[] {
    const start = Math.max(1, options.startSeq || 1);
    const max = options.maxMessages ?? Number.POSITIVE_INFINITY;
    const out: JetStreamEntry[] = [];
    for (const entry of this.#entries) {
      if (entry.seq < start) continue;
      if (options.subject && !subjectMatches(options.subject, entry.subject)) continue;
      out.push(entry);
      if (out.length >= max) break;
    }
    return out;
  }
}

function subjectMatches(pattern: string, subject: string): boolean {
  if (pattern === subject) return true;
  const parts = pattern.split(".");
  const sub = subject.split(".");
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (p === ">") return true;
    if (p === "*") {
      if (sub[i] === undefined) return false;
      continue;
    }
    if (p !== sub[i]) return false;
  }
  return parts.length === sub.length;
}
