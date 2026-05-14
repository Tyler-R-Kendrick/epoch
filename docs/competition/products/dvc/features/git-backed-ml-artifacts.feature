Feature: Git-backed ML artifacts
  DVC differentiates by keeping large datasets, models, pipelines, metrics, and experiment state connected to Git history without storing every artifact in Git.
  The implementation is strong when ML teams already collaborate in Git and need reproducible experiments.
  The implementation is weaker when users expect one system to own code, data, model registry, experiment tracking, storage, and review end to end.

  Background:
    Given an ML project has source code in Git
    And the project depends on large datasets and model artifacts

  Scenario: Data scientist tracks a dataset beside code
    Given the data scientist adds a dataset with DVC
    When DVC writes metadata files into the repository
    And the data scientist commits those metadata files with code
    Then Git records the project state
    And DVC can push the corresponding data to remote storage

  Scenario: Team member reproduces a prior model run
    Given a teammate checks out a Git commit
    When the teammate runs DVC pull
    Then DVC downloads the matching data and model artifacts
    And the teammate can rerun the pipeline against the intended inputs

  Scenario: Experiment becomes durable collaboration work
    Given a pushed experiment has promising metrics
    When the team creates a persistent Git branch from that experiment
    And pushes any required DVC-cached artifacts
    Then the experiment can be reviewed and merged through normal repository workflow
