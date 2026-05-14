import { StrictMode, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { createEpochLiveRepository, useEpochHistory } from "@epoch/wasm-react";
import {
  CanvasDocument,
  CanvasWidget,
  JsonRenderWidget,
  commitCanvas,
  createLocalStorageEpochVfs,
  evolveCanvasWithAgent,
  gossipCanvasPeers,
  moveWidget,
  panCanvas,
  readCanvas,
} from "./domain";
import "./styles.css";

const localVfs = createLocalStorageEpochVfs(localStorage, "epoch:self-evolving-canvas:local:");
const peerVfs = createLocalStorageEpochVfs(localStorage, "epoch:self-evolving-canvas:peer:");
const localRepository = createEpochLiveRepository({ vfs: localVfs, author: "browser-agent" });
const peerRepository = createEpochLiveRepository({ vfs: peerVfs, author: "peer" });

function App() {
  const localHistory = useEpochHistory(localRepository);
  const peerHistory = useEpochHistory(peerRepository);
  const [prompt, setPrompt] = useState("track release risk");
  const [gossipStatus, setGossipStatus] = useState("idle");
  const canvas = useMemo(() => readCanvas(localRepository), [localHistory]);
  const peerCanvas = useMemo(() => readCanvas(peerRepository), [peerHistory]);

  function askAgent(): void {
    commitCanvas(localRepository, evolveCanvasWithAgent(readCanvas(localRepository), prompt));
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

  function gossip(): void {
    const result = gossipCanvasPeers({ repository: localRepository, vfs: localVfs }, { repository: peerRepository, vfs: peerVfs });
    setGossipStatus(`local to peer ${result.leftToRight}, peer to local ${result.rightToLeft}`);
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <h1>Epoch Canvas Agent</h1>
        <label className="prompt-label" htmlFor="agent-prompt">Agent prompt</label>
        <textarea id="agent-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} />
        <button onClick={askAgent}>Ask agent</button>
        <button onClick={nudgeFirstWidget} disabled={canvas.widgets.length === 0}>Move first widget</button>
        <div className="pan-grid" aria-label="Pan canvas">
          <button onClick={() => pan({ x: 0, y: 40 })}>Up</button>
          <button onClick={() => pan({ x: -40, y: 0 })}>Left</button>
          <button onClick={() => pan({ x: 40, y: 0 })}>Right</button>
          <button onClick={() => pan({ x: 0, y: -40 })}>Down</button>
        </div>
        <button onClick={gossip}>Gossip to peer</button>
        <dl className="facts">
          <div><dt>local events</dt><dd>{localHistory.length}</dd></div>
          <div><dt>peer events</dt><dd>{peerHistory.length}</dd></div>
          <div><dt>revision</dt><dd>{canvas.revision}</dd></div>
          <div><dt>gossip</dt><dd>{gossipStatus}</dd></div>
        </dl>
      </aside>
      <InfiniteCanvas canvas={canvas} />
      <section className="peer-panel" aria-label="Peer materialized canvas">
        <h2>Peer</h2>
        <p>{peerCanvas.widgets.length} widget(s)</p>
        <ol>
          {peerCanvas.widgets.map((widget) => (
            <li key={widget.id}>{widget.json.type}: {widget.id}</li>
          ))}
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

const root = document.getElementById("root");
if (root === null) throw new Error("missing root element");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
