# Witness Design

## Public Design References

- Product site: https://witness.dev/
- Documentation: https://docs.witness.dev/
- GitHub repository: https://github.com/testifysec/witness
- Concepts documentation: https://github.com/testifysec/witness/blob/main/docs/concepts.md

## Look And Feel

Witness presents as a developer-security command-line tool with documentation-driven onboarding. The visual identity is direct and technical: terminal commands, policy snippets, attestation terminology, and CI/CD examples dominate the experience. The product design is mostly a workflow design rather than a visual application.

## Design Differentiators

- The core interaction maps naturally to a build step: wrap execution, record evidence, then verify against policy.
- Witness makes attestations concrete by tying them to materials, products, command execution, and signer identity.
- OPA/Rego policy support gives security teams a familiar enforcement surface.
- The documentation frames provenance as a repeatable pipeline habit rather than a one-time signing action.

## What Works Well

- CLI-first design is appropriate for CI/CD and release engineering workflows.
- The in-toto vocabulary helps Witness interoperate with existing supply-chain standards.
- Policy-as-code makes the trust decision reviewable, versionable, and automatable.
- The product is small enough to understand as a single workflow: run, attest, verify.

## Where The Experience Breaks Down

- Rego and attestation schemas can be too much cognitive load for teams without supply-chain specialists.
- There is no broad collaboration surface for reviewing why a repository state is trustworthy before the build.
- Debugging failed verification can require reading policy, attestation JSON, CI logs, and key material together.
- Epoch can create a better UX if it makes provenance evidence visible at the change, version, and actor level before CI policy failure.
