import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { executeChangeGraphCommand } from "@epoch/cli";
import { EpochRepository, FileSystemWorkspaceProvider, SignedSpaceStore, SpaceError } from "@epoch/core";
import { assertProtocolEvent, parseCanonicalId } from "@epoch/protocol";

/**
 * Spaces (ADR-0040).
 *
 * These assert the *enforcement*, not the shape. A Space is only worth having
 * if a missing grant, a spent budget, and an unconsented capture each actually
 * refuse, and if an anchor still points at the right construct after the file
 * around it is reformatted.
 */
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
      (error: unknown) => error instanceof SpaceError && error.code === "grant-denied");

    store.join(space.id, { principal: "bob", role: "collaborator" });
    assert.equal(store.recordTurn(space.id, { request: "refactor the rail", principal: "bob" }).kind, "space-turn");
    assert.throws(() => store.join(space.id, { principal: "bob" }),
      (error: unknown) => error instanceof SpaceError && error.code === "conflict");

    // Leaving revokes the grant in the same event, so authority cannot linger.
    store.leave(space.id, { principal: "bob" });
    assert.throws(() => store.recordTurn(space.id, { request: "sneak one in", principal: "bob" }),
      (error: unknown) => error instanceof SpaceError && error.code === "grant-denied");
    assert.equal(store.participants(space.id).find((item) => item.principalId.length > 0 && !item.active) !== undefined, true);

    // An observer is a participant whose grant does not authorize turns.
    store.join(space.id, { principal: "carol", role: "observer" });
    assert.throws(() => store.recordTurn(space.id, { request: "watch only", principal: "carol" }),
      (error: unknown) => error instanceof SpaceError && error.code === "grant-denied");

    // --- budgets: authority is bounded, not just present --------------------
    store.join(space.id, { principal: "agent-bo", role: "agent" });
    assert.throws(() => store.recordTurn(space.id, { request: "index", principal: "agent-bo", units: 1 }),
      (error: unknown) => error instanceof SpaceError && error.code === "budget-exceeded");
    store.allocateTurnBudget(space.id, { principal: "agent-bo", units: 3 });
    assert.equal(store.recordTurn(space.id, { request: "index the board", principal: "agent-bo", units: 2 }).data.remaining, 1);
    assert.throws(() => store.recordTurn(space.id, { request: "index again", principal: "agent-bo", units: 2 }),
      (error: unknown) => error instanceof SpaceError && error.code === "budget-exceeded");
    assert.equal(store.recordTurn(space.id, { request: "finish", principal: "agent-bo", units: 1 }).data.remaining, 0);

    // --- workspaces: the provider reports, the Space only records -----------
    const provider = new FileSystemWorkspaceProvider(root);
    const bound = store.bindWorkspace(space.id, { provider, principal: "agent-bo", residency: "virtual", materialization: "virtual" });
    assert.equal(bound.data.execution, "disabled");
    assert.equal(bound.data.providerId, "filesystem");
    assert.equal(store.workspaces(space.id).length, 1);
    // A Space cannot launder an isolation claim the provider never made.
    assert.throws(() => store.bindWorkspace(space.id, { provider, principal: "agent-bo", execution: "isolated" }),
      /cannot claim isolated execution/u);

    // --- capture: continuous recording requires signed consent --------------
    assert.throws(() => store.recordCapturedOperation(space.id, { path: "rail.json", content: "{}", principal: "agent-bo" }),
      (error: unknown) => error instanceof SpaceError && error.code === "policy-denied");
    const session = store.openCapture(space.id, {
      scope: "packages/Epoch.Community.Web", retention: "30d", redaction: "declared-secrets", principal: "agent-bo",
    });
    parseCanonicalId(session.id, "session");
    assert.throws(() => store.openCapture(space.id, { scope: "again", retention: "30d", principal: "agent-bo" }),
      (error: unknown) => error instanceof SpaceError && error.code === "conflict");
    store.recordCapturedOperation(space.id, { path: "rail.json", content: '{"a":1}', principal: "agent-bo" });
    assert.equal(store.closeCapture(space.id, { principal: "agent-bo" }).data.operationCount, 1);
    // Consent ends with the session; capture is refused again once it is sealed.
    assert.throws(() => store.recordCapturedOperation(space.id, { path: "rail.json", content: "{}", principal: "agent-bo" }),
      (error: unknown) => error instanceof SpaceError && error.code === "policy-denied");
    assert.equal(store.captureSessions(space.id).every((item) => item.data.open === false), true);

    // --- anchors: survive a reformat that would break a line anchor ---------
    const revisionId = repository.events()[0]!.id;
    const original = '{"rail":{"width":24},"stream":{"rows":40}}';
    assert.throws(() => store.recordAnchor(space.id, {
      revisionId, path: "board.json", structuralPath: "object#0/member:absent", content: original, principal: "agent-bo",
    }), (error: unknown) => error instanceof SpaceError && error.code === "not-found");

    const anchor = store.recordAnchor(space.id, {
      revisionId, path: "board.json", structuralPath: "object#0/member:rail", content: original, principal: "agent-bo",
    });
    parseCanonicalId(anchor.id, "anchor");
    assert.equal(store.resolveAnchor(anchor.id, { content: original }).status, "resolved");
    // Pretty-printed and reordered: every byte offset moved, the construct did not.
    const reformatted = '{\n  "stream": {\n    "rows": 40\n  },\n  "rail": {\n    "width": 24\n  }\n}\n';
    assert.equal(store.resolveAnchor(anchor.id, { content: reformatted }).status, "moved");
    // Genuinely removed is reported, never silently resolved to the wrong place.
    assert.equal(store.resolveAnchor(anchor.id, { content: '{"stream":{"rows":40}}' }).status, "unresolved");
    assert.equal(store.anchors(space.id).length, 1);

    // --- rejections stay typed ----------------------------------------------
    assert.throws(() => store.showSpace("epoch:space:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"),
      (error: unknown) => error instanceof SpaceError && error.code === "not-found");
    assert.throws(() => store.createSpace({ title: "  " }),
      (error: unknown) => error instanceof SpaceError && error.code === "invalid-input");
    assert.throws(() => store.join(space.id, { principal: "dave", role: "sudo" as never }),
      (error: unknown) => error instanceof SpaceError && error.code === "invalid-input");

    await runSpaceCliTests();
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

/** The CLI must surface each refusal as its own envelope code, not one blur. */
async function runSpaceCliTests(): Promise<void> {
  const root = mkdtempSync(join(tmpdir(), "epoch-space-cli-"));
  try {
    const created = await executeChangeGraphCommand(root, ["space", "create", "Board work", "--view", "main"]);
    assert.equal(created.ok, true);
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
    const anchorId = (anchor.data as { id: string }).id;
    const resolved = await executeChangeGraphCommand(root, ["space", "anchor", "resolve", anchorId, "--content", content]);
    assert.equal((resolved.data as { status: string }).status, "resolved");
    const moved = await executeChangeGraphCommand(root,
      ["space", "anchor", "resolve", anchorId, "--content", '{\n  "rail": {\n    "width": 24\n  }\n}\n']);
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
