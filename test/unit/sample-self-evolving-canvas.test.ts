import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import { createEpochLiveRepository, createMemoryEpochVfs } from "@epoch/wasm-react";
import { createCanvasClusterNode } from "../../samples/self-evolving-canvas/src/backend";
import {
  CANVAS_ENTITY,
  commitCanvas,
  createSnapshotEpochVfs,
  evolveCanvasWithAgent,
  exportEpochVfsSnapshot,
  gossipCanvasPeers,
  readCanvas,
} from "../../samples/self-evolving-canvas/src/domain";

export function runSampleSelfEvolvingCanvasTests(): void {
  recordsAgentCanvasChangesAsEpochEvents();
  gossipsCanvasHistoryToPeerRepositories();
  gossipsBrowserParticipantWithNodeBackendCluster();
}

function recordsAgentCanvasChangesAsEpochEvents(): void {
  const vfs = createMemoryEpochVfs();
  const repository = createEpochLiveRepository({ vfs, author: "agent" });

  const evolved = evolveCanvasWithAgent(readCanvas(repository), "track release risk");
  const event = commitCanvas(repository, evolved);

  const materialized = readCanvas(repository);
  assert.equal(event.entity, CANVAS_ENTITY);
  assert.equal(repository.history().length, 1);
  assert.equal(materialized.widgets.length, 1);
  assert.equal(materialized.widgets[0]?.renderer, "json-render");
  assert.equal(materialized.widgets[0]?.json.type, "note");
  assert.match(materialized.widgets[0]?.json.props.title ?? "", /release risk/i);
}

function gossipsCanvasHistoryToPeerRepositories(): void {
  const leftVfs = createMemoryEpochVfs();
  const rightVfs = createMemoryEpochVfs();
  const left = createEpochLiveRepository({ vfs: leftVfs, author: "agent" });
  const right = createEpochLiveRepository({ vfs: rightVfs, author: "peer" });

  commitCanvas(left, evolveCanvasWithAgent(readCanvas(left), "show build confidence"));

  const result = gossipCanvasPeers({ repository: left, vfs: leftVfs }, { repository: right, vfs: rightVfs });

  assert.equal(result.leftToRight, 1);
  assert.equal(result.rightToLeft, 0);
  assert.deepEqual(readCanvas(right), readCanvas(left));
}

function gossipsBrowserParticipantWithNodeBackendCluster(): void {
  const dataDir = mkdtempSync(join(tmpdir(), "epoch-canvas-cluster-"));
  try {
    const cluster = createCanvasClusterNode({ dataDir, participantId: "node-backend" });
    const browserVfs = createMemoryEpochVfs();
    const browser = createEpochLiveRepository({ vfs: browserVfs, author: "browser-agent" });

    commitCanvas(browser, evolveCanvasWithAgent(readCanvas(browser), "show browser risk"));
    const browserToNode = cluster.gossipWithBrowserSnapshot(exportEpochVfsSnapshot(browserVfs));

    assert.equal(browserToNode.result.receivedEvents, 1);
    assert.equal(browserToNode.state.backendEpochEvents, 1);
    assert.equal(cluster.state().canvas.lastPrompt, "show browser risk");

    cluster.commitAgentPrompt("show backend confidence");
    const nodeToBrowser = cluster.gossipWithBrowserSnapshot(exportEpochVfsSnapshot(browserVfs));
    const imported = browser.syncFrom(createSnapshotEpochVfs(nodeToBrowser.snapshot));

    assert.equal(nodeToBrowser.result.sentEvents, 1);
    assert.equal(imported, 1);
    assert.equal(readCanvas(browser).lastPrompt, "show backend confidence");
    assert.equal(readCanvas(browser).widgets.length, 2);
    assert.ok(cluster.state().backendVerifyProblems.length === 0);
  } finally {
    rmSync(dataDir, { recursive: true, force: true });
  }
}
