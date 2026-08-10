# Sealed promotion cases

Case payloads here are ignored by Git and must never be readable from a
candidate worktree. `gauntlet audit leakage` checks candidate file access,
environment, arguments, traces, copied fixtures, and Git history against
this directory.
