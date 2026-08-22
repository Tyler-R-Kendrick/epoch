import { cipherToken } from "../stream-policy";
import type { LiveConsentScope, LivePublicationPolicy } from "./contracts";
type DictionaryValue = null | undefined | boolean | number | string | bigint | readonly DictionaryValue[] | { readonly [key: string]: DictionaryValue };
function __epochIsString<T>(value: T): value is T & string { return typeof value === "string"; }


/**
 * The fail-closed publication security engine for Live Spaces.
 *
 * This hardens the original stream policy for a public network: sanitization
 * is total and recursive rather than top-level-only, the deny baseline is
 * immutable and cannot be negated by user rules, user rewrite rules are a
 * constrained literal/glob language rather than arbitrary regular expressions
 * (so an attacker-authored rule can neither backtrack catastrophically nor
 * re-enable a denied field), and every refusal is a structured reason code
 * that never carries the sensitive value it refused.
 */

export type LiveSanitizeReason =
  | "protected-input"
  | "immutable-deny"
  | "not-in-presentation-view"
  | "action-not-stream-safe"
  | "schema-invalid"
  | "payload-too-large"
  | "depth-exceeded"
  | "unsafe-object-shape"
  | "rewrite-drop"
  | "unsafe-pattern"
  | "policy-stale"
  | "unverified-source"
  | "sequence-conflict"
  | "queue-overflow";

export type LiveSanitizeDecision =
  | { readonly kind: "emit"; readonly args: Readonly<Record<string, DictionaryValue>> }
  | { readonly kind: "drop"; readonly reason: LiveSanitizeReason }
  | { readonly kind: "quarantine"; readonly reason: LiveSanitizeReason };

export const LIVE_SANITIZER_BOUNDS = Object.freeze({
  maxDepth: 12,
  maxObjectKeys: 128,
  maxArrayElements: 512,
  maxStringLength: 8_192,
  maxCanonicalBytes: 65_536,
  maxRewriteRules: 64,
  maxRewriteLiteralLength: 256,
});

/**
 * The baseline deny set. These paths can never be re-enabled by any user
 * rule; negation applies only to user-added rules, evaluated afterwards.
 */
export const IMMUTABLE_LIVE_DENY_PATHS: readonly string[] = Object.freeze([
  "**/.env",
  "**/.env.*",
  "**/*.pem",
  "**/*.key",
  "**/*.p12",
  "**/id_rsa*",
  "**/id_ed25519*",
  "**/credentials*",
  "**/secrets/**",
  "**/.aws/**",
  "**/.ssh/**",
  "dms/**",
  "**/private/**",
]);

/** Key names that mark a payload as secret-bearing wherever they nest. */
const SECRET_KEY_MARKERS: readonly string[] = Object.freeze([
  "password", "passphrase", "secret", "token", "apikey", "authorization",
  "cookie", "otp", "onetimecode", "recoverycode", "credential", "privatekey",
  "e2eekey", "accesstoken", "refreshtoken", "sessionsalt", "signingkey",
  "clientsecret", "webhooksecret", "bearer",
]);

const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);

// ------------------------------------------------------------ path decisions

/** Normalize a logical Epoch path: NFKC, forward slashes, no dot segments. */
export function normalizeLivePath(path: string): string {
  const cleaned = path.normalize("NFKC").replaceAll("\\", "/").replace(/^\/+/u, "").replace(/\/+$/u, "");
  const segments: string[] = [];
  for (const segment of cleaned.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") return "";
    segments.push(segment);
  }
  return segments.join("/");
}

export function pathMatchesLivePattern(path: string, pattern: string): boolean {
  const cleaned = normalizeLivePattern(pattern);
  if (cleaned === "") return false;
  if (cleaned === "**") return true;
  if (cleaned.endsWith("/**")) {
    const prefix = cleaned.slice(0, -3);
    if (path === prefix || path.startsWith(`${prefix}/`)) return true;
  }
  // Wildcards become placeholders first, then the remainder is regex-escaped,
  // then the placeholders expand. `?` must take part in that: left alone it
  // survived escaping as a quantifier over the preceding character, so a deny
  // rule spelled `**/secret?.txt` released `secrets.txt` and hid `secre.txt`.
  // It is a single-character glob, and like `*` it never spans a separator.
  const escaped = cleaned
    .replaceAll("**/", "\0dbl\0")
    .replaceAll("**", "\0all\0")
    .replaceAll("*", "\0one\0")
    .replaceAll("?", "\0chr\0")
    .replaceAll(/[.+^${}()|[\]\\]/gu, "\\$&")
    .replaceAll("\0dbl\0", "(?:.*/)?")
    .replaceAll("\0all\0", ".*")
    .replaceAll("\0one\0", "[^/]*")
    .replaceAll("\0chr\0", "[^/]");
  return new RegExp(`^${escaped}$`, "u").test(path);
}

function normalizeLivePattern(pattern: string): string {
  return pattern.normalize("NFKC").replaceAll("\\", "/").replace(/^\/+/u, "").replace(/\/+$/u, "");
}

/**
 * True when the immutable baseline denies this path. User rules are never
 * consulted here, so `!**\/.env` and equivalent tricks cannot re-enable a
 * baseline-denied path.
 */
export function isImmutablyDeniedLivePath(path: string): boolean {
  const normalized = normalizeLivePath(path);
  if (normalized === "" && path.trim() !== "") return true;
  return IMMUTABLE_LIVE_DENY_PATHS.some((pattern) => pathMatchesLivePattern(normalized, pattern));
}

export type LivePathDecision =
  | { readonly kind: "allow" }
  | { readonly kind: "deny"; readonly reason: LiveSanitizeReason };

/**
 * Evaluate a path against baseline denials, then policy denials, then the
 * allow-list. The publisher starts from nothing visible: a path that matches
 * no allow pattern is refused.
 */
export function evaluateLivePath(path: string, policy: LivePublicationPolicy): LivePathDecision {
  const normalized = normalizeLivePath(path);
  if (normalized === "") return { kind: "deny", reason: "unsafe-pattern" };
  if (isImmutablyDeniedLivePath(normalized)) return { kind: "deny", reason: "immutable-deny" };
  for (const pattern of policy.deniedPathPatterns) {
    if (pattern.startsWith("!")) continue;
    if (pathMatchesLivePattern(normalized, pattern)) return { kind: "deny", reason: "not-in-presentation-view" };
  }
  const allowed = policy.allowedPathPatterns.some((pattern) =>
    !pattern.startsWith("!") && pathMatchesLivePattern(normalized, pattern));
  return allowed ? { kind: "allow" } : { kind: "deny", reason: "not-in-presentation-view" };
}

// -------------------------------------------------------------- rewrite rules

export interface LiveRewriteRule {
  readonly name: string;
  /** Literal or glob (`*` wildcard) matched against string values. */
  readonly match: string;
  readonly mode: "cipher" | "drop";
}

export interface LiveRewriteCompilation {
  readonly rules: readonly LiveRewriteRule[];
  readonly errors: readonly string[];
}

/**
 * Compile user rewrite rules at policy load. The accepted syntax is
 * `name = literal-or-glob → cipher|drop`, one per line. Regular-expression
 * constructs are refused entirely: no engine ever executes an
 * attacker-authored pattern in the publication hot path.
 */
export function compileLiveRewriteRules(source: string | undefined): LiveRewriteCompilation {
  const rules: LiveRewriteRule[] = [];
  const errors: string[] = [];
  if (source === undefined || source.trim() === "") return { rules: Object.freeze(rules), errors: Object.freeze(errors) };
  for (const raw of source.split("\n")) {
    const line = raw.trim();
    if (line === "" || line.startsWith("#")) continue;
    if (rules.length >= LIVE_SANITIZER_BOUNDS.maxRewriteRules) {
      errors.push("too many rewrite rules; later rules ignored");
      break;
    }
    const parsed = /^([A-Za-z][A-Za-z0-9_-]{0,63})\s*=\s*(.+?)\s*→\s*(cipher|drop)$/u.exec(line);
    if (parsed === null) {
      errors.push(`unsupported rewrite rule syntax: '${line.slice(0, 40)}'`);
      continue;
    }
    const match = parsed[2] ?? "";
    if (match.length > LIVE_SANITIZER_BOUNDS.maxRewriteLiteralLength) {
      errors.push("rewrite rule literal too long");
      continue;
    }
    if (/[\\^$.|?+()[\]{}]/u.test(match)) {
      errors.push(`rewrite rules accept literals and '*' globs only: '${parsed[1]}'`);
      continue;
    }
    // SAFETY: the regular expression above guarantees groups 1 and 3 are present.
    rules.push({ name: parsed[1] as string, match, mode: parsed[3] === "drop" ? "drop" : "cipher" });
  }
  return { rules: Object.freeze(rules), errors: Object.freeze(errors) };
}

interface RewriteOutcome {
  readonly text: string;
  readonly dropped: boolean;
}

function applyRewriteRules(
  text: string,
  rules: readonly LiveRewriteRule[],
  sessionSalt: string,
): RewriteOutcome {
  let output = text;
  for (const rule of rules) {
    const matched = rule.match.includes("*")
      ? globMatches(output, rule.match)
      : output.includes(rule.match) ? [rule.match] : [];
    if (matched.length === 0) continue;
    if (rule.mode === "drop") return { text: "", dropped: true };
    for (const value of matched) {
      output = output.split(value).join(cipherToken(sessionSalt, rule.name, value));
    }
  }
  // Builtin email masking, always active, using a fixed linear-time scan.
  output = maskEmails(output, sessionSalt);
  return { text: output, dropped: false };
}

/** Bounded glob match against whitespace-delimited tokens; no backtracking. */
function globMatches(text: string, pattern: string): readonly string[] {
  const parts = pattern.split("*");
  const matches: string[] = [];
  for (const token of text.split(/(\s+)/u)) {
    if (token.trim() === "") continue;
    if (tokenMatchesGlob(token, parts)) matches.push(token);
  }
  return matches;
}

function tokenMatchesGlob(token: string, parts: readonly string[]): boolean {
  let cursor = 0;
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index] ?? "";
    if (part === "") continue;
    const at = token.indexOf(part, cursor);
    if (at === -1) return false;
    if (index === 0 && at !== 0) return false;
    cursor = at + part.length;
  }
  const last = parts[parts.length - 1] ?? "";
  return last === "" || token.endsWith(last);
}

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/giu;

function maskEmails(text: string, sessionSalt: string): string {
  EMAIL_PATTERN.lastIndex = 0;
  return text.replace(EMAIL_PATTERN, (match) => cipherToken(sessionSalt, "email", match));
}

// --------------------------------------------------------- recursive sanitizer

export interface LiveSanitizeContext {
  readonly policy: LivePublicationPolicy;
  readonly rewriteRules: readonly LiveRewriteRule[];
  /** Per-session cryptographically random salt. Never published to spectators. */
  readonly sessionSalt: string;
  readonly protectedInput?: boolean;
}

interface TraversalState {
  bytes: number;
  readonly seen: Set<object>;
}

type TraversalResult =
  | { readonly kind: "ok"; readonly value: DictionaryValue }
  | { readonly kind: "fail"; readonly reason: LiveSanitizeReason };

/**
 * Total, bounded, recursive sanitization of JSON-shaped argument payloads.
 * Anything that is not plain data — accessors, class instances, symbols,
 * cyclic graphs, prototype-key smuggling — fails closed with a reason code.
 */
export function sanitizeLiveArgs(
  args: Readonly<Record<string, DictionaryValue>>,
  context: LiveSanitizeContext,
): LiveSanitizeDecision {
  if (context.protectedInput === true) return { kind: "drop", reason: "protected-input" };
  const state: TraversalState = { bytes: 0, seen: new Set() };
  const result = sanitizeValue(args, context, state, 0);
  if (result.kind === "fail") return { kind: "drop", reason: result.reason };
  if (!isDictionary(result.value)) return { kind: "drop", reason: "unsafe-object-shape" };
  return { kind: "emit", args: result.value };
}

function sanitizeValue(
  value: DictionaryValue,
  context: LiveSanitizeContext,
  state: TraversalState,
  depth: number,
): TraversalResult {
  if (depth > LIVE_SANITIZER_BOUNDS.maxDepth) return { kind: "fail", reason: "depth-exceeded" };
  if (value === null) return { kind: "ok", value: null };
  if (value === undefined) return { kind: "fail", reason: "unsafe-object-shape" };
  if (__epochIsString(value)) return sanitizeString(value, context, state);
  if (isBooleanValue(value)) return { kind: "ok", value };
  if (isNumberValue(value)) {
    return Number.isFinite(value) ? { kind: "ok", value } : { kind: "fail", reason: "unsafe-object-shape" };
  }
  if (isBigIntValue(value)) return { kind: "fail", reason: "unsafe-object-shape" };
  if (Array.isArray(value)) return sanitizeArray(value, context, state, depth);
  if (isDictionary(value)) return sanitizeObject(value, context, state, depth);
  return { kind: "fail", reason: "unsafe-object-shape" };
}

function sanitizeString(value: string, context: LiveSanitizeContext, state: TraversalState): TraversalResult {
  if (value.length > LIVE_SANITIZER_BOUNDS.maxStringLength) return { kind: "fail", reason: "payload-too-large" };
  state.bytes += value.length;
  if (state.bytes > LIVE_SANITIZER_BOUNDS.maxCanonicalBytes) return { kind: "fail", reason: "payload-too-large" };
  const normalized = value.normalize("NFKC");
  if (containsSecretMaterial(normalized)) return { kind: "fail", reason: "immutable-deny" };
  const rewritten = applyRewriteRules(normalized, context.rewriteRules, context.sessionSalt);
  if (rewritten.dropped) return { kind: "fail", reason: "rewrite-drop" };
  return { kind: "ok", value: rewritten.text };
}

function sanitizeArray(
  value: readonly DictionaryValue[],
  context: LiveSanitizeContext,
  state: TraversalState,
  depth: number,
): TraversalResult {
  if (value.length > LIVE_SANITIZER_BOUNDS.maxArrayElements) return { kind: "fail", reason: "payload-too-large" };
  const identity: object = value;
  if (state.seen.has(identity)) return { kind: "fail", reason: "unsafe-object-shape" };
  state.seen.add(identity);
  const items: DictionaryValue[] = [];
  for (const item of value) {
    const result = sanitizeValue(item, context, state, depth + 1);
    if (result.kind === "fail") return result;
    items.push(result.value);
  }
  state.seen.delete(identity);
  return { kind: "ok", value: Object.freeze(items) };
}

function sanitizeObject(
  value: { readonly [key: string]: DictionaryValue },
  context: LiveSanitizeContext,
  state: TraversalState,
  depth: number,
): TraversalResult {
  if (state.seen.has(value)) return { kind: "fail", reason: "unsafe-object-shape" };
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return { kind: "fail", reason: "unsafe-object-shape" };
  if (Object.getOwnPropertySymbols(value).length > 0) return { kind: "fail", reason: "unsafe-object-shape" };
  const names = Object.getOwnPropertyNames(value);
  if (names.length > LIVE_SANITIZER_BOUNDS.maxObjectKeys) return { kind: "fail", reason: "payload-too-large" };
  state.seen.add(value);
  const output: Record<string, DictionaryValue> = {};
  for (const key of names) {
    if (FORBIDDEN_KEYS.has(key)) return { kind: "fail", reason: "unsafe-object-shape" };
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || descriptor.get !== undefined || descriptor.set !== undefined) {
      return { kind: "fail", reason: "unsafe-object-shape" };
    }
    state.bytes += key.length;
    if (state.bytes > LIVE_SANITIZER_BOUNDS.maxCanonicalBytes) return { kind: "fail", reason: "payload-too-large" };
    if (isSecretKeyName(key)) return { kind: "fail", reason: "immutable-deny" };
    const result = sanitizeValue(descriptor.value, context, state, depth + 1);
    if (result.kind === "fail") return result;
    output[key] = result.value;
  }
  state.seen.delete(value);
  return { kind: "ok", value: Object.freeze(output) };
}

export function isSecretKeyName(key: string): boolean {
  const normalized = key.normalize("NFKC").toLowerCase().replaceAll(/[^a-z0-9]/gu, "");
  return SECRET_KEY_MARKERS.some((marker) => normalized.includes(marker));
}

/**
 * Credential shapes that are recognisable on their own, without help from the
 * key they were stored under.
 *
 * `isSecretKeyName` catches a credential filed under an honest label. Nothing
 * caught it when the label lied: a property test published an AWS access key
 * id under `view` and the publisher released it, because the only value-shaped
 * checks were a PEM block and a `Bearer` header. These are the vendor formats
 * that carry their own prefix and enough entropy after it to be unambiguous —
 * matching one is not a guess about intent, it is the format saying what it is.
 *
 * Deliberately narrow. A pattern loose enough to catch every possible
 * credential also drops ordinary prose, and a filter that eats a live session's
 * legitimate content gets turned off, which protects nobody.
 */
const SECRET_VALUE_PATTERNS: readonly RegExp[] = Object.freeze([
  // Authorization headers pasted into an argument.
  /\bBearer\s+[A-Za-z0-9._~+/-]{8,}/u,
  // AWS access key ids: a fixed four-character type prefix and 16 more.
  /\b(?:AKIA|ASIA|AIDA|AROA|AIPA|ANPA|ANVA|ABIA|ACCA)[A-Z0-9]{16}\b/u,
  // GitHub personal access, OAuth, user-to-server, server-to-server, refresh.
  /\bgh[pousr]_[A-Za-z0-9]{16,}/u,
  // OpenAI- and Anthropic-style secret keys.
  /\bsk-[A-Za-z0-9_-]{16,}/u,
  // Slack bot, app, personal, and legacy tokens.
  /\bxox[abporse]-[A-Za-z0-9-]{10,}/u,
  // Google API keys. Length is a range, not the exact 35 the format uses
  // today: a filter that a one-character drift slips past is not a filter.
  /\bAIza[A-Za-z0-9_-]{30,}/u,
  // A signed JWT: three base64url segments, the first two JSON objects.
  /\bey[A-Za-z0-9_-]{8,}\.ey[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/u,
]);

function containsSecretMaterial(value: string): boolean {
  // Any PEM-armoured private key, not only the ones spelled "PRIVATE KEY":
  // an OPENSSH block is the same material under a different header.
  if (value.includes("-----BEGIN") && /PRIVATE KEY|OPENSSH/u.test(value)) return true;
  return SECRET_VALUE_PATTERNS.some((pattern) => pattern.test(value));
}

function isDictionary(value: DictionaryValue): value is { readonly [key: string]: DictionaryValue } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBooleanValue(value: DictionaryValue): value is boolean {
  return typeof value === "boolean";
}

function isNumberValue(value: DictionaryValue): value is number {
  return typeof value === "number";
}

function isBigIntValue(value: DictionaryValue): value is bigint {
  return typeof value === "bigint";
}

// ------------------------------------------------------------------ preflight

export interface LivePreflightInput {
  readonly sessionId: string;
  readonly spaceId: string;
  readonly policy: LivePublicationPolicy;
  readonly policyDigest: string;
  readonly rewriteErrors?: readonly string[];
  readonly consentScopes?: readonly LiveConsentScope[];
  readonly mediaProviderReady?: boolean;
  readonly captionProviderReady?: boolean;
}

export interface LivePreflightReport {
  readonly sessionId: string;
  readonly spaceId: string;
  readonly policyDigest: string;
  readonly presentationViewRef: string;
  readonly allowedPathPatterns: readonly string[];
  readonly allowedActionIds: readonly string[];
  readonly immutableDenials: readonly string[];
  readonly requiredConsentScopes: readonly LiveConsentScope[];
  readonly missingConsentScopes: readonly LiveConsentScope[];
  readonly warnings: readonly string[];
  readonly errors: readonly string[];
  readonly startAllowed: boolean;
}

/**
 * Preflight uses the same policy object and sanitizer configuration the
 * publisher uses after start — there is no separate preview-only view of the
 * data. Start is refused while any error remains.
 */
export function runLivePreflight(input: LivePreflightInput): LivePreflightReport {
  const errors: string[] = [...(input.rewriteErrors ?? [])];
  const warnings: string[] = [];
  const policy = input.policy;
  if (policy.allowedPathPatterns.length === 0 && policy.allowedActionIds.length === 0) {
    errors.push("nothing is allow-listed: add at least one presentation path pattern or stream-safe action");
  }
  const requiredConsentScopes = requiredScopesFor(policy);
  const granted = new Set(input.consentScopes ?? []);
  const missingConsentScopes = requiredConsentScopes.filter((scope) => !granted.has(scope));
  if (missingConsentScopes.length > 0) {
    errors.push(`missing consent scopes: ${missingConsentScopes.join(", ")}`);
  }
  const wantsMedia = policy.media.audio || policy.media.camera || policy.media.screenShare;
  if (wantsMedia && input.mediaProviderReady !== true) {
    warnings.push("media provider is not ready; the session can still start semantic-only");
  }
  if (policy.media.captions === "required" && input.captionProviderReady !== true && wantsMedia) {
    errors.push("captions are required but no caption provider is ready");
  }
  if (policy.visibility === "public" || policy.visibility === "unlisted") {
    warnings.push("released data may be copied by spectators and cannot be recalled");
  }
  return {
    sessionId: input.sessionId,
    spaceId: input.spaceId,
    policyDigest: input.policyDigest,
    presentationViewRef: policy.presentationViewRef,
    allowedPathPatterns: policy.allowedPathPatterns,
    allowedActionIds: policy.allowedActionIds,
    immutableDenials: IMMUTABLE_LIVE_DENY_PATHS,
    requiredConsentScopes,
    missingConsentScopes: Object.freeze(missingConsentScopes),
    warnings: Object.freeze(warnings),
    errors: Object.freeze(errors),
    startAllowed: errors.length === 0,
  };
}

function requiredScopesFor(policy: LivePublicationPolicy): readonly LiveConsentScope[] {
  const scopes: LiveConsentScope[] = ["semantic-capture"];
  if (policy.media.audio) scopes.push("audio");
  if (policy.media.camera) scopes.push("camera");
  if (policy.media.screenShare) scopes.push("screen-share");
  if (policy.media.recording) scopes.push("recording");
  if (policy.media.externalEgress.length > 0) scopes.push("external-egress");
  return Object.freeze(scopes);
}
