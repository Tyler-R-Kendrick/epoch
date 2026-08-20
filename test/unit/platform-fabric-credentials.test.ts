import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  createInMemoryPlatformCore,
  PlatformError,
  type PlatformSnapshot,
} from "@epoch/platform-core";
import { EpochPlatformSdk } from "@epoch/platform-sdk";

type TestJsonValue = boolean | null | number | string | TestJsonObject | readonly TestJsonValue[] | undefined;
interface TestJsonObject {
  readonly [key: string]: TestJsonValue;
}

export function runPlatformFabricCredentialTests(): void {
  mintFromSessionVerifiesWithSecretAndRejectsWrongSecret();
  revokeCredentialMakesVerifyFail();
  revokeSessionCascadesToFabricCredentials();
  mintFromApiTokenCopiesServiceAccountScopes();
  expiredCredentialFailsVerification();
  zeroTtlExpiresImmediately();
  invalidTtlIsRejected();
  sessionIdIsNotAFabricSecret();
  blankSecretIsRejected();
  mintRequiresActiveParent();
  snapshotPersistsHashNotSecretAndRestoresEmptyForLegacy();
  sdkIdentityExposesFabricCredentialWrappers();
}

function mintFromSessionVerifiesWithSecretAndRejectsWrongSecret(): void {
  const { core, session, user } = platformWithSession();
  const minted = core.mintFabricCredential({ sessionId: session.id });

  assert.equal(minted.kind, "session");
  assert.equal(minted.subjectRef, user.id);
  assert.deepEqual([...minted.scopes], ["fabric:human"]);
  assert.notEqual(minted.secret, session.id);
  assert.notEqual(minted.secret, minted.id);
  assert.equal(core.latestAuditEvent()?.type, "identity.fabric_credential.minted");

  const verified = core.verifyFabricCredential(minted.secret);
  assert.equal(verified.id, minted.id);
  assert.equal(verified.kind, "session");
  assert.equal(verified.parentId, session.id);
  assert.equal(verified.subjectRef, user.id);
  assert.deepEqual([...verified.scopes], ["fabric:human"]);
  assert.equal(verified.expiresAt, minted.expiresAt);
  assert.equal(verified.allowServiceDiscovery, false);

  assert.throws(
    () => core.verifyFabricCredential("not-the-secret"),
    (error) => error instanceof PlatformError,
  );
}

function revokeCredentialMakesVerifyFail(): void {
  const { core, session } = platformWithSession();
  const minted = core.mintFabricCredential({ sessionId: session.id });

  core.revokeFabricCredential(minted.id);
  assert.equal(core.latestAuditEvent()?.type, "identity.fabric_credential.revoked");

  assert.throws(
    () => core.verifyFabricCredential(minted.secret),
    (error) => error instanceof PlatformError,
  );
}

function revokeSessionCascadesToFabricCredentials(): void {
  const { core, session } = platformWithSession();
  const minted = core.mintFabricCredential({ sessionId: session.id });

  core.revokeSession(session.id);

  assert.throws(
    () => core.verifyFabricCredential(minted.secret),
    (error) => error instanceof PlatformError,
  );
}

function mintFromApiTokenCopiesServiceAccountScopes(): void {
  const { core, token, serviceAccount } = platformWithApiToken(["fabric:deploy", "projects:read"]);
  const minted = core.mintFabricCredential({ apiTokenId: token.id });

  assert.equal(minted.kind, "api-token");
  assert.equal(minted.subjectRef, serviceAccount.id);
  assert.deepEqual([...minted.scopes], ["fabric:deploy", "projects:read"]);

  const verified = core.verifyFabricCredential(minted.secret);
  assert.equal(verified.kind, "api-token");
  assert.equal(verified.parentId, token.id);
  assert.equal(verified.subjectRef, serviceAccount.id);
  assert.deepEqual([...verified.scopes], ["fabric:deploy", "projects:read"]);

  core.revokeApiToken(token.id);
  assert.throws(
    () => core.verifyFabricCredential(minted.secret),
    (error) => error instanceof PlatformError,
  );
}

function expiredCredentialFailsVerification(): void {
  const { core, session } = platformWithSession();
  const minted = core.mintFabricCredential({ sessionId: session.id, ttlSeconds: -1 });

  assert.ok(minted.expiresAt <= Date.now());
  assert.throws(
    () => core.verifyFabricCredential(minted.secret),
    (error) => error instanceof PlatformError,
  );
}

function zeroTtlExpiresImmediately(): void {
  const { core, session } = platformWithSession();
  const minted = core.mintFabricCredential({ sessionId: session.id, ttlSeconds: 0 });
  assert.ok(minted.expiresAt <= Date.now());
  assert.throws(
    () => core.verifyFabricCredential(minted.secret),
    (error) => error instanceof PlatformError,
  );
}

function invalidTtlIsRejected(): void {
  const { core, session } = platformWithSession();
  for (const ttlSeconds of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    assert.throws(
      () => core.mintFabricCredential({ sessionId: session.id, ttlSeconds }),
      // SAFETY: Runtime checks or construction above establish PlatformError).code === "invalid_input".
      (error) => error instanceof PlatformError && (error as PlatformError).code === "invalid_input",
    );
  }
}

function sessionIdIsNotAFabricSecret(): void {
  const { core, session } = platformWithSession();
  core.mintFabricCredential({ sessionId: session.id });
  assert.throws(
    () => core.verifyFabricCredential(session.id),
    (error) => error instanceof PlatformError,
  );
}

function blankSecretIsRejected(): void {
  const { core } = platformWithSession();
  for (const secret of ["", "   ", "\n"]) {
    assert.throws(
      () => core.verifyFabricCredential(secret),
      (error) => error instanceof PlatformError,
    );
  }
}

function mintRequiresActiveParent(): void {
  const { core, session } = platformWithSession();
  core.revokeSession(session.id);
  assert.throws(
    () => core.mintFabricCredential({ sessionId: session.id }),
    (error) => error instanceof PlatformError,
  );

  const { core: core2, token } = platformWithApiToken(["live:write"]);
  core2.revokeApiToken(token.id);
  assert.throws(
    () => core2.mintFabricCredential({ apiTokenId: token.id }),
    (error) => error instanceof PlatformError,
  );
}

function snapshotPersistsHashNotSecretAndRestoresEmptyForLegacy(): void {
  const { core, session } = platformWithSession();
  const minted = core.mintFabricCredential({ sessionId: session.id });
  const snapshot = core.exportSnapshot();
  const serialized = JSON.stringify(snapshot);

  assert.equal(snapshot.fabricCredentials.length, 1);
  assert.equal(snapshot.fabricCredentials[0]?.id, minted.id);
  assert.equal(
    snapshot.fabricCredentials[0]?.secretHash,
    createHash("sha256").update(minted.secret).digest("hex"),
  );
  assert.equal(serialized.includes(minted.secret), false);
      assert.equal("secret" in (snapshot.fabricCredentials[0] ?? {}), false);

  const restored = createInMemoryPlatformCore({ snapshot });
  const verified = restored.verifyFabricCredential(minted.secret);
  assert.equal(verified.id, minted.id);

  // SAFETY: Runtime checks or construction above establish Record<string.
  const parsed = JSON.parse(JSON.stringify(snapshot)) as TestJsonObject;
  // SAFETY: Legacy snapshots omit fabricCredentials before platform core restore.
  delete (parsed as { fabricCredentials?: TestJsonValue }).fabricCredentials;
  // SAFETY: Runtime checks or construction above establish unknown as PlatformSnapshot }).
  const fromLegacy = createInMemoryPlatformCore({ snapshot: parsed as PlatformSnapshot });
  assert.deepEqual(fromLegacy.exportSnapshot().fabricCredentials, []);
}

function sdkIdentityExposesFabricCredentialWrappers(): void {
  const core = createInMemoryPlatformCore();
  const sdk = new EpochPlatformSdk(core);
  const user = sdk.identity.createUser({ handle: "bob", displayName: "Bob" });
  const session = sdk.identity.openSession({ userId: user.id, name: "browser" });

  const minted = sdk.identity.mintFabricCredential({ sessionId: session.id });
  const verified = sdk.identity.verifyFabricCredential(minted.secret);
  assert.equal(verified.id, minted.id);
  sdk.identity.revokeFabricCredential(minted.id);
  assert.throws(
    () => sdk.identity.verifyFabricCredential(minted.secret),
    (error) => error instanceof PlatformError,
  );
}

function platformWithSession() {
  const core = createInMemoryPlatformCore();
  const user = core.createUser({ handle: "alice", displayName: "Alice" });
  const session = core.openSession({ userId: user.id, name: "laptop" });
  return { core, user, session };
}

function platformWithApiToken(scopes: string[]) {
  const core = createInMemoryPlatformCore();
  const organization = core.createOrganization({ slug: "acme", displayName: "Acme" });
  const serviceAccount = core.createServiceAccount({
    organizationId: organization.id,
    name: "deploy",
    scopes,
  });
  const token = core.issueApiToken({ serviceAccountId: serviceAccount.id, name: "ci" });
  return { core, organization, serviceAccount, token };
}
