import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { createEpochLiveRepository, useEpochHistory } from "@epoch/wasm-react";
import { fetchClusterState, gossipWithEpochCluster, requestBackendAgent } from "./api";
import {
  CanvasClusterState,
  CanvasDocument,
  CanvasWidget,
  JsonRenderWidget,
  commitCanvas,
  createLocalStorageEpochVfs,
  evolveCanvasWithAgent,
  moveWidget,
  panCanvas,
  readCanvas,
} from "./domain";
import "./styles.css";
type BoundaryValue = null | undefined | boolean | number | string | bigint | symbol | Readonly<object>;


const participantId = browserParticipantId();
const localVfs = createLocalStorageEpochVfs(localStorage, "epoch:self-evolving-canvas:local:");
const localRepository = createEpochLiveRepository({ vfs: localVfs, author: "browser-agent" });

function App() {
  const localHistory = useEpochHistory(localRepository);
  const [prompt, setPrompt] = useState("track release risk");
  const [gossipStatus, setGossipStatus] = useState("idle");
  const [clusterState, setClusterState] = useState<CanvasClusterState | undefined>();
  const canvas = useMemo(() => readCanvas(localRepository), [localHistory]);

  useEffect(() => {
    void fetchClusterState()
      .then(setClusterState)
      .catch((error: BoundaryValue) => setGossipStatus(errorMessage(error)));
  }, []);

  function commitLocalDraft(): void {
    commitCanvas(localRepository, evolveCanvasWithAgent(readCanvas(localRepository), prompt));
  }

  async function askBackendAgent(): Promise<void> {
    setClusterState(await requestBackendAgent(prompt));
    await gossip();
  }

  function nudgeFirstWidget(): void {
    const current = readCanvas(localRepository);
    const first = current.widgets[0];
    if (first === undefined) return;
    commitCanvas(localRepository, moveWidget(current, first.id, { x: 32, y: 20 }));
  }

  function pan(delta: { readonly x: number; readonly y: number }): void {
    commitCanvas(localRepository, panCanvas(readCanvas(localRepository), delta));
  }

  async function gossip(): Promise<void> {
    try {
      const { response, importedEvents } = await gossipWithEpochCluster(participantId, localRepository, localVfs);
      setClusterState(response.state);
      setGossipStatus(`sent ${response.result.receivedEvents}, received ${importedEvents}`);
    } catch (error: unknown) {
      // SAFETY: Cluster gossip failures are normalized to user-visible status text.
      setGossipStatus(errorMessage(error as BoundaryValue));
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <h1>Epoch Canvas Cluster</h1>
        <label className="prompt-label" htmlFor="agent-prompt">Agent prompt</label>
        <textarea id="agent-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} />
        <button onClick={() => void askBackendAgent()}>Ask backend agent</button>
        <button onClick={commitLocalDraft}>Commit local draft</button>
        <button onClick={nudgeFirstWidget} disabled={canvas.widgets.length === 0}>Move first widget</button>
        <div className="pan-grid" aria-label="Pan canvas">
          <button onClick={() => pan({ x: 0, y: 40 })}>Up</button>
          <button onClick={() => pan({ x: -40, y: 0 })}>Left</button>
          <button onClick={() => pan({ x: 40, y: 0 })}>Right</button>
          <button onClick={() => pan({ x: 0, y: -40 })}>Down</button>
        </div>
        <button onClick={() => void gossip()}>Gossip with cluster</button>
        <dl className="facts">
          <div><dt>browser events</dt><dd>{localHistory.length}</dd></div>
          <div><dt>backend events</dt><dd>{clusterState?.backendEpochEvents ?? 0}</dd></div>
          <div><dt>revision</dt><dd>{canvas.revision}</dd></div>
          <div><dt>gossip</dt><dd>{gossipStatus}</dd></div>
        </dl>
      </aside>
      <InfiniteCanvas canvas={canvas} />
      <section className="peer-panel" aria-label="Epoch cluster participant">
        <h2>Node</h2>
        <p>{clusterState?.participantId ?? "node-backend"}</p>
        <ol>
          <li>{clusterState?.liveEvents ?? 0} live event(s)</li>
          <li>{clusterState?.backendEpochEvents ?? 0} backend Epoch event(s)</li>
          <li>{clusterState?.canvas.widgets.length ?? 0} materialized widget(s)</li>
          <li>{clusterState?.backendVerifyProblems.length ?? 0} verification problem(s)</li>
        </ol>
      </section>
    </main>
  );
}

function InfiniteCanvas({ canvas }: { readonly canvas: CanvasDocument }) {
  return (
    <section className="canvas-shell" aria-label="Infinite widget canvas">
      <div
        className="canvas-plane"
        style={{ transform: `translate(${canvas.viewport.x}px, ${canvas.viewport.y}px) scale(${canvas.viewport.zoom})` }}
      >
        {canvas.widgets.map((widget) => (
          <article className="canvas-widget" key={widget.id} style={{ left: widget.x, top: widget.y }}>
            <JsonWidget widget={widget} />
          </article>
        ))}
      </div>
    </section>
  );
}

function JsonWidget({ widget }: { readonly widget: CanvasWidget }) {
  return (
    <div className="json-render-widget" data-renderer={widget.renderer}>
      <JsonRender spec={widget.json} />
      <code>{widget.id}</code>
    </div>
  );
}

function JsonRender({ spec }: { readonly spec: JsonRenderWidget }) {
  if (spec.type === "metric") {
    return (
      <>
        <span className="widget-label">{spec.props.label}</span>
        <strong>{spec.props.value}</strong>
        <small>{spec.props.trend}</small>
      </>
    );
  }

  if (spec.type === "list") {
    return (
      <>
        <span className="widget-label">{spec.props.title}</span>
        <ul>{spec.props.items.map((item) => <li key={item}>{item}</li>)}</ul>
      </>
    );
  }

  return (
    <>
      <span className="widget-label">{spec.props.title}</span>
      <p>{spec.props.body}</p>
    </>
  );
}

function browserParticipantId(): string {
  const key = "epoch:self-evolving-canvas:participant-id";
  const existing = localStorage.getItem(key);
  if (existing !== null) return existing;
  const created = `browser-${Math.random().toString(16).slice(2, 10)}`;
  localStorage.setItem(key, created);
  return created;
}

function errorMessage(error: BoundaryValue): string {
  return error instanceof Error ? error.message : String(error);
}

const root = document.getElementById("root");
if (root === null) throw new Error("missing root element");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
