@competition @gitlab @merge_requests @ci
Feature: Governed merge request delivery
  GitLab combines code review, approval policy, CI/CD, and compliance state
  so teams can decide whether a repository change is safe to merge.

  Scenario: Developer opens a merge request with automated validation
    Given a developer pushes a branch to a GitLab project
    And the project has a pipeline configured in .gitlab-ci.yml
    When the developer opens a merge request
    Then GitLab runs the configured merge request pipeline
    And the merge request shows review, approval, and pipeline state together

  Scenario: Approval rules block unsafe self-approval
    Given a project requires merge request approvals
    And administrators prevent the merge request author from approving their own work
    When the author attempts to approve the merge request
    Then GitLab blocks the approval
    And the merge request remains unmergeable until an eligible reviewer approves it

  Scenario: Merge train protects the target branch
    Given the target branch must remain green
    And multiple approved merge requests are ready
    When the team queues the changes through a merge train
    Then GitLab validates the merged result for each queued change
    And only validated changes reach the target branch
