import assert from "node:assert/strict";
import {
  ReferenceSearchBackend,
  type CommunityEntity,
  type SearchBackend,
  type SearchExpression,
} from "@epoch/community-core";
import { OramaSearchBackend, createOramaLexicalIndex } from "../../../packages/Epoch.Community.Web/src/search/orama-backend";
import { SqliteWasmSearchBackend, type SqliteIndexPort } from "../../../packages/Epoch.Community.Web/src/search/sqlite-wasm-backend";
import {
  CONFORMANCE_EXPRESSIONS,
  FIELD_REGISTRY,
  FIXED_CURSOR_KEY,
  conformanceCorpus,
  conformancePlan,
} from "./fixture";

export async function runCommunitySearchBackendConformance(): Promise<void> {
  for (const expression of CONFORMANCE_EXPRESSIONS) await assertBackendParity(expression);
  await insertionOrderAndPaginationAreStable();
  await authorizationIsObservationallyNonInterfering();
}

async function assertBackendParity(expression: SearchExpression): Promise<void> {
  const corpus = conformanceCorpus();
  const backends = createBackends();
  try {
    await Promise.all(backends.map((backend) => backend.rebuild(corpus)));
    const plan = conformancePlan(expression);
    const observations = await Promise.all(backends.map(async (backend) => {
      const page = await backend.search(plan, { first: 100 });
      return {
        hits: page.hits,
        hasNextPage: page.pageInfo.hasNextPage,
        snapshot: page.snapshot,
        completeness: page.completeness,
        facets: await backend.facets(plan, ["state"]),
        suggestions: await backend.suggest({ plan, field: "title", prefix: "p", limit: 10 }),
      };
    }));
    for (const observation of observations.slice(1)) assert.deepEqual(observation, observations[0], JSON.stringify(expression));
  } finally {
    await Promise.all(backends.map((backend) => backend.close()));
  }
}

async function insertionOrderAndPaginationAreStable(): Promise<void> {
  for (const corpus of [conformanceCorpus(), [...conformanceCorpus()].reverse()]) {
    for (const backend of createBackends()) {
      try {
        await backend.rebuild(corpus);
        const plan = conformancePlan({ kind: "all" });
        const first = await backend.search(plan, { first: 1 });
        const second = await backend.search(plan, { first: 1, after: first.pageInfo.endCursor });
        const third = await backend.search(plan, { first: 1, after: second.pageInfo.endCursor });
        assert.deepEqual([...first.hits, ...second.hits, ...third.hits].map((hit) => hit.target.objectId), ["issue-alpha", "issue-beta", "issue-gamma"]);
      } finally { await backend.close(); }
    }
  }
}

async function authorizationIsObservationallyNonInterfering(): Promise<void> {
  for (const factory of backendFactories()) {
    const observe = async (corpus: readonly CommunityEntity[]) => {
      const backend = factory();
      try {
        await backend.rebuild(corpus);
        const plan = conformancePlan({ kind: "all" });
        const page = await backend.search(plan, { first: 100 });
        return {
          hits: page.hits,
          hasNextPage: page.pageInfo.hasNextPage,
          completeness: page.completeness,
          facets: await backend.facets(plan, ["state", "visibility"]),
          suggestions: await backend.suggest({ plan, field: "title", prefix: "p", limit: 10 }),
          explain: await backend.explain(plan),
        };
      } finally { await backend.close(); }
    };
    assert.deepEqual(await observe(conformanceCorpus(true)), await observe(conformanceCorpus(false)));
  }
}

function createBackends(): SearchBackend[] { return backendFactories().map((factory) => factory()); }

function backendFactories(): readonly (() => SearchBackend)[] {
  return [
    () => new ReferenceSearchBackend({ registry: FIELD_REGISTRY, cursorKey: FIXED_CURSOR_KEY }),
    () => new OramaSearchBackend({ registry: FIELD_REGISTRY, cursorKey: FIXED_CURSOR_KEY, index: createOramaLexicalIndex() }),
    () => new SqliteWasmSearchBackend({ registry: FIELD_REGISTRY, cursorKey: FIXED_CURSOR_KEY, index: new SupersetSqlitePort() }),
  ];
}

class SupersetSqlitePort implements SqliteIndexPort {
  readonly #entities = new Map<string, CommunityEntity>();
  async apply(changes: Parameters<SqliteIndexPort["apply"]>[0]): Promise<void> {
    for (const ref of changes.deletes) this.#entities.delete(ref.objectId);
    for (const entity of changes.upserts) this.#entities.set(entity.ref.objectId, entity);
  }
  async replace(entities: readonly CommunityEntity[]): Promise<void> {
    this.#entities.clear();
    for (const entity of entities) this.#entities.set(entity.ref.objectId, entity);
  }
  async query(input: Parameters<SqliteIndexPort["query"]>[0]): Promise<readonly string[]> {
    return input.allowedObjectIds.filter((id) => this.#entities.has(id));
  }
  async export(): Promise<Uint8Array> { return new Uint8Array(); }
  async reset(): Promise<void> { this.#entities.clear(); }
  async close(): Promise<void> { this.#entities.clear(); }
}

if (require.main === module) {
  runCommunitySearchBackendConformance().then(
    () => console.log("community search backend conformance passed"),
    (error: unknown) => { console.error(error); process.exitCode = 1; },
  );
}
