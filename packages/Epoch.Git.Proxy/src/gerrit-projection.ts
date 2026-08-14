import {
  describeChangePublish,
  type ChangePublishOptions,
} from "@epoch/protocol";
import { gitCommit, type GitCommitInput, type GitObject } from "./deterministic-projection";

export function projectChangeForReview(
  input: GitCommitInput & ChangePublishOptions & { readonly changeId: string; readonly revisionId: string },
): {
  readonly commit: GitObject;
  readonly reviewRef: string;
  readonly changeIdTrailer: string;
  readonly pushSpec: string;
} {
  const published = describeChangePublish({
    changeId: input.changeId,
    revisionId: input.revisionId,
    target: input.target,
    topic: input.topic,
    hashtags: input.hashtags,
    wip: input.wip,
  });
  const commit = gitCommit({
    tree: input.tree,
    parents: input.parents,
    author: input.author,
    committer: input.committer,
    message: input.message,
    notes: { ...input.notes, "Change-Id": published.changeIdTrailer },
  });
  return Object.freeze({
    commit,
    reviewRef: published.reviewRef,
    changeIdTrailer: published.changeIdTrailer,
    pushSpec: published.pushSpec,
  });
}
