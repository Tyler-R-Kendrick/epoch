---
product: Redux
gossip_sources:
  - https://github.com/reduxjs/redux/issues
  - https://redux.js.org/faq/general
  - https://redux-toolkit.js.org/introduction/getting-started
---

# Gossip

## Positive Sentiment

- Redux is widely trusted as a stable, predictable pattern that scales to large
  teams and codebases.
- Redux DevTools time-travel is repeatedly praised as a debugging superpower for
  reproducing and understanding state transitions.
- Redux Toolkit is broadly credited with fixing the historical boilerplate
  complaints and making Redux pleasant again.
- The documentation, learning resources, and community answers are deep enough
  that most problems have a known solution.

## Complaints And Friction

- Classic Redux carried a reputation for verbosity: action types, action
  creators, reducers, and wiring for every slice of state.
- Newcomers often add Redux prematurely to apps that would be fine with local or
  context state, then feel the ceremony without the benefit.
- Time-travel is a development-only tool; teams sometimes expect it to translate
  into production undo or recovery and discover it does not.
- Synchronization, persistence, offline, and undo require choosing and operating
  additional libraries, which fragments patterns across projects.

## Bug Themes To Watch

- Store rehydration and persistence edge cases when combining `redux-persist`
  with async or migrated state shapes.
- Middleware ordering and async race conditions in thunks and sagas.
- Serialization warnings and non-serializable values leaking into the store and
  breaking time-travel.
- Undo/redo correctness when implemented via history libraries over reducers.

## Epoch Takeaways

- Keep the "predictable, inspectable" promise but make the log durable and
  signed, not just an in-memory debugging aid.
- Deliver rollback, persistence, and sync as first-class guarantees so teams do
  not assemble four libraries to get one coherent story.
- Match RTK-level ergonomics; verbosity is the failure mode that a challenger
  must avoid from day one.
- Turn time-travel from a dev-tool into a production-grade, replicated, audited
  rollback capability that Redux structurally cannot offer.
