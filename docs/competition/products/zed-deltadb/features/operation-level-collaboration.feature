@competition @zed @deltadb
Feature: Operation-level collaborative code history
  Zed DeltaDB records fine-grained code evolution so humans and agents can collaborate
  on a shared, navigable history instead of relying only on Git snapshots.

  Scenario: Human and agent collaborate in one evolving codebase
    Given a codebase is open in Zed with collaboration enabled
    And an agent thread is working in the same project context
    When a developer and the agent edit related code before a commit exists
    Then DeltaDB records and synchronizes the edit operations as they happen
    And the team can later relate those operations to Git history

  Scenario: Discussion remains attached after code moves
    Given a discussion is anchored to a character-level location in source code
    When the code is refactored, moved, or transformed
    Then the discussion remains linked to the evolving code location
    And teammates can inspect the preserved context without finding an old snapshot

  Scenario: Teammate reviews agent-generated context
    Given an agent changed code after a back-and-forth conversation
    When a teammate highlights the affected code in Zed
    Then Zed can show relevant operations, discussion, and assumptions
    And the teammate can continue the conversation from the code context
