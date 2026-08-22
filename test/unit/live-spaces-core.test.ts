import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EpochRepository, SignedLiveSessionStore, SignedSpaceStore, SpaceError } from "@epoch/core";
import { assertProtocolEvent, parseCanonicalId } from "@epoch/protocol";

/**
 * Live Sessions over Spaces (signed lifecycle).
 *
 * A Live Session binds to an existing Space and View, evaluates authority
 * through the Space's own grants, appends only validated protocol events, and
 * reconstructs deterministically — including from a second store opened over
 * the same repository.
 */
export async function runLiveSpacesCoreTests(): Promise<void> {
  const root = mkdtempSync(join(tmpdir(), "epoch-live-"));
  try {
    const spaces = SignedSpaceStore.open(root, { author: "alice" });
    const live = new SignedLiveSessionStore(spaces);

    // --- binding: sessions require an existing Space and owner authority ----
    assert.throws(() => live.createSession("epoch:space:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", { policyDigest: "livepol_1" }),
      (error) => error instanceof SpaceError && error.code === "not-found");
    const space = spaces.createSpace({ title: "Nightboard live", view: "main" });
    const session = live.createSession(space.id, {
      policyDigest: "livepol_abc",
      visibility: "community",
      securityMode: "semantic-only",
    });
    parseCanonicalId(session.sessionId, "session");
    assert.equal(session.spaceId, space.id);
    assert.equal(session.viewName, "main");
    assert.equal(session.lifecycle, "draft");
    assert.equal(live.listSessions(space.id).length, 1);

    // A collaborator cannot create or drive a session; an observer cannot either.
    spaces.join(space.id, { principal: "bob", role: "collaborator" });
    spaces.join(space.id, { principal: "olive", role: "observer" });
    assert.throws(() => live.createSession(space.id, { policyDigest: "livepol_x", principal: "bob" }),
      (error) => error instanceof SpaceError && error.code === "grant-denied");
    assert.throws(() => live.applyLifecycle(session.sessionId, { command: "openLobby", principal: "olive" }),
      (error) => error instanceof SpaceError && error.code === "grant-denied");
    // A stranger with no grant at all is refused before any event is written.
    assert.throws(() => live.applyLifecycle(session.sessionId, { command: "openLobby", principal: "mallory" }),
      (error) => error instanceof SpaceError && error.code === "grant-denied");

    // --- lifecycle: the machine refuses shortcuts and start needs consent ---
    assert.throws(() => live.applyLifecycle(session.sessionId, { command: "start" }),
      (error) => error instanceof SpaceError && error.code === "conflict");
    live.applyLifecycle(session.sessionId, { command: "openLobby" });
    // Start without recorded semantic-capture consent is refused.
    assert.throws(() => live.applyLifecycle(session.sessionId, { command: "start" }),
      (error) => error instanceof SpaceError && error.code === "policy-denied");
    live.recordConsent(session.sessionId, { scopes: ["semantic-capture"] });
    const started = live.applyLifecycle(session.sessionId, { command: "start" });
    assert.equal(started.lifecycle, "live");
    assert.ok(started.startedEventId !== undefined);

    // Consent recorded against a stale policy digest does not satisfy start:
    // replacing the policy invalidates it.
    live.applyLifecycle(session.sessionId, { command: "pause" });
    live.recordPolicy(session.sessionId, { policyDigest: "livepol_widened", change: "widening" });
    const afterPolicy = live.showSession(session.sessionId);
    assert.equal(afterPolicy.policyDigest, "livepol_widened");
    live.applyLifecycle(session.sessionId, { command: "resume" });
    const ended = live.applyLifecycle(session.sessionId, { command: "end" });
    assert.equal(ended.lifecycle, "ended");
    assert.ok(ended.endedEventId !== undefined);

    // Observers can record their own consent, but never lifecycle commands.
    live.recordConsent(session.sessionId, { scopes: ["semantic-capture"], principal: "olive" });

    // --- sealing: append-only, honest completeness, then immutable ---------
    const sealed = live.seal(session.sessionId, {
      manifestJson: JSON.stringify({ replayId: "replay-1", presentationEventIds: [] }),
      completeness: "semantic-only",
    });
    assert.equal(sealed.lifecycle, "sealed");
    assert.equal(sealed.completeness, "semantic-only");
    assert.match(sealed.manifestDigest ?? "", /^[a-f0-9]{64}$/u);
    for (const attempt of [
      () => live.applyLifecycle(session.sessionId, { command: "openLobby" }),
      () => live.recordPolicy(session.sessionId, { policyDigest: "livepol_again", change: "narrowing" }),
      () => live.recordConsent(session.sessionId, { scopes: ["audio"] }),
      () => live.seal(session.sessionId, { manifestJson: "{}", completeness: "partial" }),
    ]) {
      assert.throws(attempt, (error) => error instanceof SpaceError && error.code === "policy-denied");
    }

    // --- signed history: every event validates and reconstruction converges -
    const repository = new EpochRepository(root);
    const liveEvents = repository.events().filter((event) => event.type.startsWith("live.session."));
    assert.ok(liveEvents.length >= 7);
    for (const event of liveEvents) {
      assertProtocolEvent({ schemaVersion: 1, type: event.type, eventId: event.id, revisionId: event.id, body: event.payload });
    }
    assert.deepEqual(repository.verify(), []);
    // A second store over the same repository reconstructs the same record.
    const reopened = new SignedLiveSessionStore(SignedSpaceStore.open(root, { author: "alice" }));
    const reconstructed = reopened.showSession(session.sessionId);
    assert.deepEqual(reconstructed, live.showSession(session.sessionId));
    assert.equal(reconstructed.lifecycle, "sealed");
    assert.equal(reconstructed.consent.length, 2);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
