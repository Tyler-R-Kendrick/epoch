@competition @redux @predictable-state
Feature: Predictable state container with time-travel debugging
  Redux differentiates by packaging application state as a single store updated
  through plain actions and pure reducers, with an inspectable action log and
  developer-tool time-travel.
  The implementation is strong for predictable, testable, debuggable local state.
  The implementation is weaker when teams need durable rollback, cross-client
  propagation, presence, or a signed audit trail without assembling extra
  libraries.

  Background:
    Given an application keeps client state in a single Redux store
    And developers dispatch actions that pure reducers fold into the next state

  Scenario: Developer replays state transitions during debugging
    Given the app has dispatched a sequence of actions
    And Redux DevTools is connected
    When the developer moves the time-travel slider to an earlier action
    Then the inspector shows the state as it was at that point
    And the developer can step forward and backward through the action log

  Scenario: Time-travel does not survive a reload or reach other clients
    Given the developer has jumped to an earlier state in DevTools
    When the browser tab reloads
    Then the reconstructed history is gone because the store is in-memory
    And no other user's client is affected by the local time-travel

  Scenario: Real-time sync requires additional libraries
    Given two users run the same Redux app in different browsers
    When one user dispatches an action that changes shared data
    Then the other user's store does not converge on its own
    And the team must add persistence, transport, and conflict handling
      through separate libraries to synchronize state
