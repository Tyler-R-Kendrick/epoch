@competition @gittuf @repository_security @policy_verification
Feature: Repository policy verification
  gittuf lets maintainers define repository security policy and lets consumers
  independently verify that repository activity followed that policy.

  Scenario: Maintainer defines protected repository policy
    Given a Git repository has initialized gittuf trust metadata
    And maintainers have signing identities configured
    When a policy administrator adds rules for protected branches and files
    Then the policy metadata is stored in the repository
    And future verification can evaluate changes against those rules

  Scenario: Contributor records and verifies pushes
    Given a contributor works in a gittuf-enabled repository
    When the contributor records a push and synchronizes repository activity metadata
    Then the activity log preserves evidence for the push
    And other repository copies can verify the recorded state

  Scenario: Consumer verifies without trusting the forge alone
    Given a consumer has read access to a repository copy
    When the consumer runs gittuf verification
    Then the tool checks repository policy and activity evidence
    And the consumer can detect whether expected controls were followed
