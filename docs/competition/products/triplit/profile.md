---
product: Triplit
slug: triplit
category: fullstack_local_first_database
primary_sources:
  - https://www.triplit.dev/
  - https://github.com/aspen-cloud/triplit
  - https://github.com/aspen-cloud/triplit/issues
---

# Triplit

Triplit is an open-source fullstack database that syncs data between server and browser in real time with TypeScript schemas, reactive queries, offline support, conflict resolution, and a database console. It competes with Epoch where teams want a complete local-first application data layer rather than repository-native history.

## Competitive Relevance

- Triplit bundles schema definition, query language, local cache, realtime sync, offline behavior, and UI-framework hooks into one developer experience.
- The homepage directly compares the product against traditional databases by emphasizing that it runs on the client, has live queries, schemas, and conflict resolution.
- First-party support for React, React Native, Svelte, Vue, Angular, and Solid broadens adoption across app teams.
- The database console gives Triplit a more productized control surface than many library-only sync engines.
- Its marketing leans heavily on developer love and "this replaces several tools" framing.

## Epoch Implications

- Epoch should show why repository-level state and signed history matter even when application data is already synced and reactive.
- Triplit's TypeScript-first schema and hooks are a benchmark for SDK ergonomics.
- Epoch's WASM and React surfaces should feel similarly direct for app developers.
- The database-console angle is a reminder that infrastructure needs an inspection surface, not only APIs.
- Epoch can differentiate by linking source, artifacts, policies, actors, and recovery into one auditable history rather than only app records.

## Unknowns To Track

- How Triplit handles larger enterprise governance requirements, fine-grained permissions, and operational scale.
- Whether its custom query and schema model becomes a lock-in concern for teams with existing SQL or ORM investments.
- How rapidly the database console and server adapters mature relative to user expectations.
