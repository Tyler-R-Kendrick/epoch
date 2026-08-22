import assert from "node:assert/strict";
import {
  classifyLivePolicyChange,
  compileLiveRewriteRules,
  evaluateLivePath,
  isImmutablyDeniedLivePath,
  isSecretKeyName,
  nextLiveLifecycle,
  normalizeLivePublicationPolicy,
  runLivePreflight,
  sanitizeLiveArgs,
  type LivePublicationPolicy,
  type LivePublicationPolicyInput,
  type LiveSanitizeContext,
} from "@epoch/community-runtime";
import type { TestJsonObject } from "../helpers/json-types";

type DictionaryValue = null | undefined | boolean | number | string | bigint | readonly DictionaryValue[] | { readonly [key: string]: DictionaryValue };

/**
 * Live Spaces publication security engine.
 *
 * These are the adversarial cases the mandate treats as rejection criteria:
 * nested secrets, baseline-deny negation, prototype smuggling, oversized and
 * cyclic payloads, attacker-authored rewrite rules, and security-mode
 * contradictions must all fail closed with reason codes and no leaked value.
 */
export function runLiveSpacesPolicyTests(): void {
  lifecycleMachineIsDeterministicAndSealedIsImmutable();
  policyNormalizationBoundsAndDigests();
  securityModeContradictionsAreRefused();
  policyChangeClassificationDrivesConfirmation();
  immutableDenyBaselineCannotBeNegated();
  allowListStartsFromNothingVisible();
  recursiveSanitizerCatchesNestedSecrets();
  recursiveSanitizerRejectsHostileValues();
  recursiveSanitizerBoundsDepthAndSize();
  rewriteRulesAreConstrainedAndCompiledSafely();
  cipherOutputLeaksNoLengthAndPreflightIsHonest();
}

function policyOf(overrides: LivePublicationPolicyInput = {}): LivePublicationPolicy {
  const normalized = normalizeLivePublicationPolicy({
    visibility: "public",
    securityMode: "semantic-only",
    presentationViewRef: "views/present",
    allowedPathPatterns: ["packages/app/**", "docs/**"],
    allowedActionIds: ["view.open", "diff.show"],
    ...overrides,
  });
  if (normalized.kind !== "valid") throw new Error(`fixture policy invalid: ${normalized.errors.join(", ")}`);
  return normalized.policy;
}

function contextOf(policy: LivePublicationPolicy = policyOf()): LiveSanitizeContext {
  return { policy, rewriteRules: [], sessionSalt: "test-salt" };
}

function lifecycleMachineIsDeterministicAndSealedIsImmutable(): void {
  assert.deepEqual(nextLiveLifecycle("draft", "openLobby"), { kind: "ok", state: "lobby" });
  assert.deepEqual(nextLiveLifecycle("lobby", "start"), { kind: "ok", state: "live" });
  assert.deepEqual(nextLiveLifecycle("live", "pause"), { kind: "ok", state: "paused" });
  assert.deepEqual(nextLiveLifecycle("paused", "resume"), { kind: "ok", state: "live" });
  assert.deepEqual(nextLiveLifecycle("paused", "end"), { kind: "ok", state: "ended" });
  assert.deepEqual(nextLiveLifecycle("ended", "seal"), { kind: "ok", state: "sealed" });
  // Skipping the lobby, re-starting, or mutating a sealed session all refuse.
  assert.equal(nextLiveLifecycle("draft", "start").kind, "refused");
  assert.equal(nextLiveLifecycle("live", "start").kind, "refused");
  assert.equal(nextLiveLifecycle("draft", "seal").kind, "refused");
  for (const command of ["openLobby", "start", "pause", "resume", "end", "seal"] as const) {
    const decision = nextLiveLifecycle("sealed", command);
    assert.equal(decision.kind, "refused");
    if (decision.kind === "refused") assert.match(decision.reason, /immutable/u);
  }
}

function policyNormalizationBoundsAndDigests(): void {
  const first = normalizeLivePublicationPolicy({ presentationViewRef: "views/present", allowedActionIds: ["b", "a", "a"] });
  const second = normalizeLivePublicationPolicy({ presentationViewRef: "views/present", allowedActionIds: ["a", "b"] });
  assert.equal(first.kind, "valid");
  assert.equal(second.kind, "valid");
  if (first.kind === "valid" && second.kind === "valid") {
    // Order and duplicates never change the digest: one policy, one identity.
    assert.equal(first.digest, second.digest);
  }
  const invalid = normalizeLivePublicationPolicy({
    presentationViewRef: "",
    publicationDelayMs: 999_999,
    allowedPathPatterns: ["../escape", "x".repeat(300)],
    media: { externalEgress: ["rtmp://attacker.example/live"] },
    retention: { mode: "forever" },
  });
  assert.equal(invalid.kind, "invalid");
  if (invalid.kind === "invalid") {
    assert.ok(invalid.errors.some((error) => error.includes("presentationViewRef")));
    assert.ok(invalid.errors.some((error) => error.includes("publicationDelayMs")));
    assert.ok(invalid.errors.some((error) => error.includes("dot segments")));
    assert.ok(invalid.errors.some((error) => error.includes("egress-ref")));
    assert.ok(invalid.errors.some((error) => error.includes("retention")));
  }
}

function securityModeContradictionsAreRefused(): void {
  const e2eeRecording = normalizeLivePublicationPolicy({
    presentationViewRef: "views/present",
    securityMode: "private-e2ee",
    media: { audio: true, recording: true },
  });
  assert.equal(e2eeRecording.kind, "invalid");
  const publicNoCaptions = normalizeLivePublicationPolicy({
    presentationViewRef: "views/present",
    visibility: "public",
    securityMode: "public-broadcast",
    media: { audio: true, captions: "disabled" },
  });
  assert.equal(publicNoCaptions.kind, "invalid");
  if (publicNoCaptions.kind === "invalid") {
    assert.ok(publicNoCaptions.errors.some((error) => error.includes("captions")));
  }
  const semanticWithMedia = normalizeLivePublicationPolicy({
    presentationViewRef: "views/present",
    securityMode: "semantic-only",
    media: { camera: true },
  });
  assert.equal(semanticWithMedia.kind, "invalid");
}

function policyChangeClassificationDrivesConfirmation(): void {
  const base = policyOf();
  assert.equal(classifyLivePolicyChange(base, policyOf()), "equal");
  const narrowed = policyOf({ allowedPathPatterns: ["packages/app/**"] });
  assert.equal(classifyLivePolicyChange(base, narrowed), "narrowing");
  const widened = policyOf({ allowedPathPatterns: ["packages/app/**", "docs/**", "test/**"] });
  assert.equal(classifyLivePolicyChange(base, widened), "widening");
  const shorterDelay = policyOf({ publicationDelayMs: 0 });
  const longerDelay = policyOf({ publicationDelayMs: 30_000 });
  assert.equal(classifyLivePolicyChange(longerDelay, shorterDelay), "widening");
  assert.equal(classifyLivePolicyChange(shorterDelay, longerDelay), "narrowing");
}

function immutableDenyBaselineCannotBeNegated(): void {
  for (const path of [".env", "apps/api/.env.local", "config/secrets/prod.json", "dms/maya", "keys/deploy.pem", "home/.ssh/id_rsa"]) {
    assert.equal(isImmutablyDeniedLivePath(path), true, `expected baseline denial for ${path}`);
  }
  // Unicode and separator games do not bypass the baseline.
  assert.equal(isImmutablyDeniedLivePath("apps\\api\\.env"), true);
  assert.equal(isImmutablyDeniedLivePath("secrets/../.env"), true);
  // A user allow pattern that names a denied path still loses: baseline first.
  const policy = policyOf({ allowedPathPatterns: ["**"] });
  const denied = evaluateLivePath(".env", policy);
  assert.deepEqual(denied, { kind: "deny", reason: "immutable-deny" });
  const negation = evaluateLivePath("secrets/keys.txt", policyOf({ allowedPathPatterns: ["!**/.env", "**"] }));
  assert.equal(negation.kind, "deny");
}

function allowListStartsFromNothingVisible(): void {
  const nothingAllowed = policyOf({ allowedPathPatterns: [] });
  assert.deepEqual(evaluateLivePath("packages/app/board.ts", nothingAllowed),
    { kind: "deny", reason: "not-in-presentation-view" });
  const policy = policyOf();
  assert.deepEqual(evaluateLivePath("packages/app/board.ts", policy), { kind: "allow" });
  assert.deepEqual(evaluateLivePath("packages/other/file.ts", policy),
    { kind: "deny", reason: "not-in-presentation-view" });
  const withDenied = policyOf({ deniedPathPatterns: ["packages/app/internal/**"] });
  assert.deepEqual(evaluateLivePath("packages/app/internal/plan.md", withDenied),
    { kind: "deny", reason: "not-in-presentation-view" });
}

function recursiveSanitizerCatchesNestedSecrets(): void {
  const context = contextOf();
  // Top-level, nested, and array-contained secret key names all fail closed.
  assert.deepEqual(sanitizeLiveArgs({ password: "hunter2" }, context), { kind: "drop", reason: "immutable-deny" });
  assert.deepEqual(sanitizeLiveArgs({ config: { nested: { Authorization: "abc" } } }, context),
    { kind: "drop", reason: "immutable-deny" });
  assert.deepEqual(sanitizeLiveArgs({ items: [{ api_key: "k" }] }, context), { kind: "drop", reason: "immutable-deny" });
  // Separator and case disguises are normalized before matching.
  assert.equal(isSecretKeyName("Api-Key"), true);
  assert.equal(isSecretKeyName("ACCESS_TOKEN"), true);
  assert.equal(isSecretKeyName("wébhook_sécret".normalize("NFD")), false);
  assert.equal(isSecretKeyName("webhook_secret"), true);
  // Secret-shaped values are refused even under innocent key names.
  assert.deepEqual(sanitizeLiveArgs({ note: "Bearer abcdefgh12345678" }, context), { kind: "drop", reason: "immutable-deny" });
  assert.deepEqual(sanitizeLiveArgs({ note: "-----BEGIN RSA PRIVATE KEY----- x" }, context),
    { kind: "drop", reason: "immutable-deny" });
  // Protected input drops everything regardless of content.
  assert.deepEqual(sanitizeLiveArgs({ text: "hello" }, { ...context, protectedInput: true }),
    { kind: "drop", reason: "protected-input" });
  const clean = sanitizeLiveArgs({ view: "board", depth: 2, tags: ["a", "b"] }, context);
  assert.equal(clean.kind, "emit");
}

function recursiveSanitizerRejectsHostileValues(): void {
  const context = contextOf();
  // Cycles fail closed instead of hanging.
  const cyclic: Record<string, DictionaryValue> = {};
  cyclic.self = cyclic;
  assert.deepEqual(sanitizeLiveArgs(cyclic, context), { kind: "drop", reason: "unsafe-object-shape" });
  // Getters never execute during traversal.
  let executed = false;
  const withGetter: Record<string, DictionaryValue> = {};
  Object.defineProperty(withGetter, "value", { get: () => { executed = true; return "boom"; }, enumerable: true });
  assert.deepEqual(sanitizeLiveArgs({ payload: withGetter }, context),
    { kind: "drop", reason: "unsafe-object-shape" });
  assert.equal(executed, false);
  // Prototype-key smuggling is refused.
  const proto = JSON.parse('{"inner": {"__proto__": {"polluted": true}}}');
  assert.deepEqual(sanitizeLiveArgs(proto, context), { kind: "drop", reason: "unsafe-object-shape" });
  const constructorKey: Record<string, DictionaryValue> = {};
  Object.defineProperty(constructorKey, "constructor", { value: { x: 1 }, enumerable: true });
  assert.deepEqual(sanitizeLiveArgs(constructorKey, context), { kind: "drop", reason: "unsafe-object-shape" });
  // Class instances, functions, symbol keys, bigints, and non-finite numbers are not data.
  class Sneaky { [key: string]: number; value = 1; }
  assert.deepEqual(sanitizeLiveArgs({ instance: new Sneaky() }, context),
    { kind: "drop", reason: "unsafe-object-shape" });
  const withFunction: Record<string, DictionaryValue> = {};
  Object.defineProperty(withFunction, "callback", { value: () => "x", enumerable: true });
  assert.deepEqual(sanitizeLiveArgs({ payload: withFunction }, context),
    { kind: "drop", reason: "unsafe-object-shape" });
  const withSymbol = { safe: 1 };
  Object.defineProperty(withSymbol, Symbol("hidden"), { value: "x", enumerable: true });
  assert.deepEqual(sanitizeLiveArgs({ payload: withSymbol }, context),
    { kind: "drop", reason: "unsafe-object-shape" });
  assert.deepEqual(sanitizeLiveArgs({ big: 1n }, context), { kind: "drop", reason: "unsafe-object-shape" });
  assert.deepEqual(sanitizeLiveArgs({ nan: Number.NaN }, context), { kind: "drop", reason: "unsafe-object-shape" });
}

function recursiveSanitizerBoundsDepthAndSize(): void {
  const context = contextOf();
  let deep: TestJsonObject = { leaf: 1 };
  for (let level = 0; level < 20; level += 1) deep = { next: deep };
  assert.deepEqual(sanitizeLiveArgs({ deep }, context), { kind: "drop", reason: "depth-exceeded" });
  assert.deepEqual(sanitizeLiveArgs({ long: "x".repeat(10_000) }, context), { kind: "drop", reason: "payload-too-large" });
  const wide: Record<string, number> = {};
  for (let index = 0; index < 200; index += 1) wide[`key${index}`] = index;
  assert.deepEqual(sanitizeLiveArgs({ wide }, context), { kind: "drop", reason: "payload-too-large" });
  assert.deepEqual(sanitizeLiveArgs({ list: Array.from({ length: 600 }, (_, index) => index) }, context),
    { kind: "drop", reason: "payload-too-large" });
}

function rewriteRulesAreConstrainedAndCompiledSafely(): void {
  const compiled = compileLiveRewriteRules([
    "team = Maya Chen → cipher",
    "handle = @maya* → cipher",
    "codename = project-nightboard → drop",
  ].join("\n"));
  assert.equal(compiled.errors.length, 0);
  assert.equal(compiled.rules.length, 3);
  // Regular-expression constructs are refused outright — nothing compiles them.
  const hostile = compileLiveRewriteRules([
    "redos = /(a+)+$/ → cipher",
    "lookbehind = (?<=secret)x → drop",
    "anchor = ^root$ → cipher",
  ].join("\n"));
  assert.equal(hostile.rules.length, 0);
  assert.equal(hostile.errors.length, 3);
  // Rule count is bounded; overflow is reported, not silently truncated.
  const flood = compileLiveRewriteRules(Array.from({ length: 80 }, (_, index) => `r${index} = value${index} → cipher`).join("\n"));
  assert.equal(flood.rules.length, 64);
  assert.ok(flood.errors.some((error) => error.includes("too many")));
  // Compiled rules rewrite nested strings without leaking the original.
  const policy = policyOf();
  const decision = sanitizeLiveArgs(
    { note: { text: "ping Maya Chen about the rail" } },
    { policy, rewriteRules: compiled.rules, sessionSalt: "salt" },
  );
  assert.equal(decision.kind, "emit");
  if (decision.kind === "emit") {
    assert.equal(JSON.stringify(decision.args).includes("Maya Chen"), false);
  }
  const dropped = sanitizeLiveArgs(
    { note: "the project-nightboard launch" },
    { policy, rewriteRules: compiled.rules, sessionSalt: "salt" },
  );
  assert.deepEqual(dropped, { kind: "drop", reason: "rewrite-drop" });
}

function cipherOutputLeaksNoLengthAndPreflightIsHonest(): void {
  const context = contextOf();
  const short = sanitizeLiveArgs({ text: "mail a@b.io now" }, context);
  const long = sanitizeLiveArgs({ text: "mail a.very.long.address+tag@example-corp.example now" }, context);
  assert.equal(short.kind, "emit");
  assert.equal(long.kind, "emit");
  if (short.kind === "emit" && long.kind === "emit") {
    const shortText = String(short.args.text);
    const longText = String(long.args.text);
    assert.equal(shortText.includes("@"), false);
    assert.equal(longText.includes("@"), false);
    // Fixed-width slabs: both masked addresses occupy the same width.
    assert.equal(longText.length - "mail  now".length, shortText.length - "mail  now".length);
  }
  const normalized = normalizeLivePublicationPolicy({
    visibility: "public",
    presentationViewRef: "views/present",
    allowedPathPatterns: ["docs/**"],
    allowedActionIds: ["view.open"],
  });
  assert.equal(normalized.kind, "valid");
  if (normalized.kind !== "valid") return;
  const missingConsent = runLivePreflight({
    sessionId: "session-1", spaceId: "space-1",
    policy: normalized.policy, policyDigest: normalized.digest,
    consentScopes: [],
  });
  assert.equal(missingConsent.startAllowed, false);
  assert.ok(missingConsent.missingConsentScopes.includes("semantic-capture"));
  assert.ok(missingConsent.warnings.some((warning) => warning.includes("cannot be recalled")));
  const ready = runLivePreflight({
    sessionId: "session-1", spaceId: "space-1",
    policy: normalized.policy, policyDigest: normalized.digest,
    consentScopes: ["semantic-capture"],
  });
  assert.equal(ready.startAllowed, true);
  assert.ok(ready.immutableDenials.includes("**/.env"));
  // Preflight for an empty allow-list refuses start: nothing visible, nothing to show.
  const empty = normalizeLivePublicationPolicy({ presentationViewRef: "views/present" });
  assert.equal(empty.kind, "valid");
  if (empty.kind === "valid") {
    const report = runLivePreflight({
      sessionId: "session-1", spaceId: "space-1",
      policy: empty.policy, policyDigest: empty.digest,
      consentScopes: ["semantic-capture"],
    });
    assert.equal(report.startAllowed, false);
  }
}
