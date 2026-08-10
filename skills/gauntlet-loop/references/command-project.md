# Command family: project (and profile selection)

## When to load this file

Load it to initialize or inspect a project, diagnose the environment, run a
migration, or choose a domain representation profile. This is the first
reference a fresh repository needs.

## Prerequisites

- A Git repository. `gauntlet project init` locates the Git root itself (it
  does not depend on the current working directory) and refuses to run
  outside a repository unless `--allow-no-git` is passed.
- The locked environment: `uv sync --locked` in the skill root.

## Commands

```bash
uv run --project <skill-root> gauntlet project init [--allow-no-git] [--update-root-gitignore]
uv run --project <skill-root> gauntlet project doctor
uv run --project <skill-root> gauntlet project status
uv run --project <skill-root> gauntlet project migrate (--check | --apply)

uv run --project <skill-root> gauntlet guide <topic>
uv run --project <skill-root> gauntlet next --json

uv run --project <skill-root> gauntlet profile list
uv run --project <skill-root> gauntlet profile show <name>
uv run --project <skill-root> gauntlet profile validate <name>
uv run --project <skill-root> gauntlet profile select <name>
```

- `init` materializes `<git-root>/.gauntlet/` from the bundled template:
  atomic file creation, idempotent, never overwrites a non-identical
  existing file, generates a stable project UUID, copies the installed JSON
  Schemas into `.gauntlet/schemas/` so historical state stays
  self-describing, and configures an external worktree root as a sibling
  directory (`<repo-parent>/.<repo-name>.gauntlet-worktrees/` by default).
  The repository root `.gitignore` is untouched unless you explicitly pass
  `--update-root-gitignore`; the scoped `.gauntlet/.gitignore` is sufficient.
- `doctor` checks Git, Python, uv, ActiveGraph, schema compatibility,
  filesystem permissions, ignored paths, optional integrations, worktree
  safety, and migration status. Failing checks exit with code 2.
- `status` reports project/campaign state without any mutation.
- `migrate` is explicit and recoverable: `--check` reports pending
  migrations; `--apply` backs up local state first, emits events, preserves
  old schemas, and never silently rewrites normative state. Passing both or
  neither flag is invalid.
- `guide <topic>` resolves exactly one reference file from
  `assets/command-index.yaml`; unknown or deep paths are rejected.
- `next` computes the next legal transitions from durable state and policy
  (deterministically — no LLM) and names the one reference to load.
- `profile select <name>` installs one domain profile: it writes the
  selection into `.gauntlet/profiles/`, copies the profile's evaluator
  templates into the project registry, and merges only the profile's
  *declared defaults* into the draft spec. Profile-generated references are
  never normative. After selecting, load exactly one `profile-*.md`
  reference. `show`/`validate` inspect nodes, transforms, roles, and
  cross-representation checks without mutation.

## Durable outputs

- `init`: the full `.gauntlet/` tree (spec, policies, profiles, schemas,
  evaluators, datasets, counterexamples, ledger, artifacts, handoffs,
  workflows, state, …) plus a recorded initialization event with skill,
  ActiveGraph, and schema digests.
- `migrate --apply`: a state backup plus migration events.
- `profile select`: `.gauntlet/profiles/` selection record, copied evaluator
  templates under `.gauntlet/evaluators/`, and merged spec defaults in
  `.gauntlet/spec/gauntlet.yaml`.
- `doctor`, `status`, `guide`, `next`: no mutation.

## Action and effect class

`doctor`, `status`, `guide`, `next`, `profile list|show|validate` are R0
(pure inspection). `init`, `migrate --apply`, and `profile select` are R1
(local, bounded, reversible project state; they take the project lock).
Effect class: `pure`/`read_only` for inspection, `reversible` local writes
otherwise. Nothing in this family touches the network.

## Failure and recovery

- `init` on an existing project skips identical files and reports conflicts
  for non-identical ones instead of overwriting; resolve conflicts manually
  or via `project migrate`. Unrelated dirty changes are preserved.
- `doctor` failures name the failing check; fix the environment and rerun.
- A held project lock surfaces as exit code 6; retry after the competing
  command finishes.
- `guide` with an unknown topic exits 2 and lists known topics.

## `--json` examples

```bash
$ uv run --project <skill-root> gauntlet project init --json
{
  "created": ["..."],
  "skipped_identical": [],
  "conflicts": [],
  "next_action": "gauntlet spec init"
}

$ uv run --project <skill-root> gauntlet next --json
{
  "campaign_id": null,
  "state": "spec_required",
  "allowed_commands": ["gauntlet spec init"],
  "blocked_commands": [],
  "reference": "references/command-spec.md",
  "stop": null,
  "unresolved": [],
  "approval_required": false
}
```

## External docs

- Git worktrees (candidate isolation relies on them):
  <https://git-scm.com/docs/git-worktree>
- uv projects and locking: <https://docs.astral.sh/uv/>
