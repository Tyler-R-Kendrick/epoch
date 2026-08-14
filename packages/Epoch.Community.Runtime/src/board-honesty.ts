/**
 * Board honesty helpers shared by the Community Web board and its tests.
 *
 * These are the shipped functions for receipts-as-objects, jump/search
 * isolation, composer letter ownership, scoped moderation, and Activity that
 * only grows from real participant events.
 */

export type BoardReceiptKind = "sig" | "intent" | "agent-run";

export interface BoardReceipt {
  readonly kind: BoardReceiptKind;
  readonly locator: string;
  readonly id: string;
  readonly title: string;
  readonly inspectable: true;
}

export interface ScopedActionResult {
  readonly ok: true;
  readonly actionId: string;
  readonly objectId: string;
}

export interface UnscopedActionResult {
  readonly ok: false;
  readonly reason: "unscoped";
  readonly actionId: string;
}

export interface ParticipantActivityEvent {
  readonly id: string;
  readonly actorId: string;
  readonly kind: string;
  readonly at?: string;
}

const RECEIPT = /^(sig:|intent:\/\/|agent-run:\/\/)([^\s]+)$/u;

export function parseBoardReceiptLocator(raw: string): BoardReceipt | null {
  const text = String(raw || "").trim();
  const match = RECEIPT.exec(text);
  if (!match) return null;
  const prefix = match[1]!;
  const id = match[2]!;
  const kind: BoardReceiptKind = prefix === "sig:" ? "sig" : prefix === "intent://" ? "intent" : "agent-run";
  const title = kind === "sig" ? "Signature receipt" : kind === "intent" ? "Intent receipt" : "Agent-run receipt";
  return Object.freeze({ kind, locator: text, id, title, inspectable: true as const });
}

export function openBoardReceipt(raw: string): { readonly kind: "open"; readonly receipt: BoardReceipt } | { readonly kind: "unknown"; readonly reason: string } {
  const receipt = parseBoardReceiptLocator(raw);
  if (!receipt) return { kind: "unknown", reason: "not-a-receipt" };
  return { kind: "open", receipt };
}

export function preservedSearchAfterJump(searchQuery: string | undefined): string {
  return String(searchQuery ?? "");
}

export function composerOwnsLetter(input: {
  readonly composerFocused: boolean;
  readonly composerValue: string;
  readonly key: string;
}): boolean {
  if (!input.composerFocused) return false;
  return input.key.length === 1;
}

/** Letters stay in an actively focused composer; they never steer the board. */
export function letterSteersBoard(input: {
  readonly composerFocused: boolean;
  readonly composerValue: string;
  readonly key: string;
  readonly columnFocus: boolean;
}): boolean {
  if (input.composerFocused) return false;
  if (!input.columnFocus) return false;
  return /^[hjklzyvre]$/iu.test(input.key);
}

const SCOPED_ACTIONS = new Set(["post.mute", "post.report", "hooks.test", "moderation.report"]);

export function requireScopedTarget(actionId: string, objectId: string | undefined): ScopedActionResult | UnscopedActionResult {
  if (!SCOPED_ACTIONS.has(actionId)) {
    return { ok: true, actionId, objectId: String(objectId || "") };
  }
  const id = String(objectId || "").trim();
  if (!id) return { ok: false, reason: "unscoped", actionId };
  return { ok: true, actionId, objectId: id };
}

export function activityFromParticipantEvents(
  events: readonly ParticipantActivityEvent[],
  input: { readonly sampleBoard: boolean; readonly mutedObjectIds?: readonly string[] },
): readonly ParticipantActivityEvent[] {
  if (input.sampleBoard) return Object.freeze([]);
  const muted = new Set(input.mutedObjectIds ?? []);
  return Object.freeze(events.filter((event) => {
    if (!event.id || !event.actorId || event.kind === "tick") return false;
    if (muted.has(event.id) || muted.has(event.actorId)) return false;
    return true;
  }));
}

export function describeReceiptBlade(receipt: BoardReceipt, source?: { readonly who?: string; readonly body?: string; readonly path?: string }): {
  readonly kind: BoardReceiptKind;
  readonly locator: string;
  readonly id: string;
  readonly title: string;
  readonly actor: string;
  readonly evidence: string;
  readonly inspectable: true;
} {
  return Object.freeze({
    kind: receipt.kind,
    locator: receipt.locator,
    id: receipt.id,
    title: receipt.title,
    actor: String(source?.who || "unknown"),
    evidence: String(source?.body || source?.path || receipt.locator),
    inspectable: true as const,
  });
}

export function honestAgentStatus(status: string | undefined, heartbeatAt?: number, now = Date.now()): string {
  if (status === "working" && !(typeof heartbeatAt === "number" && now - heartbeatAt < 30_000)) {
    return "idle";
  }
  return status || "idle";
}
