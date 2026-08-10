"""CLI bindings for the spec command family."""

from __future__ import annotations

import click

from gauntlet.cli import CliContext, common_options, pass_cli
from gauntlet.locking import project_lock
from gauntlet.paths import require_project
from gauntlet.spec import (
    FailClosedGovernanceGate,
    diff_specs,
    freeze_spec,
    init_spec,
    supersede_spec,
    validate_spec,
)


@click.group(name="spec")
def spec_group() -> None:
    """Create, validate, or freeze quality criteria (command-spec.md)."""


@spec_group.command("init")
@click.option("--force", is_flag=True, help="Restore the draft template over an existing spec.")
@common_options
@pass_cli
def spec_init(cli: CliContext, force: bool) -> None:
    """Copy the documented draft spec (never frozen)."""
    paths = require_project()
    if cli.dry_run:
        cli.emit({"dry_run": True, "target": str(paths.spec_dir / "gauntlet.yaml")})
        return
    with project_lock(paths.locks_dir):
        target = init_spec(paths, force=force)
    cli.emit({"created": str(target)}, human=f"draft spec at {target}")


@spec_group.command("validate")
@common_options
@pass_cli
def spec_validate(cli: CliContext) -> None:
    """Schema, cross-reference, evaluator, split, and policy validation."""
    paths = require_project()
    report = validate_spec(paths)
    cli.emit(report.to_json())
    if not report.ok:
        from gauntlet.errors import GateFailedError

        raise GateFailedError("spec validation failed; see errors above")


@spec_group.command("freeze")
@common_options
@pass_cli
def spec_freeze(cli: CliContext) -> None:
    """Canonicalize and digest the complete spec bundle."""
    paths = require_project()
    if cli.dry_run:
        from gauntlet.spec import bundle_digests

        cli.emit({"dry_run": True, "member_digests": bundle_digests(paths)})
        return
    with project_lock(paths.locks_dir):
        record = freeze_spec(paths)
    cli.emit(record, human=f"spec frozen: {record['frozen_digest']}")


@spec_group.command("diff")
@click.argument("old_digest")
@click.argument("new_digest")
@common_options
@pass_cli
def spec_diff(cli: CliContext, old_digest: str, new_digest: str) -> None:
    """Explain member-level changes between two frozen versions."""
    paths = require_project()
    cli.emit(diff_specs(paths, old_digest, new_digest))


@spec_group.command("supersede")
@click.option(
    "--governance-decision",
    default=None,
    help="Recorded R4 governance decision id authorizing the change.",
)
@common_options
@pass_cli
def spec_supersede(cli: CliContext, governance_decision: str | None) -> None:
    """Create a new spec version through an R4 governance intent."""
    paths = require_project()
    if cli.dry_run:
        cli.emit({"dry_run": True, "operation": "supersede"})
        return
    with project_lock(paths.locks_dir):
        result = supersede_spec(
            paths,
            gate=FailClosedGovernanceGate(),
            governance_decision=governance_decision,
        )
    cli.emit(result)
