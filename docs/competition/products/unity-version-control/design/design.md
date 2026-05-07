---
product: Unity Version Control
design_sources:
  - https://unity.com/features/version-control
  - https://activation.unity3d.com/how-to/redeem/version-control
  - https://docs.unity.com/en-us/unity-version-control/file-explorer
  - https://docs.unity.com/en-us/unity-version-control/navigate-repositories
  - https://docs.unity.com/en-us/unity-version-control/vcs-plugins/unreal-plugin
---

# Design

## Look And Feel

Unity Version Control presents as a production tool for creative teams: Unity-branded marketing pages, dashboard workflows, desktop clients, editor plugins, repository tabs, lock panels, file explorers, code reviews, and asset previews. The strongest design differentiator is not decoration; it is the use of workflow-specific surfaces for programmers, artists, designers, and producers who touch the same repository.

## Open Design Assets

- Unity marketing pages include hero and product screenshots for Smart Locks, Unity Hub repository setup, on-prem seat management, and role-specific workflows.
- Unity setup guides show screenshots for connecting UVCS to Unity, creating workspaces, adding assets, inviting members, viewing pending changes, and inspecting history.
- Unity docs describe repository tabs for file explorer, file locks, code reviews, branches, and merge bots.
- File explorer docs describe 3D preview controls, wireframe mode, animation controls, metadata, history, permissions, and side-by-side 3D diff.
- Unreal plugin docs expose integration screens, source-control menus, Blueprint diff setup, locks, and known issues.

## Differentiators

- UVCS designs for assets first: 3D preview and 3D diff make repository state inspectable for people who do not read raw binary files.
- Gluon provides a simplified centralized workflow while Plastic workspaces preserve distributed branching for programmers.
- Smart Locks are designed to travel across branches and prevent expensive binary merge conflicts before they happen.
- Deep Unity Editor and Hub integration makes repository setup part of project creation instead of a separate DevOps ceremony.

## What Works

- The product acknowledges that artists and programmers need different interaction models without splitting them into separate repositories.
- Lock and preview surfaces translate version-control state into concepts creative users can act on.
- Dashboard user/group management and code reviews make UVCS credible as a production collaboration system, not only a local client.
- Engine-agnostic positioning plus Unity-native integration gives the product a broad message and a strong home-field advantage.

## UX Breakdowns

- The product surface is fragmented across Unity Hub, Unity Editor, Dashboard, desktop clients, Gluon, Plastic, CLI, and engine plugins.
- Users outside game/3D production may find the asset-first terminology and Unity Cloud packaging too specialized.
- Lock-based workflows reduce conflicts but can create coordination friction and stale ownership problems when teams are distributed.
- Some non-Unity integrations require manual configuration of credentials, lock rules, diff tools, and external editor paths.
