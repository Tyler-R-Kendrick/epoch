import { EpochCommandError, type EpochCommandReceipt } from "../receipts";
import type { CommunityRuntime } from "../runtime";
import type {
  LiveConsentScope,
  LivePresentationCheckpoint,
  LivePublicationPolicyInput,
  LiveReplayCompleteness,
} from "./contracts";
import type { LiveParticipantRole, LiveSessionSnapshot } from "./commands";
type DictionaryValue = null | undefined | boolean | number | string | bigint | readonly DictionaryValue[] | { readonly [key: string]: DictionaryValue };


/**
 * The typed SDK surface for Live Spaces.
 *
 * It is a thin, named spelling of the same bus commands the CLI parses and the
 * browser dispatches — not a second path into the domain. Every method returns
 * the receipt, so an SDK caller sees the same policy decision, the same event
 * ids, and the same refusals as every other adapter, and confirmation stays an
 * explicit argument rather than something the client decides on the caller's
 * behalf.
 */
export interface LiveSpaceClient {
  create(input: {
    readonly spaceId: string;
    readonly policy: LivePublicationPolicyInput;
  }): Promise<EpochCommandReceipt<LiveSessionSnapshot>>;
  show(sessionId: string): Promise<EpochCommandReceipt<LiveSessionSnapshot>>;
  list(): Promise<EpochCommandReceipt<readonly LiveSessionSnapshot[]>>;
  preflight(sessionId: string): Promise<EpochCommandReceipt>;
  consent(sessionId: string, scopes: readonly LiveConsentScope[]): Promise<EpochCommandReceipt>;
  openLobby(sessionId: string): Promise<EpochCommandReceipt<LiveSessionSnapshot>>;
  /** Irreversible steps take confirmation explicitly; the default is refusal. */
  start(sessionId: string, options?: { readonly confirmed?: boolean }): Promise<EpochCommandReceipt<LiveSessionSnapshot>>;
  pause(sessionId: string): Promise<EpochCommandReceipt<LiveSessionSnapshot>>;
  resume(sessionId: string): Promise<EpochCommandReceipt<LiveSessionSnapshot>>;
  end(sessionId: string, options?: { readonly confirmed?: boolean }): Promise<EpochCommandReceipt<LiveSessionSnapshot>>;
  seal(sessionId: string, input?: {
    readonly completeness?: LiveReplayCompleteness;
    readonly confirmed?: boolean;
  }): Promise<EpochCommandReceipt>;
  publish(input: {
    readonly sessionId: string;
    readonly actionId: string;
    readonly args?: Readonly<Record<string, DictionaryValue>>;
    readonly path?: string;
  }): Promise<EpochCommandReceipt>;
  status(sessionId: string): Promise<EpochCommandReceipt>;
  checkpoint(sessionId: string): Promise<EpochCommandReceipt<LivePresentationCheckpoint>>;
  join(sessionId: string): Promise<EpochCommandReceipt<LiveSessionSnapshot>>;
  requestGrant(sessionId: string, capability: string): Promise<EpochCommandReceipt>;
  grant(input: {
    readonly sessionId: string;
    readonly principalId: string;
    readonly role: LiveParticipantRole;
    readonly confirmed?: boolean;
  }): Promise<EpochCommandReceipt<LiveSessionSnapshot>>;
  revoke(input: {
    readonly sessionId: string;
    readonly principalId: string;
    readonly confirmed?: boolean;
  }): Promise<EpochCommandReceipt<LiveSessionSnapshot>>;
  lockJoins(sessionId: string, locked: boolean): Promise<EpochCommandReceipt<LiveSessionSnapshot>>;
  bookmark(sessionId: string, checkpointId: string): Promise<EpochCommandReceipt>;
  annotate(input: {
    readonly sessionId: string;
    readonly checkpointId: string;
    readonly body: string;
    readonly path?: string;
  }): Promise<EpochCommandReceipt>;
  forkAt(sessionId: string, checkpointId: string): Promise<EpochCommandReceipt>;
  report(sessionId: string, reason: string): Promise<EpochCommandReceipt>;
}

export function createLiveSpaceClient(runtime: CommunityRuntime): LiveSpaceClient {
  function run<TData>(
    kind: string,
    input: Readonly<Record<string, DictionaryValue>>,
    confirmed = false,
  ): Promise<EpochCommandReceipt<TData>> {
    return runtime.commands.execute<TData>({ kind, input, source: "sdk", confirmed });
  }

  return {
    create: (input) => run<LiveSessionSnapshot>("live.session.create", {
      spaceId: input.spaceId,
      policy: policyToJson(input.policy),
    }),
    show: (sessionId) => run<LiveSessionSnapshot>("live.session.show", { sessionId }),
    list: () => run<readonly LiveSessionSnapshot[]>("live.session.list", {}),
    preflight: (sessionId) => run("live.session.preflight", { sessionId }),
    consent: (sessionId, scopes) => run("live.session.consent", { sessionId, scopes: [...scopes] }),
    openLobby: (sessionId) => run<LiveSessionSnapshot>("live.session.openLobby", { sessionId }),
    start: (sessionId, options) => run<LiveSessionSnapshot>("live.session.start", { sessionId }, options?.confirmed === true),
    pause: (sessionId) => run<LiveSessionSnapshot>("live.session.pause", { sessionId }),
    resume: (sessionId) => run<LiveSessionSnapshot>("live.session.resume", { sessionId }),
    end: (sessionId, options) => run<LiveSessionSnapshot>("live.session.end", { sessionId }, options?.confirmed === true),
    seal: (sessionId, input) => run("live.session.seal", {
      sessionId,
      ...(input?.completeness !== undefined && { completeness: input.completeness }),
    }, input?.confirmed === true),
    publish: (input) => run("live.presentation.publish", {
      sessionId: input.sessionId,
      actionId: input.actionId,
      args: input.args ?? {},
      ...(input.path !== undefined && { path: input.path }),
    }),
    status: (sessionId) => run("live.presentation.status", { sessionId }),
    checkpoint: (sessionId) => run<LivePresentationCheckpoint>("live.presentation.checkpoint", { sessionId }),
    join: (sessionId) => run<LiveSessionSnapshot>("live.participant.join", { sessionId }),
    requestGrant: (sessionId, capability) => run("live.participant.requestGrant", { sessionId, capability }),
    grant: (input) => run<LiveSessionSnapshot>("live.participant.grant", {
      sessionId: input.sessionId,
      principalId: input.principalId,
      role: input.role,
    }, input.confirmed === true),
    revoke: (input) => run<LiveSessionSnapshot>("live.participant.revoke", {
      sessionId: input.sessionId,
      principalId: input.principalId,
    }, input.confirmed === true),
    lockJoins: (sessionId, locked) => run<LiveSessionSnapshot>("live.participant.lockJoins", { sessionId, locked }),
    bookmark: (sessionId, checkpointId) => run("live.presentation.bookmark", { sessionId, checkpointId }),
    annotate: (input) => run("live.presentation.annotate", {
      sessionId: input.sessionId,
      checkpointId: input.checkpointId,
      body: input.body,
      ...(input.path !== undefined && { path: input.path }),
    }),
    forkAt: (sessionId, checkpointId) => run("live.presentation.forkAt", { sessionId, checkpointId }),
    report: (sessionId, reason) => run("live.moderation.report", { sessionId, reason }),
  };
}

/** Policy input is JSON on the wire; normalization revalidates every field. */
function policyToJson(policy: LivePublicationPolicyInput): Readonly<Record<string, DictionaryValue>> {
  const encoded: DictionaryValue = JSON.parse(JSON.stringify(policy));
  if (!isJsonDictionary(encoded)) {
    throw new EpochCommandError("invalid-input", "Live publication policy must be a JSON object.");
  }
  return encoded;
}

function isJsonDictionary(value: DictionaryValue): value is { readonly [key: string]: DictionaryValue } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
