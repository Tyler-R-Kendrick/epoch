#!/usr/bin/env python3
"""Launcher for the gauntlet CLI.

The canonical invocation is the locked uv project:

    uv run --project <skill-root> gauntlet <command> [options]

This launcher exists for environments that call the script path directly.
It delegates to the installed package and fails with actionable guidance
when dependencies are missing.
"""

from __future__ import annotations

import sys


def _main() -> int:
    try:
        from gauntlet.cli import main
    except ModuleNotFoundError as error:
        sys.stderr.write(
            "gauntlet dependencies are not installed.\n"
            f"Missing module: {error.name}\n"
            "Run from the locked project instead:\n"
            "    uv run --project <skill-root> gauntlet <command>\n"
            "or install the project first:\n"
            "    uv sync --project <skill-root> --locked\n"
        )
        return 8
    return int(main(standalone_mode=False) or 0)


if __name__ == "__main__":
    sys.exit(_main())
