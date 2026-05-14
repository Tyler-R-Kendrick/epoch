# Self-Evolving Canvas Sample

This is a minimal browser sample for using Epoch as runtime application
history. A tiny local agent turns a prompt into a JSON-render widget, places the
widget on an infinite canvas, and commits the canvas document into an
`@epoch/wasm-react` live repository. The sample includes a second peer
repository so the same event history can be shared with the browser-safe gossip
helper.

## Run It

From the repository root:

```bash
npm install
npm run dev -w @epoch/sample-self-evolving-canvas
```

Then open the Vite URL shown in the terminal.

## What To Look For

- `src/domain.ts` contains the app state, localStorage VFS adapter, agent
  mutation, commit, materialization, and gossip helpers.
- `src/main.tsx` renders the bare-bones React canvas and peer history view.
- Every widget stores a `renderer: "json-render"` marker and a JSON widget spec
  so the renderer can stay data-driven.
- Epoch events are written into browser storage through the VFS adapter and
  copied between peers with `gossipCanvasPeers`.

This sample intentionally keeps the agent deterministic and local. Swap
`evolveCanvasWithAgent` for an LLM-backed planner when you want a real model in
the loop; keep the Epoch commit and gossip boundary the same.
