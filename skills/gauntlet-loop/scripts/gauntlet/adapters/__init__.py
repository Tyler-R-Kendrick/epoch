"""Optional integration adapters (trace import, CLIs, formats, exports).

Adapters translate between external tools/standards and gauntlet contracts.
They never hold authority: imported data becomes observations, and every
external effect goes through an injected ``ProcessRunner`` behind an
authority gate.
"""
