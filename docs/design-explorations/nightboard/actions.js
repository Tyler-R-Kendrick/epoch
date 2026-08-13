/** Built-in action descriptors. Execution is installed by app.js; catalogs are generated here. */
(function () {
  "use strict";

  var A = window.NB_ACTIONS;
  if (!A) throw new Error("action-registry.js must load before actions.js");

  function execute(actionId) {
    return function (input, context) {
      if (!window.NB_APP || typeof window.NB_APP.executeAction !== "function") {
        throw new Error("Nightboard action runtime is not ready");
      }
      return window.NB_APP.executeAction(actionId, input || {}, context || {});
    };
  }

  function add(spec) {
    A.register(Object.assign({
      contexts: ["board"],
      sideEffect: "local",
      execute: execute(spec.actionId),
    }, spec));
  }

  [
    { actionId: "nav.enter", label: "Change directory", description: "Enter an exact path or unique alias", commandAliases: ["cd"], commandArg: "path", slashAliases: ["/go"], slashArg: "path", run: "cd" },
    { actionId: "nav.ascend", label: "Ascend namespace", description: "Follow the current projection parent", run: "nav-ascend" },
    { actionId: "nav.list", label: "List", description: "List namespace entries and capabilities", commandAliases: ["ls"], commandArg: "path", run: "ls" },
    { actionId: "nav.read", label: "Read", description: "Read an object's default representation", commandAliases: ["cat"], commandArg: "path", run: "cat" },
    { actionId: "jump.best", label: "Jump", description: "Rank and open a unique global destination", commandAliases: ["z"], commandArg: "terms", run: "jump-best" },
    { actionId: "jump.interactive", label: "Jump chooser", description: "Open the grouped global destination chooser", commandAliases: ["zi"], commandArg: "terms", slashAliases: ["/jump"], slashArg: "terms", keyBindings: [{ key: "Ctrl+J", contexts: ["board"] }], voiceAliases: ["open global jump"], run: "jump-interactive", mcp: { toolName: "board_jump", inputSchema: { type: "object", properties: { terms: { type: "string" }, interactive: { type: "boolean" } }, required: ["terms"] } } },
    { actionId: "search.open", label: "Open search", description: "Open deterministic cross-source search", commandAliases: ["search", "q"], commandArg: "query", slashAliases: ["/search", "/q", "/view"], slashArg: "query", keyBindings: [{ key: "Ctrl+F", contexts: ["board"] }], voiceAliases: ["open search"], run: "search" },
    { actionId: "search.run", label: "Run search", description: "Run the exact typed query shown in the workbench" },
    { actionId: "search.cancel", label: "Cancel search", description: "Cancel the active deterministic search" },
    { actionId: "search.explain", label: "Explain search", description: "Explain matching, authorization, sources, and ordering" },
    { actionId: "search.saveAsProjection", label: "Save search as projection", description: "Save the normalized query as a durable projection", sideEffect: "shared", permission: "community.projection.write", commandAliases: ["projection-save"], commandArg: "label" },
    { actionId: "search.history", label: "Search history", description: "Open private bounded search history" },
    { actionId: "search.favorite", label: "Favorite search", description: "Favorite a private search history entry" },
    { actionId: "search.localFilter", label: "Filter results", description: "Filter the current result pane without changing the query" },
    { actionId: "projection.list", label: "List projections", description: "Open saved projection definitions", commandAliases: ["projections"] },
    { actionId: "projection.open", label: "Open projection", description: "Open a saved projection", commandAliases: ["projection-open"], commandArg: "projection", voiceAliases: ["open projection"] },
    { actionId: "projection.create", label: "Create projection", description: "Create a declarative projection", sideEffect: "shared", permission: "community.projection.write" },
    { actionId: "projection.clone", label: "Clone projection", description: "Clone a projection definition before editing", sideEffect: "shared", permission: "community.projection.write" },
    { actionId: "projection.edit", label: "Edit projection", description: "Open the projection definition workbench" },
    { actionId: "projection.preview", label: "Preview projection", description: "Preview the compiled projection against authorized data" },
    { actionId: "projection.diff", label: "Compare projection", description: "Compare a projection with the current namespace" },
    { actionId: "projection.validate", label: "Validate projection", description: "Validate and estimate a projection definition" },
    { actionId: "projection.save", label: "Save projection", description: "Save a valid projection definition", sideEffect: "shared", permission: "community.projection.write" },
    { actionId: "projection.delete", label: "Delete projection", description: "Delete a projection definition without deleting its objects", sideEffect: "shared", permission: "community.projection.write", commandAliases: ["projection-delete"], commandArg: "projection" },
    { actionId: "projection.explain", label: "Explain projection", description: "Explain why an object occurs at a path" },
    { actionId: "namespace.mount", label: "Mount projection", description: "Mount a projection into the scoped namespace", sideEffect: "shared", permission: "community.namespace.write" },
    { actionId: "namespace.unmount", label: "Unmount projection", description: "Remove a path alias without deleting canonical objects", sideEffect: "shared", permission: "community.namespace.write" },
    { actionId: "namespace.list", label: "List mounts", description: "List the effective namespace mount order", commandAliases: ["mounts"] },
    { actionId: "namespace.reset", label: "Reset namespace", description: "Restore the built-in root while retaining definitions", sideEffect: "shared", permission: "community.namespace.write" },
    { actionId: "namespace.use", label: "Use namespace", description: "Select a scoped namespace" },
    { actionId: "namespace.explain", label: "Explain namespace", description: "Explain mount precedence and shadowing" },
    { actionId: "snapshot.freeze", label: "Freeze snapshot", description: "Freeze content and ordering for this workbench" },
    { actionId: "snapshot.refresh", label: "Refresh snapshot", description: "Refresh source checkpoints explicitly" },
    { actionId: "snapshot.applyQueued", label: "Apply queued updates", description: "Apply queued projection changes without losing the reading anchor" },
    { actionId: "search.find", label: "Find names", description: "Search names without changing deterministic cd", commandAliases: ["find"], commandArg: "text", run: "find" },
    { actionId: "search.body", label: "Search bodies", description: "Search readable message bodies", commandAliases: ["grep"], commandArg: "text", run: "grep" },
    { actionId: "stream.load", label: "Load queued posts", description: "Merge queued arrivals without stealing the reader anchor", commandAliases: ["tail"], run: "tail" },
    { actionId: "stream.watch", label: "Resume stream", description: "Resume live arrivals", commandAliases: ["watch"], run: "watch" },
    { actionId: "macro.manage", label: "Manage macros", description: "Define and invoke safe reusable registered actions", commandAliases: ["macro", "skill"], commandArg: "macro", run: "macro" },
    { actionId: "hobo.workbench", label: "HoBo workbench", description: "Run deterministic HoBo lifecycle commands", commandAliases: ["hobo"], commandArg: "hobo", run: "hobo" },
    { actionId: "board.status", label: "Status", description: "Show Epoch board status", commandAliases: ["stat"], run: "stat" },
    { actionId: "help.open", label: "Help", description: "Show generated action help", commandAliases: ["help"], slashAliases: ["/help"], run: "slash-help" },
    { actionId: "transcript.clear", label: "Clear transcript", description: "Clear this workspace transcript", commandAliases: ["clear"], run: "clear" },
    { actionId: "prompt.mode", label: "Prompt mode", description: "Set AI or CLI prompt interpretation", slashAliases: ["/mode"], slashArg: "mode", run: "mode" },
    { actionId: "context.act", label: "Context action", description: "Run an available action for the selected canonical object", slashAliases: ["/act"], slashArg: "act", run: "act" },
    { actionId: "compose.publish", label: "Publish message", description: "Publish in the active channel, reply, or DM scope", sideEffect: "shared", permission: "community.participate", mcp: { toolName: "board_post", inputSchema: { type: "object", properties: { body: { type: "string" }, channel: { type: "string" }, re: { type: "string" } }, required: ["body"] } } },
    { actionId: "post.voteUp", label: "Upvote post", description: "Toggle an upvote on the focused post", sideEffect: "shared", permission: "community.participate", keyBindings: [{ key: "u", contexts: ["feed", "thread-outline"] }] },
    { actionId: "post.voteDown", label: "Downvote post", description: "Toggle a downvote on the focused post", sideEffect: "shared", permission: "community.participate", keyBindings: [{ key: "d", contexts: ["feed", "thread-outline"] }] },
    { actionId: "post.reactionPicker", label: "Choose reaction", description: "Open the reaction picker for the focused post", keyBindings: [{ key: "a", contexts: ["feed", "thread-outline"] }] },
    { actionId: "post.react", label: "React to post", description: "Toggle a reaction on a post", sideEffect: "shared", permission: "community.participate" },
    { actionId: "post.fold", label: "Fold replies", description: "Expand or collapse replies under the focused post", keyBindings: [{ key: "f", contexts: ["feed", "thread-outline"] }] },
    { actionId: "post.repost", label: "Repost", description: "Toggle a repost of the focused post", sideEffect: "shared", permission: "community.participate", keyBindings: [{ key: "Shift+R", contexts: ["feed", "thread-outline"] }] },
    { actionId: "share.contextual", label: "Share contextual link", description: "Copy an HTTPS link for this object in its current projection", slashAliases: ["/share"], keyBindings: [{ key: "s", contexts: ["feed", "thread-outline"] }], run: "share" },
    { actionId: "share.canonical", label: "Share canonical link", description: "Copy the canonical HTTPS link for this object" },
    { actionId: "share.exact", label: "Share exact revision", description: "Copy the exact-revision HTTPS link for this object" },
    { actionId: "post.copy", label: "Copy post", description: "Copy the focused post in an optimized paste format", keyBindings: [{ key: "y", contexts: ["feed", "thread-outline"] }] },
    { actionId: "workspace.new", label: "New workspace", description: "Open an isolated Nightboard workspace", slashAliases: ["/tab", "/workspace"], run: "tab" },
    { actionId: "dm.open", label: "Open direct message", description: "Open a private conversation by stable member ID", slashAliases: ["/dm", "/msg"], slashArg: "member", run: "dm" },
    { actionId: "activity.open", label: "Open activity", description: "Open notifications and mentions", slashAliases: ["/notifications", "/activity"], slashArg: "filter", run: "notifications" },
    { actionId: "hooks.manage", label: "Manage hooks", description: "Manage local activity hooks", slashAliases: ["/hooks"], slashArg: "command", run: "hooks" },
    { actionId: "attachment.manage", label: "Attachments", description: "Open, list, or clear prompt attachments", slashAliases: ["/attach", "/file"], slashArg: "command", run: "attach" },
    { actionId: "identity.show", label: "Show identity", description: "Show the current principal and space", slashAliases: ["/whoami"], run: "whoami" },
    { actionId: "space.open", label: "Open space", description: "List spaces or join one", slashAliases: ["/space"], slashArg: "space", run: "space" },
    { actionId: "identity.login", label: "Sign in", description: "Sign in to the current space", slashAliases: ["/login", "/signin"], slashArg: "handle", run: "login" },
    { actionId: "identity.claim", label: "Claim identity", description: "Claim the current anonymous principal", slashAliases: ["/claim"], slashArg: "handle", run: "claim" },
    { actionId: "identity.logout", label: "Sign out", description: "Return to an anonymous local principal", slashAliases: ["/logout", "/signout"], run: "logout" },
    { actionId: "history.back", label: "Back", description: "Restore the previous browser navigation state", keyBindings: [{ key: "Alt+Left", contexts: ["board"] }], run: "history-back" },
    { actionId: "history.forward", label: "Forward", description: "Restore the next browser navigation state", keyBindings: [{ key: "Alt+Right", contexts: ["board"] }], run: "history-forward" },
    { actionId: "history.previousLocation", label: "Previous shell location", description: "Return to the previous namespace location", run: "previous-location" },
    { actionId: "cancel.topLayer", label: "Cancel", description: "Close exactly the top visible interaction layer", keyBindings: [{ key: "Escape", contexts: ["board", "dialog", "completion"] }], run: "cancel" },
    { actionId: "thread.parent", label: "Reply parent", description: "Move to the explicit inReplyTo ancestor", keyBindings: [{ key: "ArrowLeft", contexts: ["thread-outline"] }], run: "thread-parent" },
    { actionId: "thread.root", label: "Thread root", description: "Move to the explicit thread root", run: "thread-root" },
    { actionId: "thread.firstChild", label: "First reply", description: "Move to the first explicit reply child", keyBindings: [{ key: "ArrowRight", contexts: ["thread-outline"] }], run: "thread-first-child" },
    { actionId: "thread.nextSibling", label: "Next sibling", description: "Move to the next reply sibling", run: "thread-next-sibling" },
    { actionId: "thread.previousSibling", label: "Previous sibling", description: "Move to the previous reply sibling", run: "thread-previous-sibling" },
    { actionId: "thread.nextUnread", label: "Next unread", description: "Move to the next unread reply", run: "thread-next-unread" },
    { actionId: "prompt.ai", label: "AI mode", description: "Switch to AI prompt mode", slashAliases: ["/ai"], run: "ai", hidden: true },
    { actionId: "prompt.cli", label: "CLI mode", description: "Switch to CLI prompt mode", slashAliases: ["/cli"], run: "cli", hidden: true },
    { actionId: "theme.use", label: "Theme", description: "Use the Grid theme", slashAliases: ["/theme"], slashArg: "theme", run: "theme", hidden: true },
    { actionId: "compose.reply", label: "Reply", description: "Arm a reply to the selected object", sideEffect: "shared", permission: "community.participate", slashAliases: ["/reply"], slashArg: "text", keyBindings: [{ key: "r", contexts: ["feed", "thread-outline"] }], run: "reply", hidden: true },
    { actionId: "channel.create", label: "Create channel", description: "Create a channel in the current project", sideEffect: "shared", permission: "community.participate", slashAliases: ["/channel"], slashArg: "new name", run: "channel", hidden: true, mcp: { toolName: "board_create_channel", inputSchema: { type: "object", properties: { name: { type: "string" }, project: { type: "string" } }, required: ["name"] } } },
    { actionId: "channel.rename", label: "Rename channel", description: "Rename a channel in its current project", sideEffect: "shared", permission: "community.participate", hidden: true, mcp: { toolName: "board_rename_channel", inputSchema: { type: "object", properties: { from: { type: "string" }, to: { type: "string" }, project: { type: "string" } }, required: ["from", "to"] } } },
    { actionId: "project.create", label: "Create project", description: "Create a project", sideEffect: "shared", permission: "community.participate", slashAliases: ["/project"], slashArg: "new name", run: "project", hidden: true, mcp: { toolName: "board_create_project", inputSchema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] } } },
    { actionId: "voice.manage", label: "Voice", description: "Manage channel voice", slashAliases: ["/voice"], slashArg: "command", run: "voice", hidden: true },
    { actionId: "help.keys", label: "Hotkeys", description: "Show contextual hotkeys", slashAliases: ["/keys"], run: "keys", hidden: true },
  ].forEach(add);
})();
