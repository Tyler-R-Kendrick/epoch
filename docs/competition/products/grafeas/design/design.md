# Grafeas Design

## Public Design References

- Grafeas site: https://grafeas.io/
- Grafeas GitHub repository: https://github.com/grafeas/grafeas
- Kritis GitHub repository: https://github.com/grafeas/kritis
- Google Cloud Artifact Analysis docs: https://cloud.google.com/artifact-analysis/docs

## Look And Feel

Grafeas itself is API-first and documentation-led. The design centers on data types, API services, notes, occurrences, and artifact identifiers. The managed Google Cloud surface is more console-oriented, using tables, vulnerability panels, artifact drilldowns, and policy-related status views.

## Design Differentiators

- The note and occurrence split gives teams a reusable pattern for facts that are defined once and observed many times.
- Artifact metadata is treated as a graph of related evidence, not as one scanner report.
- The model supports multiple fact types, including vulnerability, build, package, discovery, deployment, and attestation metadata.
- Google Cloud's Artifact Analysis documentation shows a path from open API concepts to a managed platform workflow.

## What Works Well

- API-first modeling is attractive for platform teams that need to aggregate scanner and provenance data across systems.
- The metadata categories map cleanly to common supply-chain questions: what is it, how was it built, where is it deployed, and what is wrong with it.
- Centralized artifact facts are easier to query for incident response than scattered CI logs.
- The design leaves room for multiple producers and consumers instead of locking metadata to one build tool.

## Where The Experience Breaks Down

- Grafeas is not a complete product experience on its own; value depends on producers, consumers, policy engines, and UI layers.
- The API model can feel abstract compared with a concrete repository or release workflow.
- Kritis and standalone Grafeas adoption signals are quieter than modern SBOM and cloud-native scanning products.
- Epoch can win if it makes artifact metadata trace back to signed source history with clearer human context.
