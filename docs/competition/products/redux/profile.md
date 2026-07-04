---
product: Redux
slug: redux
category: predictable_state_container
primary_sources:
  - https://redux.js.org/
  - https://redux.js.org/introduction/getting-started
  - https://redux.js.org/understanding/thinking-in-redux/three-principles
  - https://redux-toolkit.js.org/
  - https://github.com/reduxjs/redux
  - https://github.com/reduxjs/redux-devtools
---

# Redux

Redux is a predictable state container for JavaScript applications. It competes
with Epoch where teams need a single source of truth for client state, an
explicit action log, and time-travel debugging. Redux is the reference point most
front-end engineers already carry in their heads for "how application state
should work," which makes it the primary framing competitor for Epoch's browser
live-state surface.

## Competitive Relevance

- Redux popularized the mental model Epoch's browser client must speak fluently:
  a single store, plain-object actions, pure reducers, and unidirectional data
  flow with an inspectable action history.
- Redux Toolkit (RTK) is the officially recommended, batteries-included path and
  removed most of the historical boilerplate; RTK Query added data-fetching and
  cache lifecycle, expanding Redux from "state container" toward "app data
  layer."
- Redux DevTools made time-travel debugging a mainstream expectation: replay
  actions, jump to a prior state, skip actions, and export/import sessions.
- Redux deliberately stops at the local store boundary. Persistence, undo/redo,
  offline behavior, and network synchronization are all add-on libraries
  (`redux-persist`, `redux-undo`, `redux-offline`), not core guarantees.
- Its ubiquity means Epoch's positioning, API vocabulary, and migration story
  are all judged against Redux whether or not Redux is the technical incumbent in
  a given app.

## Epoch Implications

- Epoch's browser client should feel familiar to a Redux developer: dispatch,
  select, subscribe, and an inspectable log should map onto Epoch events with
  little conceptual translation.
- Redux's time-travel is a developer-tool affordance that is ephemeral and
  local; Epoch can differentiate by making rollback a durable, signed, and
  replicated first-class operation rather than a debugging convenience.
- Redux keeps state management and data synchronization as separate concerns
  solved by different libraries. Epoch can argue for one signed history that
  serves both the local store and cross-peer propagation.
- RTK's success shows that ergonomics decide adoption. Epoch must minimize
  ceremony (store creation, typed selectors, React hooks) to be a credible
  alternative rather than a research artifact.

## Unknowns To Track

- Whether RTK Query's growth pulls teams toward expecting server-cache and sync
  semantics from their state library by default.
- How much of the market still runs classic Redux versus RTK, and how migration
  fatigue affects willingness to adopt a new container.
- Whether time-travel debugging expectations extend into production-grade
  rollback and audit requirements as apps handle more sensitive workflows.
- How strongly the React ecosystem's shift toward server components and
  lightweight stores (Zustand, Jotai) reshapes what "competing with Redux" means.
