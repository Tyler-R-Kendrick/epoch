"""gauntlet CLI: deterministic control plane entry point.

Conventions enforced here for every command:

- structured results go to stdout (``--json`` for machine-readable form);
- diagnostics go to stderr;
- expected failures raise :class:`gauntlet.errors.GauntletError` subclasses,
  mapped onto the stable exit-code vocabulary;
- mutations acquire the project lock and honor ``--dry-run``;
- ``--non-interactive`` fails instead of inferring an approval.
"""

from __future__ import annotations

import json
import sys
from dataclasses import dataclass
from typing import Any, NoReturn

import click
import yaml

import gauntlet
from gauntlet.errors import GauntletError, InvalidInvocationError
from gauntlet.paths import find_skill_root, skill_resource
from gauntlet.schemas import generate_all, require_no_drift


@dataclass
class CliContext:
    json_output: bool = False
    dry_run: bool = False
    non_interactive: bool = False

    def emit(self, payload: dict[str, Any], *, human: str | None = None) -> None:
        if self.json_output:
            click.echo(json.dumps(payload, indent=2, sort_keys=True))
        else:
            click.echo(human if human is not None else yaml.safe_dump(payload, sort_keys=False))

    def diag(self, message: str) -> None:
        click.echo(message, err=True)


pass_cli = click.make_pass_decorator(CliContext, ensure=True)


def common_options(command: Any) -> Any:
    """Attach --json/--dry-run/--non-interactive to a leaf command.

    The flags also exist on the root group; leaf flags win when set so both
    `gauntlet --json project status` and `gauntlet project status --json`
    behave identically.
    """

    def _merge(ctx: click.Context, param: click.Parameter, value: bool) -> bool:
        cli = ctx.ensure_object(CliContext)
        if value and param.name:
            attribute = {
                "json_output": "json_output",
                "dry_run": "dry_run",
                "non_interactive": "non_interactive",
            }[param.name]
            setattr(cli, attribute, True)
        return value

    for declaration, name in (
        ("--json", "json_output"),
        ("--dry-run", "dry_run"),
        ("--non-interactive", "non_interactive"),
    ):
        command = click.option(
            declaration,
            name,
            is_flag=True,
            expose_value=False,
            callback=_merge,
            help=f"Same as the global {declaration} flag.",
        )(command)
    return command


def _fail(error: GauntletError, json_output: bool) -> NoReturn:
    if json_output:
        click.echo(
            json.dumps(
                {"error": error.message, "hint": error.hint, "exit_code": error.exit_code},
                indent=2,
                sort_keys=True,
            )
        )
    click.echo(f"error: {error.render()}", err=True)
    sys.exit(error.exit_code)


class GauntletGroup(click.Group):
    """Group that converts GauntletError into stable exit codes."""

    def invoke(self, ctx: click.Context) -> Any:
        try:
            return super().invoke(ctx)
        except GauntletError as error:
            json_output = bool(ctx.params.get("json_output")) or "--json" in sys.argv
            _fail(error, json_output)


@click.group(cls=GauntletGroup, name="gauntlet")
@click.version_option(version=gauntlet.__version__, prog_name="gauntlet")
@click.option("--json", "json_output", is_flag=True, help="Machine-readable output on stdout.")
@click.option("--dry-run", is_flag=True, help="Plan without mutating or executing effects.")
@click.option(
    "--non-interactive",
    is_flag=True,
    help="Fail instead of prompting; missing approval is never treated as approval.",
)
@click.pass_context
def main(
    ctx: click.Context, json_output: bool, dry_run: bool, non_interactive: bool
) -> None:
    """Spec-grounded, counterexample-driven improvement campaigns."""
    ctx.obj = CliContext(
        json_output=json_output, dry_run=dry_run, non_interactive=non_interactive
    )


# ---------------------------------------------------------------------------
# project
# ---------------------------------------------------------------------------


@main.group()
def project() -> None:
    """Initialize or inspect a project (reference: command-project.md)."""


@project.command("init")
@click.option("--allow-no-git", is_flag=True, help="Initialize outside a Git repository.")
@click.option(
    "--update-root-gitignore",
    is_flag=True,
    help="Also append gauntlet entries to the repository root .gitignore.",
)
@common_options
@pass_cli
def project_init(cli: CliContext, allow_no_git: bool, update_root_gitignore: bool) -> None:
    """Create .gauntlet/ from the bundled template (idempotent)."""
    from gauntlet.project import init_project

    if cli.dry_run:
        cli.emit(
            {"dry_run": True, "would_create": ".gauntlet/ from bundled template"},
            human="dry-run: would create .gauntlet/ from the bundled template",
        )
        return
    report = init_project(
        allow_no_git=allow_no_git, update_root_gitignore=update_root_gitignore
    )
    cli.emit(
        report.to_json(),
        human=(
            f"initialized .gauntlet/ (created {len(report.created)}, "
            f"skipped {len(report.skipped_identical)}, conflicts {len(report.conflicts)})\n"
            f"next: {report.next_action}"
        ),
    )


@project.command("doctor")
@common_options
@pass_cli
def project_doctor(cli: CliContext) -> None:
    """Check Git, Python, uv, ActiveGraph, schemas, permissions, integrations."""
    from gauntlet.project import doctor

    checks = doctor()
    payload = {
        "checks": [
            {"name": c.name, "passed": c.passed, "detail": c.detail} for c in checks
        ],
        "ok": all(c.passed for c in checks),
    }
    lines = [
        f"{'ok  ' if c.passed else 'FAIL'} {c.name}: {c.detail}" for c in checks
    ]
    cli.emit(payload, human="\n".join(lines))
    if not payload["ok"]:
        raise InvalidInvocationError("project doctor found failing checks")


@project.command("status")
@common_options
@pass_cli
def project_status_cmd(cli: CliContext) -> None:
    """Report project/campaign state without mutation."""
    from gauntlet.project import project_status

    cli.emit(project_status())


@project.command("migrate")
@click.option("--check", "mode_check", is_flag=True, help="Report pending migrations only.")
@click.option("--apply", "mode_apply", is_flag=True, help="Apply pending migrations.")
@common_options
@pass_cli
def project_migrate(cli: CliContext, mode_check: bool, mode_apply: bool) -> None:
    """Explicit, recoverable migration (backs up local state first)."""
    from gauntlet.project import migrate

    if mode_check == mode_apply:
        raise InvalidInvocationError("pass exactly one of --check or --apply")
    report = migrate(apply=mode_apply and not cli.dry_run)
    cli.emit(report)


# ---------------------------------------------------------------------------
# guide / next
# ---------------------------------------------------------------------------


def _load_command_index() -> dict[str, Any]:
    index_path = skill_resource("assets/command-index.yaml")
    loaded = yaml.safe_load(index_path.read_text(encoding="utf-8"))
    if not isinstance(loaded, dict):
        raise InvalidInvocationError("assets/command-index.yaml is malformed")
    return loaded


@main.command("guide")
@click.argument("topic")
@common_options
@pass_cli
def guide(cli: CliContext, topic: str) -> None:
    """Locate exactly one progressive-disclosure reference for TOPIC."""
    index = _load_command_index()
    families: dict[str, Any] = index.get("families", {})
    guides: dict[str, str] = index.get("guides", {})

    reference: str | None = None
    if topic in families:
        reference = families[topic]["reference"]
    elif topic in guides:
        reference = guides[topic]
    else:
        for family in families.values():
            profile_refs = family.get("profile_references") or {}
            if topic in profile_refs:
                reference = profile_refs[topic]
                break
    if reference is None:
        known = sorted(set(families) | set(guides))
        raise InvalidInvocationError(
            f"unknown guide topic: {topic!r}", hint=f"known topics: {', '.join(known)}"
        )
    resolved = skill_resource(reference)
    cli.emit(
        {"topic": topic, "reference": reference, "path": str(resolved)},
        human=str(resolved),
    )


@main.command("next")
@common_options
@pass_cli
def next_command(cli: CliContext) -> None:
    """Compute the next legal transitions from durable state and policy."""
    from gauntlet.guidance import compute_next

    cli.emit(compute_next())


# ---------------------------------------------------------------------------
# schema
# ---------------------------------------------------------------------------


@main.group()
def schema() -> None:
    """Regenerate or verify committed JSON Schemas (reference: contracts.md)."""


@schema.command("generate")
@common_options
@pass_cli
def schema_generate(cli: CliContext) -> None:
    """Update committed schemas in the skill assets (developer context)."""
    target = find_skill_root() / "assets" / "schemas"
    if cli.dry_run:
        cli.emit({"dry_run": True, "target": str(target)})
        return
    manifest = generate_all(target)
    cli.emit({"generated": len(manifest), "target": str(target)})


@schema.command("check")
@common_options
@pass_cli
def schema_check(cli: CliContext) -> None:
    """Fail when committed schemas differ from generated schemas."""
    target = find_skill_root() / "assets" / "schemas"
    require_no_drift(target)
    cli.emit({"ok": True, "checked": str(target)}, human="schemas match the models")


# ---------------------------------------------------------------------------
# completion
# ---------------------------------------------------------------------------


@main.group()
def completion() -> None:
    """Shell completion scripts."""


def _completion_script(shell: str) -> str:
    return (
        f"# gauntlet {shell} completion\n"
        f'eval "$(_GAUNTLET_COMPLETE={shell}_source gauntlet)"\n'
    )


@completion.command("bash")
def completion_bash() -> None:
    click.echo(_completion_script("bash"))


@completion.command("zsh")
def completion_zsh() -> None:
    click.echo(_completion_script("zsh"))


@completion.command("fish")
def completion_fish() -> None:
    click.echo(_completion_script("fish"))


def _register_service_commands() -> None:
    """Attach command families implemented in service modules."""
    from gauntlet.cli_families import register_all

    register_all(main)


_register_service_commands()


if __name__ == "__main__":
    main()
