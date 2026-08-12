import { createHash } from "node:crypto";

export const COMPATIBILITY_PROFILES = Object.freeze({
  git: { status: "native", mode: "protocol-v2-subset", unsupported: ["replace-refs", "filter-without-promisor"] },
  mercurial: { status: "subset", mode: "bridge", supported: ["heads", "bookmarks", "linear-changesets"], unsupported: ["phases", "evolve"] },
  sapling: { status: "subset", mode: "git-profile", supported: ["Git-compatible clone", "Git-compatible push"], unsupported: ["Sapling native wire protocol"] },
} as const);

export function jjChangeRevision(changeId: string, immutableHeader: string, _mutableBody: string): string {
  if (!changeId || !immutableHeader) throw new Error("jj change identity and immutable header are required");
  return createHash("sha256").update(`jj-change-v1\0${changeId}\0${immutableHeader}`).digest("hex");
}

export function graphiteStack(branches: readonly string[]): readonly { readonly branch: string; readonly parent: string | null }[] {
  return branches.map((branch, index) => ({ branch, parent: index === 0 ? null : branches[index - 1]! }));
}

export function gitButlerParallelBranches(branches: readonly string[], base = "main"): readonly { readonly branch: string; readonly parent: string }[] {
  return branches.map((branch) => ({ branch, parent: base }));
}
