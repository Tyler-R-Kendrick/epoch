import { identifier } from "./digest";
type BoundaryValue = null | undefined | boolean | number | string | bigint | symbol | Readonly<object>;


/**
 * Command receipts.
 *
 * A receipt is the single answer every adapter returns. The web UI renders it,
 * WebMCP hands it to an agent, `--json` prints it verbatim, and the SDK passes
 * it through. Because all four carry the same `commandId`, the same event ids,
 * and the same policy and validation evidence, "the button and the tool did the
 * same thing" is something a user can verify rather than take on trust.
 */
export type EpochCommandSource = "web" | "prompt" | "webmcp" | "cli" | "sdk" | "api";

export type EpochPolicyDecision = "allow" | "deny" | "confirm";

export interface EpochPolicyReceipt {
  readonly decision: EpochPolicyDecision;
  readonly receiptId: string;
  readonly capability: string;
  readonly reason?: string;
}

export interface EpochValidationReceipt {
  readonly state: "valid" | "invalid" | "skipped";
  readonly receiptIds: readonly string[];
  readonly errors: readonly string[];
}

export interface EpochConfirmationReceipt {
  readonly required: boolean;
  readonly granted: boolean;
}

export interface EpochCommandReceipt<TData = unknown> {
  readonly commandId: string;
  readonly kind: string;
  readonly source: EpochCommandSource;
  readonly actor: string;
  readonly workspaceId: string;
  readonly readOnly: boolean;
  readonly baseRef?: string;
  readonly proposalRef?: string;
  readonly changeId?: string;
  readonly revisionIds: readonly number[];
  readonly eventIds: readonly string[];
  readonly policy: EpochPolicyReceipt;
  readonly validation: EpochValidationReceipt;
  readonly confirmation: EpochConfirmationReceipt;
  readonly timestamp: string;
  readonly data: TData;
}

/**
 * Raised when a command cannot run at all — unknown kind, malformed input, or a
 * domain rule the caller violated. Policy denial and "this needs confirmation"
 * are *not* errors: they come back as receipts, because refusing to act is an
 * outcome the audit trail should record.
 */
export class EpochCommandError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "EpochCommandError";
    this.code = code;
  }
}

export interface CommandReceiptInput<TData> {
  readonly kind: string;
  readonly source: EpochCommandSource;
  readonly actor: string;
  readonly workspaceId: string;
  readonly readOnly: boolean;
  readonly sequence: number;
  readonly timestamp: string;
  readonly input: unknown;
  readonly policy: EpochPolicyReceipt;
  readonly validation: EpochValidationReceipt;
  readonly confirmation: EpochConfirmationReceipt;
  readonly baseRef?: string;
  readonly proposalRef?: string;
  readonly changeId?: string;
  readonly revisionIds?: readonly number[];
  readonly eventIds?: readonly string[];
  readonly data: TData;
}

export function createCommandReceipt<TData>(input: CommandReceiptInput<TData>): EpochCommandReceipt<TData> {
  const commandId = identifier("cmd", {
    kind: input.kind,
    actor: input.actor,
    workspace: input.workspaceId,
    sequence: input.sequence,
    input: input.input,
  });

  return {
    commandId,
    kind: input.kind,
    source: input.source,
    actor: input.actor,
    workspaceId: input.workspaceId,
    readOnly: input.readOnly,
    ...(!(input.baseRef === undefined) && { baseRef: input.baseRef }),
    ...(!(input.proposalRef === undefined) && { proposalRef: input.proposalRef }),
    ...(!(input.changeId === undefined) && { changeId: input.changeId }),
    revisionIds: input.revisionIds ?? [],
    eventIds: input.eventIds ?? [],
    policy: input.policy,
    validation: input.validation,
    confirmation: input.confirmation,
    timestamp: input.timestamp,
    data: input.data,
  };
}

export function policyReceipt(
  decision: EpochPolicyDecision,
  capability: string,
  reason?: string,
): EpochPolicyReceipt {
  return {
    decision,
    capability,
    receiptId: identifier("pol", { decision, capability, reason: reason ?? null }),
    ...(!(reason === undefined) && { reason }),
  };
}

export const skippedValidation: EpochValidationReceipt = {
  state: "skipped",
  receiptIds: [],
  errors: [],
};

export function validationReceipt(subject: BoundaryValue, errors: readonly string[]): EpochValidationReceipt {
  return {
    state: errors.length === 0 ? "valid" : "invalid",
    receiptIds: [identifier("val", { subject, errors })],
    errors,
  };
}
