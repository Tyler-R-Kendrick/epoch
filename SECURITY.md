# Security Policy

Epoch handles signed events, repository identities, content-addressed blobs, compacts, and Git interoperability. Treat these areas as security-sensitive.

## Supported versions

Epoch is currently a pre-1.0 prototype. Security fixes are accepted on the default development line.

## Reporting a vulnerability

Please report suspected vulnerabilities privately to the repository maintainers through a GitHub private vulnerability report at <https://github.com/Tyler-R-Kendrick/epoch/security/advisories/new>. Do not open a public issue for secrets exposure, signature bypasses, tamper-detection failures, arbitrary file writes, command execution, or dependency compromise.

Include:

- Affected command or API.
- Reproduction steps.
- Expected and actual behavior.
- Any relevant repository state, sanitized logs, or proof-of-concept details.

## Security expectations for contributors

- Never commit private keys, tokens, seed data, or real user repositories.
- Validate paths and filesystem writes carefully in CLI, Git, backup, and restore code.
- Preserve signature verification, event hash validation, DAG validation, and blob integrity checks.
- Avoid shell execution. When native Git is necessary, prefer argument-array APIs such as `execFileSync`.
- Keep dependencies minimal and review new packages before adoption.
