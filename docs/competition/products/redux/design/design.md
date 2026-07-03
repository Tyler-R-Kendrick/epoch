---
product: Redux
design_sources:
  - https://redux.js.org/
  - https://redux-toolkit.js.org/
  - https://redux.js.org/tutorials/essentials/part-1-overview-concepts
  - https://github.com/reduxjs/redux-devtools
---

# Design

## Look And Feel

Redux presents as a developer library and pattern, not a SaaS application. Its
public surface is documentation, tutorials, and the Redux Toolkit quick start.
The conceptual "design" that matters is the data-flow model: view dispatches an
action, a pure reducer computes the next state, subscribers re-render. Redux
DevTools provides the most product-like surface: an action list, a state
inspector, and a time-travel slider.

## Open Design Assets

- The documentation exposes the full information architecture: store, actions,
  reducers, middleware, selectors, and the RTK slice model.
- Redux DevTools is an open, well-known UI for the action log, diff view, state
  tree, and time-travel controls (jump, skip, sweep, lock).
- RTK Query documents a cache-lifecycle and data-fetching design layered on the
  same store.
- There is no unified end-user product design system because Redux is
  infrastructure that other product UIs consume.

## Differentiators

- The three principles — single source of truth, read-only state, changes via
  pure functions — give Redux a clear, teachable mental model.
- The action log is an explicit, serializable narrative of everything that
  happened, which is the foundation for time-travel debugging.
- Middleware is a clean extension seam for async, logging, and side effects.
- RTK reduces ceremony with `createSlice`, Immer-backed "mutating" syntax, and
  typed hooks.

## What Works

- Predictable unidirectional flow makes complex state transitions debuggable and
  testable.
- Time-travel debugging turns "how did we get into this state" into a
  reproducible replay.
- The pattern is universally understood, so onboarding and hiring are easy.
- RTK's ergonomics make the common case concise while preserving the underlying
  model.

## UX Breakdowns

- Time-travel lives in the developer tools and is ephemeral; it does not survive
  reload, does not reach other clients, and is not an end-user or production
  capability.
- The store is in-memory; durability, audit, and history require external
  persistence with their own failure modes.
- Real-time collaboration, presence, and conflict resolution are entirely out of
  scope and must be assembled from other libraries.
- The separation between "state management" (Redux) and "data synchronization"
  (a different stack) pushes integration complexity onto every team that needs
  both.
