/**
 * Change-based review publish — Epoch's default, not a mode.
 *
 * Gerrit and GitButler Gerrit Mode review one commit/change at a time and
 * republish new versions of that same identity. Epoch already has that shape:
 * a ChangeId is stable lineage and a Revision is a patch set. This module is
 * the public mapping onto the Git review-ref dialect (`Change-Id`,
 * `refs/for/<target>`, topic/hashtag/wip) so a Git remote can speak Gerrit
 * without a hook or a `gerritMode` flag.
 */
import { parseChangeId } from "./ids";
import { fail } from "./errors";

const TARGET_PATTERN = /^[A-Za-z0-9._][A-Za-z0-9._/-]*$/u;
const OPTION_PATTERN = /^[A-Za-z0-9._][A-Za-z0-9._/-]*$/u;
const ALPHABET = "abcdefghijklmnopqrstuvwxyz234567";

export interface ChangePublishOptions {
  readonly target?: string;
  readonly topic?: string;
  readonly hashtags?: readonly string[];
  readonly wip?: boolean;
}

export interface ChangePublishDescriptor {
  readonly changeId: string;
  readonly revisionId: string;
  readonly changeIdTrailer: `I${string}`;
  readonly target: string;
  readonly reviewRef: string;
  readonly pushSpec: string;
  readonly pushOptions: readonly string[];
  readonly topic?: string;
  readonly hashtags: readonly string[];
  readonly wip: boolean;
}

export function gerritChangeIdTrailer(changeId: string): `I${string}` {
  const { token } = parseChangeId(changeId);
  const bytes = decodeBase32Token(token);
  let hex = "";
  for (let index = 0; index < 20; index += 1) {
    hex += (bytes[index] ?? 0).toString(16).padStart(2, "0");
  }
  return `I${hex}`;
}

export function gerritReviewRef(target = "main"): string {
  return `refs/for/${normalizeTarget(target)}`;
}

export function gerritPushOptions(input: ChangePublishOptions = {}): readonly string[] {
  const options: string[] = [];
  if (input.topic !== undefined && input.topic !== "") {
    options.push(`topic=${sanitizeOption(input.topic, "topic")}`);
  }
  for (const tag of input.hashtags ?? []) {
    if (!tag) continue;
    options.push(`hashtag=${sanitizeOption(tag, "hashtag")}`);
  }
  if (input.wip === true) options.push("wip");
  return Object.freeze(options);
}

export function gerritPushSpec(input: ChangePublishOptions = {}): string {
  const ref = gerritReviewRef(input.target);
  const options = gerritPushOptions(input);
  return options.length === 0 ? ref : `${ref}%${options.join(",")}`;
}

export function describeChangePublish(input: ChangePublishOptions & {
  readonly changeId: string;
  readonly revisionId: string;
}): ChangePublishDescriptor {
  const target = normalizeTarget(input.target ?? "main");
  const hashtags = Object.freeze((input.hashtags ?? []).filter((tag) => tag.length > 0).map((tag) => sanitizeOption(tag, "hashtag")));
  const topic = input.topic ? sanitizeOption(input.topic, "topic") : undefined;
  const options = { target, topic, hashtags, wip: input.wip === true };
  return Object.freeze({
    changeId: parseChangeId(input.changeId) && input.changeId,
    revisionId: input.revisionId,
    changeIdTrailer: gerritChangeIdTrailer(input.changeId),
    target,
    reviewRef: gerritReviewRef(target),
    pushSpec: gerritPushSpec(options),
    pushOptions: gerritPushOptions(options),
    ...(topic === undefined ? {} : { topic }),
    hashtags,
    wip: input.wip === true,
  });
}

function normalizeTarget(raw: string): string {
  const trimmed = raw.trim().replace(/^refs\/(?:for|heads)\//u, "").replace(/^\/+/u, "").replace(/\/+$/u, "");
  if (!trimmed || !TARGET_PATTERN.test(trimmed) || trimmed.includes("..")) {
    return fail("invalid-ref", `Invalid review target: ${raw}`);
  }
  return trimmed;
}

function sanitizeOption(value: string, label: string): string {
  if (!OPTION_PATTERN.test(value) || value.includes("..")) {
    return fail("invalid-ref", `Invalid ${label}: ${value}`);
  }
  return value;
}

function decodeBase32Token(token: string): Uint8Array {
  let bits = 0;
  let buffer = 0;
  const bytes: number[] = [];
  for (const character of token) {
    const value = ALPHABET.indexOf(character);
    if (value < 0) return fail("invalid-id", `Invalid canonical token: ${token}`);
    buffer = (buffer << 5) | value;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >>> bits) & 0xff);
      buffer &= (1 << bits) - 1;
    }
  }
  return Uint8Array.from(bytes.slice(0, 32));
}
