import { cpus, platform, arch } from "node:os";
import {
  ReferenceSearchBackend,
  compileProjectionDefinition,
  createSearchPlan,
  normalizeQuery,
  validateCommunityEntity,
  type CommunityEntity,
  type ProjectionDefinition,
} from "@epoch/community-core";
import { OramaSearchBackend, createOramaLexicalIndex } from "../../../packages/Epoch.Community.Web/src/search/orama-backend";
import { translateSearchExpressionToSql } from "../../../packages/Epoch.Community.Web/src/search/sqlite-wasm-backend";
import { FIELD_REGISTRY, FIXED_CURSOR_KEY, FIXED_NOW } from "../../conformance/community-search/fixture";

interface BenchmarkMetric {
  readonly operation: string;
  readonly entityCount: number;
  readonly samples: number;
  readonly p50Milliseconds: number;
  readonly p95Milliseconds: number;
  readonly logicalBytes?: number;
  readonly notes?: string;
}

export interface CommunitySearchBenchmarkReport {
  readonly schema: "epoch.community.search-benchmark.v1";
  readonly createdAt: string;
  readonly environment: {
    readonly node: string;
    readonly platform: string;
    readonly architecture: string;
    readonly cpu: string;
  };
  readonly corpusSizes: readonly number[];
  readonly metrics: readonly BenchmarkMetric[];
  readonly limitations: readonly string[];
}

export async function runCommunitySearchBenchmarks(
  options: { readonly include100k?: boolean; readonly samples?: number } = {},
): Promise<CommunitySearchBenchmarkReport> {
  const samples = options.samples ?? 7;
  const sizes = options.include100k === true ? [1_000, 10_000, 100_000] : [1_000, 10_000];
  const metrics: BenchmarkMetric[] = [];
  metrics.push(await measure("parse-normalize", 0, samples * 10, () => {
    const query = normalizeQuery("state:needs-review AND updatedAt:>=2026-08-01T00:00:00Z sort:updatedAt:desc", { now: FIXED_NOW, timezone: "UTC", locale: "en-US" });
    if (query.ast === null) throw new Error("benchmark query did not parse");
  }));
  metrics.push(await measure("projection-compile", 0, samples, () => { compileProjectionDefinition(projectionDefinition(), {
    fields: FIELD_REGISTRY.list({ actorId: "benchmark" }).map((field) => field.name),
    sortableFields: FIELD_REGISTRY.list({ actorId: "benchmark" }).filter((field) => field.sortable).map((field) => field.name),
    limits: { maxDepth: 16, maxNodes: 256, maxFanout: 1000, maxTemplateLength: 256, maxSegmentLength: 120, maxRelationDepth: 8 },
  }); }));
  metrics.push(await measure("sqlite-fts-translation", 0, samples * 10, () => { translateSearchExpressionToSql(
    { kind: "and", terms: [{ kind: "text", fields: ["title"], value: "projection", mode: "term" }, { kind: "compare", field: "state", operator: "eq", value: "needs-review" }] },
    Array.from({ length: 100 }, (_, index) => `bench-${index}`),
  ); }));

  for (const size of sizes) {
    const corpus = benchmarkCorpus(size);
    const logicalBytes = new TextEncoder().encode(JSON.stringify(corpus)).length;
    const plan = benchmarkPlan();
    metrics.push(await measure("reference-rebuild", size, samples, async () => {
      const backend = new ReferenceSearchBackend({ registry: FIELD_REGISTRY, cursorKey: FIXED_CURSOR_KEY });
      await backend.rebuild(corpus);
      await backend.close();
    }, logicalBytes));
    const reference = new ReferenceSearchBackend({ registry: FIELD_REGISTRY, cursorKey: FIXED_CURSOR_KEY });
    await reference.rebuild(corpus);
    metrics.push(await measure("reference-warm-search", size, samples, async () => { await reference.search(plan, { first: 50 }); }, logicalBytes));
    metrics.push(await measure("reference-facet", size, samples, async () => { await reference.facets(plan, ["state"]); }, logicalBytes));
    metrics.push(await measure("reference-suggest", size, samples, async () => { await reference.suggest({ plan, field: "title", prefix: "p", limit: 10 }); }, logicalBytes));
    await reference.close();

    metrics.push(await measure("orama-cold-build", size, Math.max(3, Math.floor(samples / 2)), async () => {
      const backend = new OramaSearchBackend({ registry: FIELD_REGISTRY, cursorKey: FIXED_CURSOR_KEY, index: createOramaLexicalIndex() });
      await backend.rebuild(corpus);
      await backend.close();
    }, logicalBytes));
    const orama = new OramaSearchBackend({ registry: FIELD_REGISTRY, cursorKey: FIXED_CURSOR_KEY, index: createOramaLexicalIndex() });
    await orama.rebuild(corpus);
    metrics.push(await measure("orama-warm-search", size, samples, async () => { await orama.search(plan, { first: 50 }); }, logicalBytes));
    await orama.close();
  }
  return Object.freeze({
    schema: "epoch.community.search-benchmark.v1",
    createdAt: FIXED_NOW,
    environment: Object.freeze({ node: process.version, platform: platform(), architecture: arch(), cpu: cpus()[0]?.model ?? "unknown" }),
    corpusSizes: Object.freeze(sizes),
    metrics: Object.freeze(metrics),
    limitations: Object.freeze([
      "Wall-clock values are evidence, not portable CI thresholds.",
      "SQLite WASM persistence, OPFS locking, Worker long tasks, and database size require the Chromium benchmark host.",
      "100k entities are opt-in with EPOCH_BENCH_100K=1 to keep ordinary verification bounded.",
    ]),
  });
}

async function measure(
  operation: string,
  entityCount: number,
  samples: number,
  run: () => void | Promise<void>,
  logicalBytes?: number,
): Promise<BenchmarkMetric> {
  const durations: number[] = [];
  await run();
  for (let sample = 0; sample < samples; sample += 1) {
    const started = performance.now();
    await run();
    durations.push(performance.now() - started);
  }
  durations.sort((left, right) => left - right);
  const result = {
    operation,
    entityCount,
    samples,
    p50Milliseconds: rounded(percentile(durations, 0.50)),
    p95Milliseconds: rounded(percentile(durations, 0.95)),
  };
  return Object.freeze(logicalBytes === undefined ? result : { ...result, logicalBytes });
}

function benchmarkPlan() {
  const checkpoint = { sourceId: "benchmark", token: "1", observedAt: FIXED_NOW, status: "current" as const };
  return createSearchPlan({
    expression: { kind: "text", fields: ["title", "body"], value: "projection", mode: "term" },
    order: [{ field: "updatedAt", direction: "descending", nulls: "last" }],
    sources: [{ sourceId: "benchmark", fields: {}, fullText: "none", supportsRelations: false, checkpoint }],
    registry: FIELD_REGISTRY,
    authorization: { actorId: "benchmark" },
    authorizationFingerprint: "auth:benchmark",
    snapshot: { snapshotId: "benchmark", createdAt: FIXED_NOW, resolvedNow: FIXED_NOW, timezone: "UTC", locale: "en-US", queryHash: "benchmark", planHash: "pending", fieldRegistryVersion: FIELD_REGISTRY.version, analyzerVersion: "epoch-tokenizer-v1", authorizationFingerprint: "auth:benchmark", sourceCheckpoints: [checkpoint] },
    limit: 100,
  });
}

function benchmarkCorpus(size: number): readonly CommunityEntity[] {
  return Array.from({ length: size }, (_, index) => {
    const objectId = `bench-${index.toString().padStart(6, "0")}`;
    const title = index % 3 === 0 ? `Projection item ${index}` : `Community item ${index}`;
    const body = index % 5 === 0 ? "deterministic projection search" : "canonical community object";
    return validateCommunityEntity({
      ref: { objectId, kind: "issue" },
      fields: { objectId, kind: "issue", title, body, state: index % 2 === 0 ? "open" : "needs-review", score: index % 100, visibility: "public", createdAt: FIXED_NOW, updatedAt: FIXED_NOW },
      searchableText: { title, body }, relations: [], visibility: "public", ownerId: "benchmark", participantIds: [], createdAt: FIXED_NOW, updatedAt: FIXED_NOW,
      provenance: { sourceId: "benchmark", nativeId: objectId, observedAt: FIXED_NOW },
    });
  });
}

function projectionDefinition(): ProjectionDefinition {
  return {
    apiVersion: "epoch.dev/v1alpha1", projectionId: "benchmark", version: 1, label: "Benchmark", visibility: "private",
    root: { nodeId: "root", kind: "literal", segment: "", children: [{ nodeId: "issues", kind: "select", objectKinds: ["issue"], order: [{ field: "updatedAt", direction: "descending", nulls: "last" }], limit: 1000, children: [{ nodeId: "leaf", kind: "leaf", segment: { template: "{slug(title)}-{shortId(objectId)}" }, representation: "default" }] }] },
    order: [{ field: "updatedAt", direction: "descending", nulls: "last" }], updateMode: "live", consistency: "current",
  };
}

function percentile(values: readonly number[], fraction: number): number { return values[Math.min(values.length - 1, Math.ceil(values.length * fraction) - 1)] ?? 0; }
function rounded(value: number): number { return Math.round(value * 1000) / 1000; }

if (require.main === module) {
  runCommunitySearchBenchmarks({ include100k: process.env.EPOCH_BENCH_100K === "1" }).then(
    (report) => console.log(JSON.stringify(report, null, 2)),
    (error) => { console.error(error); process.exitCode = 1; },
  );
}
