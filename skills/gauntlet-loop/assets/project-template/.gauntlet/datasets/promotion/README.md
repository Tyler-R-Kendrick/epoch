# Promotion split

Held-out cases unavailable to candidate builders. The manifest is tracked;
the sealed case payloads live in `sealed/` (ignored by Git) or behind a
content-addressed remote. A candidate receives only the manifest/digest and
aggregate permitted outputs.

This split running under the same OS user provides process discipline, not
cryptographic secrecy; the stronger isolation mode uses separate CI/runner
credentials and storage (see the skill's `references/safety.md`).
