import assert from "node:assert/strict";
import {
  type CommunityAuthorizationContext,
  type CommunityEntity,
  type CommunitySourceAdapter,
} from "@epoch/community-core";
import { createCanonicalStoreSource } from "../../../packages/Epoch.Community.API/src/community-source";
import { createCommunityWebSource } from "../../../packages/Epoch.Community.Web/src/search/community-web-source";
import { conformanceCorpus, FIXED_NOW } from "./fixture";

export interface SourceConformanceObservation {
  readonly sourceId: string;
  readonly objectIds: readonly string[];
  readonly checkpointTokens: readonly string[];
  readonly pages: number;
}

export async function assertCommunitySourceConformance(
  source: CommunitySourceAdapter,
  authorization: CommunityAuthorizationContext,
): Promise<SourceConformanceObservation> {
  const capabilities = source.capabilities();
  assert.equal(capabilities.sourceId, source.sourceId);
  assert.ok(capabilities.maxPageSize >= 1);
  const ids: string[] = [];
  const checkpoints: string[] = [];
  let after: string | undefined;
  let pages = 0;
  while (pages < 10_000) {
    const request = after === undefined ? { limit: 1, authorization } : { after, limit: 1, authorization };
    const page = await source.scan(request);
    pages += 1;
    checkpoints.push(page.checkpoint.token);
    ids.push(...page.entities.map((entity) => entity.ref.objectId));
    if (page.next === undefined) break;
    assert.notEqual(page.next, after);
    after = page.next;
  }
  assert.ok(pages < 10_000, "source pagination must terminate");
  assert.equal(new Set(ids).size, ids.length, "source pagination must not duplicate canonical IDs");
  assert.deepEqual(await source.checkpoint(), await source.checkpoint(), "checkpoint reads must be stable");
  if (source.get !== undefined && ids[0] !== undefined) {
    const entity = (await source.scan({ limit: 1, authorization })).entities[0];
    assert.ok(entity);
    assert.equal((await source.get([entity.ref], authorization))[0]?.ref.objectId, ids[0]);
  }
  return Object.freeze({ sourceId: source.sourceId, objectIds: Object.freeze(ids), checkpointTokens: Object.freeze(checkpoints), pages });
}

export async function runCommunitySourceConformance(): Promise<void> {
  const corpus = conformanceCorpus(true);
  const canonical = createCanonicalStoreSource({
    readEntities: async () => corpus,
    checkpoint: async () => ({ sourceId: "community-store", token: "fixture:1", observedAt: FIXED_NOW, status: "current" }),
  });
  const visible = await assertCommunitySourceConformance(canonical, { actorId: "maya" });
  assert.deepEqual(visible.objectIds, ["issue-alpha", "issue-beta", "issue-gamma"]);
  const anonymous = await assertCommunitySourceConformance(canonical, {});
  assert.deepEqual(anonymous.objectIds, visible.objectIds);

  const nightboard = createCommunityWebSource({
    posts: corpus.slice(0, 2).map((entity) => ({ id: entity.ref.objectId, title: String(entity.fields.title), body: String(entity.fields.body), author: entity.ownerId, createdAt: entity.createdAt })),
    dmMessages: [{ id: "dm-hidden", body: "DO_NOT_OBSERVE", author: "mallory", ownerId: "mallory", participantIds: ["mallory"], createdAt: FIXED_NOW }],
  }, FIXED_NOW);
  const nightboardVisible = await assertCommunitySourceConformance(nightboard, { actorId: "maya" });
  assert.equal(JSON.stringify(nightboardVisible).includes("dm-hidden"), false);
}

export function assertStableEntityProvenance(first: CommunityEntity, second: CommunityEntity): void {
  assert.equal(first.ref.objectId, second.ref.objectId);
  assert.deepEqual(first.provenance, second.provenance);
  assert.equal(first.createdAt, second.createdAt);
  assert.equal(first.updatedAt, second.updatedAt);
}

if (require.main === module) {
  runCommunitySourceConformance().then(
    () => console.log("community source conformance passed"),
    (error) => { console.error(error); process.exitCode = 1; },
  );
}
