# Community Operations E2E Evidence

This directory stores the recorded BDD proof for the
`features/community_operations.feature` browser scenario.

- [Cucumber JSON evidence](community_operations.feature.json)
- [Playwright WebM evidence](community_operations.webm)

Regenerate both artifacts with:

```sh
npm run e2e:community-operations
```

The scenario opens the `Epoch.Community.Operations.Web` extension in Chromium,
renders code hosted from the `epoch-community` repository on the `node20`
runtime, shows the GitHub Actions-style workflow, and records the `ui-agent`
sandbox producing `patch-region-widget`.
