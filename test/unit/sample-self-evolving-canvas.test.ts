import assert from "node:assert/strict";
import { createEpochLiveRepository, createMemoryEpochVfs } from "@epoch/wasm-react";
import {
  CANVAS_ENTITY,
  commitCanvas,
  evolveCanvasWithAgent,
  gossipCanvasPeers,
  readCanvas,
} from "../../samples/self-evolving-canvas/src/domain";

export function runSampleSelfEvolvingCanvasTests(): void {
  recordsAgentCanvasChangesAsEpochEvents();
  gossipsCanvasHistoryToPeerRepositories();
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
