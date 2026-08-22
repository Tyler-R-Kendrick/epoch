import { EpochCommandError, type EpochCommandReceipt, type LivePresentationEnvelopeV2 } from "@epoch/community-runtime";
import type { LiveSessionService } from "./live-session-service";
type BoundaryValue = null | undefined | boolean | number | string | bigint | symbol | Readonly<object>;
type DictionaryValue = null | undefined | boolean | number | string | bigint | readonly DictionaryValue[] | { readonly [key: string]: DictionaryValue };
function __epochIsString<T>(value: T): value is T & string { return typeof value === "string"; }


/**
 * The hosted Live Space HTTP surface.
 *
 * These routes are an adapter and nothing more: they translate request shapes,
 * enforce transport-level bounds the domain cannot see (origin, rate, client
 * count), and hand everything else to the shared command bus. They never decide
 * authority, and they never answer a question the caller was not authorized to
 * ask — an unreadable session and a nonexistent one return the same 404, so the
 * route surface is not an existence oracle.
 */

export interface LiveRequestAuthorization {
  readonly principalId: string;
  /** Session-scoped capabilities resolved by the host's trusted auth boundary. */
  readonly capabilities?: readonly string[];
}

export interface LiveRouteRateLimit {
  readonly windowMs: number;
  readonly maxRequests: number;
}

export interface LiveRouteOptions {
  readonly service: LiveSessionService;
  /** Resolves identity from a trusted host/session boundary; never from the body. */
  readonly resolveAuthorization?: (
    request: Request,
  ) => LiveRequestAuthorization | undefined | Promise<LiveRequestAuthorization | undefined>;
  /** Exact origins permitted for browser transports. Empty disables the check for non-browser hosts. */
  readonly allowedOrigins?: readonly string[];
  readonly basePath?: string;
  readonly now: () => number;
  readonly rateLimit?: LiveRouteRateLimit;
  /** Injected interval scheduler for SSE heartbeats; omit to disable heartbeats. */
  readonly scheduleInterval?: (delayMs: number, callback: () => void) => () => void;
  readonly heartbeatMs?: number;
  readonly maxEventPageSize?: number;
}

const DEFAULT_BASE_PATH = "/community/live";
const DEFAULT_MAX_EVENT_PAGE = 256;
const SCHEMA_VERSION = 1;
/** Media and token routes are deliberately absent from the generic command endpoint. */
const COMMAND_KIND_PREFIX = "live.";
const COMMAND_KIND_DENY_PREFIXES = ["live.media."];

export function createLiveSessionFetchHandler(options: LiveRouteOptions): (request: Request) => Promise<Response> {
  const basePath = options.basePath ?? DEFAULT_BASE_PATH;
  const maxEventPage = options.maxEventPageSize ?? DEFAULT_MAX_EVENT_PAGE;
  const buckets = new Map<string, { count: number; resetAtMs: number }>();

  function rateLimited(key: string): boolean {
    const limit = options.rateLimit;
    if (limit === undefined) return false;
    const nowMs = options.now();
    const bucket = buckets.get(key);
    if (bucket === undefined || nowMs >= bucket.resetAtMs) {
      buckets.set(key, { count: 1, resetAtMs: nowMs + limit.windowMs });
      return false;
    }
    bucket.count += 1;
    return bucket.count > limit.maxRequests;
  }

  /**
   * Cross-site request forgery over a browser transport starts with an origin
   * the operator never allow-listed, so the check is exact-match and applies
   * before any authorization work.
   */
  function originRejected(request: Request): boolean {
    const allowed = options.allowedOrigins;
    if (allowed === undefined || allowed.length === 0) return false;
    const origin = request.headers.get("origin");
    if (origin === null) return false;
    return !allowed.includes(origin);
  }

  return async (request) => {
    const url = new URL(request.url);
    if (!url.pathname.startsWith(basePath)) return notFound();
    if (originRejected(request)) return problem(403, "origin-not-allowed", "Origin is not allow-listed for live transports.");

    const authorization = await options.resolveAuthorization?.(request);
    const actor = authorization?.principalId ?? "anonymous";
    if (rateLimited(`${actor}:${request.method}`)) {
      return problem(429, "rate-limited", "Too many live session requests; retry after the window resets.");
    }

    const route = url.pathname.slice(basePath.length);
    const segments = route.split("/").filter((segment) => segment !== "");

    if (request.method === "POST" && segments.length === 1 && segments[0] === "sessions") {
      return runCommand(request, "live.session.create", actor);
    }
    const sessionId = segments[1];
    if (segments[0] !== "sessions" || sessionId === undefined) return notFound();

    if (request.method === "GET" && segments.length === 2) {
      return readCommand("live.session.show", sessionId, actor);
    }
    if (request.method === "POST" && segments.length === 3 && segments[2] === "commands") {
      return runCommand(request, undefined, actor, sessionId);
    }
    if (request.method === "POST" && segments.length === 3 && segments[2] === "join") {
      return runCommand(request, "live.participant.join", actor, sessionId);
    }
    if (request.method === "GET" && segments.length === 4 && segments[2] === "presentation") {
      if (segments[3] === "checkpoint") return checkpointResponse(sessionId, actor);
      if (segments[3] === "events") return eventsResponse(url, sessionId, actor);
      if (segments[3] === "stream") return streamResponse(request, sessionId, actor);
    }
    return notFound();
  };

  async function runCommand(
    request: Request,
    fixedKind: string | undefined,
    actor: string,
    sessionId?: string,
  ): Promise<Response> {
    let body: Readonly<Record<string, DictionaryValue>>;
    try {
      body = await objectBody(request);
    } catch {
      return problem(400, "invalid-body", "Request body must be a JSON object.");
    }
    const kind = fixedKind ?? stringField(body, "kind");
    if (kind === undefined || !kind.startsWith(COMMAND_KIND_PREFIX)) {
      return problem(400, "unsupported-command", "Only live.* commands are accepted on this endpoint.");
    }
    if (COMMAND_KIND_DENY_PREFIXES.some((prefix) => kind.startsWith(prefix))) {
      return problem(404, "not-found", NOT_FOUND_DETAIL);
    }
    const input = dictionaryField(body, "input");
    const merged = sessionId === undefined ? input : { ...input, sessionId };
    return execute({
      kind,
      input: merged,
      source: "api",
      actor,
      ...(body.confirmed === true && { confirmed: true }),
    });
  }

  async function readCommand(kind: string, sessionId: string, actor: string): Promise<Response> {
    return execute({ kind, input: { sessionId }, source: "api", actor });
  }

  async function execute(request: {
    readonly kind: string;
    readonly input: Readonly<Record<string, DictionaryValue>>;
    readonly source: "api";
    readonly actor: string;
    readonly confirmed?: boolean;
  }): Promise<Response> {
    try {
      const receipt = await options.service.run(request);
      return json({ schemaVersion: SCHEMA_VERSION, receipt }, statusForReceipt(receipt));
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      return errorResponse(error);
    }
  }

  async function checkpointResponse(sessionId: string, actor: string): Promise<Response> {
    try {
      const snapshot = await options.service.snapshot({ sessionId, actor, afterSequence: 0 });
      return json({
        schemaVersion: SCHEMA_VERSION,
        ...(snapshot.checkpoint !== undefined && { checkpoint: snapshot.checkpoint }),
        envelopes: snapshot.envelopes,
        releasedThroughSequence: snapshot.releasedThroughSequence,
        lifecycle: snapshot.session.lifecycle,
      });
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      return errorResponse(error);
    }
  }

  async function eventsResponse(url: URL, sessionId: string, actor: string): Promise<Response> {
    const after = integerParameter(url, "after", 0);
    const limit = Math.min(maxEventPage, integerParameter(url, "limit", maxEventPage));
    try {
      const envelopes = await options.service.events({ sessionId, actor, afterSequence: after, limit });
      return json({
        schemaVersion: SCHEMA_VERSION,
        envelopes,
        nextAfter: envelopes.at(-1)?.sequence ?? after,
      });
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      return errorResponse(error);
    }
  }

  /**
   * Server-sent events with `Last-Event-ID` resume.
   *
   * The cursor is the envelope sequence, so a reconnecting spectator names
   * exactly what it already has and receives exactly what it missed. Delivery
   * is bounded by the hub; when a bound is hit the connection is refused
   * outright rather than silently dropping frames a client would never know
   * were missing.
   */
  async function streamResponse(request: Request, sessionId: string, actor: string): Promise<Response> {
    const lastEventId = request.headers.get("last-event-id");
    const resumeFrom = lastEventId === null ? integerParameter(new URL(request.url), "after", 0) : toInteger(lastEventId, 0);
    let backlog: readonly LivePresentationEnvelopeV2[];
    try {
      backlog = await options.service.events({
        sessionId, actor, afterSequence: resumeFrom, limit: maxEventPage,
      });
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      return errorResponse(error);
    }

    const encoder = new TextEncoder();
    let cancelHeartbeat: (() => void) | undefined;
    let subscription: { close(): void } | undefined;
    let refused = false;

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const send = (chunk: string): void => {
          try {
            controller.enqueue(encoder.encode(chunk));
          } catch {
            // The peer went away between frames; cleanup happens in cancel().
          }
        };
        for (const envelope of backlog) send(sseFrame(envelope));
        const opened = options.service.hub.subscribe(sessionId, {
          onEnvelope: (envelope) => send(sseFrame(envelope)),
          onClose: (reason) => {
            send(`event: closed\ndata: ${JSON.stringify({ reason })}\n\n`);
            cancelHeartbeat?.();
            controller.close();
          },
        });
        if (opened === undefined) {
          refused = true;
          send(`event: refused\ndata: ${JSON.stringify({ reason: "capacity" })}\n\n`);
          controller.close();
          return;
        }
        subscription = opened;
        if (options.scheduleInterval !== undefined && (options.heartbeatMs ?? 0) > 0) {
          cancelHeartbeat = options.scheduleInterval(options.heartbeatMs ?? 0, () => send(": heartbeat\n\n"));
        }
      },
      cancel() {
        cancelHeartbeat?.();
        subscription?.close();
      },
    });

    return new Response(stream, {
      status: refused ? 503 : 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-store",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  }
}

function sseFrame(envelope: LivePresentationEnvelopeV2): string {
  return `id: ${envelope.sequence}\nevent: presentation\ndata: ${JSON.stringify(envelope)}\n\n`;
}

/**
 * A denial never distinguishes "you may not" from "it does not exist" on read
 * paths, because that distinction is itself private information.
 */
const NOT_FOUND_DETAIL = "Live session not found.";

function statusForReceipt(receipt: EpochCommandReceipt): number {
  if (receipt.policy.decision === "deny") return 403;
  if (receipt.policy.decision === "confirm") return 409;
  return 200;
}

function errorResponse(error: Error | EpochCommandError): Response {
  const code = error instanceof EpochCommandError ? error.code : "internal-error";
  if (code === "not-found") return problem(404, "not-found", NOT_FOUND_DETAIL);
  if (code === "policy-denied") return problem(403, "policy-denied", "The command was refused by policy.");
  if (code === "invalid-input") return problem(400, "invalid-input", "The command input was rejected.");
  if (code === "unknown-command") return problem(400, "unsupported-command", "Unknown live command.");
  return problem(500, "internal-error", "The live session request could not be completed.");
}

function notFound(): Response {
  return problem(404, "not-found", NOT_FOUND_DETAIL);
}

function problem(status: number, code: string, detail: string): Response {
  return json({ schemaVersion: SCHEMA_VERSION, error: { code, detail } }, status);
}

function json(value: BoundaryValue, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

async function objectBody(request: Request): Promise<Readonly<Record<string, DictionaryValue>>> {
  const text = await request.text();
  if (text.trim() === "") return {};
  const value: DictionaryValue = JSON.parse(text);
  if (!isDictionary(value)) throw new Error("Request body must be a JSON object.");
  return value;
}

function isDictionary(value: DictionaryValue): value is { readonly [key: string]: DictionaryValue } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringField(body: Readonly<Record<string, DictionaryValue>>, key: string): string | undefined {
  const value = body[key];
  return __epochIsString(value) && value.trim() !== "" ? value : undefined;
}

function dictionaryField(
  body: Readonly<Record<string, DictionaryValue>>,
  key: string,
): Readonly<Record<string, DictionaryValue>> {
  const value = body[key];
  return isDictionary(value) ? value : {};
}

function integerParameter(url: URL, name: string, fallback: number): number {
  return toInteger(url.searchParams.get(name), fallback);
}

function toInteger(value: string | null, fallback: number): number {
  if (value === null) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : fallback;
}
