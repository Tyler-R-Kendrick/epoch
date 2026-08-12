import type { AuthorityLedger, PrincipalId } from "./index";

export type MembershipDecision =
  | { readonly allow: true; readonly defaults: { readonly merge: "human-approval"; readonly release: "human-approval" } }
  | { readonly allow: false; readonly reason: string };

export function authorizeMembership(ledger: AuthorityLedger, input: {
  readonly principalId: PrincipalId;
  readonly keyId: string;
  readonly communityId: string;
  readonly grantId?: string;
}): MembershipDecision {
  const principal = ledger.principal(input.principalId);
  if (!principal || (principal.status ?? "active") !== "active") return { allow: false, reason: "principal-inactive" };
  if (!ledger.ownsActiveKey(input.principalId, input.keyId)) return { allow: false, reason: "principal-key-mismatch" };
  const defaults = { merge: "human-approval", release: "human-approval" } as const;
  if (principal.kind === "human") return { allow: true, defaults };
  if (principal.kind === "agent" && !input.grantId) return { allow: false, reason: "agent-grant-required" };
  if (input.grantId) {
    const decision = ledger.authorize({ principalId: input.principalId, grantId: input.grantId,
      action: "community.join", resource: input.communityId });
    if (!decision.allow) return { allow: false, reason: decision.reason };
  }
  return { allow: true, defaults };
}
