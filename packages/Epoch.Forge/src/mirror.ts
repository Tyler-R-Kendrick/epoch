import { createHash } from "node:crypto";
import { isIP } from "node:net";

export type MirrorDirection = "import" | "export";
export type MirrorAuthority = "epoch-primary" | "git-primary";
export type MirrorMutationPolicy = "deny" | "allow";

export interface MirrorRule {
  readonly ruleId: string;
  readonly direction: MirrorDirection;
  readonly authority: MirrorAuthority;
  readonly sourceRef: string;
  readonly destinationRef: string;
  readonly credentialRef: string;
  readonly force: MirrorMutationPolicy;
  readonly deletion: MirrorMutationPolicy;
}

function validRef(ref: string): boolean {
  return /^refs\/[A-Za-z0-9][A-Za-z0-9._/-]*$/u.test(ref) && !ref.includes("..") && !ref.endsWith("/") && !ref.includes("//");
}

export function createMirrorRule(input: MirrorRule): MirrorRule {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(input.ruleId)) throw new Error("Mirror rule ID is invalid");
  if (!validRef(input.sourceRef) || !validRef(input.destinationRef)) throw new Error("Mirror ref rule is invalid");
  if (!input.credentialRef || /^(https?|ssh):/u.test(input.credentialRef)) throw new Error("Mirror credentials require an opaque credentialRef");
  if (input.authority === "epoch-primary" && input.direction === "import" && input.force === "allow") {
    throw new Error("Epoch-primary import cannot force-rewrite product refs");
  }
  if (input.authority === "git-primary" && input.direction === "export" && input.force === "allow") {
    throw new Error("Git-primary export cannot force-rewrite the authoritative remote");
  }
  return Object.freeze({ ...input });
}

function privateIp(address: string): boolean {
  const value = address.toLowerCase().replace(/^\[|\]$/gu, "");
  if (value === "::1" || value === "::" || value.startsWith("fc") || value.startsWith("fd") || value.startsWith("fe8") || value.startsWith("fe9") || value.startsWith("fea") || value.startsWith("feb")) return true;
  const parts = value.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  return parts[0] === 10 || parts[0] === 127 || parts[0] === 0 || parts[0] === 169 && parts[1] === 254 ||
    parts[0] === 172 && parts[1]! >= 16 && parts[1]! <= 31 || parts[0] === 192 && parts[1] === 168 ||
    parts[0]! >= 224;
}

export type MirrorHostResolver = (hostname: string) => Promise<readonly string[]>;

export async function validateMirrorRemote(input: string, resolveHost: MirrorHostResolver = async (hostname) => [hostname]): Promise<URL> {
  let remote: URL;
  try { remote = new URL(input); } catch { throw new Error("Mirror remote URL is invalid"); }
  if (remote.protocol !== "https:") throw new Error("Mirror remote must use HTTPS");
  if (remote.username || remote.password) throw new Error("Mirror remote URL must not embed credentials");
  if (remote.port && remote.port !== "443") throw new Error("Mirror remote uses a non-standard port");
  if (remote.hostname === "localhost" || remote.hostname.endsWith(".localhost") || privateIp(remote.hostname)) {
    throw new Error("Mirror remote resolves to a private or loopback host");
  }
  const addresses = await resolveHost(remote.hostname);
  if (addresses.length === 0) throw new Error("Mirror remote hostname did not resolve");
  if (addresses.some((address) => isIP(address) !== 0 && privateIp(address))) throw new Error("Mirror remote resolved to a private address");
  return remote;
}

export interface MirrorOperation {
  readonly operationId: string;
  readonly ruleId: string;
  readonly sourceOid: string;
  readonly expectedOldOid?: string;
  readonly observedDestinationOid?: string;
  readonly delete?: boolean;
  readonly force?: boolean;
  readonly loopMarker?: string;
}

export interface MirrorDecision {
  readonly outcome: "apply" | "replayed" | "conflict" | "paused" | "rejected";
  readonly operationId: string;
  readonly loopMarker?: string;
  readonly conflictRef?: string;
  readonly detail?: string;
}

export interface MirrorCheckpoint {
  readonly ruleId: string;
  readonly lastOperationId: string;
  readonly sourceOid: string;
  readonly observedDestinationOid?: string;
  readonly outcome: MirrorDecision["outcome"];
  readonly updatedAt: number;
}

export interface MirrorRetry {
  readonly ruleId: string;
  readonly attempt: number;
  readonly notBefore: number;
  readonly reason: string;
}

export function mirrorLoopMarker(rule: MirrorRule, sourceOid: string): string {
  return `epoch-mirror-v1:${createHash("sha256").update(`${rule.ruleId}\0${rule.direction}\0${sourceOid}`).digest("hex")}`;
}

export class MirrorCoordinator {
  readonly #rules = new Map<string, MirrorRule>();
  readonly #decisions = new Map<string, MirrorDecision>();
  readonly #checkpoints = new Map<string, MirrorCheckpoint>();
  readonly #paused = new Map<string, string>();
  readonly #retries = new Map<string, number>();

  constructor(rules: readonly MirrorRule[]) {
    for (const rule of rules) {
      if (this.#rules.has(rule.ruleId)) throw new Error(`Duplicate mirror rule: ${rule.ruleId}`);
      this.#rules.set(rule.ruleId, createMirrorRule(rule));
    }
  }

  reconcile(operation: MirrorOperation): MirrorDecision {
    const replay = this.#decisions.get(operation.operationId);
    if (replay !== undefined) return Object.freeze({ ...replay, outcome: "replayed" });
    const rule = this.#rules.get(operation.ruleId);
    if (rule === undefined) return this.record(operation, { outcome: "rejected", operationId: operation.operationId, detail: "unknown mirror rule" });
    const pause = this.#paused.get(rule.ruleId);
    if (pause !== undefined) return this.record(operation, { outcome: "paused", operationId: operation.operationId, detail: pause });
    if (operation.delete === true && rule.deletion !== "allow") return this.record(operation, { outcome: "rejected", operationId: operation.operationId, detail: "ref deletion denied" });
    if (operation.force === true && rule.force !== "allow") return this.record(operation, { outcome: "rejected", operationId: operation.operationId, detail: "force update denied" });
    const marker = mirrorLoopMarker(rule, operation.sourceOid);
    if (operation.loopMarker === marker) return this.record(operation, { outcome: "replayed", operationId: operation.operationId, loopMarker: marker });
    if (operation.expectedOldOid !== operation.observedDestinationOid) {
      const suffix = createHash("sha256").update(`${rule.ruleId}\0${operation.observedDestinationOid ?? "missing"}`).digest("hex").slice(0, 16);
      return this.record(operation, { outcome: "conflict", operationId: operation.operationId, loopMarker: marker,
        conflictRef: `refs/epoch/import-conflicts/${rule.ruleId}/${suffix}`, detail: "destination drifted; authoritative ref was not rewritten" });
    }
    return this.record(operation, { outcome: "apply", operationId: operation.operationId, loopMarker: marker });
  }

  pauseRef(ruleId: string, reason: string): void { if (!this.#rules.has(ruleId)) throw new Error("Unknown mirror rule"); this.#paused.set(ruleId, reason); }
  resumeRef(ruleId: string): void { this.#paused.delete(ruleId); }
  checkpoint(ruleId: string): MirrorCheckpoint | undefined { return this.#checkpoints.get(ruleId); }

  recordRetry(ruleId: string, reason: string, now = Date.now()): MirrorRetry {
    if (!this.#rules.has(ruleId)) throw new Error("Unknown mirror rule");
    const attempt = (this.#retries.get(ruleId) ?? 0) + 1;
    this.#retries.set(ruleId, attempt);
    return Object.freeze({ ruleId, attempt, reason, notBefore: now + Math.min(300_000, 1_000 * 2 ** (attempt - 1)) });
  }

  private record(operation: MirrorOperation, decision: MirrorDecision): MirrorDecision {
    const frozen = Object.freeze(decision);
    this.#decisions.set(operation.operationId, frozen);
    this.#checkpoints.set(operation.ruleId, Object.freeze({ ruleId: operation.ruleId,
      lastOperationId: operation.operationId, sourceOid: operation.sourceOid,
      ...(operation.observedDestinationOid === undefined ? {} : { observedDestinationOid: operation.observedDestinationOid }),
      outcome: decision.outcome, updatedAt: Date.now() }));
    return frozen;
  }
}
