import type { AttestationEventFields } from "../schemas/attestation-event";
import { attestationIsActive, scopeAllows } from "./attestation";

export type PolicyDecision =
  | { readonly allow: true }
  | { readonly allow: false; readonly reason: string };

export class AgentRequestPolicy {
  readonly #windowMs: number;
  readonly #maxPerWindow: number;
  readonly #hits = new Map<string, number[]>();

  constructor(options?: { readonly windowMs?: number; readonly maxPerWindow?: number }) {
    this.#windowMs = options?.windowMs ?? 60_000;
    this.#maxPerWindow = options?.maxPerWindow ?? 30;
  }

  evaluate(input: {
    readonly attestation: AttestationEventFields;
    readonly requiredScope: string;
    readonly agentPubkey: string;
    readonly nowUnix?: number;
  }): PolicyDecision {
    if (input.attestation.agentPubkey !== input.agentPubkey.toLowerCase()) {
      return { allow: false, reason: "attestation-agent-mismatch" };
    }
    if (!attestationIsActive(input.attestation, input.nowUnix)) {
      return { allow: false, reason: "attestation-inactive" };
    }
    if (!scopeAllows(input.attestation.scope, input.requiredScope)) {
      return { allow: false, reason: "scope-denied" };
    }
    if (!this.#rateLimit(input.agentPubkey)) {
      return { allow: false, reason: "rate-limited" };
    }
    return { allow: true };
  }

  #rateLimit(agentPubkey: string): boolean {
    const now = Date.now();
    const windowStart = now - this.#windowMs;
    const prior = (this.#hits.get(agentPubkey) ?? []).filter((t) => t >= windowStart);
    if (prior.length >= this.#maxPerWindow) {
      this.#hits.set(agentPubkey, prior);
      return false;
    }
    prior.push(now);
    this.#hits.set(agentPubkey, prior);
    return true;
  }
}
