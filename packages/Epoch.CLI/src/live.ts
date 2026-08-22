import {
  EpochCommandError,
  type EpochCommandOutcome,
  type LivePublicationPolicyInput,
  type LiveSpaceApplicationPort,
} from "@epoch/community-runtime";
type DictionaryValue = null | undefined | boolean | number | string | bigint | readonly DictionaryValue[] | { readonly [key: string]: DictionaryValue };
function __epochIsString<T>(value: T): value is T & string { return typeof value === "string"; }


/**
 * `epoch live …` against a configured Community host.
 *
 * The terminal does not own Live Space state, so this port forwards each
 * command to the deployment that does and returns what came back. That keeps
 * one authority: the server's bus decides, the server's receipt is what the
 * CLI prints, and a refusal in the browser is the same refusal here. With no
 * remote configured the CLI builds no port at all, and the command family
 * answers with an honest `unavailable` receipt rather than pretending a local
 * in-memory session is the real one.
 */
export interface RemoteLiveOptions {
  readonly baseUrl: string;
  /** Injected so tests never open a socket. */
  readonly fetch: (request: Request) => Promise<Response>;
  readonly principalId: string;
}

export function resolveCommunityRemote(
  argv: readonly string[],
  environment: Readonly<Record<string, string | undefined>>,
): string | undefined {
  const index = argv.indexOf("--remote");
  const flag = index === -1 ? undefined : argv[index + 1];
  if (flag !== undefined && !flag.startsWith("--")) return flag;
  const configured = environment.EPOCH_COMMUNITY_URL;
  return configured !== undefined && configured.trim() !== "" ? configured : undefined;
}

interface RemoteReceipt {
  readonly data?: DictionaryValue;
  readonly eventIds?: readonly string[];
  readonly policy?: { readonly decision?: string; readonly reason?: string };
}

export function createRemoteLiveSpacePort(options: RemoteLiveOptions): LiveSpaceApplicationPort {
  const base = options.baseUrl.replace(/\/+$/u, "");

  async function post(path: string, body: Readonly<Record<string, DictionaryValue>>): Promise<EpochCommandOutcome> {
    const response = await options.fetch(new Request(`${base}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Epoch-Principal": options.principalId,
      },
      body: JSON.stringify(body),
    }));
    return outcomeOf(response, await readJson(response));
  }

  async function get(path: string): Promise<EpochCommandOutcome> {
    const response = await options.fetch(new Request(`${base}${path}`, {
      method: "GET",
      headers: { "X-Epoch-Principal": options.principalId },
    }));
    return outcomeOf(response, await readJson(response));
  }

  /** Forward one live command and adopt the deployment's answer verbatim. */
  function command(
    sessionId: string,
    kind: string,
    input: Readonly<Record<string, DictionaryValue>> = {},
  ): Promise<EpochCommandOutcome> {
    return post(`/community/live/sessions/${encodeURIComponent(sessionId)}/commands`, { kind, input, confirmed: true });
  }

  return {
    createSession: (input) => post("/community/live/sessions", {
      input: { spaceId: input.spaceId, policy: policyJson(input.policy) },
      confirmed: true,
    }),
    showSession: (sessionId) => get(`/community/live/sessions/${encodeURIComponent(sessionId)}`),
    bindThread: (input) => command(input.sessionId, "live.session.bindThread", { threadObjectId: input.threadObjectId }),
    listSessions: () => command("none", "live.session.list"),
    preflight: (sessionId) => command(sessionId, "live.session.preflight"),
    configure: (input) => command(input.sessionId, "live.session.configure", { policy: policyJson(input.policy) }),
    recordConsent: (input) => command(input.sessionId, "live.session.consent", { scopes: [...input.scopes] }),
    lifecycle: (input) => command(input.sessionId, `live.session.${input.command}`),
    seal: (input) => command(input.sessionId, "live.session.seal", { completeness: input.completeness }),
    join: (input) => post(`/community/live/sessions/${encodeURIComponent(input.sessionId)}/join`, {}),
    requestGrant: (input) => command(input.sessionId, "live.participant.requestGrant", { capability: input.capability }),
    grant: (input) => command(input.sessionId, "live.participant.grant", {
      principalId: input.principalId,
      role: input.role,
    }),
    revoke: (input) => command(input.sessionId, "live.participant.revoke", { principalId: input.principalId }),
    lockJoins: (input) => command(input.sessionId, "live.participant.lockJoins", { locked: input.locked }),
    publish: (input) => command(input.sessionId, "live.presentation.publish", {
      actionId: input.actionId,
      args: input.args,
      ...(input.path !== undefined && { path: input.path }),
    }),
    status: (sessionId) => command(sessionId, "live.presentation.status"),
    checkpoint: (input) => command(input.sessionId, "live.presentation.checkpoint"),
    bookmark: (input) => command(input.sessionId, "live.presentation.bookmark", { checkpointId: input.checkpointId }),
    annotate: (input) => command(input.sessionId, "live.presentation.annotate", {
      checkpointId: input.checkpointId,
      body: input.body,
      ...(input.path !== undefined && { path: input.path }),
    }),
    forkAt: (input) => command(input.sessionId, "live.presentation.forkAt", { checkpointId: input.checkpointId }),
    report: (input) => command(input.sessionId, "live.moderation.report", { reason: input.reason }),

    /**
     * A media credential is deliberately unreachable from the terminal: there
     * is no CLI spelling, and this port refuses rather than fetching one into
     * a shell history.
     */
    issueMediaToken: () => Promise.reject(new EpochCommandError(
      "policy-denied",
      "media credentials are not issued to the CLI; use a client that can hold one safely",
    )),
    recordProviderEvent: () => Promise.reject(new EpochCommandError(
      "policy-denied",
      "provider events are ingested by the deployment's webhook route, not by a CLI",
    )),
  };
}

function outcomeOf(response: Response, body: DictionaryValue): EpochCommandOutcome {
  if (response.status === 404) throw new EpochCommandError("not-found", "Live session not found.");
  if (response.status === 403) throw new EpochCommandError("policy-denied", refusalReason(body) ?? "The command was refused by policy.");
  if (response.status === 409) {
    throw new EpochCommandError("confirmation-required", "This command requires explicit confirmation; re-run with --confirm.");
  }
  if (!response.ok) throw new EpochCommandError("remote-error", refusalReason(body) ?? `Live request failed (${response.status}).`);
  const receipt = receiptOf(body);
  return {
    data: receipt?.data ?? null,
    ...(receipt?.eventIds !== undefined && { eventIds: receipt.eventIds }),
  };
}

function receiptOf(body: DictionaryValue): RemoteReceipt | undefined {
  if (!isDictionary(body)) return undefined;
  const receipt = body.receipt;
  if (!isDictionary(receipt)) return undefined;
  return {
    ...(receipt.data !== undefined && { data: receipt.data }),
    ...(Array.isArray(receipt.eventIds) && { eventIds: receipt.eventIds.filter(__epochIsString) }),
  };
}

function refusalReason(body: DictionaryValue): string | undefined {
  if (!isDictionary(body)) return undefined;
  const error = body.error;
  if (isDictionary(error) && __epochIsString(error.detail)) return error.detail;
  const receipt = body.receipt;
  if (isDictionary(receipt) && isDictionary(receipt.policy) && __epochIsString(receipt.policy.reason)) {
    return receipt.policy.reason;
  }
  return undefined;
}

async function readJson(response: Response): Promise<DictionaryValue> {
  try {
    const text = await response.text();
    if (text.trim() === "") return null;
    const parsed: DictionaryValue = JSON.parse(text);
    return parsed;
  } catch {
    return null;
  }
}

/** Policy input travels as plain JSON; the deployment revalidates every field. */
function policyJson(policy: LivePublicationPolicyInput): DictionaryValue {
  const encoded: DictionaryValue = JSON.parse(JSON.stringify(policy));
  return isDictionary(encoded) ? encoded : {};
}

function isDictionary(value: DictionaryValue): value is { readonly [key: string]: DictionaryValue } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
