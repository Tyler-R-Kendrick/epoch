Feature: Community agent sandboxes
  Maintainers use community-hosted agent sandboxes to delegate focused work while keeping policy, provenance, and review authority visible.

  @persona.maintainer
  Scenario: Maintainer starts a policy-bound agent sandbox from a signed intent
    Given maintainer "Maya" has repository "epoch-community" with patch intent "intent-region-revenue" ready for agent help
    When Maya opens the agent task queue for "epoch-community"
    And Maya chooses agent "ui-agent" for intent "intent-region-revenue"
    And Maya reviews sandbox policy "repo write only, no secrets, network allowlist docs" and limits "2 CPU / 4GB / 30m"
    And Maya starts the agent sandbox
    Then agent sandbox "sandbox-region-revenue" is running for intent "intent-region-revenue"
    And the sandbox uses approved agent "ui-agent"
    And the sandbox shows policy "repo write only, no secrets, network allowlist docs"
    And the sandbox keeps signed invocation "event-sandbox-region-revenue"

  @persona.maintainer
  Scenario: Maintainer reviews a completed agent sandbox result
    Given maintainer "Maya" has completed agent sandbox "sandbox-region-revenue" for intent "intent-region-revenue"
    When Maya opens the agent sandbox result
    And Maya reviews agent transcript "updated chart component and tests"
    And Maya reviews sandbox changed file "src/dashboard/RegionRevenue.tsx"
    And Maya reviews sandbox checks "typecheck passed, unit tests passed"
    And Maya submits sandbox output as patch intent "patch-region-revenue-agent"
    Then patch intent "patch-region-revenue-agent" is ready for workspace review
    And the sandbox result links preview "preview-region-revenue"
    And the sandbox result keeps signed output "event-agent-output-region-revenue"

  @persona.maintainer
  Scenario: Maintainer retries a failed agent sandbox without losing failure evidence
    Given maintainer "Maya" has failed agent sandbox "sandbox-region-revenue-failed" for intent "intent-region-revenue"
    When Maya opens the failed sandbox diagnosis
    And Maya keeps secret policy "no repository secrets"
    And Maya retries the sandbox with agent "ui-agent"
    Then failed sandbox "sandbox-region-revenue-failed" keeps signed failure "event-agent-failure-region-revenue"
    And retry sandbox "sandbox-region-revenue-retry" is queued for intent "intent-region-revenue"
    And the retry keeps agent context "intent summary and previous failure reason"
