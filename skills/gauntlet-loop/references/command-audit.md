# Command family: audit

## When to load this file

Load it to verify that the evidence is what it claims to be: cross-store
integrity, provenance lineage, search/promotion leakage, security controls,
and dependency health. Run audits before trusting a promotion, after a
crash, after hydrating a bundle, and periodically during long campaigns.

## Prerequisites

- An initialized project. `dependencies` reports vulnerability results only
  when an established scanner is installed — it records real results or
  their absence, never fabricated findings.

## Commands

```bash
uv run --project <skill-root> gauntlet audit integrity
uv run --project <skill-root> gauntlet audit provenance
uv run --project <skill-root> gauntlet audit leakage
uv run --project <skill-root> gauntlet audit security
uv run --project <skill-root> gauntlet audit dependencies
```

- `integrity` cross-checks Git commits, ActiveGraph events, ledger records,
  schemas, digests, and artifact manifests against each other. Unreadable
  or divergent records that navigation silently skips are reported here.
- `provenance` verifies lineage completeness (every material artifact has
  derivation/generation/attribution links) and, where configured, optional
  in-toto/SLSA/C2PA evidence. Unsigned statements are reported as unsigned.
- `leakage` verifies search/promotion split separation and that candidate
  worktrees did not access sealed data: candidate file access, environment
  variables, command-line arguments, trace/log content, copied fixtures,
  Git history and worktree contents, and evaluator-generated
  counterexamples revealed before the final decision.
- `security` checks path-escape, symlink/hardlink, environment, secret,
  shell-injection, and unsafe-effect controls.
- `dependencies` reports locked versions, licenses, known vulnerabilities
  when a scanner is installed, and stale integration assumptions (for
  example, a pinned adapter version that no longer matches the installed
  tool).

## Durable outputs

- Audit findings as observations/records; a confirmed violation produces a
  security counterexample and, where a release is affected, an incident
  record (ledger kind `incidents`).
- No audit mutates the state it audits.

## Action and effect class

All audit commands are R0 (pure inspection, read-only access to stores).
`dependencies` may invoke a local scanner as a bounded local subprocess;
it performs no network calls itself.

## Failure and recovery

- A finding exits 9 (integrity/provenance/leakage/security violation) with
  the exact record/path/entity named. Treat exit 9 as stop-the-line:
  quarantine affected beliefs, do not promote or release, and escalate to
  the human.
- Leakage findings additionally invalidate the affected candidate's
  held-out evidence — the candidate must be re-confirmed against a
  clean/sealed suite after the leak is closed.
- `dependencies` with no scanner installed reports that fact (and exits 0
  unless another check fails); it never invents CVE results.

## Honest-limits note

Leakage auditing is process discipline. When the candidate builder,
evaluators, and sealed promotion cases all run under the same unrestricted
OS user, no audit provides cryptographic secrecy; the stronger isolation
mode uses separate CI/runner credentials and storage for the sealed suite.

## `--json` example

```bash
$ uv run --project <skill-root> gauntlet audit integrity --json
{
  "checked": {"ledger_records": 128, "events": 4210, "manifests": 57},
  "findings": [],
  "verdict": "clean"
}
```

## External docs

- in-toto attestations: <https://in-toto.io/>
- SLSA provenance: <https://slsa.dev/>
- C2PA: <https://c2pa.org/>
