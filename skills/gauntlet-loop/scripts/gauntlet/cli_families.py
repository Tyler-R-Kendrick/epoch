"""Registration seam for service-backed CLI command families.

Families are attached here as their services land, keeping ``cli.py`` free
of import-time coupling to heavy service modules.
"""

from __future__ import annotations

import click


def register_all(main: click.Group) -> None:
    from gauntlet.cli_profile import profile_group
    from gauntlet.cli_spec import spec_group

    main.add_command(spec_group)
    main.add_command(profile_group)
