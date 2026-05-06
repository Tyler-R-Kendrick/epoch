@competition @jujutsu
Feature: Safe repository mutation with operation log
  Jujutsu records repository mutations so users can undo or restore earlier states.

  Scenario: User rewrites history and undoes the operation
    Given a repository with several local changes
    When the user rebases or abandons revisions
    Then Jujutsu records the mutation in the operation log
    And the user can undo or restore the repository to a previous operation

  Scenario: User rebases into a conflict
    Given two changes edit the same file incompatibly
    When the user rebases one change over the other
    Then the rebase can complete with a conflicted commit
    And the user can resolve the conflict later by editing and amending that commit

