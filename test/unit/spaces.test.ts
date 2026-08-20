import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { executeChangeGraphCommand } from "@epoch/cli";
import { EpochRepository, FileSystemWorkspaceProvider, SignedSpaceStore, SpaceError } from "@epoch/core";
import { assertProtocolEvent, createCanonicalId, parseCanonicalId } from "@epoch/protocol";
import { createHash } from "node:crypto";

/**
 * Spaces (ADR-0043).
 *
 * These assert the *enforcement*, not the shape. A Space is only worth having
 * if a missing grant, a spent budget, and an unconsented capture each actually
 * refuse, and if an anchor still points at the right construct after the file
 * around it is reformatted.
 */
/** Mirrors the store's rule that a principal ID hashes real signing key material. */
function principalIdFor(repository: EpochRepository, author: string): string {
  const digest = createHash("sha256").update(repository.identityFor(author).publicKey).digest();
  return createCanonicalId("principal", () => new Uint8Array(digest));
}

export async function runSpaceTests(): Promise<void> {
  const root = mkdtempSync(join(tmpdir(), "epoch-space-"));
  try {
    const store = SignedSpaceStore.open(root, { author: "alice" });

    // --- composition: a Space references a View and joins its creator --------
    const space = store.createSpace({ title: "Nightboard redesign", view: "main" });
    parseCanonicalId(space.id, "space");
    assert.equal(space.data.viewName, "main");
    assert.equal(space.data.participantCount, 1);
    assert.equal(store.listSpaces().length, 1);
    assert.equal(store.showSpace(space.id).id, space.id);

    // Every Space event is a signed protocol event, verifiable offline.
    const repository = new EpochRepository(root);
    const spaceEvents = repository.events().filter((event) => event.type.startsWith("space."));
    assert.ok(spaceEvents.length >= 2);
    for (const event of spaceEvents) {
      assertProtocolEvent({ schemaVersion: 1, type: event.type, eventId: event.id, revisionId: event.id, body: event.payload });
    }
    assert.deepEqual(repository.verify(), []);

    // --- authority: a turn requires a live grant ----------------------------
    assert.throws(() => store.recordTurn(space.id, { request: "refactor", principal: "mallory" }),
      (error) => error instanceof SpaceError && error.code === "grant-denied");

    store.join(space.id, { principal: "bob", role: "collaborator" });
    assert.equal(store.recordTurn(space.id, { request: "refactor the rail", principal: "bob" }).kind, "space-turn");
    assert.throws(() => store.join(space.id, { principal: "bob" }),
      (error) => error instanceof SpaceError && error.code === "conflict");

    // Leaving revokes the grant in the same event, so authority cannot linger.
    store.leave(space.id, { principal: "bob" });
    assert.throws(() => store.recordTurn(space.id, { request: "sneak one in", principal: "bob" }),
      (error) => error instanceof SpaceError && error.code === "grant-denied");
    assert.equal(store.participants(space.id).find((item) => item.principalId.length > 0 && !item.active) !== undefined, true);

    // An observer is a participant whose grant does not authorize turns.
    store.join(space.id, { principal: "carol", role: "observer" });
    assert.throws(() => store.recordTurn(space.id, { request: "watch only", principal: "carol" }),
      (error) => error instanceof SpaceError && error.code === "grant-denied");

    // --- budgets: authority is bounded, not just present --------------------
    store.join(space.id, { principal: "agent-steward", role: "agent" });
    assert.throws(() => store.recordTurn(space.id, { request: "index", principal: "agent-steward", units: 1 }),
      (error) => error instanceof SpaceError && error.code === "budget-exceeded");
    store.allocateTurnBudget(space.id, { principal: "agent-steward", units: 3 });
    assert.equal(store.recordTurn(space.id, { request: "index the board", principal: "agent-steward", units: 2 }).data.remaining, 1);
    assert.throws(() => store.recordTurn(space.id, { request: "index again", principal: "agent-steward", units: 2 }),
      (error) => error instanceof SpaceError && error.code === "budget-exceeded");
    assert.equal(store.recordTurn(space.id, { request: "finish", principal: "agent-steward", units: 1 }).data.remaining, 0);

    // A budget belongs to the Space that allocated it. Units granted here must
    // not become spendable in a different Space.
    const otherSpace = store.createSpace({ title: "Unrelated space", view: "main" });
    store.join(otherSpace.id, { principal: "agent-steward", role: "agent" });
    assert.throws(() => store.recordTurn(otherSpace.id, { request: "spend elsewhere", principal: "agent-steward", units: 1 }),
      (error) => error instanceof SpaceError && error.code === "budget-exceeded");
    // ...and consumption in one Space does not silently drain another.
    store.allocateTurnBudget(otherSpace.id, { principal: "agent-steward", units: 1 });
    assert.equal(store.recordTurn(otherSpace.id, { request: "spend here", principal: "agent-steward", units: 1 }).data.remaining, 0);

    // A principal is always key-backed: the ID hashes real signing material, so
    // a grant can never name a principal that holds no key.
    const bobPrincipal = store.participants(space.id).find((item) => item.role === "collaborator")?.principalId;
    assert.ok(bobPrincipal !== undefined);
    assert.equal(bobPrincipal, principalIdFor(repository, "bob"));

    // --- workspaces: the provider reports, the Space only records -----------
    const provider = new FileSystemWorkspaceProvider(root);
    const bound = store.bindWorkspace(space.id, { provider, principal: "agent-steward", residency: "virtual", materialization: "virtual" });
    assert.equal(bound.data.execution, "disabled");
    assert.equal(bound.data.providerId, "filesystem");
    assert.equal(store.workspaces(space.id).length, 1);
    // A Space cannot launder an isolation claim the provider never made.
    assert.throws(() => store.bindWorkspace(space.id, { provider, principal: "agent-steward", execution: "isolated" }),
      /cannot claim isolated execution/u);

    // --- capture: continuous recording requires signed consent --------------
    assert.throws(() => store.recordCapturedOperation(space.id, { path: "rail.json", content: "{}", principal: "agent-steward" }),
      (error) => error instanceof SpaceError && error.code === "policy-denied");
    const session = store.openCapture(space.id, {
      scope: "packages/Epoch.Community.Web", retention: "30d", redaction: "declared-secrets", principal: "agent-steward",
    });
    parseCanonicalId(session.id, "session");
    assert.throws(() => store.openCapture(space.id, { scope: "again", retention: "30d", principal: "agent-steward" }),
      (error) => error instanceof SpaceError && error.code === "conflict");
    store.recordCapturedOperation(space.id, { path: "rail.json", content: '{"a":1}', principal: "agent-steward" });
    assert.equal(store.closeCapture(space.id, { principal: "agent-steward" }).data.operationCount, 1);
    // Consent ends with the session; capture is refused again once it is sealed.
    assert.throws(() => store.recordCapturedOperation(space.id, { path: "rail.json", content: "{}", principal: "agent-steward" }),
      (error) => error instanceof SpaceError && error.code === "policy-denied");
    assert.equal(store.captureSessions(space.id).every((item) => item.data.open === false), true);

    // --- anchors: survive a reformat that would break a line anchor ---------
    const revisionId = repository.events()[0]!.id;
    const original = '{"rail":{"width":24},"stream":{"rows":40}}';
    assert.throws(() => store.recordAnchor(space.id, {
      revisionId, path: "board.json", structuralPath: "object#0/member:absent", content: original, principal: "agent-steward",
    }), (error) => error instanceof SpaceError && error.code === "not-found");

    const anchor = store.recordAnchor(space.id, {
      revisionId, path: "board.json", structuralPath: "object#0/member:rail", content: original, principal: "agent-steward",
    });
    parseCanonicalId(anchor.id, "anchor");
    assert.equal(store.resolveAnchor(anchor.id, { content: original }).status, "resolved");
    // Pretty-printed and reordered: every byte offset moved, the construct did not.
    const reformatted = '{\n  "stream": {\n    "rows": 40\n  },\n  "rail": {\n    "width": 24\n  }\n}\n';
    assert.equal(store.resolveAnchor(anchor.id, { content: reformatted }).status, "moved");
    // Genuinely removed is reported, never silently resolved to the wrong place.
    assert.equal(store.resolveAnchor(anchor.id, { content: '{"stream":{"rows":40}}' }).status, "unresolved");
    assert.equal(store.anchors(space.id).length, 1);

    // Paths in signed events are normalized repository-relative paths, so a
    // capture or anchor can never record an absolute or traversing path.
    for (const badPath of ["/etc/passwd", "../../secrets.env", "a/../../b"]) {
      assert.throws(() => store.recordAnchor(space.id, {
        revisionId, path: badPath, structuralPath: "object#0/member:rail", content: original, principal: "agent-steward",
      }), /path/iu, `anchor accepted unsafe path: ${badPath}`);
    }
    store.openCapture(space.id, { scope: "src", retention: "7d", principal: "agent-steward" });
    assert.throws(() => store.recordCapturedOperation(space.id, {
      path: "../escape.json", content: "{}", principal: "agent-steward",
    }), /path/iu);
    store.closeCapture(space.id, { principal: "agent-steward" });

    // --- rejections stay typed ----------------------------------------------
    assert.throws(() => store.showSpace("epoch:space:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"),
      (error) => error instanceof SpaceError && error.code === "not-found");
    assert.throws(() => store.createSpace({ title: "  " }),
      (error) => error instanceof SpaceError && error.code === "invalid-input");
    // SAFETY: Runtime checks or construction above establish never }).
    assert.throws(() => store.join(space.id, { principal: "dave", role: "sudo" as never }),
      (error) => error instanceof SpaceError && error.code === "invalid-input");

    // Optional fields are still validated when present: a turn body may omit
    // units, but a negative or fractional value must be rejected.
    const turnBody = {
      spaceId: space.id, principalId: bobPrincipal, grantId: store.participants(space.id)[1]!.grantId,
      execution: "disabled", requestDigest: "a".repeat(64),
    };
    assertProtocolEvent({ schemaVersion: 1, type: "space.turn.recorded", eventId: revisionId, revisionId, body: turnBody });
    for (const units of [-5, 1.5, "many"]) {
      assert.throws(() => assertProtocolEvent({
        schemaVersion: 1, type: "space.turn.recorded", eventId: revisionId, revisionId,
        body: { ...turnBody, units },
      }), /units/u, `protocol accepted units=${String(units)}`);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

/** The CLI must surface each refusal as its own envelope code, not one blur. */
export async function runSpaceCliTests(): Promise<void> {
  const root = mkdtempSync(join(tmpdir(), "epoch-space-cli-"));
  try {
    const created = await executeChangeGraphCommand(root, ["space", "create", "Board work", "--view", "main"]);
    assert.equal(created.ok, true);
    // SAFETY: Runtime checks or construction above establish { id: string }).id.
    const spaceId = (created.data as { id: string }).id;

    assert.equal((await executeChangeGraphCommand(root, ["space", "show", spaceId])).ok, true);
    assert.equal((await executeChangeGraphCommand(root, ["space", "list"])).ok, true);
    assert.equal((await executeChangeGraphCommand(root, ["space", "participants", spaceId])).ok, true);

    assert.equal((await executeChangeGraphCommand(root, ["space", "turn", spaceId, "do it", "--principal", "mallory"])).code,
      "grant-denied");
    assert.equal((await executeChangeGraphCommand(root, ["space", "join", spaceId, "--principal", "bob"])).ok, true);
    assert.equal((await executeChangeGraphCommand(root, ["space", "turn", spaceId, "do it", "--principal", "bob"])).ok, true);
    assert.equal((await executeChangeGraphCommand(root, ["space", "turn", spaceId, "do it", "--principal", "bob", "--units", "5"])).code,
      "budget-exceeded");

    assert.equal((await executeChangeGraphCommand(root, ["space", "budget", spaceId, "--principal", "bob", "--units", "5"])).ok, true);
    assert.equal((await executeChangeGraphCommand(root, ["space", "turn", spaceId, "do it", "--principal", "bob", "--units", "5"])).ok, true);

    assert.equal((await executeChangeGraphCommand(root, ["space", "bind", spaceId, "--principal", "bob", "--path", root])).ok, true);
    assert.equal((await executeChangeGraphCommand(root, ["space", "workspaces", spaceId])).ok, true);

    assert.equal((await executeChangeGraphCommand(root,
      ["space", "capture", "record", spaceId, "--path", "a.json", "--content", "{}", "--principal", "bob"])).code, "policy-denied");
    assert.equal((await executeChangeGraphCommand(root,
      ["space", "capture", "open", spaceId, "--scope", "src", "--retention", "30d", "--principal", "bob"])).ok, true);
    assert.equal((await executeChangeGraphCommand(root,
      ["space", "capture", "record", spaceId, "--path", "a.json", "--content", "{}", "--principal", "bob"])).ok, true);
    assert.equal((await executeChangeGraphCommand(root, ["space", "capture", "list", spaceId])).ok, true);
    assert.equal((await executeChangeGraphCommand(root, ["space", "capture", "close", spaceId, "--principal", "bob"])).ok, true);

    const revisionId = new EpochRepository(root).events()[0]!.id;
    const content = '{"rail":{"width":24}}';
    const anchor = await executeChangeGraphCommand(root, ["space", "anchor", "record", spaceId,
      "--revision", revisionId, "--path", "board.json", "--structural-path", "object#0/member:rail",
      "--content", content, "--principal", "bob"]);
    assert.equal(anchor.ok, true);
    // SAFETY: Runtime checks or construction above establish { id: string }).id.
    const anchorId = (anchor.data as { id: string }).id;
    const resolved = await executeChangeGraphCommand(root, ["space", "anchor", "resolve", anchorId, "--content", content]);
    // SAFETY: Runtime checks or construction above establish { status: string }).status.
    assert.equal((resolved.data as { status: string }).status, "resolved");
    const moved = await executeChangeGraphCommand(root,
      ["space", "anchor", "resolve", anchorId, "--content", '{\n  "rail": {\n    "width": 24\n  }\n}\n']);
    // SAFETY: Runtime checks or construction above establish { status: string }).status.
    assert.equal((moved.data as { status: string }).status, "moved");
    assert.equal((await executeChangeGraphCommand(root, ["space", "anchor", "list", spaceId])).ok, true);

    assert.equal((await executeChangeGraphCommand(root, ["space", "nope", spaceId])).code, "invalid-command");
    assert.equal((await executeChangeGraphCommand(root, ["space", "capture", "nope", spaceId])).code, "invalid-command");
    assert.equal((await executeChangeGraphCommand(root, ["space", "anchor", "nope", spaceId])).code, "invalid-command");
    assert.equal((await executeChangeGraphCommand(root, ["space", "create"])).code, "invalid-input");
    assert.equal((await executeChangeGraphCommand(root, ["space", "show", "not-a-space"])).code, "not-found");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
