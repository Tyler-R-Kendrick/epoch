import assert from "node:assert/strict";
import { asFixture } from "../helpers/type-guards";
import {
  STREAM_CIPHER_WIDTH,
  cipherToken,
  isProtectedStreamTarget,
  isSpectatorViewPreference,
  pathIsStreamIgnored,
  parseStreamIgnore,
  parseStreamRewrite,
  replayStreamCommand,
  sanitizeStreamCommand,
} from "@epoch/community-runtime";

export function runCommunityStreamPolicyTests(): void {
  ignoreDefaultsHideEnvAndDms();
  customIgnoreHidesPrivateOrg();
  protectedTargetsCoverSecretsAndAuth();
  cipherIsFixedWidthAndStable();
  sanitizerDropsProtectedInputAndPrivatePaths();
  sanitizerDropsMutedInputWithoutLengthOracle();
  sanitizerCiphersEmailWithoutLengthOracle();
  customRewriteCiphersLegalName();
  spectatorCannotSeePrivatePath();
  spectatorReplayKeepsLocalTheme();
}

function ignoreDefaultsHideEnvAndDms(): void {
  const rules = parseStreamIgnore("workspace/secret.txt\n!workspace/secret.txt");
  assert.equal(pathIsStreamIgnored(".env", rules), true);
  assert.equal(pathIsStreamIgnored("apps/api/.env.local", rules), true);
  assert.equal(pathIsStreamIgnored("dms/maya", rules), true);
  assert.equal(pathIsStreamIgnored("workspace/secret.txt", rules), false);
  assert.equal(pathIsStreamIgnored("projects/community/channels/general", rules), false);
}

function protectedTargetsCoverSecretsAndAuth(): void {
  assert.equal(isProtectedStreamTarget({ inputType: "password" }), true);
  assert.equal(isProtectedStreamTarget({ inAuthDialog: true }), true);
  assert.equal(isProtectedStreamTarget({ path: "apps/.env" }), true);
  assert.equal(isProtectedStreamTarget({ protectAttr: true }), true);
  assert.equal(isProtectedStreamTarget({ path: "projects/community/channels/general", inputType: "text" }), false);
  // Non-string paths must not throw (editor buffers are objects with .path).
  // SAFETY: Runtime checks or construction above establish unknown as string }).
  // SAFETY: Non-string path objects must be rejected without throwing.
  assert.equal(isProtectedStreamTarget({ path: asFixture<string>({ path: "projects/community/channels/general" }) }), false);
}

function cipherIsFixedWidthAndStable(): void {
  const first = cipherToken("salt", "email", "maya@epoch.dev");
  const second = cipherToken("salt", "email", "maya@epoch.dev");
  const other = cipherToken("salt", "email", "other@epoch.dev");
  assert.equal(first.length, STREAM_CIPHER_WIDTH);
  assert.equal(first, second);
  assert.notEqual(first, other);
  assert.notEqual(first.length, "maya@epoch.dev".length);
}

function sanitizerDropsProtectedInputAndPrivatePaths(): void {
  const typing = sanitizeStreamCommand({
    envelope: { t: 1, actorId: "maya", actionId: "compose.publish", args: { body: "secret" }, path: "projects/community/channels/general" },
    protectedInput: true,
  });
  assert.equal(typing.kind, "drop");
  const dm = sanitizeStreamCommand({
    envelope: { t: 2, actorId: "maya", actionId: "nav.enter", args: {}, path: "dms/maya" },
  });
  assert.equal(dm.kind, "drop");
}

function sanitizerCiphersEmailWithoutLengthOracle(): void {
  const result = sanitizeStreamCommand({
    envelope: {
      t: 3,
      actorId: "maya",
      actionId: "compose.publish",
      args: { body: "ping maya@epoch.dev please" },
      path: "projects/community/channels/general",
    },
    sessionSalt: "walk",
  });
  assert.equal(result.kind, "emit");
  if (result.kind !== "emit") return;
  const body = String(result.envelope.args.body);
  assert.doesNotMatch(body, /maya@epoch\.dev/u);
  assert.equal(body.includes("ping "), true);
  assert.equal(cipherToken("walk", "email", "maya@epoch.dev").length, STREAM_CIPHER_WIDTH);
}

function spectatorCannotSeePrivatePath(): void {
  const result = sanitizeStreamCommand({
    envelope: { t: 4, actorId: "maya", actionId: "nav.enter", args: {}, path: "projects/secret-org" },
    spectatorCanReadPath: (path) => path.includes("community"),
  });
  assert.equal(result.kind, "drop");
}

function customIgnoreHidesPrivateOrg(): void {
  const rules = parseStreamIgnore("orgs/acme-private/**\n");
  assert.equal(pathIsStreamIgnored("orgs/acme-private/repos/ledger", rules), true);
  assert.equal(pathIsStreamIgnored("orgs/acme-public/repos/sdk", rules), false);
}

function sanitizerDropsMutedInputWithoutLengthOracle(): void {
  const shortSecret = sanitizeStreamCommand({
    envelope: { t: 5, actorId: "maya", actionId: "compose.publish", args: { body: "x" }, path: "projects/community/channels/general" },
    inputMuted: true,
  });
  const longSecret = sanitizeStreamCommand({
    envelope: { t: 6, actorId: "maya", actionId: "identity.login", args: { handle: "maya", value: "hunter2hunter2" }, path: "projects/community/channels/general" },
    protectedInput: true,
  });
  assert.equal(shortSecret.kind, "drop");
  assert.equal(longSecret.kind, "drop");
}

function customRewriteCiphersLegalName(): void {
  const rules = parseStreamRewrite("legal_name = /Maya Chen/g → cipher\nbroken = /(/ → drop\n");
  assert.equal(rules.length, 1);
  assert.equal(rules[0]?.name, "legal_name");
  const result = sanitizeStreamCommand({
    envelope: {
      t: 7,
      actorId: "maya",
      actionId: "compose.publish",
      args: { body: "credit Maya Chen on the release" },
      path: "projects/community/channels/general",
    },
    rewrite: "legal_name = /Maya Chen/g → cipher",
    sessionSalt: "walk",
  });
  assert.equal(result.kind, "emit");
  if (result.kind !== "emit") return;
  const body = String(result.envelope.args.body);
  assert.doesNotMatch(body, /Maya Chen/u);
  assert.equal(body.includes("credit "), true);
  assert.equal(cipherToken("walk", "legal_name", "Maya Chen").length, STREAM_CIPHER_WIDTH);
}

function spectatorReplayKeepsLocalTheme(): void {
  assert.equal(isSpectatorViewPreference("theme.use"), true);
  assert.equal(isSpectatorViewPreference("nav.enter"), false);
  const skipped = replayStreamCommand({
    t: 8,
    actorId: "maya",
    actionId: "theme.use",
    args: { theme: "crt" },
  });
  const applied = replayStreamCommand({
    t: 9,
    actorId: "maya",
    actionId: "nav.enter",
    args: { path: "projects/community/channels/general" },
    path: "projects/community/channels/general",
  });
  assert.equal(skipped.kind, "skip");
  if (skipped.kind === "skip") assert.equal(skipped.reason, "view-preference");
  assert.equal(applied.kind, "apply");
}

if (require.main === module) {
  runCommunityStreamPolicyTests();
  console.log("community stream policy tests passed");
}
