# Dependency Exceptions

## `protobufjs` override for Collabs

Epoch pins `protobufjs@7.6.5` and uses npm `overrides` to force Collabs' transitive protobuf dependency to the patched version.

Reason:

- `@collabs/collabs@0.13.4` is the selected CRDT entity backend.
- Collabs packages currently request `protobufjs ~6.9.0`.
- `protobufjs <=7.6.4` has code-injection, prototype-pollution, and denial-of-service advisories.
- The override keeps the Collabs backend while allowing `npm audit --omit=dev` to report zero production vulnerabilities.

See [ADR-0002: CRDT Backend Selection](crdt-backend-decision.md) for the backend decision and exception rationale.

## Change Graph convergence dependency result

The 2026-08-11 Change Graph convergence implementation added no external runtime
dependency and therefore needs no new exception. Package-local dependencies
connect existing Epoch workspaces (`@epoch/protocol`, Core, SDK/WASM, Git proxy,
forge, identity, and Software Heritage). Hashing, URL validation, subprocess
probing, and reference transports use existing platform APIs. Revisit this
record before adding a native VFS, external resolver, forge transport, archive
client transport, or sandbox provider dependency.

## Community deterministic search and projections

Reviewed 2026-08-12. All three production packages are pinned exactly. Package
metadata was verified against the installed tarballs and npm registry; `npm
audit --omit=dev` reported zero production vulnerabilities across the lockfile
at review time. Audit results are time-sensitive and remain a release gate.

| Package | Review |
|---|---|
| `graphql@17.0.2` | MIT; released 2026-07-03; source [`graphql/graphql-js`](https://github.com/graphql/graphql-js); published by the GraphQL.js maintainer set listed by npm (`benjie`, `leebyron`, `yaacovcr`, `i1g`, `mjmahone`, `enisdenjo`); zero runtime dependencies; no consumer install script or native/WASM asset. Installed footprint was approximately 11.6 MiB before tree shaking. It supplies spec-conformant parsing, validation, execution, introspection, subscription support, and September 2025 `@oneOf`; maintaining a private GraphQL implementation would be materially less safe. The portable `@epoch/community-graphql` package is the only owner of this dependency. |
| `@orama/orama@3.1.18` | Apache-2.0; released 2025-12-19; source [`oramasearch/orama`](https://github.com/oramasearch/orama); npm publishers `micheleriva`, `fra.giannino`, `allevo`, `matijagaspar`, and `rjborba-askorama`; zero runtime dependencies; no consumer install script or native/WASM asset. Installed footprint was approximately 3.7 MiB before bundling. It provides an audited lexical index, tokenizer, incremental updates, and browser/Worker distribution; replacing it would create a bespoke search engine. Imports stay inside browser-bundled Community Web code. Vector, hybrid, RAG, answer, telemetry, and cloud features are not used. The dependency-free reference backend remains the fallback and semantic oracle. |
| `@sqlite.org/sqlite-wasm@3.53.0-build1` | Apache-2.0; released 2026-04-21; official source [`sqlite/sqlite-wasm`](https://github.com/sqlite/sqlite-wasm); npm publishers `tomayac` and `sgbeal`; zero runtime dependencies; no `preinstall`, `install`, or `postinstall` lifecycle; includes an 844 KiB `sqlite3.wasm` asset plus Worker/OPFS JavaScript. Installed footprint was approximately 2.7 MiB. It supplies official SQLite/FTS5 browser behavior and documented OPFS VFS options that would be unsafe to recreate. It is Worker-only, optional, capability-detected, and rebuildable. Epoch makes no Node durability or universal OPFS claim; Orama/reference fallback preserves function. |

Footprints above are package-install measurements, not transfer-size claims.
Actual generated browser/Worker asset sizes belong in the
[search/projection evidence](evidence/community-search-projection/README.md)
after the final build. No package is loaded from a CDN.

### Rejected runtime dependencies and interfaces

- **Liqe:** useful as a parser reference or development-only differential
  corpus, but the existing small owned parser already has versioned migration,
  strict diagnostics, browser generation, and Epoch's typed AST. Adding Liqe
  would introduce a second grammar/AST authority without removing Core code.
- **Tantivy:** capable search engine, rejected because Rust/native/WASM bindings,
  additional artifacts, and deployment variants are not justified by measured
  need. The backend contract leaves room for a later evidence-backed choice.
- **Arbitrary SQL:** rejected as a public interface. The selected SQLite WASM
  surface does not provide a product-wide proof that untrusted SQL can be
  constrained across every VFS/version. Epoch translates the typed Search
  Expression into parameterized internal statements instead.
