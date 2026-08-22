# Lua-Scriptable Generative UI Customization — Master Instructions

This document is a complete, self-contained instruction prompt for an LLM coding
agent running with subagent swarms. It is the sole context for the run: it
assumes no prior conversation, no uploaded material, and no external reading.
Every claim below is either a verified fact about this repository (§1) or a
normative decision recorded here (§3, §4). Where the two could conflict, §1
wins for what exists and §3/§4 win for what must be built.

Target deliverable: a Lua-scriptable generative UI customization system for
Epoch's Community Web, designed, implemented, tested, and validated in one
execution, with subagent swarms S1–S10 working maximally in parallel against
frozen contracts.

---

## §0 Mission and verdict discipline

**Mission.** Design, implement, test, and validate the system described by the
frozen resolutions in §3 and the contracts in §4, inside this repository,
following the repository's own gates. Swarms execute in parallel against the
ownership map in §5. There is no sequencing language in this document: any
swarm may start as soon as its consumed contracts are committed, and contracts
C0–C12 are frozen by this document before any swarm starts.

**Verdict discipline.**

1. Every done-claim defaults to **REJECTED**. A claim becomes ACCEPTED only
   when the gate command named for it in this document has been run and exited
   0, and the exit code is quoted in the swarm's report (§10).
2. Prose is not evidence. "It works", "manual testing passed", and "the code
   obviously does X" are REJECTED by default. The only acceptable evidence is
   a named command, its exit code, and — where the gate is a test — the test
   that fails when the mechanism is removed (§9, question 2).
3. This document is the sole context. If a fact you need is not in §1 or
   derivable by reading the repository, state the assumption explicitly in
   your report's Deviations section; never silently invent a command, file,
   or convention.
4. A gate that cannot fail is not a gate. Every check introduced by a swarm
   must be demonstrated to fail when its subject is broken (zero-mechanism
   control, §9).
5. When a gate fails, the claiming swarm's verdict for that task is REJECTED;
   the swarm fixes and re-runs. S10's final `npm run verify` is authoritative
   for the whole initiative (§11).

---

## §1 Ground truth: repo orientation (trust; do not re-derive)

The facts in this section were verified against the repository. Do not spend
effort re-deriving them; extend them.

### §1.1 What this repository is

| Fact | Verified value |
|---|---|
| Product | Epoch, a signed DVCS ("git successor") written in TypeScript. Community Web is its "GitHub": a community forge surface. |
| Community Web stack | Vanilla JavaScript, terminal-styled (Tron Grid) browser PWA in `packages/Epoch.Community.Web`. **No React anywhere in the repo.** |
| Workspaces | 40 npm workspaces under `packages/`. Directory `packages/Epoch.Dotted.Pascal/` maps to npm name `@epoch/kebab-case`. |
| Structural gate | `konsistent.json` requires each package to have `package.json` + `src/index.ts`; enforced by `npm run konsistent`. New packages must be registered in the root `workspaces`, `exports`, `build`, and `typecheck` chains. |
| Language/toolchain | CommonJS, ES2022, `strict`, compiled with `tsgo`. Typecheck: `npm run typecheck` (`tsgo --noEmit` across workspaces and test projects). |
| Lint dialect | Vendored anti-slop Oxlint plugin (`tools/oxlint/anti-slop/`, ADR-0056, `docs/anti-slop.md`): `// SAFETY:` comments for justified escapes, no `unknown` parameters, boundary parsing at edges. Run via `npm run lint:oxlint`. ESLint runs alongside via `npm run lint`. |
| Unit tests | **No vitest, no jest.** `node:test` `.test.mjs` files plus a hand-rolled runner: `test/unit/*.test.ts` compiled and run via `node dist/test/run-unit-tests.js` (`npm run test:unit:runtime`). |
| Behavior tests | Cucumber + persona-tagged Gherkin: `features/*.feature`, steps in `test/features/`; run via `npm test`. Persona tags: `@persona.github_open_source_contributor`, `@persona.maintainer`, `@persona.platform_operator`, `@persona.security_compliance_responder`. |
| Browser e2e | Playwright: `packages/Epoch.Community.Web/test/e2e.mjs`, scenario filter via `CW_E2E=<prefix>` (`npm run community-web:app:e2e`). |
| Contracts | Pact at HTTP integration boundaries (`npm run test:pact`; pacts committed under `pacts/`). |
| Property/fuzz | fast-check property tests; Jazzer.js fuzz with versioned corpora (`npm run fuzz:fast-check`, `npm run fuzz:jazzer`). |
| Coverage | c8, thresholds lines/statements 90, functions 87, branches 80. **Never lower thresholds.** `npm run coverage`. |
| Goldens | Verify-style goldens: `test/verify/assert-verified.ts`; regenerate with `EPOCH_UPDATE_VERIFIED=1`. |
| Mutation | Targeted mutant-kill runners `test/mutation/run-*-mutants.mjs` with oracles: `npm run mutation:nats`, `npm run mutation:xmpp`, `npm run mutation:protocol`, `npm run mutation:community-web`. |
| Design system | `DESIGN.md` is machine-checked: `npm run design:lint` (`@google/design.md@0.4.0`), `npm run design:audit` (`scripts/audit-design-tokens.mjs --enforce-structural`, fail-closed), `npm run community-web:app:design-lint` (Bracket Rule chrome). Named rules: Grid, Signal, No Pill, Glow Budget, Terminal Type, Bracket, Page-Is-The-Terminal, Keyboard-First, Queue. |
| Tokens (platform) | `--epoch-color-*` generated from `DESIGN.md` frontmatter by `packages/Epoch.DesignTokens` (`npm run tokens:generate`); light-locked per ADR-0024. Frontmatter is bespoke; **no DTCG file exists yet**. |
| Tokens (board) | `--cw-*` board theme contract in `docs/community-web/CONTRACT.md` (~20 tokens). **This is the Lua customization target.** |
| Theme runtime | `app/themes.js` (one shipped theme, `grid`) + `app/theme.js` ("garden"): manual token edit + on-device Chrome `LanguageModel` generation with an allowlist and a WCAG AA contrast floor already enforced. |
| GenUI (ships today) | `scripts/build-openui.mjs` uses `@openuidev/lang-core` (OpenUI Lang) + Zod at build time, emitting schema + system prompt + browser parser (`app/openui-parser.js`); `app/generate.js` renders generated AST into the same `[data-c]` markup as authored views. `packages/Epoch.GenUI` provides `trackGeneratedUiChange` (signed tracked changes). `samples/self-evolving-dashboard` uses a local json-render-shaped `{root, elements}` spec convention; **no npm json-render dependency exists**. |
| Sandbox precedent | `packages/Epoch.Extensions` (ADR-0045): WASM capability providers, host-owned memory only, "absence, not withholding", declared limits, `determinism` class, `advisory` tier ("may never contribute to signed state"), signed manifests, publisher lifecycle/trust/store (ADR-0046, ADR-0037). `CAPABILITY_KINDS` includes an **unclaimed `"view"` kind**. Related: ADR-0031 (provider output = untrusted proposal), ADR-0034 (agent principals/grants/budgets, Ed25519). |
| Theme threat model | `docs/community-web/CONTRACT.md`: `[data-region]` / `[data-c]` / `[data-state]` selectors, "Themes may only write CSS", "What a theme cannot do". |
| GraphQL | `packages/Epoch.Community.GraphQL`: dynamic in-browser execution of a search-expression SDL. **No persisted operations or codegen exist**; the static-API layer is new work and must follow the repo's deterministic `scripts/build-*.mjs` + `--check` byte-verification pattern (see `community-web:app:build:check` chain). |
| Other seams | `app/action-registry.js` (frozen action registry), `app/webmcp.js` (WebMCP tools with readOnly/untrusted hints), `packages/Epoch.Community.Runtime` (shared commands/receipts, board honesty), `app/sitemap.js` (board VFS nav). |
| Docs conventions | ADRs: `docs/design-decisions/NNNN-kebab.md`; plans: `docs/plans/<slug>/sdlc-state.md` + append-only `docs/plans/dispatch-log.md`; **every doc must be reachable from the root `README.md` hierarchy** (link it from `docs/README.md`); `npm run docs:check` fails on orphans. |
| Commit format | `type(scope): summary (#NNN)`. |
| New user-visible work requires | A Verify golden, a mutant-kill entry, persona Gherkin + steps, rows in `docs/feature-scenario-inventory.md` + `docs/persona-feature-matrix.md`, an ADR, and an sdlc-state record. |

### §1.2 Gate ladder (run these; they exist in `package.json`)

| Command | Meaning |
|---|---|
| `npm run gate:fast` | Parallel static pre-flight: konsistent, docs:check, design:lint, design:audit, eslint, oxlint (`scripts/run-gate-fast.mjs`). |
| `npm run gate:commit` | `gate:fast` + `community-web:app:a11y-lint` + `community-web:app:design-lint`. Wired to `.githooks/pre-commit` and `pre-push`. Minimum local bar. |
| `npm run gate:push` | `gate:commit` + typecheck + build + unit tests. Run before opening a PR. |
| `npm run verify` | Full bar: docs:check, lint, a11y-lint, design-lint, design:lint, design:audit, typecheck, konsistent, `npm test` (Cucumber), schemas check, `community-web:app:build:check`, axe (`a11y:community-web`, `community-web:app:a11y`), coverage, Pact, parity, faults, app e2e. This is what CI runs, job by job. |
| `npm test` | Build + Cucumber feature suite. |
| `npm run test:unit:runtime` | Build-independent unit runner over compiled `test/unit` output. |
| `npm run community-web:app:build:check` | Byte-verifies all deterministic browser build artifacts (`build-*-runtime.mjs --check` chain). New deterministic generators must be wired into this chain. |
| `npm run community-web:app:parity` | Static harness vs dynamic UI parity + navigation/projection/cli-tools/nats tests + NAV e2e. |
| `npm run community-web:app:e2e` | Full Playwright board e2e (`CW_E2E=` to filter). |
| `npm run community-graphql:check` | `@epoch/community-graphql` package tests. |
| `npm run design:lint` / `npm run design:audit` | DESIGN.md schema lint / structural token audit (fail-closed). |
| `npm run community-web:app:a11y-lint` / `npm run community-web:app:design-lint` | Board a11y lint / Bracket Rule chrome lint. |
| `npm run a11y:community-web` | axe-core browser run. |
| `npm run test:pact` | Pact consumer + provider verification. |
| `npm run fuzz:fast-check` | fast-check history/property lane. |
| `npm run mutation:community-web` | Community Web mutant-kill runner (pattern to copy for new mutant lanes). |
| `npm run tokens:generate` | Regenerate `--epoch-color-*` tokens from `DESIGN.md` frontmatter. |

CI is `.github/workflows/quality.yml`: one job per concern, `ubuntu-latest`,
fail-closed guard job. CI re-verifies everything regardless of local runs.

### §1.3 Existing seams to extend (do not fork)

- `packages/Epoch.Community.Web/scripts/build-openui.mjs` — catalog/schema/system-prompt generator; extend, do not replace.
- `packages/Epoch.Community.Web/app/openui-parser.js`, `app/openui-library.js`, `app/generate.js` — browser parser, component library, renderer.
- `packages/Epoch.Community.Web/app/theme.js`, `app/themes.js` — token edit/generation surface with allowlist + contrast floor.
- `packages/Epoch.Extensions` — manifests, signing, trust, store; the script distribution home.
- `packages/Epoch.DesignTokens` — token generator; the overlay resolver's home.
- `packages/Epoch.Community.GraphQL` — dynamic GraphQL engine; persisted ops are additive beside it.
- `docs/community-web/CONTRACT.md` — theme contract; amended, never rewritten (§3(d)).

### §1.4 CSP caveat

`docs/community-web/CONTRACT.md` asserts a content-security posture **in
prose only; no actual Content-Security-Policy is implemented** in the served
app. Treat CSP as an aspiration this initiative must make real (owned by S8,
contract C5/C8): shipped CSS tier and script execution must be enforceable by
a delivered policy, not by documentation.

### §1.5 Docs reachability and commit discipline

- Every new or amended doc must be linked from `docs/README.md` (or a page it
  links) so `npm run docs:check` passes. No orphaned docs.
- Persona-facing behavior changes require scenario rows in
  `docs/feature-scenario-inventory.md` and `docs/persona-feature-matrix.md`
  (S10 owns these rows; S9 authors the scenarios).
- Commits: `type(scope): summary (#NNN)`. Generated outputs (`dist/`,
  `coverage/`, temporary files) stay out of commits. Never edit generated
  bundles by hand; change the generator and re-run it.

---

## §2 Adversarial critique record

Each row binds a threat or failure class to the mechanism that contains it and
the gate that proves containment. The lessons are stated inline; no external
reading is required. Contracts referenced here are defined in §4.

| # | Threat / failure class | Lesson (stated in full) | Containing mechanism | Proving gate |
|---|---|---|---|---|
| T1 | Distribution supply-chain | The Fractureiser Minecraft-mod incident, the Stylish extension exfiltration scandal, and repeated Chrome Web Store extension takeovers all show the same shape: the sharing channel is the primary attack surface, not the sandbox. A perfect sandbox around a script that millions install from a poisoned store still loses. | Scripts are Epoch.Extensions citizens with signed manifests, publisher key lifecycle, per-version killbit + tombstone + notify, staged rollout, and reputation tiers (C4, C9). The store, not the runtime, carries the trust decision. | S7 unit tests + `npm run test:pact`; S8 adversarial corpus (`npm test`) |
| T2 | Generative phishing | An LLM or script that can place UI anywhere will eventually place a fake payment, permission, or credential prompt where users are trained to trust chrome. Content filters fail; the placement itself must be impossible. | Intent *placement* policy: payment/permission/credential UI is never script- or LLM-placeable. Every placement carries a `placementClass`; `blocked` classes are refused by the renderer, not filtered by the model (C3, C8). | S3 parser tests (`npm run community-web:app:parity`); S8 red-team corpus |
| T3 | CSS exfiltration | A theme that can write `url()` or `@import` can leak per-user state (attribute-selectored background images, imported beacons). | Tier-2 CSS forbids `url()`/`@import` entirely (or proxies first-party only), strips `:visited`, caps blur/shadow under the Glow Budget, and ships compiled external `text/css`, never inline (C5). | S4 sanitizer corpus (`npm run test:unit:runtime`); S8 CSP gate (`npm run community-web:app:e2e`) |
| T4 | Swallowed quota-kills | OpenResty production experience: raw Lua `pcall`/`xpcall` inside a sandbox lets guest code catch and swallow the host's resource-quota kill exception, converting a hard limit into a suggestion. | The runtime shadows raw `pcall`/`xpcall` in every guest state so quota-kill is a host-raised, unswallowable termination (C1). | S1 unit tests incl. a swallow-attempt mutant (`npm run test:unit:runtime`) |
| T5 | Per-call capability RPC economics | Measured worker/bridge round-trips cost ~0.1 ms each; a script making hundreds of capability calls per event spends its entire CPU budget on transport, and each call is an attack-surface crossing. | Batch-in/batch-out bridge: the host pre-resolves all declared persisted ops into frozen read-only snapshot tables before dispatch; the script returns ONE transactional spec-mutation batch per event (C2). | S2 bridge tests incl. a round-trip counter assertion (`npm run test:unit:runtime`) |
| T6 | Prose ≠ gates | AGENTbench-style evaluation of agent runs shows unverified done-claims are wrong at high rates; any acceptance criterion that exists only as prose will be claimed-done without being true. Separately, LLM-emittted JSON that is merely "asked for" arrives malformed; structure must be enforced at decode time. | Every acceptance row in §7 names a machine gate (C12). LLM-facing output uses constrained decoding: the OpenUI Lang schema + Zod parse is the only accepted channel (C3). | `npm run verify` (S10); schema reject tests (S3) |
| T7 | HITL rubber-stamping | Measured human-in-the-loop studies find only 9–26% intervention success on flagged items once approval fatigue sets in; a universal "click to approve" step is a ritual, not a control. | Risk-tiered approval: reversible-by-default actions need no click; only irreversible or `blocked`-adjacent actions interrupt, and approval-rate telemetry feeds the reputation system so a rubber-stamping operator is visible in data (C8, C9). | S8 telemetry schema tests (`npm run test:unit:runtime`) |
| T8 | A11y-lint blindness | Automated lint covers roughly 30–50% of WCAG; treating a clean lint run as an accessible product ships keyboard traps and contrast failures generated at runtime. | A11y properties are mandatory catalog schema fields — a component without them cannot be emitted at all — over a non-overridable platform floor (contrast, focus, keyboard, target size, reduced motion) (C3, C10). Lint and axe then verify what schema cannot express. | S9 gates (`npm run community-web:app:a11y-lint`, `npm run a11y:community-web`, `npm run community-web:app:design-lint`) |

---

## §3 Frozen design resolutions

These are decided. Swarms may not reopen them; a swarm that believes a
resolution is impossible records a Deviation in its report (§10) and stops
that task rather than silently substituting a different design.

**Deviations from the prior draft (auditable overrides).** An earlier draft of
this plan assumed: fengari as the primary runtime, one worker per script,
per-call capability RPC, an npm import of `json-render`, and a generic React
`apps/web` target. All five were wrong for this repository and are corrected
by (a), (b), and §1: the runtime is wasmoon with a prewarmed pool, the bridge
is batch-in/batch-out, the spec reuses the repo's local `{root, elements}`
convention with no new npm dependency, and the target is the vanilla-JS
`packages/Epoch.Community.Web`.

- **(a) Runtime.** wasmoon (Lua 5.4 compiled to WASM) is the default
  `LuaRuntimeAdapter`. A reserved adapter slot names Luau→WASM as a future
  dialect. fengari is used for SSR-preview only (deterministic static render
  of a scripted view without a worker). Execution uses a prewarmed pool of
  1–2 Web Workers holding per-script sandboxed Lua states — **not**
  worker-per-script: a 5–15 ms worker spawn on every dispatch is the
  anti-pattern this pool exists to kill. Raw `pcall`/`xpcall` are shadowed in
  every guest state so quota-kill is unswallowable (T4). The Lua dialect is
  pinned in the script manifest (C4).
- **(b) Wire format.** Extend the EXISTING OpenUI Lang catalog plus the repo's
  local json-render-shaped `{root, elements}` spec convention. No A2UI import
  in this initiative — but the spec sits behind an internal abstraction module
  so an A2UI adapter is a later additive task. This preserves the proven
  invariant: *the model composes only what a theme can style.*
- **(c) Tokens.** DTCG 2025.10 is the overlay interchange format: sparse
  overlays, a `com.epoch.*` `$extensions` namespace, at most ~40 user-editable
  semantic tokens, targeting `--cw-*` custom properties only. `DESIGN.md`
  frontmatter stays the source of truth for platform tokens; the
  `Epoch.DesignTokens` generator is extended to resolve overlays. The WCAG AA
  floor reuses the existing contrast check in `app/theme.js`.
- **(d) CONTRACT.md reconciliation.** `docs/community-web/CONTRACT.md` is
  amended to a customization-tier model: **Tier 1** themes (CSS only — the
  existing CONTRACT text preserved verbatim), **Tier 2** token overlays
  (DTCG → `--cw-*`), **Tier 3** scripts (emit specs/intents only; never CSS,
  DOM, or network), with a new "What a script cannot do" sibling list beside
  the existing "What a theme cannot do".
- **(e) Packaging.** A new `packages/Epoch.Community.Scripting` package hosts
  the runtime, but scripts are Epoch.Extensions citizens: claim the unclaimed
  `"view"` capability kind, ship at the `advisory` tier (may never contribute
  to signed state), and reuse manifests, signing, publisher lifecycle, trust,
  and store. **No second distribution system.**
- **(f) Persisted GraphQL.** Additive `scripts/build-persisted-ops.mjs`
  (+ `--check` byte verification, wired into the existing
  `community-web:app:build:check` chain) emitting a content-addressed
  operation manifest. Scripts may reference only operation hashes declared in
  their own manifest. The dynamic in-browser engine remains for interactive
  use.
- **(g) Reserved app tier** *(added by ADR-0059)*. A fourth customization tier
  — reviewed, sandboxed-iframe apps on a platform-controlled origin, with a
  message bridge instead of DOM access, host-minted scoped identity, declared
  network egress, and the persisted-operation set as their entire query
  surface — is NAMED and RESERVED, exactly as the Luau adapter slot in (a) is
  reserved. No swarm implements it in this initiative; claiming the slot
  requires its own ADR. A swarm that finds itself building an iframe host has
  left this initiative's scope.

---

## §4 Frozen contracts C0–C12

Contracts are the only inter-swarm channel (§5). They are **additive-only**:
once committed, a contract may gain optional fields but never change or remove
a clause. A swarm that needs a contract change files it as a Deviation for S10
to adjudicate; it never edits another swarm's consumed contract inline.

Schemas below are normative TypeScript. Field names are frozen; comments are
explanatory.

### C0 — Repo facts and gates

§1 is incorporated by reference. Every swarm inherits: the gate ladder
(§1.2), the no-vitest/no-jest/no-React rule, the anti-slop dialect, the
coverage floors, the docs-reachability rule, and the commit format.

### C1 — Runtime adapter interface and resource budgets

```ts
export type LuaDialect =
  | "lua54-wasmoon"      // default; the only dialect shipped by this initiative
  | "luau-wasm"          // RESERVED adapter slot; not implemented now
  | "lua54-fengari-ssr"; // SSR-preview only; never executes user events

export interface ResourceBudget {
  readonly cpuMsPerDispatch: number;      // default 50
  readonly memoryMbPerState: number;      // default 16
  readonly wallClockMsPerDispatch: number; // default 250
  readonly fuelPerDispatch: number;        // WASM instruction fuel; interrupt on exhaust
}

export interface LuaStateHandle { readonly stateId: string; }

export interface LuaRuntimeAdapter {
  readonly dialect: LuaDialect;
  /** Acquires a sandboxed per-script state from the prewarmed worker pool. */
  acquire(manifest: ScriptManifest, budget: ResourceBudget): Promise<LuaStateHandle>;
  /** One event in, one transactional batch out (C2). Quota-kill rejects. */
  dispatch(handle: LuaStateHandle, event: HostEvent, batch: SnapshotBatch): Promise<SpecMutationBatch>;
  /** Host-raised termination. Guest code cannot catch, defer, or observe it. */
  kill(handle: LuaStateHandle, reason: "quota" | "killbit" | "unload"): Promise<void>;
}
```

Clauses:
- C1.1 Raw `pcall` and `xpcall` are shadowed in every guest state; the
  shadow raises a host error that propagates as dispatch rejection, and a
  guest attempt to catch a quota-kill is itself a quota-kill (T4).
- C1.2 Worker pool size is 1–2 prewarmed workers; spawn-on-dispatch is
  forbidden (§3(a)).
- C1.3 Budgets are declared per script in the manifest (C4) and clamped to
  the platform maximums above.
- C1.4 Guest states hold no ambient authority: no network, no DOM, no
  timers, no host memory beyond the dispatched batch (mirrors ADR-0045's
  host-owned-memory rule).

### C2 — Batch-in / batch-out bridge

```ts
export interface SnapshotBatch {
  /** Frozen at dispatch; keyed by the persisted-op hash declared in C4. */
  readonly tables: Readonly<Record<string, ReadonlyArray<Readonly<Record<string, unknown>>>>>;
  readonly context: Readonly<Record<string, boolean>>; // opaque predicates only (C8)
}
export interface SpecMutationBatch {
  readonly mutations: ReadonlyArray<SpecMutation>; // upsert/remove against {root, elements}
  readonly intents: ReadonlyArray<IntentProposal>; // proposals, never executions (C8)
}
```

Clauses:
- C2.1 The host pre-resolves every persisted operation declared in the
  script manifest into a frozen read-only snapshot table BEFORE dispatch.
  A script cannot trigger a query, fetch, or capability call mid-dispatch (T5).
- C2.2 The script returns exactly one `SpecMutationBatch` per event
  dispatch. Application is transactional: any invalid mutation rejects the
  whole batch and leaves the previous rendered spec untouched.
- C2.3 Exactly one bridge round-trip per event dispatch. Tests assert the
  round-trip counter equals 1.
- C2.4 Snapshot tables are deep-frozen host-side; mutation attempts are a
  dispatch error, not a silent no-op.

### C3 — UI spec and component catalog

```ts
export interface UiSpec { readonly root: string; readonly elements: Readonly<Record<string, UiElement>>; }
export interface UiElement {
  readonly type: string;              // MUST be a catalog component name
  readonly props: Readonly<Record<string, unknown>>;
  readonly a11y: {                    // MANDATORY schema fields (T8)
    readonly role: string;
    readonly label: string;           // accessible name; never empty for interactive types
    readonly keyboard: "operable" | "not-interactive";
  };
  readonly placementClass: PlacementClass;
  readonly children: ReadonlyArray<string>;
}
export type PlacementClass = "content" | "chrome-adjacent" | "blocked";
```

Clauses:
- C3.1 The catalog is generated by extending `scripts/build-openui.mjs`;
  every catalog component declares its a11y schema fields and its allowed
  `placementClass` set. A component without complete a11y fields fails the
  build.
- C3.2 `blocked` covers payment, permission, and credential UI: scripts and
  LLM generation can never place it (T2, C8).
- C3.3 Generated elements render through `app/generate.js` into the same
  `[data-c]` markup as authored views and are taint-marked (`data-gen`)
  so policy and lint can distinguish generated subtrees.
- C3.4 The spec sits behind an internal abstraction module
  (`app/openui-spec.js`); the OpenUI Lang / `{root, elements}` pairing is
  one adapter. A future A2UI adapter is additive (§3(b)).
- C3.5 LLM-facing output is constrained by the OpenUI Lang schema + Zod
  parse; free-form JSON prompting is not an accepted channel (T6).
- C3.6 *(added by ADR-0059)* The catalog carries a named social-primitive set
  beside the shipped `Panel` / `Post` / `Notice` / `Channel` / `Fact` /
  `Theme` components: `PostCard`, `ThreadView`, `ChannelList`, `ChatLine`,
  `AnswerBlock`, `VoteControls`, `LivePanel`, `BotCard`, `EmbedCard`,
  `UserLine`. Each declares complete a11y fields and its allowed
  `placementClass` set under C3.1; a member of the set missing either fails
  the build exactly as any other component does.
- C3.7 *(added by ADR-0059)* Consequential affordances on those components —
  vote, accept answer, follow, repost, compose, send — are expressible only as
  `IntentProposal`s under C8.1. No catalog component may bind a consequential
  action to a script- or LLM-placed element in a way that commits without a
  member gesture on platform chrome.
- C3.8 *(added by ADR-0059)* `BotCard` carries a non-removable AI provenance
  label: the label is a schema-required prop rendered by the host, not a
  string the emitting script or model supplies or can suppress.

### C4 — Script manifest (extends the Epoch.Extensions manifest)

```json
{
  "kind": "view",
  "tier": "advisory",
  "dialect": "lua54-wasmoon",
  "entry": "main.lua",
  "limits": { "cpuMsPerDispatch": 50, "memoryMbPerState": 16, "wallClockMsPerDispatch": 250 },
  "persistedOps": ["sha256:…"],
  "capabilities": ["render:view"],
  "publisher": "…",
  "signature": "…"
}
```

Clauses:
- C4.1 `kind` is the claimed `"view"` capability kind; `tier` is always
  `advisory` — a script may never contribute to signed state (ADR-0045
  tier semantics, §3(e)).
- C4.2 `dialect` pins the Lua dialect; the runtime refuses a dialect other
  than the pinned one.
- C4.3 `persistedOps` lists content-addressed operation hashes (C7); the
  bridge refuses to resolve anything not listed.
- C4.4 Signing, publisher lifecycle, rotation, and revocation reuse
  ADR-0046 machinery unchanged.

### C5 — CSS tier

Clauses:
- C5.1 Tier-2 CSS contains no `url()` and no `@import` (or first-party
  proxied URLs only); `:visited` selectors are stripped; external `text/css`
  files are served, never inline `<style>` from user data (T3).
- C5.2 Authored output is wrapped in `@scope` + `@layer` with
  `overflow: clip` containment so a theme cannot paint outside its region.
- C5.3 Blur and shadow values are capped by the DESIGN.md Glow Budget rule;
  the compiler rejects values over budget.
- C5.4 SCSS/LESS exist at authoring time only; compilation and serving are
  server-side/build-side via `scripts/build-css-tier.mjs`, byte-verified in
  the `community-web:app:build:check` chain.
- C5.5 Tier 1 (existing CONTRACT.md themes) is preserved verbatim (§3(d)).

### C6 — DTCG token overlay schema

```json
{
  "$schema": "dtcg/2025.10",
  "cw": {
    "accent": { "$value": "#7df9ff", "$type": "color" }
  },
  "$extensions": { "com.epoch": { "targets": ["--cw-accent"], "contrastFloor": "AA" } }
}
```

Clauses:
- C6.1 Overlays are sparse: only overridden tokens appear.
- C6.2 At most ~40 user-editable semantic tokens, each mapped to `--cw-*`
  custom properties only; overlays can never target `--epoch-color-*`
  (platform tokens stay sourced from DESIGN.md frontmatter, §3(c)).
- C6.3 The `com.epoch.*` `$extensions` namespace carries Epoch metadata
  (targets, contrast floor, tier).
- C6.4 Resolution happens in the extended `Epoch.DesignTokens` generator;
  the WCAG AA floor reuses the `app/theme.js` contrast check (C10).

### C7 — Persisted-operation manifest

```ts
export interface PersistedOpsManifest {
  readonly operations: ReadonlyArray<{
    readonly hash: string;   // sha256 of the normalized operation document
    readonly name: string;   // human label; not load-bearing
    readonly sdl: string;    // the frozen operation text
  }>;
}
```

Clauses:
- C7.1 `scripts/build-persisted-ops.mjs` emits the manifest
  deterministically; `--check` byte-verifies it, wired into the existing
  `community-web:app:build:check` chain (§3(f)).
- C7.2 Scripts reference operations by hash only (C4.3); the client wrapper
  fetches by hash and verifies before use.
- C7.3 The dynamic in-browser GraphQL engine is untouched for interactive
  use.

### C8 — Intent placement and taint

Clauses:
- C8.1 **UI proposes, gesture commits.** Scripts and LLMs emit
  `IntentProposal`s; only a direct user gesture on platform chrome commits
  an intent through the frozen `app/action-registry.js`.
- C8.2 Payment, permission, and credential UI is never script- or
  LLM-placeable: `placementClass: "blocked"` elements are refused by the
  renderer regardless of content (T2).
- C8.3 Host context reaches scripts as opaque boolean predicates in
  `SnapshotBatch.context` (World-of-Warcraft "secret values" pattern: addon
  code evaluates policy predicates without ever reading the underlying
  secret). Scripts never receive raw identity, token, or content strings
  they do not themselves render.
- C8.4 Risk-tiered approval: reversible-by-default needs no interstitial;
  irreversible or trust-adjacent intents require an explicit gesture and
  emit approval-rate telemetry (T7).

### C9 — Distribution and trust

Clauses:
- C9.1 Publisher identity, key expiry, rotation, and revocation are exactly
  the ADR-0046 lifecycle; no parallel identity system.
- C9.2 Every script version carries a per-version killbit; a killbit event
  produces a typed tombstone at the script's installed position (matching
  the CONTRACT.md tombstone rule) plus user notification.
- C9.3 Staged rollout: a new version ships to declared percentage buckets
  before general availability; rollback is killbit + re-pin.
- C9.4 Reputation tiers derive from publisher history plus the approval-rate
  telemetry of C8.4 (T1, T7).
- C9.5 Bots are script authors through the same pipeline: Ed25519 agent
  principals with ADR-0034 attenuated grants and budgets (C11).

### C10 — Accessibility floor

Non-overridable platform minimums for every rendered element, authored or
generated: WCAG AA contrast (reusing `app/theme.js`'s check), visible focus,
full keyboard operability (Keyboard-First rule), minimum target sizes per
the existing a11y lint, and reduced-motion respect. A theme, overlay, or
script output that would breach the floor is clamped or rejected — never
waived. Lint covers the rest but is never the floor's substitute (T8).

### C11 — Governance

Clauses:
- C11.1 Capability-floor charter: the platform floor (C10, Bracket Rule,
  DESIGN.md named rules) is a minimum; customization can only add to user
  agency, never subtract.
- C11.2 Stability tiers for catalog components and contracts:
  `experimental` → `stable` → `frozen`. The frozen action registry and
  Tier-1 CONTRACT text start at `frozen`.
- C11.3 Deprecation: two documented notices across shipped artifacts before
  removal, with migration notes in the deprecation ADR.
- C11.4 Agent/bot authors use the same manifest, signature, and grant
  machinery as humans (C9.5).

### C12 — Acceptance and reporting schema

Every swarm reports in exactly the §10 format. Every REQ row in §7 names a
gate command from §1.2. A claim without its gate's exit code is REJECTED
(§0).

### C13 — Community bundle manifest *(added by ADR-0059)*

```ts
export type BundleMemberKind = "overlay" | "css-tier" | "script" | "bot";

export interface BundleMember {
  readonly kind: BundleMemberKind;
  readonly hash: string;   // sha256 of the member artifact; installs resolve by hash only
  readonly name: string;   // human label; not load-bearing
}

export interface BundleManifest {
  readonly kind: "bundle";
  readonly tier: "advisory";
  readonly publisher: string;
  readonly signature: string;
  readonly members: ReadonlyArray<BundleMember>;
}
```

Clauses:
- C13.1 A bundle is an Epoch.Extensions citizen. Publisher identity, signing,
  rotation, revocation, staged rollout, and reputation are the C9 machinery
  unchanged; a bundle introduces no distribution or identity system of its own.
- C13.2 Members are content-hash-pinned. Installation resolves each member by
  `hash`; a member whose bytes do not match its declared hash fails the whole
  bundle install, and no member installs partially.
- C13.3 Each member installs through the machinery its kind already has:
  `script` members through C4 manifest validation, `overlay` members through
  the C6 resolver and its contrast floor, `css-tier` members through the C5
  sanitizer, `bot` members through the C9.5 agent-principal path.
- C13.4 Killbit granularity is both bundle and member. Killing either leaves a
  typed tombstone at the installed position and notifies, per C9.2; a killed
  member cannot be re-enabled by reinstalling its bundle.
- C13.5 The store install surface shows a bundle's full member list, by kind
  and name, before the install gesture. A bundle never installs members it did
  not disclose.

### C14 — Feed-skeleton interface *(added by ADR-0059)*

```ts
export interface SkeletonItem { readonly id: string; readonly reason?: string; }
export interface SkeletonBatch { readonly items: ReadonlyArray<SkeletonItem>; }
```

Clauses:
- C14.1 A `view`-kind script may return one `SkeletonBatch` per dispatch under
  the same C2 rules as `SpecMutationBatch`: one round trip, transactional
  application, whole-batch rejection on any invalid item.
- C14.2 Skeleton output is identifiers only. A script never returns hydrated
  content, and never receives content in its snapshot that it was not already
  granted through its declared persisted operations (C4.3).
- C14.3 The host hydrates identifiers through its own persisted operations and
  applies blocks, labels, and permission checks after hydration. Hydration is
  never delegated to the script.
- C14.4 Skeleton output is advisory: it orders items the requesting member can
  already see. An identifier the member cannot see is dropped at hydration, and
  dropping is not observable to the script as a distinct outcome.

---

## §5 Ownership map

Contracts (§4) and committed fixtures are the ONLY inter-swarm channel. Two
swarms never write the same file. The globs below are pairwise disjoint: each
is either a new directory owned outright, a new filename prefix inside a
shared directory, a single explicitly named existing file assigned to exactly
one swarm, or — for the one shared package — a subdirectory split.

| Swarm | Owned globs |
|---|---|
| S1 Runtime | `packages/Epoch.Community.Scripting/**` **except** `src/policy/**`; `test/unit/lua-runtime-*.test.ts`; root `package.json` workspace/exports/build/typecheck registration for the new package only |
| S2 Bridge | `packages/Epoch.Community.Web/app/scripting/**` (new subdir, incl. `cw-script-host.js`); `test/unit/script-bridge-*.test.ts` |
| S3 Catalog/Renderer | `packages/Epoch.Community.Web/scripts/build-openui.mjs`; `packages/Epoch.Community.Web/app/openui-parser.js`; `…/app/openui-library.js`; `…/app/generate.js`; `…/app/openui-spec.js` (new); `test/unit/openui-*.test.ts` |
| S4 Style Tier | `packages/Epoch.Community.Web/scripts/build-css-tier.mjs` (new); `packages/Epoch.Community.Web/css-tier/**` (new); `test/unit/css-tier-*.test.ts` |
| S5 Token Overlays | `packages/Epoch.DesignTokens/**`; `packages/Epoch.Community.Web/app/theme.js`; `test/unit/design-tokens-overlay-*.test.ts` |
| S6 Persisted Ops | `packages/Epoch.Community.Web/scripts/build-persisted-ops.mjs` (new); `packages/Epoch.Community.Web/app/graphql-persisted.js` (new); `packages/Epoch.Community.GraphQL/src/persisted/**` (new); `packages/Epoch.Community.GraphQL/test/persisted-*.test.mjs` (new) |
| S7 Distribution/Trust | `packages/Epoch.Extensions/src/view-*.ts` and `…/src/script-*.ts` (new files only); the single existing file declaring `CAPABILITY_KINDS` (additive edit, locate by Grep); `packages/Epoch.Community.Web/app/script-store.js` (new); `test/unit/extensions-view-*.test.ts` |
| S8 Security/Red Team | `packages/Epoch.Community.Scripting/src/policy/**` (new); `packages/Epoch.Community.Web/scripts/serve.mjs` (additive CSP edit); `test/adversarial/lua-scripting/**` (new); `test/fuzz/lua-scripting-*` (new); `test/mutation/run-scripting-mutants.mjs` + `test/mutation/oracles/scripting-*` (new); `test/unit/script-policy-*.test.ts` |
| S9 A11y/Design Lint | `scripts/lint-community-web-app-a11y.mjs`; `scripts/lint-community-web-app-design.mjs`; `scripts/audit-design-tokens.mjs`; `scripts/run-community-web-axe.mjs` (additive fixtures); `features/lua_ui_customization.feature` (new); `test/features/**/lua-scripting-*` (new step files) |
| S10 Docs/Verify | `docs/**`; `test/verify/**scripting*` (new goldens); `packages/Epoch.Community.Web/test/e2e.mjs` (additive `CW_E2E` scenario entries); `packages/Epoch.Community.Web/test/e2e-scripting-*` (new helpers); root `package.json` final merge arbitration |

Rules:
- Root `package.json`: S1 adds the new package registration; each swarm may
  add only its own new script entries; S10 resolves any conflict at merge
  (§11).
- Existing files not listed above are read-only for every swarm. If a change
  to one is unavoidable, file a Deviation for S10.
- Committed fixtures (example scripts, overlays, manifests) are proposed by
  the producing swarm and committed under its own globs.

---

## §6 Swarms S1–S10

Each task is atomic: one file-set, one runnable gate command, one falsifiable
"Done means". Gate commands are taken from §1.2 and exist in `package.json`
today; where a task adds a NEW checker, the task includes wiring that checker
into one of those existing commands so the gate stays real.

### S1 — Scripting Runtime

- Charter: create `packages/Epoch.Community.Scripting` (`@epoch/community-scripting`): wasmoon pool, quotas, `pcall` shadowing, adapter interface.
- Consumes: C0, C1, C4.

1. Scaffold the package (`package.json`, `src/index.ts`) and register it in
   root `workspaces`, `exports`, `build`, and `typecheck` chains.
   Gate: `npm run konsistent`.
   Done means: `npm run konsistent` exits 0 and `npm run typecheck` resolves
   `@epoch/community-scripting`.
2. Implement `LuaRuntimeAdapter` (C1) over wasmoon with a prewarmed 1–2 worker
   pool and per-script sandboxed states.
   Gate: `npm run typecheck`.
   Done means: adapter compiles; a pool saturation test dispatches two scripts
   through one worker without a second spawn (spawn counter asserted).
3. Enforce resource budgets: CPU ms, memory MB, wall-clock, fuel/interrupt
   (C1.3).
   Gate: `npm run test:unit:runtime`.
   Done means: `test/unit/lua-runtime-quotas-*.test.ts` kills a deliberately
   over-budget script and asserts rejection, not hang.
4. Shadow raw `pcall`/`xpcall` so quota-kill is unswallowable (C1.1, T4).
   Gate: `npm run test:unit:runtime`.
   Done means: a guest that wraps its infinite loop in `pcall` is still
   killed; the test fails if shadowing is removed (zero-mechanism control).
5. Add the reserved Luau adapter slot and the fengari SSR-preview path
   (§3(a)); fengari never executes user events.
   Gate: `npm run test:unit:runtime`.
   Done means: dialect pin mismatch is rejected (C4.2); SSR-preview renders a
   fixture spec without a worker.
- Forbidden: worker-per-script spawn; any network/DOM/timer capability inside
  a guest state; editing `src/policy/**` (S8's).

### S2 — Capability Bridge

- Charter: snapshot-table builder, transactional spec batch, and the browser
  host `app/scripting/cw-script-host.js` (C2).
- Consumes: C0, C1, C2, C3, C7, C8.

1. Build the snapshot-table pre-resolver: manifest-declared op hashes (C4.3)
   → frozen read-only tables before dispatch (C2.1, C2.4).
   Gate: `npm run test:unit:runtime`.
   Done means: a script requesting an undeclared hash is rejected; deep-freeze
   violation is a dispatch error.
2. Implement transactional `SpecMutationBatch` apply with whole-batch
   rollback (C2.2).
   Gate: `npm run test:unit:runtime`.
   Done means: a batch with one invalid mutation leaves the prior rendered
   spec byte-identical.
3. Implement `cw-script-host.js`: pool client, one round-trip per event
   (C2.3, T5).
   Gate: `npm run test:unit:runtime`.
   Done means: a round-trip counter test asserts exactly 1 bridge crossing per
   dispatched event over a scripted fixture.
4. Route `IntentProposal`s to the frozen action registry as proposals only
   (C8.1); gesture commits stay platform-side.
   Gate: `npm run test:unit:runtime`.
   Done means: a script-originated intent without a gesture never reaches the
   registry's commit path.
- Forbidden: per-call capability RPC; importing the dynamic GraphQL engine
  into the dispatch path; touching `app/generate.js` (S3's).

### S3 — GenUI Catalog and Renderer

- Charter: extend `scripts/build-openui.mjs`, `app/openui-parser.js`,
  `app/openui-library.js`, `app/generate.js`; add the spec abstraction module
  and taint marking (C3).
- Consumes: C0, C3, C8, C10.

1. Extend the catalog schema with mandatory a11y fields and `placementClass`
   sets (C3.1, C3.2); wire `build-openui.mjs --check` byte verification into
   the `community-web:app:build:check` chain.
   Gate: `npm run community-web:app:build:check`.
   Done means: a catalog component missing an a11y field fails the build;
   `--check` exits non-zero on a hand-edited artifact.
2. Extend `app/openui-parser.js` to validate the new fields fail-closed (C3.5).
   Gate: `npm run community-web:app:parity`.
   Done means: malformed LLM output is rejected by the parser in the parity
   harness; no silent coercion.
3. Taint-mark generated subtrees in `app/generate.js` (`data-gen`, C3.3) and
  refuse `blocked` placements at render (C8.2).
   Gate: `npm run community-web:app:parity`.
   Done means: a fixture spec with `placementClass: "blocked"` renders nothing
   and logs a typed refusal.
4. Add `app/openui-spec.js`: the internal spec abstraction with the OpenUI
   Lang / `{root, elements}` adapter as its only implementation (C3.4).
   Gate: `npm run typecheck`.
   Done means: parser and renderer import the abstraction, never the adapter
   directly; the adapter is swappable without renderer edits (proven by a
   test double).
5. Commit catalog fixtures used by S2/S8/S9 tests.
   Gate: `npm run test:unit:runtime`.
   Done means: `test/unit/openui-*.test.ts` passes against the committed
   fixtures.
- Forbidden: new npm dependencies; React; free-form LLM JSON channels;
  editing CONTRACT.md (S10's).

### S4 — Style Tier

- Charter: server-side CSS compiler/sanitizer and SCSS/LESS authoring
  ingestion (C5).
- Consumes: C0, C5, C10.

1. Create `packages/Epoch.Community.Web/scripts/build-css-tier.mjs` +
   `css-tier/**`: compile and sanitize Tier-2 CSS; wire its `--check` into the
   `community-web:app:build:check` chain.
   Gate: `npm run community-web:app:build:check`.
   Done means: deterministic artifact regenerates byte-identically; `--check`
   fails on hand edits.
2. Implement the sanitizer: reject `url()`/`@import` (or first-party proxy
   only), strip `:visited`, wrap output in `@scope` + `@layer` with
   `overflow: clip`, cap blur/shadow at Glow Budget (C5.1–C5.3).
   Gate: `npm run test:unit:runtime`.
   Done means: `test/unit/css-tier-*.test.ts` includes an exfiltration corpus
   (attribute-selector beacons, imported URLs); every entry is rejected.
3. Add SCSS/LESS authoring-time ingestion that compiles to the same artifact
   (C5.4); no client-side preprocessors ship.
   Gate: `npm run community-web:app:build:check`.
   Done means: an SCSS fixture and its hand-written CSS twin produce the same
   sanitized artifact.
4. Prove Tier-1 preservation: existing CONTRACT themes compile through the
   new path unchanged.
   Gate: `npm run community-web:app:parity`.
   Done means: the shipped `grid` theme artifact is byte-identical before and
   after the new pipeline.
- Forbidden: inline `<style>` from user data; runtime CSS evaluation;
  weakening the Glow Budget.

### S5 — Token Overlays

- Charter: DTCG 2025.10 overlay resolver in `Epoch.DesignTokens` and
  `app/theme.js` integration (C6).
- Consumes: C0, C6, C10.

1. Add the overlay schema + validator (sparse, `$extensions: com.epoch.*`,
   ≤40 semantic tokens, `--cw-*` targets only) (C6.1–C6.3).
   Gate: `npm run test:unit:runtime`.
   Done means: overlays targeting `--epoch-color-*` or exceeding the token
   cap are rejected with typed errors.
2. Extend the token generator to resolve overlays over the DESIGN.md
   frontmatter source of truth (C6.4).
   Gate: `npm run design:audit`.
   Done means: `design:audit` stays green with a committed overlay fixture;
   removing the resolver breaks the fixture test.
3. Integrate overlay application into `app/theme.js`, reusing its WCAG AA
   contrast check as the floor (C10).
   Gate: `npm run gate:push`.
   Done means: a contrast-violating overlay fixture is clamped/rejected on
   device; garden (manual + on-device generation) keeps working.
4. Commit overlay fixtures (valid, sparse; invalid, over-cap; invalid,
   platform-targeting).
   Gate: `npm run test:unit:runtime`.
   Done means: all three fixtures are exercised by name in tests.
- Forbidden: a second token source of truth; editing `DESIGN.md`; touching
  `app/themes.js` (read-only this initiative).

### S6 — Persisted Operations

- Charter: additive persisted GraphQL layer: `scripts/build-persisted-ops.mjs`
  (+ `--check`), content-addressed operation manifest, client wrapper (C7).
- Consumes: C0, C7, C4.

1. Create `packages/Epoch.Community.Web/scripts/build-persisted-ops.mjs`:
   deterministic emission of the `PersistedOpsManifest` (C7.1); wire
   `--check` into the `community-web:app:build:check` chain.
   Gate: `npm run community-web:app:build:check`.
   Done means: manifest regenerates byte-identically; `--check` fails on a
   hand-edited manifest.
2. Add `packages/Epoch.Community.GraphQL/src/persisted/**`: hash pinning and
   operation lookup beside (never inside) the dynamic engine (C7.3).
   Gate: `npm run community-graphql:check`.
   Done means: package tests cover hash-pinned resolution and unknown-hash
   refusal.
3. Add `app/graphql-persisted.js`: fetch-by-hash client wrapper that verifies
   content before use (C7.2).
   Gate: `npm run gate:push`.
   Done means: a tampered-bytes fixture is rejected by the wrapper before
   execution.
4. Prove manifest-declaration enforcement end to end with S2's resolver:
   undeclared hash → dispatch rejection (C4.3).
   Gate: `npm run test:unit:runtime`.
   Done means: the cross-contract fixture (script manifest minus one op hash)
   fails at pre-resolution.
- Forbidden: modifying the dynamic engine's behavior; introducing codegen or
  a new network protocol; persisted operations outside the manifest.

### S7 — Distribution and Trust

- Charter: scripts as Epoch.Extensions citizens: claim `"view"`, advisory
  tier, killbit/tombstone/notify, staged rollout, reputation tiers, and the
  board store UI `app/script-store.js` (C4, C9).
- Consumes: C0, C4, C9, C11.

1. Claim the `"view"` capability kind additively in the existing
   `CAPABILITY_KINDS` declaration and register the advisory-tier semantics
   (C4.1, §3(e)).
   Gate: `npm run gate:push`.
   Done means: a `view` provider attempting to contribute to signed state is
   rejected by the existing tier enforcement.
2. Implement script-manifest validation (dialect pin, declared op hashes,
   declared limits) as an extension-manifest profile (C4).
   Gate: `npm run test:unit:runtime`.
   Done means: manifests missing dialect/limits/hashes fail validation with
   typed errors.
3. Implement per-version killbit → typed tombstone + notify (C9.2), reusing
   ADR-0046 revocation propagation.
   Gate: `npm run test:unit:runtime`.
   Done means: a killed version leaves a tombstone at its installed position,
   notifies, and cannot be re-enabled without a new version.
4. Implement staged rollout buckets and reputation tiers fed by approval-rate
   telemetry (C9.3, C9.4).
   Gate: `npm run test:pact`.
   Done means: the distribution API's consumer/provider pact covers rollout
   state, killbit, and tombstone responses.
5. Build `app/script-store.js`: install/inspect/kill views over the extension
   store, rendered through the catalog (C3) and the action registry (C8.1).
   Gate: `npm run community-web:app:parity`.
   Done means: store surfaces render in the parity harness with taint marking
   intact.
- Forbidden: a second distribution/trust system; any change to publisher key
  semantics (ADR-0046 is reused verbatim); scripts outside the extension
  pipeline.

### S8 — Security Policy and Red Team

- Charter: taint/secret-value predicate library, real CSP, adversarial corpus
  with a zero-mechanism control, fuzz targets, scripting mutant lane,
  approval-rate telemetry schema (C5, C8, C9; T1–T8).
- Consumes: C0, C1, C2, C5, C8, C9.

1. Implement `packages/Epoch.Community.Scripting/src/policy/**`: opaque
   context predicates (C8.3) and the taint model consumed by S2/S3.
   Gate: `npm run test:unit:runtime`.
   Done means: predicates return booleans only; a test proves no raw context
   value crosses into a guest state.
2. Make CSP real (§1.4): deliver a served Content-Security-Policy via
   `scripts/serve.mjs` covering the CSS tier and script execution posture
   asserted in CONTRACT.md prose.
   Gate: `npm run community-web:app:e2e`.
   Done means: an e2e asserts the delivered policy blocks a fixture inline
   style/script injection that previously succeeded.
3. Author the adversarial corpus (`test/adversarial/lua-scripting/**`):
   supply-chain fixtures (T1), phishing placement attempts (T2), CSS
   exfiltration (T3), pcall swallow attempts (T4), RPC flooding (T5) — plus a
   ZERO-MECHANISM CONTROL: one corpus entry that must fail if the containing
   mechanism is deleted.
   Gate: `npm test`.
   Done means: the control entry demonstrably fails when its mechanism is
   removed and passes when present; this is shown in the report.
4. Add Jazzer/fast-check fuzz targets for the spec parser and bridge codec
   (`test/fuzz/lua-scripting-*`).
   Gate: `npm run fuzz:fast-check`.
   Done means: the property lane covers parser reject-shapes and bridge batch
   round-trips with shrinking.
5. Create `test/mutation/run-scripting-mutants.mjs` + oracles following the
   existing `run-community-web-mutants.mjs` pattern, and register an npm
   script for it.
   Gate: `npm run gate:push`.
   Done means: every listed scripting mutant is killed by the oracle tests
   (runner exit 0, quoted in the report); the tree stays green under
   gate:push.
6. Define the approval-rate telemetry schema (C8.4, T7) consumed by S7's
   reputation tiers.
   Gate: `npm run test:unit:runtime`.
   Done means: telemetry events round-trip through the schema validator;
   unknown event shapes are rejected.
- Forbidden: weakening any existing lint/typecheck/coverage setting; editing
  another swarm's runtime code to make a red-team case pass; prose-only
  security claims (every claim names its C-clause).

### S9 — A11y and Design Lint

- Charter: extend the three lint/audit scripts and axe fixtures for
  generated/scripted subtrees; author the persona Gherkin (C3, C5, C6, C10;
  T8).
- Consumes: C0, C3, C5, C6, C10.

1. Extend `scripts/lint-community-web-app-a11y.mjs` to cover `data-gen`
   (script/LLM-rendered) subtrees.
   Gate: `npm run community-web:app:a11y-lint`.
   Done means: a fixture scripted view with a missing accessible name fails
   the lint; removing the extension hides the failure (control shown).
2. Extend `scripts/lint-community-web-app-design.mjs` so Bracket Rule chrome
   (receipt locators, `button.cn-sig-text[data-receipt-locator]`,
  `--cw-signed`) holds inside generated subtrees.
   Gate: `npm run community-web:app:design-lint`.
   Done means: a fixture that strips receipt chrome inside a scripted view
   fails the lint.
3. Extend `scripts/audit-design-tokens.mjs` to audit overlay-resolved
   `--cw-*` tokens structurally (fail-closed).
   Gate: `npm run design:audit`.
   Done means: an overlay resolving to an undeclared `--cw-*` token fails the
   audit.
4. Add axe fixtures for scripted views to `scripts/run-community-web-axe.mjs`.
   Gate: `npm run a11y:community-web`.
   Done means: axe runs over at least one scripted-view route at both
   existing viewport sizes.
5. Author `features/lua_ui_customization.feature` + steps: persona-tagged
   journeys (`@persona.github_open_source_contributor`,
   `@persona.maintainer`, `@persona.platform_operator`,
   `@persona.security_compliance_responder`) that read as user journeys —
   install a scripted view, apply a token overlay, commit a script-proposed
   intent by gesture, observe a killbit tombstone.
   Gate: `npm test`.
   Done means: the feature file executes green under Cucumber with steps in
   `test/features/**/lua-scripting-*`.
- Forbidden: persona/governance-only feature files; scenarios written as
  screen inventories or "browser shows" checklists; lowering any lint
  severity to pass.

### S10 — Docs, Governance, and Final Verify

- Charter: CONTRACT.md tier amendment, implementation ADRs, goldens, e2e
  entries, inventory/matrix rows, merge arbitration, final verify (C11, C12).
- Consumes: C0, C11, C12, and every swarm report.

1. Amend `docs/community-web/CONTRACT.md` to the three-tier model (§3(d)):
   Tier-1 text preserved verbatim, Tier-2 overlay tier, Tier-3 script tier,
   "What a script cannot do" sibling list.
   Gate: `npm run docs:check`.
   Done means: a verbatim diff check shows Tier-1 clauses unchanged; the new
   tiers are linked from `docs/README.md`.
2. Author implementation ADRs (runtime choice, persisted ops, distribution)
   following `docs/design-decisions/NNNN-kebab.md` conventions and index them
   in `docs/design-decisions/README.md`.
   Gate: `npm run docs:check`.
   Done means: each ADR has status/context/decision/consequences/revisit and
   an index row.
3. Add Verify goldens for scripting decisions (manifest resolution, overlay
   resolution, killbit tombstone) under `test/verify/`, regenerated with
   `EPOCH_UPDATE_VERIFIED=1`.
   Gate: `npm run verify`.
   Done means: goldens are committed and asserted green in the full run.
4. Add e2e scenario entries (`CW_E2E=` prefix) for the scripted-view journey
   in `packages/Epoch.Community.Web/test/e2e.mjs` + new helper files.
   Gate: `npm run community-web:app:e2e`.
   Done means: the new scenarios run green in the full e2e suite, not only
   under their filter.
5. Add rows to `docs/feature-scenario-inventory.md` and
   `docs/persona-feature-matrix.md` for every new S9 scenario; update the
   sdlc-state and dispatch log.
   Gate: `npm run docs:check`.
   Done means: inventory/matrix reference the exact scenario names in
   `features/lua_ui_customization.feature`.
6. Run the merge and final verification protocol (§11).
   Gate: `npm run verify`.
   Done means: full verify exits 0 on the merged tree; the report quotes the
   exit code and each REQ row's gate evidence.
- Forbidden: rewriting Tier-1 CONTRACT text; merging a swarm report that
  lacks gate exit codes; claiming verify from a partial run.

---

## §7 Acceptance matrix

Every REQ is machine-checkable. A REQ is met only when its gate command
exited 0 on the merged tree and the owning swarm's report quotes it.

| REQ | Requirement (machine-checkable form) | Enforcing mechanism | Gate command | Owner |
|---|---|---|---|---|
| REQ-1 | Runtime sandboxing: pooled wasmoon states, budgets enforced, `pcall`/`xpcall` shadowed | C1 adapter + quotas + shadowing | `npm run test:unit:runtime` | S1 |
| REQ-2 | Bridge batching: snapshot-in, one transactional batch out, one round-trip per event | C2 bridge + host | `npm run test:unit:runtime` | S2 |
| REQ-3 | Spec/catalog: mandatory a11y fields, `placementClass`, taint marking, abstraction module | C3 catalog + parser + renderer | `npm run community-web:app:parity` | S3 |
| REQ-4 | CSS tier: no exfiltration vectors, scoped/layered, Glow Budget caps, build-verified | C5 compiler/sanitizer | `npm run community-web:app:build:check` | S4 |
| REQ-5 | Token overlays: DTCG sparse overlays, ≤40 tokens, `--cw-*` only, AA floor | C6 resolver + theme integration | `npm run design:audit` | S5 |
| REQ-6 | Persisted ops: content-addressed manifest, byte-verified, hash-declared use | C7 build + client wrapper | `npm run community-web:app:build:check` | S6 |
| REQ-7 | Distribution/trust: `view` kind, advisory tier, killbit/tombstone/notify, rollout, reputation | C4 + C9 on Epoch.Extensions | `npm run test:pact` | S7 |
| REQ-8 | Security red team: real CSP, adversarial corpus with zero-mechanism control, fuzz + mutants | C8 policy + corpus + lanes | `npm test` and `npm run fuzz:fast-check` | S8 |
| REQ-9 | A11y/design gates: lint/audit/axe extended to generated subtrees; persona Gherkin green | C10 floor + S9 extensions | `npm run community-web:app:a11y-lint` and `npm run community-web:app:design-lint` and `npm run a11y:community-web` | S9 |
| REQ-10 | Docs/governance/verify: tier amendment, ADRs, goldens, inventory/matrix, full verify | C11 + C12 | `npm run docs:check` and `npm run verify` | S10 |
| REQ-11 *(ADR-0059)* | Social catalog set ships with complete a11y fields, placement sets, gesture-only consequential actions, and a host-rendered `BotCard` provenance label | C3.6–C3.8 catalog + renderer | `npm run community-web:app:parity` | S3 |
| REQ-12 *(ADR-0059)* | Bundles: hash-pinned members, per-kind install paths, bundle- and member-granular killbit with tombstone, disclosed member list before install | C13 on Epoch.Extensions | `npm run test:unit:runtime` | S7 |
| REQ-13 *(ADR-0059)* | Feed skeletons: identifier-only output under one round trip, host-side hydration with blocks/labels/permissions applied after hydration | C14 bridge + hydration ops | `npm run test:unit:runtime` | S2 |

Contract consumption coverage (each C consumed by ≥1 swarm): C0 all; C1 S1/S8;
C2 S2/S8; C3 S2/S3/S9; C4 S1/S6/S7; C5 S4/S8/S9; C6 S5/S9; C7 S2/S6;
C8 S2/S3/S8; C9 S7/S8; C10 S3/S4/S5/S9; C11 S7/S10; C12 S10/all.
*(Added by ADR-0059)* C13 S7; C14 S2/S6. The social catalog clauses C3.6–C3.8
are consumed by S3 (catalog and renderer) and S9 (a11y and design lint) inside
their existing globs; C13 falls to S7's distribution/trust globs, including the
bundle surface in `app/script-store.js`; C14 splits across S2's bridge globs
(skeleton batch handling) and S6's persisted-operation globs (hydration ops).
No new glob ownership is created, so §5 is unchanged.

---

## §8 Hard rules

1. No vitest, no jest. Unit tests are `node:test` / `test/unit/*.test.ts`
   through the hand-rolled runner.
2. No React anywhere. Community Web is vanilla JS; generated UI renders into
   `[data-c]` markup via the existing renderer.
3. Follow the anti-slop dialect: `// SAFETY:` comments for justified escapes,
   no `unknown` parameters, boundary parsing at edges. Never weaken Oxlint or
   ESLint settings to pass.
4. No raw `pcall`/`xpcall` in guest-reachable code paths; shadows are part of
   the runtime, not an option (C1.1).
5. "Themes may only write CSS" is preserved verbatim for Tier 1; scripts
   never emit CSS, DOM, or network calls at any tier (§3(d)).
6. No sequencing/schedule language in code, docs, or reports: work is
   described by ownership and gates, never by calendar order or staged
   work plans. Staged rollout in C9.3 is a product mechanism (percentage
   buckets), not a work plan.
7. Contract changes are additive-only (§4); frozen resolutions (§3) are not
   reopened.
8. Never lower coverage thresholds (90/80/87/90) or lint/typecheck settings.
9. Never edit generated bundles by hand; change the generator and re-run it;
   `--check` must byte-verify.
10. Every new user-visible behavior ships with: Verify golden, mutant-kill
    entry, persona Gherkin + steps, inventory/matrix rows, ADR, sdlc-state
    update (§1.1).

---

## §9 Five-question adversarial self-check

Every swarm answers all five in its report. Unanswered or hand-waved answers
are REJECTED.

1. **Gate evidence.** For every done-claim: the exact gate command and its
   exit code. Which claims currently lack one?
2. **Zero-mechanism control.** Which test fails if your mechanism is deleted
   outright? Name the test and the deletion you tried.
3. **Laundered-failure check.** Can any failure of your mechanism pass a gate
   under a different name (renamed test, widened assertion, moved fixture,
   prose reclassification)? Show you tried at least one laundering attempt.
4. **Ownership discipline.** List every file you wrote; confirm each matches
   your §5 globs and no other swarm's.
5. **Contract basis.** For every security claim you make: the exact C-clause
   that justifies it. Claims without a clause are withdrawn.

---

## §10 Fixed per-swarm reporting format

Reports use exactly this structure (C12):

```md
# Swarm S<n> report — <charter>

## Tasks
| # | Task | Gate command | Exit code | Done means (restated) | Verdict |
|---|---|---|---|---|---|

## Evidence
- Per task: the command output excerpt proving the gate, and the
  zero-mechanism control demonstration (question 2).

## Deviations
- Each deviation from §3/§4/§5, why it was necessary, and what S10 must
  adjudicate. None is silent.

## Self-check
1. … 2. … 3. … 4. … 5. …
```

---

## §11 Merge and final verification protocol

1. Swarms hand back §10 reports. S10 arbitrates root `package.json` and any
   cross-glob conflicts; no other swarm merges another's tree.
2. A report with a missing exit code, an unanswered self-check question, or a
   silent deviation is returned to its swarm; the affected verdicts stay
   REJECTED.
3. On the merged tree, S10 runs `npm run gate:commit`, then
   `npm run gate:push`, then the full `npm run verify`. Any failed gate
   reverts the claiming swarm's task verdicts to REJECTED and routes back to
   that swarm; S10 never fixes another swarm's mechanism to force green.
4. Final acceptance requires: every §7 REQ row green on the merged tree,
   `npm run verify` exit 0 quoted in S10's report, docs reachable
   (`npm run docs:check`), and the sdlc-state + dispatch log updated.
5. Only then is the initiative done. Anything short of that is stated as
   residual work, in writing, in the sdlc-state record.
