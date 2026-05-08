@competition @yjs @collaboration
Feature: Collaborative shared types and awareness
  Yjs differentiates by letting applications bind shared CRDT types to editors,
  synchronize them through interchangeable providers, and show collaborator awareness.
  The implementation is strong for live editing surfaces.
  The implementation is weaker when teams need durable repository review and governance.

  Background:
    Given an application includes a rich-text or code editor
    And multiple users need to collaborate in real time

  Scenario: Developer makes an editor collaborative
    Given the developer creates a Yjs document
    And binds a shared text type to the editor
    When the user edits text in the editor
    Then Yjs updates the shared type
    And connected peers receive the merged text state

  Scenario: Team adds presence to collaboration
    Given the collaboration provider exposes awareness state
    When users join the same document
    Then the application can show names, colors, and cursor locations
    And collaborators can understand who is active in the document

  Scenario: Application switches sync providers
    Given a prototype uses peer-to-peer WebRTC sync
    When the application needs a server-backed production topology
    Then the developer can move to a WebSocket or custom provider
    And keep the document and editor-binding model intact
