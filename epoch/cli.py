"""Command line interface for the Epoch prototype."""

from __future__ import annotations

import argparse
import sys

from .core import EpochRepository
from .crdt import CRDTRegistry, dump_entity, load_entity


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="epoch", description="Minimal Epoch DVCS prototype")
    parser.add_argument("--repo", default=".", help="repository root (default: current directory)")
    subcommands = parser.add_subparsers(dest="command", required=True)

    init = subcommands.add_parser("init", help="initialize an Epoch repository")
    init.add_argument("--author", default="local", help="local author identity")

    record = subcommands.add_parser("record", help="record a file as an immutable event")
    record.add_argument("path", help="path to record")
    record.add_argument("--type", default=None, dest="entity_type", help="entity MIME type")

    subcommands.add_parser("log", help="print event log")
    subcommands.add_parser("verify", help="verify event content hashes and parent links")

    merge = subcommands.add_parser("merge", help="merge three entity versions")
    merge.add_argument("--type", required=True, dest="entity_type", help="entity MIME type")
    merge.add_argument("base")
    merge.add_argument("left")
    merge.add_argument("right")

    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    repo = EpochRepository(args.repo)

    if args.command == "init":
        repo.init(args.author)
        print(f"initialized Epoch repository at {repo.epoch_dir}")
        return 0

    if args.command == "record":
        event = repo.record_file(args.path, args.entity_type)
        print(event.id)
        return 0

    if args.command == "log":
        for event in repo.iter_events():
            print(f"{event.id} {event.type} {event.payload}")
        return 0

    if args.command == "verify":
        errors = repo.verify()
        if errors:
            for error in errors:
                print(error, file=sys.stderr)
            return 1
        print("ok")
        return 0

    if args.command == "merge":
        registry = CRDTRegistry.defaults()
        with open(args.base, encoding="utf-8") as file:
            base = load_entity(args.entity_type, file.read())
        with open(args.left, encoding="utf-8") as file:
            left = load_entity(args.entity_type, file.read())
        with open(args.right, encoding="utf-8") as file:
            right = load_entity(args.entity_type, file.read())
        sys.stdout.write(dump_entity(args.entity_type, registry.merge(args.entity_type, base, left, right)))
        return 0

    return 2


if __name__ == "__main__":
    raise SystemExit(main())
