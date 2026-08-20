import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  FileSystemWorkspaceProvider,
  HydratingWorkspaceProvider,
  MemoryObjectStore,
  NamespaceSandboxProvider,
  ProcessSandboxProvider,
  SandboxError,
  SignedSpaceStore,
  SpaceError,
  objectIdFor,
  probeNamespaceSandbox,
  probeReflink,
  selectSandboxProvider,
} from "@epoch/core";

/**
 * Spaces runtime — ADR-0043 phases 4 to 6.
 *
 * These assert the *proof*, not the intent. A sandbox may only claim what a
 * probe demonstrated, hydration may only accept bytes that hash to the manifest
 * entry, and a joined replica must reach the same participant set as the
 * origin. Where the host cannot provide a capability the test asserts the
 * honest refusal instead of skipping.
 */
export async function runSpaceRuntimeTests(): Promise<void> {
  const root = mkdtempSync(join(tmpdir(), "epoch-space-runtime-"));
  try {
    // --- phase 5: sandboxes prove what they confine ------------------------
    const probe = probeNamespaceSandbox();
    const namespaceProvider = new NamespaceSandboxProvider();
    const capabilities = namespaceProvider.capabilities();

    // The provider must never claim more than the probe observed. This holds on
    // hosts with namespaces and on hosts without them, which is the point.
    assert.equal(capabilities.isolation === "namespace", probe.available);
    assert.equal(capabilities.network === "denied", probe.available && probe.networkDenied);
    assert.equal(capabilities.verified, probe.available);
    if (!probe.available) {
      assert.ok(capabilities.unavailableReason !== undefined, "unavailable sandbox must explain itself");
      // A provider that cannot isolate refuses rather than silently degrading.
      await assert.rejects(() => namespaceProvider.run({ command: "sh", args: ["-c", "true"] }),
        (error) => error instanceof SandboxError && error.code === "unavailable");
    }

    // An injected probe proves the refusal path on every host, including CI.
    const unavailable = new NamespaceSandboxProvider({
      probe: { available: false, networkDenied: false, pidIsolated: false, reason: "namespaces disabled for this test" },
    });
    assert.equal(unavailable.capabilities().isolation, "none");
    assert.equal(unavailable.capabilities().verified, false);
    await assert.rejects(() => unavailable.run({ command: "sh", args: ["-c", "true"] }),
      (error) => error instanceof SandboxError && error.code === "unavailable");
    // Selection degrades visibly: an unprovable namespace yields the process provider.
    assert.equal(selectSandboxProvider().id, probe.available && probe.networkDenied ? "namespace" : "process");

    // Command and argument shapes are refused before anything is spawned.
    const processProvider = new ProcessSandboxProvider();
    for (const bad of [{ command: "sh; rm -rf /" }, { command: "sh", args: ["a\nb"] }]) {
      // SAFETY: Runtime checks or construction above establish { command: string.
      await assert.rejects(() => processProvider.run(bad as { command: string; args?: string[] }),
        (error) => error instanceof SandboxError && error.code === "invalid-input");
    }

    // The environment is scrubbed, so a sandboxed turn cannot read the
    // operator's credentials out of the parent process.
    process.env.EPOCH_TEST_SECRET = "leaked-value";
    const leak = await processProvider.run({ command: "sh", args: ["-c", "echo \"[${EPOCH_TEST_SECRET:-unset}]\""] });
    assert.match(leak.stdout, /\[unset\]/u, "sandbox leaked a parent environment variable");
    delete process.env.EPOCH_TEST_SECRET;

    // --- phase 5: a turn runs, and the receipt is signed evidence -----------
    const store = SignedSpaceStore.open(root, { author: "alice" });
    const space = store.createSpace({ title: "Runtime space", view: "main" });
    store.join(space.id, { principal: "agent-steward", role: "agent" });

    const run = await store.runTurn(space.id, {
      request: "print a line", sandbox: processProvider, command: "sh", args: ["-c", "echo ran"], principal: "agent-steward",
    });
    assert.equal(run.result?.stdout.trim(), "ran");
    assert.equal(run.receipt.data.outcome, "succeeded");
    assert.equal(store.receipts(space.id).length, 1);
    assert.equal(store.receipts(space.id)[0]!.data.isolation, "process");

    // A failing command is recorded as failed rather than swallowed.
    const failed = await store.runTurn(space.id, {
      request: "exit nonzero", sandbox: processProvider, command: "sh", args: ["-c", "exit 3"], principal: "agent-steward",
    });
    assert.equal(failed.receipt.data.outcome, "failed");

    // Requiring isolation from a provider that cannot prove it is refused --
    // and the refusal is itself recorded, so a denied turn leaves evidence.
    const before = store.receipts(space.id).length;
    await assert.rejects(() => store.runTurn(space.id, {
      request: "needs isolation", sandbox: unavailable, command: "sh", args: ["-c", "true"],
      principal: "agent-steward", requireIsolation: true,
    }), (error) => error instanceof SpaceError && error.code === "policy-denied");
    assert.equal(store.receipts(space.id).length, before + 1);
    assert.equal(store.receipts(space.id).at(-1)!.data.outcome, "refused");

    // Running still needs a live grant: the sandbox does not bypass authority.
    await assert.rejects(() => store.runTurn(space.id, {
      request: "no grant", sandbox: processProvider, command: "sh", args: ["-c", "true"], principal: "mallory",
    }), (error) => error instanceof SpaceError && error.code === "grant-denied");

    // Where the host supports it, assert the isolation itself rather than the
    // claim: no network, and a private process table.
    if (probe.available && probe.networkDenied) {
      const net = await namespaceProvider.run({
        command: "sh", args: ["-c", "getent hosts example.com >/dev/null 2>&1 && echo REACHABLE || echo BLOCKED"],
      });
      assert.match(net.stdout, /BLOCKED/u, "namespace sandbox did not block the network");
      const pids = await namespaceProvider.run({ command: "sh", args: ["-c", "ls /proc | grep -c '^[0-9]*$'"] });
      assert.ok(Number(pids.stdout.trim()) < 20, "namespace sandbox did not isolate the process table");
      namespaceProvider.dispose();
    }

    // --- phase 4: on-access hydration --------------------------------------
    const objects = new MemoryObjectStore();
    const boardBytes = Buffer.from('{"rail":{"width":24}}');
    const docBytes = Buffer.from("# readme\n");
    await objects.put(objectIdFor(boardBytes), boardBytes);
    const hydrating = new HydratingWorkspaceProvider(join(root, "hydrated"), objects, [
      { path: "board.json", objectId: objectIdFor(boardBytes), size: boardBytes.byteLength },
      // Absent locally: it must arrive through the configured source.
      { path: "docs/readme.md", objectId: objectIdFor(docBytes), size: docBytes.byteLength },
    ], { fetchObject: async (id) => id === objectIdFor(docBytes) ? docBytes : Buffer.from("wrong") });

    // The shape is complete before any bytes are paid for -- this is what makes
    // joining cheap by residency rather than by copy-on-write.
    assert.equal(hydrating.manifest().length, 2);
    assert.equal(hydrating.virtualPaths().length, 2);
    assert.equal(hydrating.status("board.json"), "virtual");

    assert.equal((await hydrating.read("board.json")).toString(), boardBytes.toString());
    assert.equal(hydrating.status("board.json"), "materialized");
    assert.deepEqual(hydrating.virtualPaths(), ["docs/readme.md"]);

    const fetched = await hydrating.hydrate("docs/readme.md");
    assert.equal(fetched.hydrated, true);
    assert.equal(hydrating.virtualPaths().length, 0);
    // Idempotent: a second hydrate does no work.
    assert.equal((await hydrating.hydrate("docs/readme.md")).hydrated, false);

    await hydrating.dehydrate("board.json");
    assert.deepEqual(hydrating.virtualPaths(), ["board.json"]);
    assert.equal((await hydrating.read("board.json")).toString(), boardBytes.toString());

    // A hydration source supplies bytes but never decides them.
    const tampering = new HydratingWorkspaceProvider(join(root, "tampered"), new MemoryObjectStore(),
      [{ path: "board.json", objectId: objectIdFor(boardBytes), size: boardBytes.byteLength }],
      { fetchObject: async () => Buffer.from("tampered content") });
    await assert.rejects(() => tampering.hydrate("board.json"), /hash mismatch/iu);

    // With no local bytes and no source, the gap is reported as availability,
    // not silently materialized as empty (ADR-0032).
    const promised = new HydratingWorkspaceProvider(join(root, "promised"), new MemoryObjectStore(),
      [{ path: "board.json", objectId: objectIdFor(boardBytes), size: boardBytes.byteLength }]);
    await assert.rejects(() => promised.hydrate("board.json"), /promised but absent/iu);

    // Traversal is refused by the hydration layer as well as the filesystem one.
    for (const bad of ["../escape.json", "/etc/passwd", "a/../../b"]) {
      assert.throws(() => hydrating.status(bad), /traversal|relative/iu);
    }

    // --- phase 4: reflink is measured, not asserted -------------------------
    const reflinkProbe = await probeReflink(root);
    const probed = await FileSystemWorkspaceProvider.create(join(root, "probed"));
    assert.equal(probed.capabilities.reflink.status, reflinkProbe.supported ? "supported" : "unsupported");
    // A bare boolean is still accepted for compatibility, but it labels itself
    // as an assertion so a reader cannot mistake it for evidence.
    const asserted = new FileSystemWorkspaceProvider(join(root, "asserted"), { reflink: true });
    // SAFETY: Runtime checks or construction above establish { mode: string }).mode).
    assert.match(String((asserted.capabilities.reflink as { mode: string }).mode), /asserted by caller/u);

    // --- phase 6: a second replica syncs, verifies, and joins ---------------
    const peerRoot = mkdtempSync(join(tmpdir(), "epoch-space-peer-"));
    try {
      const peer = SignedSpaceStore.open(peerRoot, { author: "bob" });
      const synced = peer.syncSpacesFrom(root);
      assert.ok(synced.eventsCopied > 0, "sync copied no events");
      assert.ok(synced.spaces.includes(space.id), "sync did not discover the space");
      // Joining after sync reaches the same participant set as the origin.
      peer.join(space.id, { principal: "bob", role: "collaborator" });
      assert.equal(peer.participants(space.id).filter((item) => item.active).length, 3);
      // The synced replica verifies offline; the transport moved bytes, the
      // signatures decide trust.
      assert.deepEqual(peer.repository.verify(), []);
    } finally {
      rmSync(peerRoot, { recursive: true, force: true });
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
  console.log("spaces runtime tests passed");
}
