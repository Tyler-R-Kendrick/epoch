# Identity Bridge integration fixtures

Offline fixtures and unit/Gherkin suites under `test/unit/identity-bridge.test.ts`
and `features/identity_bridge.feature` cover T1–T12 without external network.

Local-only ceremony path: use `runBindingCeremony` with `GuardedRelayClient(..., "local-only")`
and `ProtocolAtProofVerifier` + `buildSignedProtocolProof`.

Manual live-fire (not CI): point a federated relay client and real PDS OAuth grant
at test accounts; keep rotation keys offline.
