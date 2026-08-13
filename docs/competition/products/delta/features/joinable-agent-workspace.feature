@competition @zed @delta
Feature: Joinable multiplayer agent workspace
  Delta makes an in-progress agent conversation a shareable object that a
  teammate can join, review, and steer before any commit exists.

  Scenario: Teammate joins an in-progress agent thread from a link
    Given a developer has an agent thread working in its own checkout of a project
    When the developer shares the thread link with a teammate
    Then the teammate joins the same conversation and receives their own synced checkout
    And the teammate sees messages, file edits, comments, and agent activity as they happen

  Scenario: Reviewer comments on agent output and the agent answers in one turn
    Given an agent has produced a large set of changes in a shared thread
    When a reviewer selects passages of the output and leaves several comments
    And the reviewer submits their next message
    Then the comments are delivered together with that message
    And the agent addresses each comment in its reply with the answers linked back

  Scenario: Work moves from a thread into the team's normal Git workflow
    Given a shared thread contains reviewed agent changes
    And the participant's checkout was created from their own project, so the local remote points back at it
    When a participant asks the agent to push its branch to the local remote
    Then the participant can switch to that branch in their own repository
    And the team can instead publish through origin as an ordinary pull request

  Scenario: A participant chooses where the agent runs for a turn
    Given a shared thread with participants on different machines
    And cloud execution is enabled for the participant, which is still rolling out
    When a participant selects a cloud machine before sending their message
    Then the agent runs that turn on the cloud machine
    And the resulting file changes sync to every participant's checkout
