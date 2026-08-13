Feature: Community Web community-first experience
  Epoch Community Web opens into a community with its own channels (Discord-like),
  with Network Feed discovery and linked repository projects as secondary planes.

  @persona.github_open_source_contributor
  Scenario: Contributor searches registered sources and sees completeness
    Given Community Web has authorized Entities from current and stale registered sources
    When I run the deterministic search "state:needs-review"
    Then results identify their canonical targets and source provenance
    And source completeness names the stale source without invoking AI

  @persona.github_open_source_contributor
  Scenario: Contributor corrects a precise search syntax error without AI
    Given I open the Community Web query workbench by keyboard
    When I enter an unsupported field and operator
    Then the diagnostic identifies line column span code and field suggestions
    And no partial search or AI translation runs

  @persona.maintainer
  Scenario: Maintainer explains why an Entity matched
    Given a deterministic search returned an authorized Entity
    When I open Search Explain
    Then I can inspect normalization source pushdown residual evaluation authorization ordering and omissions
    And the explanation does not reveal unreadable Entities

  @persona.github_open_source_contributor
  Scenario: Contributor saves search semantics as a Projection Definition
    Given I preview an authorized deterministic search
    When I save it as the "needs-review" projection
    Then the Projection Definition stores the typed Search Expression and total order
    And reopening it preserves canonical Entity identity rather than a copied result tree

  @persona.github_open_source_contributor
  Scenario: Contributor clones and reorganizes the built-in namespace
    Given I clone "builtin:default" into my own Projection Definition
    When I group project Entities by state and preview the tree
    Then the preview uses authorized real data and deterministic collision names
    And the namespace diff explains changes before I mount them

  @persona.github_open_source_contributor
  Scenario: Contributor replaces the root and recovers from an invalid projection
    Given I mount my valid Projection Definition at root with user replace precedence
    When a later edit makes that Projection Definition invalid
    Then the invalid definition is quarantined and exportable
    And I can open "/.epoch/default" and reset my user namespace entirely by keyboard

  @persona.maintainer
  Scenario: Maintainer composes a projection and explains deterministic shadowing
    Given the built-in root and a community Projection Definition contain the same child name
    When I mount the community definition before the built-in root
    Then first-match lookup selects the higher-precedence Projection Entry
    And Namespace Explain identifies the ordered components and shadowed entry

  @persona.github_open_source_contributor
  Scenario: One canonical Entity appears at multiple paths and occurrences
    Given one Entity is selected by two branches of one Projection Definition
    When I locate that Entity in the mounted namespace
    Then both Projection Entries have distinct stable occurrence IDs and paths
    And both entries target the same canonical object ID

  @persona.screen_reader_power_user
  Scenario: Queued projection updates preserve the reader's position
    Given I am reading one Projection Entry in queued update mode
    When a source change adds an earlier-sorting Entity
    Then Community Web announces the queued count without moving focus or reading anchor
    When I apply queued updates
    Then focus remains attached to the prior occurrence or canonical target

  @persona.security_compliance_responder
  Scenario: Private Entities cannot influence observable search or paths
    Given two corpora differ only by Entities I am not authorized to read
    When I compare search hits counts facets suggestions completions paths collisions and explanations
    Then every observable authorized result is equivalent
    And source status reveals at most a generic unauthorized omission

  @persona.github_open_source_contributor
  Scenario: Browser falls back when persistent SQLite is unavailable
    Given my browser cannot provide the required OPFS and FTS5 capabilities
    When I open a metadata-only Community replica and search
    Then Community Web reports the unavailable persistence capability
    And the Orama or reference backend remains functional without losing canonical data

  @persona.github_open_source_contributor
  Scenario: Two browser tabs contend without corrupting the search index
    Given two Community Web tabs open the same browser search replica
    When both attempt a local index update
    Then one writer coordinates the update and the other waits or falls back explicitly
    And reopening the replica returns the same authorized Entities and checkpoint

  @persona.maintainer
  Scenario: Projection state survives reload and deterministic migration
    Given persisted schema 2 contains stable Entity IDs and a saved query record
    When Community migrates and reloads the state
    Then one current Projection Definition preserves the IDs timestamps query semantics and aliases
    And rerunning migration produces the same state without a compatibility API

  @persona.github_open_source_contributor
  Scenario: GraphQL and text frontends share one Search Expression
    Given a structured GraphQL search and text search express the same authorized predicate
    When I execute both against one Search Snapshot
    Then both return the same canonical targets in the same total order
    And GraphQL uses keyset cursors rather than array offsets

  @persona.github_open_source_contributor
  Scenario: CLI user validates and previews a Projection Definition
    Given I have a Projection Definition JSON file
    When I validate and preview it with epoch-community
    Then the CLI reports deterministic JSON diagnostics and Projection Entries
    And invalid cycles fail without saving or mounting the definition

  @persona.github_open_source_contributor
  Scenario: Contributor splits a change graph atomically and reconstructs the exact snapshot
    Given a convergence workbench with changes "base,api,ui" and dependencies "api>base,ui>api"
    When I split "api" into "api-schema,api-runtime" at unambiguous file boundaries
    Then the change graph contains both atomic changes in dependency order
    And reconstructing the change graph produces the original snapshot digest

  @persona.github_open_source_contributor
  Scenario: Contributor gets a safe failure when an atomic split is ambiguous
    Given a convergence workbench with an inseparable edit in "shared.ts"
    When I try to split the edit into "schema,runtime"
    Then the split is rejected without changing the change graph
    And the workbench explains the ambiguous hunk that needs a human boundary

  @persona.maintainer
  Scenario: Maintainer follows stable revisions across multiple heads and supersession
    Given a change with two concurrent revision heads
    When I open its revision history
    Then both heads retain stable revision identities
    And the superseded revision remains visible without becoming current

  @persona.maintainer
  Scenario: Maintainer reviews a bundle without losing individual change context
    Given a review bundle for a three-change graph
    When I traverse cumulative and per-change review by keyboard
    Then the selected change remains synchronized with the review detail
    And the gate matrix distinguishes current passing stale and missing evidence

  @persona.maintainer
  Scenario: Maintainer partially merges only a dependency-closed subset
    Given a change graph where "ui" depends on "api" and "api" depends on "base"
    When I request a partial merge through "api"
    Then the merge preview includes "base,api" and excludes "ui"
    And the merge control explains dependency closure before confirmation

  @persona.maintainer
  Scenario: Maintainer squashes a change graph without erasing provenance
    Given a dependency-closed merge preview for "base,api"
    When I confirm a squash with maintainer authority
    Then the squash records both source changes and their revisions
    And the resulting change has a new stable identity

  @persona.maintainer
  Scenario: Maintainer cannot merge with stale review evidence
    Given an approved review for an older revision
    When a new revision supersedes the approved revision
    Then merge remains blocked with an unmistakable stale approval explanation

  @persona.github_open_source_contributor
  Scenario: Contributor resolves a durable conflict after deterministic help precedes AI
    Given a durable unresolved conflict with base left and right identities
    When deterministic resolution cannot resolve it
    Then the conflict remains first-class and actionable
    When an AI resolution proposal arrives and I later confirm a human resolution
    Then the AI proposal remains untrusted and the human resolution closes the conflict

  @persona.github_open_source_contributor
  Scenario: Contributor hydrates a partial browser replica and sees truthful copy isolation
    Given an offline browser replica with promised objects and a copy-on-write workspace
    When I reconnect and hydrate the selected object
    Then availability changes without changing integrity
    And the workspace reports copy-on-write storage separately from execution isolation

  @persona.github_open_source_contributor
  Scenario: Contributor keeps stable mappings while escaping through interoperable forges
    Given a change mapped to jj and a continuous mirror with an F3 escape archive
    When the mirror synchronizes the latest revision
    Then the jj change identity remains stable across revisions
    And the forge fidelity report names preserved and lossy fields without exporting private content

  @persona.maintainer
  Scenario: Maintainer sponsors a finite-budget agent and later revokes it
    Given an agent principal with its own key sponsored by a maintainer grant
    When the agent reserves and consumes part of its finite budget
    Then allocated reserved consumed released and expired amounts are distinguishable
    When the sponsor revokes the grant
    Then new agent work is denied with the principal sponsor grant and budget reason

  @persona.security_compliance_responder
  Scenario: Responder archives a public release but denies a private archive request
    Given a public release with an SWHID and a private raw session
    When I confirm the public archive request with release authority
    Then archive status is remote-confirmed for the public release
    And the private archive request is denied without exposing the raw session

  @persona.screen_reader_power_user
  Scenario: Screen-reader maintainer traverses the change graph at mobile width and 200 percent zoom
    Given an accessible convergence workbench for a branching change graph
    When I navigate the change graph and review list entirely by keyboard
    Then tree and list focus identify the same selected change and revision
    And at 200 percent zoom the workbench has no horizontal page overflow

  @persona.github_open_source_contributor
  Scenario: Contributor enters the Community Web community from the Epoch landing
    Given Epoch Community is available
    When I open Epoch Community
    Then the landing presents the creator story with CanvasUI motion
    When I enter the community board
    Then the tmux-style Community Web is ready for keyboard collaboration

  @persona.slack_power_user
  Scenario: Power user traverses Community Web messages without a pointer
    Given Epoch Community is available
    When I open Epoch Community
    And I enter the community board
    And I open the Community Web general channel from the prompt
    And I move to the next Community Web message and open its thread by keyboard
    Then the selected Community Web message remains the single focused feed item

  @persona.slack_power_user
  Scenario: Power user operates every Community Web post action without a pointer
    Given Epoch Community is available
    When I open Epoch Community
    And I enter the community board
    And I operate every focused Community Web post action by keyboard
    Then repost and share are visible and every post action has keyboard parity

  @persona.slack_power_user
  Scenario: Power user previews and enters message directories from the prompt
    Given Epoch Community is available
    When I open Epoch Community
    And I enter the community board
    And I browse Community Web message directories with cd completion
    Then message choices explain their content and cd typeahead can drill cancel or commit

  @persona.slack_power_user
  Scenario: Power user navigates a Community Web context menu without losing focus
    Given Epoch Community is available
    When I open Epoch Community
    And I enter the community board
    And I open the general channel context menu and move down and up by keyboard
    Then the Community Web context menu retains focus without moving the nav selection

  @persona.maintainer
  Scenario: Maintainer defines one action for prompt agent and voice control
    Given Epoch Community is available
    When I open Epoch Community
    And I enter the community board
    And I define the Community Web review macro with voice phrase "start review"
    Then the review macro persists as the "user_review" agent skill
    And the exact voice phrase runs the same review macro
    But a near voice phrase does not run it

  @persona.platform_operator
  Scenario: Agent operator consumes compatible startup conditions with one restart
    Given Epoch Community is available
    When I open Epoch Community
    And I enter the community board with a resumable session update and workspace defaults
    Then the bottom line recommends one Ctrl+U restart action
    When I restart Community Web with Ctrl+U
    Then the session is continued on the updated workspace defaults

  @persona.platform_operator
  Scenario: Agent operator keeps model routing sticky within a workspace
    Given Epoch Community is available
    When I open Epoch Community
    And I enter the community board
    And I send repeated agent turns in one workspace
    Then Community Web keeps the same cache route until policy or failure invalidates it

  @persona.github_open_source_contributor
  Scenario: App builder uses deterministic HoBo authoring and focused-panel controls
    Given Epoch Community is available
    When I open Epoch Community
    And I enter the community board
    And I open the default Bo agent
    Then Bo offers deterministic HoBo new build test debug and up actions
    And complex unsupported logic is emitted as a trainable stub
    When I expand and restore the focused panel by keyboard
    Then focus and selection remain in the same panel context

  @persona.github_open_source_contributor
  Scenario: Contributor shares one message with stable context choices
    Given Epoch Community is available
    When I open Epoch Community
    And I enter the community board
    And I open one Community Web message from its channel projection
    Then canonical contextual and exact links identify the same message without private content

  @persona.maintainer
  Scenario: Maintainer reopens a durable Projection Definition
    Given Epoch Community is available
    When I open Epoch Community
    And I enter the community board
    And I save and reopen the Community Web needs-review Projection Definition
    Then the Projection Definition keeps its identity Search Expression and canonical Entity state

  @persona.screen_reader_power_user
  Scenario: Screen-reader power user traverses explicit reply ancestry
    Given Epoch Community is available
    When I open Epoch Community
    And I enter the community board
    And I traverse a Community Web thread outline with tree keys
    Then the thread outline and reading pane report the same selected object and topology

  @persona.slack_power_user
  Scenario: Power user distinguishes namespace ascent thread ancestry and history
    Given Epoch Community is available
    When I open Epoch Community
    And I enter the community board
    And I invoke namespace parent thread parent browser back and previous location
    Then each Community Web navigation operation reports its distinct action and outcome

  @persona.slack_power_user
  Scenario: Power user chooses global jump without weakening deterministic cd
    Given Epoch Community is available
    When I open Epoch Community
    And I enter the community board
    And I compare ambiguous cd with the Community Web global jump chooser
    Then cd stays put while jump candidates await explicit acceptance with reasons

  @persona.github_open_source_contributor
  Scenario: Contributor opens a community and sees community-owned channels first
    Given the Community Web live API has repository activity
    When I open the Community Web channel experience
    Then the Community Web shows a community with channels
    And the active channel does not require a repository

  @persona.github_open_source_contributor
  Scenario: Contributor opens Network Feed for cross-community discovery
    Given the Community Web live API has repository activity
    When I open the Community Web channel experience
    And I open the Network Feed
    Then the Community Web shows the Network Feed with activity tabs

  @persona.maintainer
  Scenario: Maintainer switches communities and gets a new channel list
    Given the Community Web live API has repository activity
    When I open the Community Web channel experience
    And I switch to the Agent Guild community
    And I open the agent-runs channel
    Then the Community Web shows the Agent Guild channels

  @persona.maintainer
  Scenario: Maintainer promotes a community idea into a Change
    Given the Community Web live API has repository activity
    And I open the Community Web channel experience
    And I open the ideas channel in the active community
    When I select the "Dashboard widget should group revenue by region" community message
    And I promote the selected message to a Change candidate
    Then the live API records a Change for the selected conversation

  @persona.maintainer
  Scenario: Maintainer requests an agent from a selected conversation
    Given the Community Web live API has repository activity
    And I open the Community Web channel experience
    And I open the ideas channel in the active community
    When I select the "Dashboard widget should group revenue by region" community message
    And I request an agent from the selected message
    Then the selected message shows that human review remains required

  @persona.maintainer
  Scenario: Maintainer recovers a signed action from snapshot mode
    Given Community Web is running from an honest snapshot
    Then the snapshot banner explains how to reconnect for signed work
    And I open the ideas channel in the active community
    When I select the "Dashboard widget should group revenue by region" community message
    And I promote the selected message to a Change candidate
    Then the selected message explains how to reconnect and retry Promote to Change

  @persona.github_open_source_contributor
  Scenario: Contributor adds a unified signed comment to the current channel
    Given the Community Web live API has repository activity
    And I open the Community Web channel experience
    And I open the ideas channel in the active community
    When I add a community reply "Keyboard navigation works in the preview."
    Then the reply appears in the message feed with signed comment metadata

  @persona.github_open_source_contributor
  Scenario: Contributor reaches a channel conversation on a narrow screen
    Given the Community Web live API has repository activity
    And I open the Community Web channel experience
    When I use Community Web at a narrow mobile width
    Then the active conversation remains reachable without an oversized navigation rail
    And I can browse each navigation group without horizontal page overflow
    And conversation reactions meet the Community touch-target floor
    And Community state remains readable and announced
    And the current channel context remains labeled

  @persona.github_open_source_contributor
  Scenario: Contributor keeps community content in reach at 200 percent zoom
    Given the Community Web live API has repository activity
    And I open the Community Web channel experience
    When I zoom Community Web to 200 percent in a short viewport
    Then the zoomed navigation remains bounded above community content
    And the zoomed document has no horizontal page overflow

  @persona.security_compliance_responder
  Scenario: Moderator reports a selected conversation for legal hold
    Given the Community Web live API has repository activity
    And I open the Community Web channel experience
    And I open the ideas channel in the active community
    When I select the "Dashboard widget should group revenue by region" community message
    And I report the selected message
    Then the selected message shows legal-hold evidence status

  @persona.slack_power_user
  Scenario: Contributor searches community receipts by harness and Change
    Given the Community Web live API has repository activity
    And I open the Community Web channel experience
    When I search community receipts for "goose"
    Then the receipt search reports at least one match
    And a visible agent receipt includes harness "goose"

  @persona.github_power_user
  Scenario: Maintainer sees a receipt after recording a Change
    Given the Community Web live API has repository activity
    And I open the Community Web channel experience
    And I open the ideas channel in the active community
    When I select the "Dashboard widget should group revenue by region" community message
    And I promote the selected message to a Change candidate
    Then the Community Web shows a signed promote receipt for the new proposal

  @persona.github_open_source_contributor
  Scenario: Contributor keeps signed actions after a live refresh
    Given the Community Web live API has repository activity
    And I open the Community Web channel experience
    When the community repository refreshes from the live API
    And I select the "Welcome to Epoch Civic Workshop" community message
    Then the selected message keeps the Promote to Change and Report signed actions

  @persona.bluesky_power_user
  Scenario: Contributor sees state-driven identity honesty on a live API session
    Given the Community Web live API has repository activity
    When I open the Community Web channel experience
    Then the identity chip uses auth state "api-session"
    And the identity chip explains that AT OAuth is not linked

  @persona.github_open_source_contributor
  Scenario: Contributor sees an inviting empty state in a quiet channel
    Given the Community Web live API has repository activity
    And I open the Community Web channel experience
    When I open the support channel in the active community
    Then the channel shows an empty state naming a next action

  @persona.slack_power_user
  Scenario: Contributor searching with no matches sees the query named back
    Given the Community Web live API has repository activity
    And I open the Community Web channel experience
    When I search community receipts for "zzzznomatch"
    Then the feed shows a zero-result state naming "zzzznomatch"

  @persona.slack_power_user
  Scenario: Contributor clears receipt search with Escape
    Given the Community Web live API has repository activity
    And I open the Community Web channel experience
    And I search community receipts for "goose"
    When I press Escape in the receipt search
    Then the receipt search is empty and announces the channel

  @persona.maintainer
  Scenario: Contributor sees unread only for channels with new activity
    Given the Community Web live API has repository activity
    And I open the Community Web channel experience
    Then no channel shows an unread count on a first visit
    When the ideas channel gains activity after I last read it
    Then the ideas channel shows an unread count


  @persona.security_compliance_responder
  Scenario: Contributor reveals the record behind a signature
    Given the Community Web live API has repository activity
    And I open the Community Web channel experience
    When I reveal the provenance of the "Welcome to Epoch Civic Workshop" message
    Then the provenance panel names the signature, anchor, and source

  @persona.github_power_user
  Scenario: Maintainer follows a promoted message to the change it became
    Given the Community Web live API has repository activity
    And I open the Community Web channel experience
    And I open the ideas channel in the active community
    And I select the "Dashboard widget should group revenue by region" community message
    And I promote the selected message to a Change candidate
    When I view the lineage of the promoted message
    Then the origin message and the resulting change are marked as one contribution

  @persona.github_open_source_contributor
  Scenario: Contributor sees what a generated interface change does before accepting it
    Given a personal Community interface workspace on the installed harness
    When I propose a denser feed that puts verification status beside each change
    Then I see which widgets layout and theme tokens the proposal changes
    And the proposal is not applied until I confirm it
    And accepting it records the prompt as a digest rather than the text I typed

  @persona.github_open_source_contributor
  Scenario: Contributor recovers from an interface change that no longer renders
    Given a personal Community interface workspace whose current interface no longer validates
    When I open the board
    Then the installed harness renders its recovery interface instead of the broken one
    And restoring the last working interface leaves the rejected proposal inspectable

  @persona.maintainer
  Scenario: Maintainer confirms the terminal and an agent performed the same action
    Given a personal Community interface workspace on the installed harness
    When I create the same proposal from the terminal and from an agent tool
    Then both report the same command identity and resulting view
    And an agent without permission is refused even though the tool is offered
