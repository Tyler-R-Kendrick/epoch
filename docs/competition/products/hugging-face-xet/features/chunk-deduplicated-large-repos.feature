Feature: Chunk-deduplicated large repositories
  Hugging Face Xet differentiates by making very large model and dataset repositories behave like Git-backed Hub repositories while transferring only changed chunks.
  The implementation is strong when model publishers repeatedly update checkpoints or datasets and need efficient collaboration.
  The implementation is weaker when users need domain-specific review, semantic merge, or policy workflows beyond large-file storage.

  Background:
    Given an AI team publishes models or datasets through a Git-compatible repository
    And the repository contains large binary artifacts

  Scenario: Publisher updates a large checkpoint
    Given a model checkpoint is already stored in a Xet-backed repository
    When the publisher modifies and uploads a new checkpoint version
    Then Xet stores and transfers changed chunks rather than replacing the entire file
    And the repository remains accessible through familiar Hub and Git workflows

  Scenario: Collaborator downloads only needed content
    Given a collaborator needs a specific version of a model or dataset
    When the collaborator pulls or accesses that version
    Then the storage backend resolves the pointer metadata
    And only the required large-file content is materialized locally

  Scenario: Platform migrates from Git LFS to Xet
    Given a repository previously used Git LFS-style large-file pointers
    When the platform backs the repository with Xet storage
    Then pointer metadata remains compatible with Git-centered workflows
    And chunk-level deduplication improves repeated version transfer
