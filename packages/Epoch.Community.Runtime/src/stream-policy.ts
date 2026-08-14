/**
 * Fail-closed livestream policy.
 *
 * Streams carry command envelopes, never pixels or keystrokes. Spectators replay
 * those commands in their own view. Private identity, secrets, and protected
 * inputs are dropped or replaced with a fixed-width cipher — never a length oracle.
 */
import { identifier } from "./digest";

export const STREAM_CIPHER_WIDTH = 12;
export const STREAM_CIPHER_ALPHABET = "░▒▓█▀▄■□◆◇※‡†¤§øæ#@%&";

export interface StreamCommandEnvelope {
  readonly t: number;
  readonly actorId: string;
  readonly actionId: string;
  readonly args: Readonly<Record<string, unknown>>;
  readonly path?: string;
}

export interface StreamSanitizeInput {
  readonly envelope: StreamCommandEnvelope;
  readonly inputMuted?: boolean;
  readonly protectedInput?: boolean;
  readonly ignore?: string;
  readonly rewrite?: string;
  readonly sessionSalt?: string;
  readonly spectatorCanReadPath?: (path: string) => boolean;
}

export type StreamSanitizeResult =
  | { readonly kind: "emit"; readonly envelope: StreamCommandEnvelope }
  | { readonly kind: "drop"; readonly reason: string };

export type StreamReplayDecision =
  | { readonly kind: "apply"; readonly envelope: StreamCommandEnvelope }
  | { readonly kind: "skip"; readonly reason: string };

const INPUT_ACTIONS = new Set([
  "compose.publish",
  "prompt.mode",
  "search.open",
  "search.localFilter",
  "context.act",
  "identity.login",
  "identity.claim",
]);

const VIEW_PREFERENCE_PREFIXES = ["theme."];

export const DEFAULT_STREAM_IGNORE = [
  "**/.env",
  "**/.env.*",
  "**/*.pem",
  "**/id_rsa*",
  "**/credentials*",
  "**/secrets/**",
  "dms/**",
  "**/private/**",
].join("\n");

const DEFAULT_REWRITE: readonly { readonly name: string; readonly pattern: RegExp; readonly mode: "cipher" | "drop" }[] = [
  { name: "email", pattern: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, mode: "cipher" },
];

export function parseStreamIgnore(source: string | undefined): readonly string[] {
  const lines = `${DEFAULT_STREAM_IGNORE}\n${source ?? ""}`.split("\n");
  const rules: string[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    rules.push(line);
  }
  return Object.freeze(rules);
}

export function pathIsStreamIgnored(path: string, rules: readonly string[]): boolean {
  const normalized = normalizePath(path);
  let ignored = false;
  for (const rule of rules) {
    const negated = rule.startsWith("!");
    const pattern = negated ? rule.slice(1) : rule;
    if (matchGlob(normalized, pattern)) ignored = !negated;
  }
  return ignored;
}

export function isProtectedStreamTarget(input: {
  readonly path?: string;
  readonly inputType?: string;
  readonly autocomplete?: string;
  readonly protectAttr?: boolean;
  readonly inAuthDialog?: boolean;
}): boolean {
  if (input.protectAttr === true || input.inAuthDialog === true) return true;
  if (input.inputType === "password") return true;
  if (input.autocomplete === "one-time-code" || input.autocomplete === "current-password") return true;
  const path = normalizePath(input.path ?? "");
  return pathIsStreamIgnored(path, parseStreamIgnore(undefined));
}

export function cipherToken(sessionSalt: string, field: string, value: string): string {
  const digest = identifier("stream", { sessionSalt, field, value });
  let out = "";
  for (let index = 0; index < STREAM_CIPHER_WIDTH; index += 1) {
    const code = digest.charCodeAt(index % digest.length) + index;
    out += STREAM_CIPHER_ALPHABET[code % STREAM_CIPHER_ALPHABET.length];
  }
  return out;
}

export function sanitizeStreamCommand(input: StreamSanitizeInput): StreamSanitizeResult {
  const envelope = input.envelope;
  if (input.protectedInput === true || input.inputMuted === true) {
    if (isInputAction(envelope.actionId) || hasTextPayload(envelope.args)) {
      return { kind: "drop", reason: "protected-input" };
    }
  }
  const rules = parseStreamIgnore(input.ignore);
  const path = envelope.path ?? "";
  if (path && pathIsStreamIgnored(path, rules)) {
    return { kind: "drop", reason: "ignored-path" };
  }
  if (path && input.spectatorCanReadPath && !input.spectatorCanReadPath(path)) {
    return { kind: "drop", reason: "not-public" };
  }
  const rewritten = rewriteArgs(envelope.args, input.rewrite, input.sessionSalt ?? "session");
  if (rewritten.dropped) return { kind: "drop", reason: "rewrite-drop" };
  return {
    kind: "emit",
    envelope: {
      t: envelope.t,
      actorId: envelope.actorId,
      actionId: envelope.actionId,
      args: rewritten.args,
      ...(path ? { path } : {}),
    },
  };
}

function isInputAction(actionId: string): boolean {
  return INPUT_ACTIONS.has(actionId) || actionId.startsWith("prompt.") || actionId.startsWith("compose.");
}

export function isSpectatorViewPreference(actionId: string): boolean {
  return VIEW_PREFERENCE_PREFIXES.some((prefix) => actionId.startsWith(prefix));
}

export function replayStreamCommand(envelope: StreamCommandEnvelope): StreamReplayDecision {
  if (isSpectatorViewPreference(envelope.actionId)) {
    return { kind: "skip", reason: "view-preference" };
  }
  return { kind: "apply", envelope };
}

function hasTextPayload(args: Readonly<Record<string, unknown>>): boolean {
  return typeof args.body === "string" || typeof args.text === "string" || typeof args.value === "string";
}

function rewriteArgs(
  args: Readonly<Record<string, unknown>>,
  rewriteSource: string | undefined,
  sessionSalt: string,
): { readonly args: Readonly<Record<string, unknown>>; readonly dropped: boolean } {
  const rules = [...DEFAULT_REWRITE, ...parseStreamRewrite(rewriteSource)];
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    if (typeof value !== "string") {
      next[key] = value;
      continue;
    }
    let text = value;
    for (const rule of rules) {
      rule.pattern.lastIndex = 0;
      if (!rule.pattern.test(text)) continue;
      if (rule.mode === "drop") return { args: {}, dropped: true };
      rule.pattern.lastIndex = 0;
      text = text.replace(rule.pattern, (match) => cipherToken(sessionSalt, rule.name, match));
    }
    next[key] = text;
  }
  return { args: Object.freeze(next), dropped: false };
}

export function parseStreamRewrite(source: string | undefined): readonly { readonly name: string; readonly pattern: RegExp; readonly mode: "cipher" | "drop" }[] {
  if (!source) return [];
  const rules: { name: string; pattern: RegExp; mode: "cipher" | "drop" }[] = [];
  for (const raw of source.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const match = /^([A-Za-z][A-Za-z0-9_-]*)\s*=\s*\/(.+)\/([a-z]*)\s*→\s*(cipher|drop)\s*$/u.exec(line);
    if (!match) continue;
    try {
      rules.push({
        name: match[1]!,
        pattern: new RegExp(match[2]!, match[3]),
        mode: match[4] as "cipher" | "drop",
      });
    } catch {
      /* invalid patterns are ignored, defaults still apply */
    }
  }
  return rules;
}

function normalizePath(path: string): string {
  return String(path ?? "").replaceAll("\\", "/").replace(/^\/+/u, "").replace(/\/+$/u, "");
}

function matchGlob(path: string, pattern: string): boolean {
  const cleaned = normalizePath(pattern);
  if (cleaned.endsWith("/**")) {
    const prefix = cleaned.slice(0, -3);
    return path === prefix || path.startsWith(`${prefix}/`);
  }
  const escaped = cleaned
    .replaceAll("**/", "\0dbl\0")
    .replaceAll("**", "\0all\0")
    .replaceAll("*", "\0one\0")
    .replaceAll(/[.+^${}()|[\]\\]/gu, "\\$&")
    .replaceAll("\0dbl\0", "(?:.*/)?")
    .replaceAll("\0all\0", ".*")
    .replaceAll("\0one\0", "[^/]*");
  return new RegExp(`^${escaped}$`, "u").test(path);
}
