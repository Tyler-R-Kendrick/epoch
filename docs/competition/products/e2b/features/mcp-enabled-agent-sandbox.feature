@competition @product.e2b @persona.platform_operator
Feature: MCP-enabled agent sandbox execution
  E2B lets a platform operator run AI-agent code and tools inside secure cloud sandboxes with explicit billing and rate-limit boundaries.

  Background:
    Given the platform operator has an E2B account with API access
    And an AI agent needs to run generated code outside the host application

  Scenario: Run generated code in a secure sandbox
    Given the agent needs a Linux environment for code execution
    When the application creates an E2B sandbox from an SDK
    Then the sandbox starts with configured CPU, memory, disk, and session limits
    When the agent runs code, shell commands, or file operations
    Then the work executes inside the sandbox boundary
    And the application can stop or time out the sandbox when the task is complete

  Scenario: Add MCP tools through Docker Catalog integration
    Given the agent needs access to external tools such as GitHub or Notion
    When the application creates an E2B sandbox with selected Docker MCP Catalog tools
    Then E2B launches the tool access through the Docker MCP Gateway
    And the agent can call the selected tools from inside the isolated sandbox
    And the platform operator can reason about tool access separately from host credentials

  Scenario: Keep agent scale within plan limits
    Given multiple agent tasks are creating sandboxes concurrently
    When the workload reaches the plan's concurrency or creation-rate limit
    Then E2B returns rate-limit errors instead of creating unlimited sandboxes
    And the operator can decide whether to reduce workload, pause sandboxes, or upgrade capacity
