/**
 * In-process AUTH callout answering over NatsConnectionLike.
 *
 * This is Epoch-native JSON request/reply on `$SYS.REQ.USER.AUTH`.
 * Host-side JWT issuance lives in `jwt-issuance.ts` (short-lived user JWT +
 * revoke fencing). Mixed-mode: callout + resolver accounts, intra-community only.
 */

import type {
  AuthCalloutHandler,
  AuthCalloutRequest,
  AuthCalloutResponse,
} from "./auth-callout";
import type { NatsConnectionLike, NatsMsgLike } from "./connection";
type BoundaryValue = null | undefined | boolean | number | string | bigint | symbol | Readonly<object>;


export const AUTH_CALLOUT_SUBJECT = "$SYS.REQ.USER.AUTH";

const DEFAULT_TIMEOUT_MS = 2000;

export type AttachAuthCalloutServiceOptions = {
  /** Fail closed if the handler does not settle within this window. */
  readonly timeoutMs?: number;
};

/**
 * Subscribe to the AUTH callout subject and reply with JSON AuthCalloutResponse.
 * Handler throws or timeout → deny JSON on the reply inbox.
 */
export function attachAuthCalloutService(
  nc: NatsConnectionLike,
  handler: AuthCalloutHandler,
  options?: AttachAuthCalloutServiceOptions,
) {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const decoder = new TextDecoder();

  const onMsg = (_err: Error | null, msg: NatsMsgLike): void => {
    if (!msg.reply) return;
    const reply = msg.reply;
    void (async () => {
      let response: AuthCalloutResponse;
      try {
        // SAFETY: The module validates or constructs this value before applying the asserted contract.
        const request = JSON.parse(decoder.decode(msg.data)) as AuthCalloutRequest;
        response = await withTimeout(handler(request), timeoutMs);
      } catch (err) {
        const reason =
          err instanceof Error && /timeout/i.test(err.message)
            ? "callout timeout"
            : "callout failed";
        response = { type: "deny", reason };
      }
      nc.publish(reply, JSON.stringify(response));
    })();
  };

  const sub = nc.subscribe(AUTH_CALLOUT_SUBJECT, { callback: onMsg });
  return {
    stop() {
      sub.unsubscribe();
    },
  };
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("callout timeout")), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: BoundaryValue) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}
