# Self-Evolving Canvas Sample

This is a minimal Node-backed web app for using Epoch as runtime application
history. A tiny backend agent turns a prompt into a JSON-render widget, places
the widget on an infinite canvas, and commits the canvas document into a
backend Epoch participant. The browser keeps its own local `@epoch/wasm-react`
repository in `localStorage` and gossips VFS event packets with the Node
participant so it can replicate locally as a member of the same sample cluster.

## Run It

From the repository root:

```bash
npm install
npm run dev -w @epoch/sample-self-evolving-canvas
```

Then open the Node server URL shown in the terminal.

## What To Look For

- `src/backend.ts` creates the Node cluster participant, stores browser-safe
  live events in a filesystem VFS, and records the converged canvas into a
  signed backend `@epoch/core` CRDT log.
- `src/server.ts` serves the built React client and exposes `/api/agent`,
  `/api/gossip`, and `/api/cluster`.
- `src/domain.ts` contains the app state, localStorage VFS adapter, agent
  mutation, commit, materialization, snapshot, and gossip helpers.
- `src/main.tsx` renders the React canvas, commits local browser changes, and
  gossips with the Node participant.
- Every widget stores a `renderer: "json-render"` marker and a JSON widget spec
  so the renderer can stay data-driven.
- Browser Epoch events are written into local storage through the VFS adapter.
  Gossip exports those event files as a packet, the backend participant exchanges
  missing events with the packet, and the browser imports the returned packet.

This sample intentionally keeps the backend agent deterministic. Swap
`evolveCanvasWithAgent` for an LLM-backed planner when you want a real model in
the loop; keep the Epoch commit and gossip boundary the same.
