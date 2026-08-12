/** Pure, local authority model. Private key material is deliberately absent. */

export const PRINCIPAL_KINDS = ["human", "agent", "service", "device", "org"] as const;
export type PrincipalKind = (typeof PRINCIPAL_KINDS)[number];
export type PrincipalId = `epoch:principal:${string}`;
export type KeyStatus = "active" | "rotated" | "revoked" | "compromised";

export interface PrincipalKeyBinding {
  readonly keyId: string;
  readonly algorithm: "Ed25519" | "secp256k1" | "P-256";
  readonly purpose: "root" | "signing" | "authentication" | "delegation";
  readonly state: KeyStatus;
  readonly boundAt?: number;
  readonly replacesKeyId?: string;
}

export interface PrincipalRecord {
  readonly principalId: PrincipalId;
  readonly kind: PrincipalKind;
  readonly keys: readonly PrincipalKeyBinding[];
  readonly status?: "active" | "suspended" | "revoked";
  readonly bindings?: readonly { readonly protocol: string; readonly identifier: string }[];
}

export type BudgetDimension =
  | "money-microunit" | "input-token" | "output-token" | "model-call" | "tool-call"
  | "commit" | "revision" | "merge-proposal" | "ci-second" | "wall-ms" | "cpu-ms"
  | "storage-byte" | "network-byte" | "concurrency";

export interface GrantBudget { readonly unit: BudgetDimension; readonly limit: number }

export interface AuthorityGrant {
  readonly grantId: string;
  readonly parentGrantId?: string;
  readonly issuerId: PrincipalId;
  readonly subjectId: PrincipalId;
  readonly actions: readonly string[];
  readonly resources: readonly string[];
  readonly repositories?: readonly string[];
  readonly communities?: readonly string[];
  readonly paths?: readonly string[];
  readonly views?: readonly string[];
  readonly changes?: readonly string[];
  readonly stacks?: readonly string[];
  readonly tools?: readonly string[];
  readonly models?: readonly string[];
  readonly providers?: readonly string[];
  readonly audience?: readonly string[];
  readonly notBefore?: number;
  readonly expiresAt: number;
  readonly maxDelegationDepth?: number;
  readonly budget?: GrantBudget | readonly GrantBudget[];
}

export type AuthorizationDecision =
  | { readonly allow: true; readonly remaining?: number; readonly explanation: readonly string[] }
  | { readonly allow: false; readonly reason: string; readonly remaining?: number; readonly explanation: readonly string[] };

type Reservation = { grantId: string; unit: BudgetDimension; amount: number; version: number; leaseUntil: number; state: "reserved" | "consumed" | "released" };

function integer(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${label} must be a non-negative safe integer`);
  return value;
}

export function parsePrincipalId(value: string): PrincipalId {
  if (!/^epoch:principal:[A-Za-z0-9][A-Za-z0-9._:@/-]{0,254}$/u.test(value)) {
    throw new Error("invalid principal id");
  }
  return value as PrincipalId;
}

function matches(pattern: string, value: string): boolean {
  const source = pattern.split("*").map((part) => part.replace(/[\\^$+?.()|[\]{}]/gu, "\\$&")).join(".*");
  return new RegExp(`^${source}$`, "u").test(value);
}

function subset(child: readonly string[] | undefined, parent: readonly string[] | undefined): boolean {
  if (!child?.length) return true;
  if (!parent?.length) return false;
  return child.every((value) => parent.some((pattern) => matches(pattern, value)));
}

function budgetList(budget: AuthorityGrant["budget"]): readonly GrantBudget[] {
  return !budget ? [] : Array.isArray(budget) ? budget : [budget as GrantBudget];
}

export class AuthorityLedger {
  readonly #now: () => number;
  readonly #principals = new Map<PrincipalId, PrincipalRecord>();
  readonly #keyOwners = new Map<string, PrincipalId>();
  readonly #grants = new Map<string, AuthorityGrant>();
  readonly #revocations = new Map<string, string>();
  readonly #spent = new Map<string, number>();
  readonly #reservations = new Map<string, Reservation>();
  readonly #receipts = new Map<string, Readonly<{ receiptId: string; reservationId: string; amount: number }>>();

  constructor(options?: { readonly now?: () => number }) { this.#now = options?.now ?? Date.now; }

  registerPrincipal(record: PrincipalRecord): void {
    const principalId = parsePrincipalId(record.principalId);
    if (!PRINCIPAL_KINDS.includes(record.kind)) throw new Error("invalid principal kind");
    if (!record.keys.length || !record.keys.some((key) => key.state === "active")) throw new Error("principal requires an active key");
    for (const key of record.keys) {
      const owner = this.#keyOwners.get(key.keyId);
      if (owner && owner !== principalId) throw new Error(`key already bound to ${owner}`);
      if (/private|secret|seed/iu.test(key.keyId)) throw new Error("private key material is forbidden");
    }
    const frozen = Object.freeze({ ...record, principalId, keys: Object.freeze(record.keys.map((key) => Object.freeze({ ...key }))) });
    this.#principals.set(principalId, frozen);
    for (const key of record.keys) this.#keyOwners.set(key.keyId, principalId);
  }

  issueGrant(grant: AuthorityGrant): void {
    if (this.#grants.has(grant.grantId)) throw new Error("grant id already exists");
    if (!this.#activePrincipal(grant.issuerId) || !this.#activePrincipal(grant.subjectId)) throw new Error("grant principal unavailable");
    if (!grant.actions.length || !grant.resources.length) throw new Error("grant requires actions and resources");
    if (grant.expiresAt <= this.#now()) throw new Error("grant is already expired");
    for (const item of budgetList(grant.budget)) integer(item.limit, `budget ${item.unit}`);
    if (grant.parentGrantId) this.#assertAttenuated(grant, this.#requiredGrant(grant.parentGrantId));
    this.#grants.set(grant.grantId, Object.freeze({ ...grant }));
  }

  revokeGrant(grantId: string, reason: string): void {
    this.#requiredGrant(grantId);
    this.#revocations.set(grantId, reason || "revoked");
  }

  principal(principalId: PrincipalId): PrincipalRecord | undefined { return this.#principals.get(principalId); }

  ownsActiveKey(principalId: PrincipalId, keyId: string): boolean {
    const principal = this.#principals.get(principalId);
    return !!principal && (principal.status ?? "active") === "active" &&
      principal.keys.some((key) => key.keyId === keyId && key.state === "active");
  }

  authorize(input: { readonly principalId: PrincipalId; readonly grantId: string; readonly action: string;
    readonly resource: string; readonly repository?: string; readonly community?: string; readonly path?: string;
    readonly view?: string; readonly change?: string; readonly stack?: string; readonly tool?: string;
    readonly model?: string; readonly provider?: string; readonly cost?: number; readonly unit?: BudgetDimension; readonly audience?: string }): AuthorizationDecision {
    const explanation: string[] = [];
    const grant = this.#grants.get(input.grantId);
    if (!grant) return { allow: false, reason: "grant-not-found", explanation };
    if (!this.#activePrincipal(input.principalId)) return { allow: false, reason: "principal-inactive", explanation };
    if (grant.subjectId !== input.principalId) return { allow: false, reason: "subject-mismatch", explanation };
    let current: AuthorityGrant | undefined = grant;
    while (current) {
      if (this.#revocations.has(current.grantId)) return { allow: false, reason: current === grant ? "grant-revoked" : "ancestor-revoked", explanation };
      if (current.notBefore !== undefined && this.#now() < current.notBefore) return { allow: false, reason: "grant-not-active", explanation };
      if (this.#now() >= current.expiresAt) return { allow: false, reason: "grant-expired", explanation };
      current = current.parentGrantId ? this.#grants.get(current.parentGrantId) : undefined;
    }
    if (!grant.actions.includes(input.action)) return { allow: false, reason: "action-denied", explanation };
    if (!grant.resources.some((pattern) => matches(pattern, input.resource))) return { allow: false, reason: "resource-denied", explanation };
    const dimensions: readonly [keyof typeof input, keyof AuthorityGrant, string][] = [
      ["repository", "repositories", "repository-denied"], ["community", "communities", "community-denied"],
      ["path", "paths", "path-denied"], ["view", "views", "view-denied"], ["change", "changes", "change-denied"],
      ["stack", "stacks", "stack-denied"], ["tool", "tools", "tool-denied"], ["model", "models", "model-denied"],
      ["provider", "providers", "provider-denied"],
    ];
    for (const [requestKey, grantKey, reason] of dimensions) {
      const value = input[requestKey]; const allowed = grant[grantKey] as readonly string[] | undefined;
      if (value !== undefined && (!allowed?.length || !allowed.some((pattern) => matches(pattern, String(value))))) {
        return { allow: false, reason, explanation };
      }
    }
    if (grant.audience?.length && (!input.audience || !grant.audience.includes(input.audience))) return { allow: false, reason: "audience-denied", explanation };
    explanation.push(`grant:${grant.grantId}`, `action:${input.action}`, `resource:${input.resource}`);
    const budgets = budgetList(grant.budget);
    if (!budgets.length || input.cost === undefined) return { allow: true, explanation };
    const unit = input.unit ?? budgets[0]!.unit;
    const budget = budgets.find((item) => item.unit === unit);
    if (!budget) return { allow: false, reason: "budget-dimension-denied", explanation };
    const cost = integer(input.cost, "cost");
    const key = `${grant.grantId}:${unit}`;
    const spent = this.#spent.get(key) ?? 0;
    const remaining = budget.limit - spent;
    if (cost > remaining) return { allow: false, reason: "budget-exceeded", remaining, explanation };
    this.#spent.set(key, spent + cost);
    return { allow: true, remaining: remaining - cost, explanation };
  }

  reserve(input: { readonly reservationId: string; readonly grantId: string; readonly unit: BudgetDimension;
    readonly amount: number; readonly expectedVersion: number; readonly leaseMs: number }): Readonly<Reservation> {
    const existing = this.#reservations.get(input.reservationId);
    if (existing) return Object.freeze({ ...existing });
    const amount = integer(input.amount, "reservation amount");
    const grant = this.#requiredGrant(input.grantId);
    const budget = budgetList(grant.budget).find((item) => item.unit === input.unit);
    if (!budget) throw new Error("budget dimension denied");
    const key = `${grant.grantId}:${input.unit}`;
    const version = this.#spent.get(`${key}:version`) ?? 0;
    if (version !== input.expectedVersion) throw new Error("budget CAS conflict");
    this.#expireReservations();
    const reserved = [...this.#reservations.values()].filter((item) => item.grantId === input.grantId && item.unit === input.unit && item.state === "reserved").reduce((sum, item) => sum + item.amount, 0);
    if ((this.#spent.get(key) ?? 0) + reserved + amount > budget.limit) throw new Error("budget exceeded");
    const item: Reservation = { grantId: input.grantId, unit: input.unit, amount, version: version + 1,
      leaseUntil: this.#now() + integer(input.leaseMs, "lease"), state: "reserved" };
    this.#spent.set(`${key}:version`, item.version);
    this.#reservations.set(input.reservationId, item);
    return Object.freeze({ ...item });
  }

  consume(input: { readonly reservationId: string; readonly receiptId: string; readonly amount?: number }): Readonly<{ receiptId: string; reservationId: string; amount: number }> {
    const prior = this.#receipts.get(input.receiptId);
    if (prior) return prior;
    this.#expireReservations();
    const reservation = this.#reservations.get(input.reservationId);
    if (!reservation || reservation.state !== "reserved") throw new Error("reservation unavailable");
    const amount = input.amount === undefined ? reservation.amount : integer(input.amount, "consumed amount");
    if (amount > reservation.amount) throw new Error("consume exceeds reservation");
    const key = `${reservation.grantId}:${reservation.unit}`;
    this.#spent.set(key, (this.#spent.get(key) ?? 0) + amount);
    reservation.state = "consumed";
    const receipt = Object.freeze({ receiptId: input.receiptId, reservationId: input.reservationId, amount });
    this.#receipts.set(input.receiptId, receipt);
    return receipt;
  }

  release(reservationId: string): boolean {
    const reservation = this.#reservations.get(reservationId);
    if (!reservation || reservation.state !== "reserved") return false;
    reservation.state = "released";
    return true;
  }

  #activePrincipal(id: PrincipalId): boolean { const item = this.#principals.get(id); return !!item && (item.status ?? "active") === "active"; }
  #requiredGrant(id: string): AuthorityGrant { const item = this.#grants.get(id); if (!item) throw new Error(`grant not found: ${id}`); return item; }
  #assertAttenuated(child: AuthorityGrant, parent: AuthorityGrant): void {
    if (child.issuerId !== parent.subjectId || child.expiresAt > parent.expiresAt ||
        !subset(child.actions, parent.actions) || !subset(child.resources, parent.resources) ||
        !subset(child.repositories, parent.repositories) || !subset(child.communities, parent.communities) ||
        !subset(child.paths, parent.paths) || !subset(child.views, parent.views) || !subset(child.changes, parent.changes) ||
        !subset(child.stacks, parent.stacks) || !subset(child.tools, parent.tools) || !subset(child.models, parent.models) ||
        !subset(child.providers, parent.providers) || !subset(child.audience, parent.audience)) throw new Error("child grant must attenuate parent authority");
    const depth = this.#depth(parent) + 1;
    if (parent.maxDelegationDepth !== undefined && depth > parent.maxDelegationDepth) throw new Error("delegation depth exceeded");
    for (const budget of budgetList(child.budget)) {
      const ceiling = budgetList(parent.budget).find((item) => item.unit === budget.unit);
      if (!ceiling || budget.limit > ceiling.limit) throw new Error("child grant must attenuate parent budget");
    }
  }
  #depth(grant: AuthorityGrant): number { return grant.parentGrantId ? this.#depth(this.#requiredGrant(grant.parentGrantId)) + 1 : 0; }
  #expireReservations(): void { for (const item of this.#reservations.values()) if (item.state === "reserved" && item.leaseUntil <= this.#now()) item.state = "released"; }
}

export const IDENTITY_AUTHORITY_MANIFEST = Object.freeze({
  schemaVersion: 1,
  capabilityId: "epoch.identity.authority",
  capabilities: { offline: true, persistence: false, privateKeyEvents: false, casBudgets: true, delegatedGrants: true },
  limitations: ["in-memory ledger; callers must provide durable transactional persistence", "signer implementations are separate from authority records"],
});
