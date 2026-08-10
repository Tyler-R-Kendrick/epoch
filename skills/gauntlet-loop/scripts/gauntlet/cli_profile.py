"""CLI bindings for the profile command family."""

from __future__ import annotations

import click

from gauntlet.cli import CliContext, common_options, pass_cli
from gauntlet.locking import project_lock
from gauntlet.paths import require_project
from gauntlet.profiles import (
    list_profiles,
    select_profile,
    show_profile,
    validate_profile,
)


@click.group(name="profile")
def profile_group() -> None:
    """Choose a domain representation profile."""


@profile_group.command("list")
@common_options
@pass_cli
def profile_list(cli: CliContext) -> None:
    """List the bundled domain profiles."""
    entries = list_profiles()
    human = "\n".join(f"{e['name']}: {e['display_name']} — {e['reference']}" for e in entries)
    cli.emit({"profiles": entries}, human=human)


@profile_group.command("show")
@click.argument("name")
@common_options
@pass_cli
def profile_show(cli: CliContext, name: str) -> None:
    """Show a profile's nodes, transforms, and evaluator templates."""
    cli.emit(show_profile(name))


@profile_group.command("validate")
@click.argument("name")
@common_options
@pass_cli
def profile_validate(cli: CliContext, name: str) -> None:
    """Validate transform commands, roles, and cross-representation checks."""
    cli.emit(validate_profile(name))


@profile_group.command("select")
@click.argument("name")
@common_options
@pass_cli
def profile_select(cli: CliContext, name: str) -> None:
    """Install a profile and merge only its declared defaults."""
    paths = require_project()
    if cli.dry_run:
        cli.emit({"dry_run": True, "would_select": name})
        return
    with project_lock(paths.locks_dir):
        result = select_profile(paths, name)
    cli.emit(result)
