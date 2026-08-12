export type ProtocolErrorCode =
  | "invalid-schema" | "invalid-id" | "invalid-path" | "invalid-ref"
  | "unsupported-capability" | "unsupported-fidelity"
  | "missing-object" | "promised-object" | "integrity-failure"
  | "stale-head" | "stale-revision" | "stale-review" | "stale-gate"
  | "missing-dependency" | "unresolved-conflict"
  | "policy-denied" | "grant-denied" | "budget-exceeded"
  | "transaction-failed" | "mirror-failed" | "archive-failed" | "external-failed";

export class ProtocolError extends Error {
  readonly name = "ProtocolError";

  constructor(
    readonly code: ProtocolErrorCode,
    message: string,
    readonly details: Readonly<Record<string, unknown>> = {},
  ) {
    super(message);
  }
}

export function fail(code: ProtocolErrorCode, message: string, details: Readonly<Record<string, unknown>> = {}): never {
  throw new ProtocolError(code, message, details);
}
