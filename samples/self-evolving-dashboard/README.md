# Self-Evolving Dashboard Sample

This Vite app shows the smallest useful shape for embedding Epoch into a
self-evolving generated UI workflow. It follows the same minimum viable pattern
as Vercel's json-render dashboard example: a small component catalog, a JSON
component tree, and a renderer that maps trusted JSON specs to React views.

The Epoch-specific part is automatic versioning. The app creates one browser
Epoch instance with `createBrowserEpoch`, provides it through `EpochProvider`,
and calls `trackGeneratedUiChange` when the generator emits component specs.
The materialized dashboard displays both the generated components and the Epoch
event-backed version ledger for those components.

## Run It

From the repository root:

```bash
npm install
npm run dev -w @epoch/sample-self-evolving-dashboard
```

Then open the Vite URL shown in the terminal.

## What To Look For

- `src/domain.ts` contains the JSON-render-shaped dashboard schema and
  deterministic generation helper.
- `src/main.tsx` creates the browser Epoch instance, wraps the app in
  `EpochProvider`, calls `trackGeneratedUiChange`, and renders the version
  ledger through `useEpochVersionLedger`.
- Every generated component stores `renderer: "json-render"`, an incrementing
  component `version`, and a JSON spec through the `@epoch/gen-ui` adapter.
- The version ledger maps each generated change back to the Epoch event that
  stored it, giving generated UI edits an inspectable local history.

## Integration Notes

This sample is now the intended small integration shape:

- `@epoch/integration-core` owns browser storage defaults, tracked-change
  envelopes, and version ledgers.
- `@epoch/react` owns the provider and hooks.
- `@epoch/gen-ui` owns generated component versioning.

The renderer remains app-owned on purpose. Epoch records the generated spec and
the event-backed version metadata, but the product keeps control over which
trusted component catalog can render those specs.
