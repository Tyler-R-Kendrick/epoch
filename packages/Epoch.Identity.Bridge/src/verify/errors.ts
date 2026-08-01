export type BindingFailureReason =
  | "bad-signature"
  | "bad-kind"
  | "bad-nonce"
  | "proof-missing"
  | "proof-invalid"
  | "mismatch-fields"
  | "chain-broken"
  | "chain-regression"
  | "revoked"
  | "expired"
  | "did-unresolvable";

export type BindingStatus = "valid" | "revoked" | "expired" | "conflict";

export type VerifyBindingResult =
  | {
    readonly valid: true;
    readonly status: BindingStatus;
    readonly reason?: undefined;
    readonly head: {
      readonly seqno: number;
      readonly nostrEventId: string;
      readonly pairKey: string;
    };
  }
  | {
    readonly valid: false;
    readonly status: BindingStatus | "invalid";
    readonly reason: BindingFailureReason;
  };

export function fail(reason: BindingFailureReason, status: BindingStatus | "invalid" = "invalid"): VerifyBindingResult {
  return { valid: false, status, reason };
}
