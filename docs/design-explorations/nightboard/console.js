/**
 * Console — graph, shell and diff, consolidated.
 *
 * The three that had ideas each solved one third of the same problem: the graph
 * showed lineage, the shell moved fast, the diff read work as work. Kept apart
 * they each felt partial, and all three navigated badly.
 *
 * This fuses them on one model: **the board is a filesystem**, and everything —
 * columns, command line, breadcrumb — addresses the same paths. Clicking a
 * folder and typing `cd` are the same operation, not two features that agree.
 *
 * Navigation is miller columns, the way ranger and nnn work: a column per level,
 * ↑↓ within a level, ←→ between them. It is the layout that makes "where am I"
 * unanswerable-by-accident, because your whole path is on screen.
 *
 *   ←→ / hl   column        Enter  descend or open
 *   ↑↓ / jk   entry         Tab    complete (in the command line)
 *   :         command line  /      filter this column
 *   v         cycle view    Esc    leave the command line
 *
 * Mouse and touch are peers: every entry is clickable, the breadcrumb is
 * clickable, and columns swipe horizontally on a phone.
 */
(function () {
  "use strict";

  var D = window.NB_DATA;
  var MAP = window.NB_MAP;
  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  };
  /** Markdown + colourised ASCII for bodies (tables, code, marks). */
  function formatBody(text) {
    if (window.NB_ASCII && window.NB_ASCII.formatBody) return window.NB_ASCII.formatBody(text);
    return esc(text);
  }
  function formatAscii(text) {
    if (window.NB_ASCII && window.NB_ASCII.colorizeAscii) return window.NB_ASCII.colorizeAscii(text);
    return esc(text);
  }
  var who = function (h) {
    if (window.NB_MAP && window.NB_MAP.findMember) {
      var found = window.NB_MAP.findMember(h);
      if (found) return found;
    }
    for (var i = 0; i < D.members.length; i++) if (D.members[i].handle === h) return D.members[i];
    return { handle: h, role: "", kind: "person" };
  };

  /**
   * GitHub/Slack-style reaction pills. Keys are stable ids; emoji is display.
   * Typical set: +1, -1, eyes, rocket, heart, laugh, tada, thinking.
   */
  var REACTIONS = [
    { key: "+1", emoji: "👍", label: "+1" },
    { key: "-1", emoji: "👎", label: "-1" },
    { key: "eyes", emoji: "👀", label: "eyes" },
    { key: "rocket", emoji: "🚀", label: "rocket" },
    { key: "heart", emoji: "❤️", label: "heart" },
    { key: "laugh", emoji: "😄", label: "laugh" },
    { key: "tada", emoji: "🎉", label: "hooray" },
    { key: "thinking", emoji: "🤔", label: "thinking" },
  ];

  function reactionDef(key) {
    for (var i = 0; i < REACTIONS.length; i++) {
      if (REACTIONS[i].key === key) return REACTIONS[i];
    }
    return { key: key, emoji: key, label: key };
  }

  /**
   * Merge fixture counts with session reactions.
   * state shape: reactions[postId] = { counts: {key:n}, mine: {key:true} }
   * Also accepts flat fixture object on the post: p.reactions = { "+1": 2 }
   */
  function reactionStateFor(postId, post, reactions) {
    reactions = reactions || {};
    var bag = reactions[postId] || {};
    var counts = Object.assign({}, (post && post.reactions) || {}, bag.counts || {});
    var mine = Object.assign({}, bag.mine || {});
    // Ensure mine are reflected in counts at least once.
    Object.keys(mine).forEach(function (k) {
      if (mine[k] && !(counts[k] > 0)) counts[k] = 1;
    });
    return { counts: counts, mine: mine };
  }

  function renderReactions(postId, post, reactions, pickOpen) {
    var st = reactionStateFor(postId, post, reactions);
    var pills = [];
    // Show pills that have a count, or that I reacted with.
    REACTIONS.forEach(function (r) {
      var n = st.counts[r.key] || 0;
      var me = !!st.mine[r.key];
      if (n <= 0 && !me) return;
      if (me && n <= 0) n = 1;
      pills.push(
        '<button type="button" class="cn-react-pill" data-react="' + esc(r.key) + '"' +
        ' data-react-id="' + esc(postId) + '" aria-pressed="' + me + '"' +
        ' title="' + esc(r.label) + (me ? " · you reacted" : "") + '"' +
        ' aria-label="' + esc(r.label) + ", " + n + (me ? ", including you" : "") + '">' +
        '<span class="cn-react-emoji" aria-hidden="true">' + r.emoji + "</span>" +
        '<span class="cn-react-count">' + n + "</span></button>"
      );
    });
    // Also surface unknown fixture keys not in REACTIONS.
    Object.keys(st.counts).forEach(function (k) {
      if (REACTIONS.some(function (r) { return r.key === k; })) return;
      var n = st.counts[k] || 0;
      if (n <= 0) return;
      var def = reactionDef(k);
      var me = !!st.mine[k];
      pills.push(
        '<button type="button" class="cn-react-pill" data-react="' + esc(k) + '"' +
        ' data-react-id="' + esc(postId) + '" aria-pressed="' + me + '"' +
        ' title="' + esc(def.label) + '">' +
        '<span class="cn-react-emoji" aria-hidden="true">' + esc(def.emoji) + "</span>" +
        '<span class="cn-react-count">' + n + "</span></button>"
      );
    });
    var picker = REACTIONS.map(function (r) {
      var me = !!st.mine[r.key];
      return '<button type="button" class="cn-react-opt" data-react="' + esc(r.key) + '"' +
        ' data-react-id="' + esc(postId) + '" aria-pressed="' + me + '"' +
        ' title="' + esc(r.label) + '">' +
        '<span aria-hidden="true">' + r.emoji + "</span>" +
        '<span class="cn-react-opt-label">' + esc(r.label) + "</span></button>";
    }).join("");
    return '<div class="cn-reacts" data-key="react-' + esc(postId) + '">' +
      pills.join("") +
      '<button type="button" class="cn-react-add" data-react-pick="' + esc(postId) + '"' +
      ' aria-expanded="' + !!pickOpen + '" title="Add reaction" aria-label="Add reaction">+</button>' +
      '<div class="cn-react-picker" data-react-picker="' + esc(postId) + '"' +
      ' data-open="' + (pickOpen ? "true" : "false") + '"' +
      (pickOpen ? "" : " hidden") + ' role="menu" aria-label="Choose a reaction">' +
      picker +
      "</div></div>";
  }

  /* ── Tree (Reddit-style comment hierarchy) ─────────────────────────────── */

  var SORTS = ["hot", "new", "top", "best"];

  /** Stable fixture score when a post has no explicit score. */
  function baseScore(p) {
    if (typeof p.score === "number") return p.score;
    var h = 0;
    var s = String(p.id || "");
    for (var i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return 3 + Math.abs(h % 42);
  }

  function minutesOf(p) {
    var t = String(p.at || "00:00").split(":");
    return (Number(t[0]) || 0) * 60 + (Number(t[1]) || 0);
  }

  function scoreOf(p, votes) {
    var v = (votes && votes[p.id]) || 0;
    return baseScore(p) + v;
  }

  function hotOf(p, votes) {
    // Reddit-ish: score decays with age. Minutes-from-midnight stand in for age.
    var sc = scoreOf(p, votes);
    var age = Math.max(1, (24 * 60 - minutesOf(p)) / 60);
    return sc / Math.pow(age + 2, 1.5);
  }

  function bestOf(p, votes) {
    // Prefer high score with a mild boost for depth of engagement (replies).
    return scoreOf(p, votes) * 1.1 + (p._below || 0) * 0.35;
  }

  function sortPosts(list, mode, votes) {
    var arr = list.slice();
    if (mode === "new") {
      arr.sort(function (a, b) { return minutesOf(b) - minutesOf(a); });
    } else if (mode === "top") {
      arr.sort(function (a, b) { return scoreOf(b, votes) - scoreOf(a, votes); });
    } else if (mode === "best") {
      arr.sort(function (a, b) { return bestOf(b, votes) - bestOf(a, votes); });
    } else {
      arr.sort(function (a, b) { return hotOf(b, votes) - hotOf(a, votes); });
    }
    return arr;
  }

  /**
   * Comment tree. Same visual grammar as Reddit: nest lines to trace depth,
   * [−]/[+] fold a chain, vote column, reply on the action row. Always a tree
   * — no graph/diff/raw costume changes.
   */
  function viewTree(entries, markId, folded, sort, votes, reactions, reactPick, feedQuery) {
    var rawEntries = entries || [];
    var queryInfo = null;
    // Lucene-style projection — more robust than thumbs-up rank alone.
    if (feedQuery && window.NB_QUERY && window.NB_QUERY.filterEntries) {
      queryInfo = window.NB_QUERY.filterEntries(rawEntries, feedQuery, {
        votes: votes,
        reactions: reactions,
        members: D.members,
      });
      if (!queryInfo.error) {
        entries = queryInfo.entries;
        if (queryInfo.sort) sort = queryInfo.sort;
      }
    }
    var posts = (entries || []).filter(function (e) { return e.post; }).map(function (e) { return e.post; });
    if (!posts.length) {
      var emptyMsg = "Nothing here yet.";
      if (queryInfo && queryInfo.error) emptyMsg = "Query error: " + queryInfo.error;
      else if (feedQuery && queryInfo && queryInfo.matched === 0) {
        emptyMsg = "No posts match this view.";
      }
      return '<p class="cn-empty">' + esc(emptyMsg) + "</p>";
    }
    folded = folded || {};
    votes = votes || {};
    reactions = reactions || {};
    reactPick = reactPick || null;
    sort = SORTS.indexOf(sort) >= 0 ? sort : "hot";

    var byId = {}, kids = {}, roots = [];
    posts.forEach(function (p) { byId[p.id] = p; });
    posts.forEach(function (p) {
      if (p.re && byId[p.re]) (kids[p.re] = kids[p.re] || []).push(p);
      else roots.push(p);
    });

    function subtreeCount(p) {
      return (kids[p.id] || []).reduce(function (n, c) { return n + 1 + subtreeCount(c); }, 0);
    }
    posts.forEach(function (p) { p._below = subtreeCount(p); });

    function nodeHtml(p, depth, ancestors) {
      var replies = sortPosts(kids[p.id] || [], sort, votes);
      var below = p._below || 0;
      var isFolded = !!folded[p.id];
      var sc = scoreOf(p, votes);
      var myVote = votes[p.id] || 0;
      var member = who(p.who);

      // Nest rails: one clickable bar per ancestor depth so you can collapse
      // any level of the chain by hitting its line, Reddit-style.
      var rails = ancestors.map(function (anc) {
        return '<button type="button" class="cn-rail" data-fold="' + esc(anc.id) + '"' +
          ' title="Collapse thread" aria-label="Collapse thread by ' + esc(anc.who) + '"></button>';
      }).join("");

      var foldCtl = replies.length
        ? '<button type="button" class="cn-pm" data-fold="' + esc(p.id) + '"' +
          ' aria-expanded="' + !isFolded + '" title="' +
          (isFolded ? "Expand" : "Collapse") + ' replies">' +
          (isFolded ? "+" : "−") + "</button>"
        : '<span class="cn-pm cn-pm-leaf" aria-hidden="true"></span>';

      var html = '<article class="cn-comment" data-key="' + esc(p.id) + '"' +
        ' data-kind="' + esc(member.kind) + '" data-state-of="' + esc(p.state) + '"' +
        ' data-depth="' + depth + '"' +
        (markId && p.id === markId ? ' data-here="true"' : "") +
        (String(p.id).indexOf("live-") === 0 ? ' data-live="true"' : "") + ">" +
        '<div class="cn-rails" data-key="rails-' + esc(p.id) + '">' + rails + "</div>" +
        '<div class="cn-vote" data-key="vote-' + esc(p.id) + '">' +
        '<button type="button" class="cn-vup" data-vote="up" data-vote-id="' + esc(p.id) + '"' +
        ' aria-pressed="' + (myVote === 1) + '" aria-label="Upvote">▲</button>' +
        '<span class="cn-score" data-score="' + (sc > 0 ? "pos" : sc < 0 ? "neg" : "zero") + '">' +
        sc + "</span>" +
        '<button type="button" class="cn-vdn" data-vote="down" data-vote-id="' + esc(p.id) + '"' +
        ' aria-pressed="' + (myVote === -1) + '" aria-label="Downvote">▼</button>' +
        "</div>" +
        '<div class="cn-comment-main">' +
        '<header class="cn-comment-head">' +
        foldCtl +
        '<span data-c="actor"><b data-c="handle">' + esc(p.who) + "</b>" +
        '<span data-c="role">' + esc(member.role) + "</span></span>" +
        '<span data-c="meta"><time data-c="time">' + esc(p.at) + "</time>" +
        '<span data-c="state">' + esc(p.state) + "</span></span>" +
        "</header>" +
        (p.subject ? '<b class="cn-subject">' + esc(p.subject) + "</b>" : "") +
        '<div class="cn-comment-body">' + formatBody(p.body) + "</div>" +
        (p.anchor ? '<span data-c="anchor">↳ ' + esc(p.anchor) + "</span>" : "") +
        '<span data-c="receipt"><span data-c="mark" aria-hidden="true">◆</span>' +
        '<span class="cn-sigil" aria-hidden="true">' + window.NB_ASCII.sigil(p.sig, 4) + "</span>" +
        esc(p.sig) + "</span>" +
        '<div class="cn-actions">' +
        '<button type="button" class="cn-act" data-reply="' + esc(p.id) + '"' +
        ' data-reply-who="' + esc(p.who) + '">reply</button>' +
        (isFolded && below
          ? '<button type="button" class="cn-act cn-act-fold" data-fold="' + esc(p.id) + '">' +
            below + (below === 1 ? " more reply" : " more replies") + "</button>"
          : "") +
        "</div>" +
        renderReactions(p.id, p, reactions, reactPick === p.id) +
        "</div></article>";

      if (replies.length && !isFolded) {
        html += '<div class="cn-replies" data-key="re-' + esc(p.id) + '">' +
          replies.map(function (c) {
            return nodeHtml(c, depth + 1, ancestors.concat([p]));
          }).join("") + "</div>";
      }
      return html;
    }

    var sortedRoots = sortPosts(roots, sort, votes);
    var matchNote = "";
    if (queryInfo && feedQuery && !queryInfo.error) {
      matchNote = '<div class="cn-feed-match" data-key="feed-match">' +
        queryInfo.matched + " match" + (queryInfo.matched === 1 ? "" : "es") +
        " of " + queryInfo.count +
        (queryInfo.sort ? " · ordered " + esc(queryInfo.sort) : "") +
        "</div>";
    } else if (queryInfo && queryInfo.error) {
      matchNote = '<div class="cn-feed-match cn-feed-err" data-key="feed-match">' +
        "query error: " + esc(queryInfo.error) + "</div>";
    }
    return matchNote +
      '<div class="cn-tree" data-sort="' + esc(sort) + '"' +
      (feedQuery ? ' data-query="true"' : "") + ">" +
      sortedRoots.map(function (p) { return nodeHtml(p, 0, []); }).join("") +
      "</div>";
  }

  /**
   * True when the detail pane should host the terminal file editor
   * (vim-like) rather than a card or thread.
   */
  function isEditableFile(entry) {
    if (!entry || entry.post || entry.notification || entry.dm) return false;
    if (entry.kind === "dir") return false;
    if (entry.agentFile || entry.agentSkill || entry.agentTool) return true;
    if (entry.relay || entry.space) return false;
    if (entry.openDm || entry.member) return false;
    // Generic file leaves (about-style cards still use kind file —
    // only true content files with agent payloads or explicit file meta).
    if (entry.meta === "instructions" || entry.meta === "config" ||
        entry.meta === "skill" || entry.meta === "tool") return true;
    if (/\.(md|ts|tsx|js|jsx|json|css|html|txt|py|rs|go|yml|yaml|sh)$/i.test(entry.name || "")) {
      return true;
    }
    return false;
  }

  /**
   * Detail pane: terminal editor for file content.
   * Uses NB_EDITOR buffer from app state when present.
   */
  function viewFileEditor(entry, path, state) {
    if (!window.NB_EDITOR) {
      return viewEntry(entry, path);
    }
    var src = window.NB_EDITOR.contentFromEntry(entry, path);
    var buf;
    if (state && state.editor && state.editor.buffers && state.editor.buffers[src.path]) {
      buf = state.editor.buffers[src.path];
    } else if (state && state.editor && state.editor.active &&
               state.editor.active.path === src.path) {
      buf = state.editor.active;
    } else {
      buf = window.NB_EDITOR.open(src.path, src.text, {
        name: src.name,
        language: src.language,
      });
      // Stash for app to pick up on first paint if needed.
      if (state) {
        if (!state.editor) state.editor = { active: null, buffers: {}, focused: false };
        if (!state.editor.buffers) state.editor.buffers = {};
        state.editor.buffers[src.path] = buf;
        state.editor.active = buf;
      }
    }
    return window.NB_EDITOR.render(buf, {
      focused: !!(state && state.editor && state.editor.focused),
      viewRows: 28,
    });
  }

  /** A single entry that is not a post: a member, a project, a space hub. */
  function viewEntry(entry, path, state) {
    if (!entry) return '<p class="cn-empty">Select something on the left.</p>';
    if (entry.post) return null;
    if (entry.notification) return viewNotification(entry.notification, path);
    // Editable files → terminal editor (not a static card).
    if (isEditableFile(entry)) {
      return viewFileEditor(entry, path, state);
    }
    // Eve agent directory summary still uses the agent card.
    if (entry.agent && entry.kind === "dir" && entry.meta === "eve") {
      return viewAgent(entry, path);
    }
    if (entry.agent && (entry.meta === "skills" || entry.meta === "tools")) {
      return viewAgent(entry, path);
    }
    if (entry.relay || (entry.space && entry.name === "relay")) {
      return viewRelay(entry.space || entry, entry.relay || (entry.space && entry.space.relay));
    }
    if (entry.space && (entry.name === "about" || entry.meta === "community" || entry.meta === "team")) {
      return viewSpaceAbout(entry.space, path);
    }
    var rows = [["path", path], ["kind", entry.kind], ["", entry.meta || ""], ["", entry.hint || ""]]
      .filter(function (r) { return r[1]; })
      .map(function (r) { return '<div class="cn-fact"><dt>' + esc(r[0]) + "</dt><dd>" + esc(r[1]) + "</dd></div>"; })
      .join("");
    return '<div class="cn-card"><b>' + esc(entry.name) + "</b>" + rows + "</div>";
  }

  /**
   * Vercel Eve agent directory / file preview.
   * Board-level agents apply to the space; project-level to that project only.
   */
  function viewAgent(entry, path) {
    entry = entry || {};
    var agent = entry.agent || {};
    var scope = agent.scope || entry.agentScope || "space";
    var scopeLabel = scope === "project"
      ? ("project · " + (agent.project || "…"))
      : "space (board)";

    if (entry.agentSkill) {
      var sk = entry.agentSkill;
      return '<div class="cn-agent-card" data-key="agent-skill">' +
        '<header class="cn-agent-head"><b>skill · ' + esc(sk.title || sk.id) + "</b>" +
        '<span class="cn-space-pill" data-status="skill">skill</span></header>' +
        '<p class="cn-agent-lead">' + esc(sk.body || "") + "</p>" +
        '<div class="cn-fact"><dt>file</dt><dd>' + esc(entry.name) + "</dd></div>" +
        '<div class="cn-fact"><dt>agent</dt><dd>' + esc(agent.id || "") + "</dd></div>" +
        "</div>";
    }
    if (entry.agentTool) {
      var tl = entry.agentTool;
      return '<div class="cn-agent-card" data-key="agent-tool">' +
        '<header class="cn-agent-head"><b>tool · ' + esc(tl.title || tl.id) + "</b>" +
        '<span class="cn-space-pill" data-status="tool">tool</span></header>' +
        '<p class="cn-agent-lead">' + esc(tl.body || "") + "</p>" +
        '<div class="cn-fact"><dt>file</dt><dd>' + esc(entry.name) + "</dd></div>" +
        '<div class="cn-fact"><dt>agent</dt><dd>' + esc(agent.id || "") + "</dd></div>" +
        "</div>";
    }
    if (entry.agentFile === "instructions") {
      return '<div class="cn-agent-card" data-key="agent-instructions">' +
        '<header class="cn-agent-head"><b>instructions.md</b>' +
        '<span class="cn-space-pill" data-status="instructions">prompt</span></header>' +
        '<pre class="cn-agent-md">' + esc(agent.instructions || "") + "</pre>" +
        '<div class="cn-fact"><dt>scope</dt><dd>' + esc(scopeLabel) + "</dd></div>" +
        "</div>";
    }
    if (entry.agentFile === "agent.ts") {
      var ts = "import { defineAgent } from \"eve\";\n\n" +
        "export default defineAgent({\n" +
        "  model: " + JSON.stringify(agent.model || "anthropic/claude-sonnet-4.6") + ",\n" +
        "  // scope: " + scopeLabel + "\n" +
        "});\n";
      return '<div class="cn-agent-card" data-key="agent-ts">' +
        '<header class="cn-agent-head"><b>agent.ts</b>' +
        '<span class="cn-space-pill" data-status="config">config</span></header>' +
        '<pre class="cn-agent-md">' + esc(ts) + "</pre>" +
        "</div>";
    }
    // Agent directory summary (selected from .agents list or skills/tools dir).
    var skills = agent.skills || [];
    var tools = agent.tools || [];
    var skillList = skills.map(function (s) {
      return "<li><b>" + esc(s.title || s.id) + "</b> — " + esc(s.body || "") + "</li>";
    }).join("");
    var toolList = tools.map(function (t) {
      return "<li><code>" + esc(t.id) + "</code> — " + esc(t.body || t.title || "") + "</li>";
    }).join("");
    return '<div class="cn-agent-card" data-key="agent-' + esc(agent.id || "eve") + '">' +
      '<header class="cn-agent-head">' +
      "<b>" + esc(agent.name || agent.id || "agent") + "</b>" +
      '<span class="cn-space-pill" data-status="' + esc(agent.status || "agent") + '">' +
      esc(agent.status || "eve") + "</span>" +
      "</header>" +
      '<p class="cn-agent-lead">' + esc(agent.summary || "") + "</p>" +
      '<div class="cn-fact"><dt>scope</dt><dd>' + esc(scopeLabel) + "</dd></div>" +
      '<div class="cn-fact"><dt>model</dt><dd>' + esc(agent.model || "—") + "</dd></div>" +
      '<div class="cn-fact"><dt>path</dt><dd>' + esc(path || "") + "</dd></div>" +
      '<div class="cn-fact"><dt>framework</dt><dd>vercel/eve · agent is a directory</dd></div>' +
      (skillList
        ? '<div class="cn-agent-section"><b>skills/</b><ul class="cn-agent-list">' + skillList + "</ul></div>"
        : "") +
      (toolList
        ? '<div class="cn-agent-section"><b>tools/</b><ul class="cn-agent-list">' + toolList + "</ul></div>"
        : "") +
      (agent.instructions
        ? '<div class="cn-agent-section"><b>instructions.md</b>' +
          '<pre class="cn-agent-md">' + esc(String(agent.instructions).slice(0, 480)) +
          (String(agent.instructions).length > 480 ? "…" : "") + "</pre></div>"
        : "") +
      "</div>";
  }

  /** Block/Buzz-style relay card for a space. */
  function viewRelay(space, relay) {
    space = space || {};
    relay = relay || space.relay || {};
    return '<div class="cn-space-card" data-key="relay-' + esc(space.id || "relay") + '">' +
      '<header class="cn-space-card-head">' +
      '<b>Relay</b>' +
      '<span class="cn-space-pill" data-status="' + esc(relay.status || "idle") + '">' +
      esc(relay.status || "idle") + "</span>" +
      "</header>" +
      '<p class="cn-space-card-lead">Block/Buzz-style event endpoint — signed notes over ' +
      esc(relay.protocol || "nostr") + ".</p>" +
      '<div class="cn-fact"><dt>url</dt><dd>' + esc(relay.url || "—") + "</dd></div>" +
      '<div class="cn-fact"><dt>protocol</dt><dd>' + esc(relay.protocol || "nostr") + "</dd></div>" +
      '<div class="cn-fact"><dt>read</dt><dd>' + (relay.read !== false ? "yes" : "no") + "</dd></div>" +
      '<div class="cn-fact"><dt>write</dt><dd>' + (relay.write ? "yes" : "no") + "</dd></div>" +
      (relay.note ? '<p class="cn-space-card-note">' + esc(relay.note) + "</p>" : "") +
      "</div>";
  }

  /** Reddit + Slack hybrid about card for a space. */
  function viewSpaceAbout(space, path) {
    space = space || {};
    var relay = space.relay || {};
    var rules = (space.rules || []).map(function (r) {
      return "<li>" + esc(r) + "</li>";
    }).join("");
    return '<div class="cn-space-card" data-key="about-' + esc(space.id || "space") + '">' +
      '<header class="cn-space-card-head">' +
      '<b>' + esc(space.slug || space.name || "space") + "</b>" +
      '<span class="cn-space-pill">' + esc(space.kind || "community") + "</span>" +
      "</header>" +
      '<p class="cn-space-card-lead">' + esc(space.description || "") + "</p>" +
      '<div class="cn-fact"><dt>workspace</dt><dd>' + esc(space.name || "") +
      (space.guestsAllowed === false ? " · members only" : " · guests ok") + "</dd></div>" +
      '<div class="cn-fact"><dt>subscribers</dt><dd>' + (space.subscribers || 0) + "</dd></div>" +
      '<div class="cn-fact"><dt>relay</dt><dd>' + esc(relay.protocol || "nostr") + " · " +
      esc(relay.status || "idle") + "</dd></div>" +
      '<div class="cn-fact"><dt>path</dt><dd>' + esc(path || "") + "</dd></div>" +
      (rules ? '<div class="cn-space-rules"><b>Rules</b><ul>' + rules + "</ul></div>" : "") +
      '<footer class="cn-space-card-foot">' +
      '<button type="button" class="cn-activity-open" data-space-open="' + esc(space.id) +
      '">Join / switch space</button>' +
      '<button type="button" class="cn-activity-read" data-goto="' +
      esc("/spaces/" + space.id + "/feed") + '">Open feed</button>' +
      "</footer></div>";
  }

  function spaceContextStrip(spaceId, leaf) {
    var space = null;
    if (window.NB_MAP && window.NB_MAP.findSpaceNode) space = window.NB_MAP.findSpaceNode(spaceId);
    if (!space && window.NB_SESSION && window.NB_SESSION.findSpace) {
      space = window.NB_SESSION.findSpace(spaceId);
    }
    if (!space) return "";
    var relay = space.relay || {};
    var feedN = window.NB_MAP && window.NB_MAP.postsForSpace
      ? window.NB_MAP.postsForSpace(space.id).length
      : 0;
    return '<div class="cn-ctx cn-space-ctx" data-key="ctx-space-' + esc(space.id) + '" data-space="true">' +
      '<b class="cn-ctx-name">' + esc(space.slug || space.name) + "</b>" +
      '<span class="cn-ctx-kind" data-kind="' + esc(space.kind || "community") + '">' +
      esc(space.kind || "space") + "</span>" +
      '<span class="cn-space-pill" data-status="' + esc(relay.status || "idle") + '">' +
      esc(relay.protocol || "relay") + " · " + esc(relay.status || "idle") + "</span>" +
      '<span class="cn-ctx-fact">' + (space.subscribers || 0) + " subscribers</span>" +
      '<span class="cn-ctx-fact">' + feedN + " feed posts</span>" +
      (space.guestsAllowed === false
        ? '<span class="cn-badge">members</span>'
        : '<span class="cn-ctx-fact">guests ok</span>') +
      (leaf ? '<span class="cn-ctx-fact">' + esc(leaf) + "</span>" : "") +
      '<span class="cn-ctx-fact">' + esc(space.description || "").slice(0, 72) + "</span>" +
      "</div>";
  }

  /**
   * MS Teams-style Activity feed for a notifications filter blade.
   * Mentions of you and subscription matches share one card grammar.
   */
  function viewNotifications(entries, markId) {
    var items = (entries || []).filter(function (e) { return e.notification; });
    if (!items.length) {
      return '<p class="cn-empty">No activity here — mentions of you and watched rooms show up when they land.</p>';
    }
    return '<div class="cn-activity" data-key="activity" role="feed" aria-label="Activity">' +
      items.map(function (e) {
        return notificationCard(e.notification, e.name, markId === e.name || markId === e.notification.id);
      }).join("") +
      "</div>";
  }

  function notificationGlyph(kind) {
    if (kind === "mention") return "@";
    if (kind === "subscription") return "★";
    if (kind === "reply") return "↳";
    if (kind === "dm") return "✉";
    if (kind === "hook") return "⚡";
    return "•";
  }

  function notificationCard(n, name, here) {
    n = n || {};
    var kind = n.kind || "activity";
    return '<article class="cn-activity-card" data-key="' + esc(name || n.id) + '"' +
      ' data-notif="' + esc(n.id) + '" data-kind="' + esc(kind) + '"' +
      ' data-unread="' + (n.unread ? "true" : "false") + '"' +
      (here ? ' data-here="true"' : "") +
      ' data-goto-source="' + esc(n.where || "/") + '">' +
      '<div class="cn-activity-glyph" aria-hidden="true">' + notificationGlyph(kind) + "</div>" +
      '<div class="cn-activity-main">' +
      '<header class="cn-activity-head">' +
      (n.unread ? '<span class="cn-activity-dot" title="Unread" aria-label="Unread"></span>' : "") +
      '<span class="cn-activity-who" data-c="handle">' + esc(n.who || "someone") + "</span>" +
      '<span class="cn-activity-reason">' + esc(n.reason || kind) + "</span>" +
      '<span class="cn-activity-when">' + esc(n.at || "") + "</span>" +
      "</header>" +
      (n.subject ? '<div class="cn-activity-subject">' + esc(n.subject) + "</div>" : "") +
      '<p class="cn-activity-body">' + esc(n.body || "") + "</p>" +
      '<footer class="cn-activity-foot">' +
      '<span class="cn-activity-where">' + esc(n.whereLabel || n.where || "") + "</span>" +
      '<button type="button" class="cn-activity-open" data-notif-open="' + esc(n.id) + '"' +
      ' data-goto="' + esc(n.where || "/") + '">Open</button>' +
      (n.unread
        ? '<button type="button" class="cn-activity-read" data-notif-read="' + esc(n.id) +
          '">Mark read</button>'
        : "") +
      "</footer></div></article>";
  }

  function viewNotification(n, path) {
    return '<div class="cn-activity cn-activity-solo" data-key="notif-detail">' +
      notificationCard(n, path, true) +
      '<p class="cn-activity-hint">Open jumps to the source. Mentions of you and rooms you watch land here.</p>' +
      "</div>";
  }

  function notificationsContextStrip(filter, state) {
    var readSet = (state && state.notifRead) || {};
    var all = MAP.filterNotifications ? MAP.filterNotifications("all", readSet) : (D.notifications || []);
    var mentions = MAP.filterNotifications ? MAP.filterNotifications("mentions", readSet) : [];
    var sub = MAP.filterNotifications ? MAP.filterNotifications("subscribed", readSet) : [];
    var hooks = MAP.filterNotifications ? MAP.filterNotifications("hooks", readSet) : [];
    var unread = all.filter(function (n) { return n.unread; }).length;
    var subs = D.subscriptions || [];
    var hookDefs = window.NB_HOOKS && window.NB_HOOKS.list ? window.NB_HOOKS.list() : (D.hooks || []);
    var filters = [
      { id: "all", label: "All", path: "/notifications/all", count: all.length },
      { id: "mentions", label: "Mentions", path: "/notifications/mentions", count: mentions.length },
      { id: "subscribed", label: "Subscribed", path: "/notifications/subscribed", count: sub.length },
      { id: "hooks", label: "Hooks", path: "/notifications/hooks", count: hooks.length },
    ];
    var chips = filters.map(function (f) {
      return '<button type="button" class="cn-activity-filter" data-goto="' + esc(f.path) + '"' +
        (filter === f.id ? ' aria-pressed="true"' : "") + ">" +
        esc(f.label) +
        '<span class="cn-activity-count">' + f.count + "</span></button>";
    }).join("");
    var watch = subs.slice(0, 6).map(function (s) {
      return '<span class="cn-activity-sub">' + esc(s.label || s.target) + "</span>";
    }).join("");
    var hookChips = hookDefs.filter(function (h) { return h.enabled; }).slice(0, 6).map(function (h) {
      return '<span class="cn-activity-sub" data-hook="' + esc(h.id) + '" title="' +
        esc(h.event + (h.match ? " · " + h.match : "")) + '">' +
        esc(h.label || h.event) + "</span>";
    }).join("");
    var browserPerm = window.NB_NOTIFY ? window.NB_NOTIFY.permission() : "unsupported";
    var browserLabel = window.NB_NOTIFY ? window.NB_NOTIFY.permissionLabel(browserPerm) : "";
    var browserChip = "";
    if (window.NB_NOTIFY && window.NB_NOTIFY.isSupported()) {
      if (browserPerm === "granted") {
        browserChip = '<span class="cn-ctx-fact" data-browser-perm="granted">browser alerts on</span>';
      } else if (browserPerm === "denied") {
        browserChip = '<span class="cn-ctx-fact" data-browser-perm="denied">browser alerts blocked</span>';
      } else {
        browserChip = '<button type="button" class="cn-activity-enable" data-activity-perm-inline' +
          ' title="Enable browser notifications">Enable browser alerts</button>';
      }
    }
    return '<div class="cn-ctx cn-activity-ctx" data-key="ctx-notifications" data-activity="true">' +
      '<b class="cn-ctx-name">Activity</b>' +
      '<span class="cn-ctx-kind" data-kind="activity">notifications</span>' +
      '<span class="cn-ctx-fact">' + all.length + " items</span>" +
      (unread ? '<span class="cn-badge">' + unread + " new</span>" : "") +
      (browserLabel ? '<span class="cn-ctx-fact">' + esc(browserLabel) + "</span>" : "") +
      browserChip +
      '<div class="cn-activity-filters" role="tablist" aria-label="Activity filters">' + chips + "</div>" +
      (watch
        ? '<div class="cn-activity-watching" title="Subscriptions">' +
          '<span class="cn-ctx-fact">watching</span> ' + watch + "</div>"
        : "") +
      (hookChips
        ? '<div class="cn-activity-hooks" title="Custom event hooks">' +
          '<span class="cn-ctx-fact">hooks</span> ' + hookChips +
          ' <button type="button" class="cn-activity-filter" data-goto="/notifications/hooks"' +
          ' title="Hook-fired activity">view</button></div>'
        : "") +
      "</div>";
  }

  /* ── Transcript ────────────────────────────────────────────────────────── */

  /**
   * Structured log → aligned rows. Every line has a fixed-width who-rail so
   * "you", "agent", and system output share one vertical axis. Tool calls and
   * progress sit under the agent as collapsed summaries the user can expand.
   */
  function renderTranscript(lines, openTools) {
    lines = lines || [];
    openTools = openTools || {};
    if (!lines.length) return "";
    return '<div class="cn-log" data-key="log">' + lines.map(function (line) {
      var id = line.id || "";
      var kind = line.kind || "out";
      if (kind === "banner") {
        return '<div class="cn-line" data-kind="banner" data-key="' + esc(id) + '">' +
          '<pre class="cn-banner">' + formatAscii(line.text || "") + "</pre></div>";
      }
      if (kind === "tool") {
        var open = !!openTools[id];
        var mark = line.ok === false ? "failed" : line.ok === true ? "ok" : "…";
        return '<div class="cn-line" data-kind="tool" data-key="' + esc(id) + '" data-open="' + open + '">' +
          '<span class="cn-who" data-kind="agent">agent</span>' +
          '<div class="cn-body">' +
          '<button type="button" class="cn-tool-sum" data-tool-toggle="' + esc(id) + '"' +
          ' aria-expanded="' + open + '">' +
          '<span class="cn-twist-mark" aria-hidden="true">' + (open ? "▾" : "▸") + "</span>" +
          '<span class="cn-tool-name">' + esc(line.tool || "tool") + "</span>" +
          '<span class="cn-tool-mark" data-ok="' + (line.ok === false ? "false" : line.ok === true ? "true" : "") + '">' +
          esc(mark) + "</span>" +
          '<span class="cn-tool-brief">' + esc(line.summary || "") + "</span>" +
          "</button>" +
          (open
            ? '<div class="cn-tool-detail">' +
              (line.detail ? '<div class="cn-tool-args">' + formatBody(line.detail) + "</div>" : "") +
              (line.result != null && line.result !== ""
                ? '<div class="cn-tool-result">' + formatBody(line.result) + "</div>"
                : "") +
              "</div>"
            : "") +
          "</div></div>";
      }
      var whoRail = kind === "user" ? "you"
        : kind === "agent" ? "agent"
        : kind === "error" ? "error"
        : kind === "progress" ? "…"
        : "";
      var whoKind = kind === "user" ? "person" : kind === "agent" || kind === "tool" ? "agent" : "";
      // Agent / system out get markdown (tables, code); user lines stay plain + marks.
      var body = (kind === "agent" || kind === "out" || kind === "error")
        ? formatBody(line.text || "")
        : formatAscii(line.text || "");
      if (kind === "user" && line.mode) {
        body = '<span class="cn-mode-tag">' + esc(line.mode) + "</span> " + body;
      }
      if (kind === "user" && line.attachments && line.attachments.length) {
        body += '<div class="cn-attach-sent" aria-label="Attachments">' +
          line.attachments.map(function (a) {
            var label = window.NB_ATTACH && window.NB_ATTACH.chipLabel
              ? window.NB_ATTACH.chipLabel(a)
              : (a.name || "file");
            return '<span class="cn-attach-chip cn-attach-chip-sent" data-kind="' +
              esc(a.kind || "file") + '"' +
              (a.error ? ' data-error="true"' : "") +
              ' title="' + esc((a.name || "") + " · " + (a.type || a.kind || "file")) + '">' +
              esc(label) + "</span>";
          }).join("") + "</div>";
      }
      return '<div class="cn-line" data-kind="' + esc(kind) + '" data-key="' + esc(id) + '">' +
        '<span class="cn-who"' + (whoKind ? ' data-kind="' + whoKind + '"' : "") + ">" +
        esc(whoRail) + "</span>" +
        '<div class="cn-body">' + body + "</div></div>";
    }).join("") + "</div>";
  }

  /** Staged prompt attachments — chips above the input before send. */
  function renderAttachTray(atts) {
    atts = atts || [];
    if (!atts.length) return "";
    var chips = atts.map(function (a) {
      var label = window.NB_ATTACH && window.NB_ATTACH.chipLabel
        ? window.NB_ATTACH.chipLabel(a)
        : (a.name || "file");
      var thumb = (a.kind === "image" && a.dataUrl)
        ? '<img class="cn-attach-thumb" src="' + esc(a.dataUrl) + '" alt="" />'
        : "";
      return '<span class="cn-attach-chip" data-kind="' + esc(a.kind || "file") + '"' +
        (a.error ? ' data-error="true"' : "") +
        ' data-attach-id="' + esc(a.id) + '"' +
        ' title="' + esc((a.name || "") + " · " + (a.type || "") +
          (a.error ? " · " + a.error : "")) + '">' +
        thumb +
        '<span class="cn-attach-label">' + esc(label) + "</span>" +
        '<button type="button" class="cn-attach-rm" data-attach-rm="' + esc(a.id) + '"' +
        ' aria-label="Remove ' + esc(a.name || "attachment") + '">×</button>' +
        "</span>";
    }).join("");
    return '<div class="cn-attach-tray" data-key="attach-tray" data-attach-tray role="list" aria-label="Attachments for next message">' +
      chips +
      '<button type="button" class="cn-attach-clear" data-attach-clear title="Clear attachments">clear</button>' +
      "</div>";
  }

  function sessionTabLabel(sess, index) {
    var path = (sess && sess.path) || "/";
    var parts = MAP.split(path);
    var leaf = parts.length ? parts[parts.length - 1] : "board";
    return (index + 1) + " · " + leaf;
  }

  /**
   * Snapshot of which workspace surfaces are active. The cheatsheet filters
   * to these so it never lists keys for components that are not on screen.
   *
   * Built by the driver (app.js) at Ctrl+Space time, before focus moves into
   * the prompt for intellisense — so the sheet still reflects columns/thread
   * when you opened it from there.
   */
  function buildHelpContext(state) {
    var path = (state && state.path) || "/";
    var parts = MAP.split(path);
    var extra = (state && state.merged) || [];
    var here = MAP.list(path, extra) || [];
    var selected = here[Math.min(state.cursor || 0, Math.max(0, here.length - 1))];
    var postsHere = here.some(function (e) { return e.post; });
    var postsChild = false;
    if (selected && selected.kind === "dir") {
      var child = MAP.list(MAP.resolve(path, selected.name), extra) || [];
      postsChild = child.some(function (e) { return e.post; });
    }
    var panes = (state && state.panes) || {};
    var sessions = (state && state.sessions) || [];
    var focus = state && state.columnFocus ? "columns" : "prompt";
    // Surfaces present in this workspace right now.
    var surfaces = ["workspace", "columns", "terminal"];
    if (postsHere || postsChild || (selected && selected.post)) surfaces.push("thread");
    if (sessions.length > 1) surfaces.push("tabs");
    if (panes.zoom) surfaces.push("zoom");
    if (panes.out) surfaces.push("terminal-min");
    if (panes.outMax) surfaces.push("terminal-max");
    if (state && state.filter) surfaces.push("filter");
    var pendingCount = state && state.pending ? state.pending.length : 0;
    if (pendingCount) surfaces.push("pending");
    if (focus === "prompt") surfaces.push("prompt");
    else surfaces.push("columns-focus");
    var speechOn = !!(state && state.speech && state.speech.supported);
    if (speechOn) surfaces.push("speech");
    return {
      path: path,
      leaf: parts.length ? parts[parts.length - 1] : "board",
      focus: focus,
      ai: !!(state && state.ai),
      sort: (state && state.sort) || "hot",
      dock: panes.dock || "bottom",
      session: ((state && state.activeSession) || 0) + 1,
      sessions: Math.max(1, sessions.length),
      hasThread: postsHere || postsChild || !!(selected && selected.post),
      hasFilter: !!(state && state.filter),
      hasPending: pendingCount > 0,
      pendingCount: pendingCount,
      terminalMin: !!panes.out,
      terminalMax: !!panes.outMax,
      zoomed: !!panes.zoom,
      speech: speechOn,
      speechListening: !!(state && state.speech && state.speech.listening),
      surfaces: surfaces,
    };
  }

  /**
   * Cheatsheet catalogue. Each group/row can name the surfaces it needs; only
   * rows whose surfaces are all active (or that name none) are shown.
   * `when` can further refine with the frozen context.
   */
  var HELP_GROUPS = [
    {
      id: "prompt",
      title: "Prompt",
      surfaces: ["prompt", "terminal"],
      // Still show when intel just opened from columns — prompt becomes active.
      when: function (ctx) { return ctx.focus === "prompt" || ctx.intel; },
      rows: [
        { keys: "Ctrl+Space", desc: "Intellisense + this cheatsheet" },
        { keys: "/", desc: "Slash commands (agent chat)",
          when: function (ctx) { return ctx.ai; } },
        { keys: "@", desc: "Mention a person or agent" },
        { keys: "#", desc: "Trending topic or channel" },
        { keys: "Tab", desc: "Complete / cycle candidates" },
        { keys: "↑ ↓", desc: "Candidates or history" },
        { keys: "Enter", desc: "Accept suggestion or run" },
        { keys: "Esc", desc: "Close intel, then columns" },
        { keys: "Alt+A", desc: "Toggle ai / cli mode",
          note: function (ctx) { return ctx.ai ? "now: ai" : "now: cli"; } },
        { keys: "→ / End", desc: "Accept ghost text" },
        { keys: "Hold `", desc: "Push-to-talk speech-to-text",
          when: function (ctx) { return !!ctx.speech; } },
        { keys: "Alt+V", desc: "Toggle continuous dictation",
          when: function (ctx) { return !!ctx.speech; },
          note: function (ctx) { return ctx.speechListening ? "listening" : "idle"; } },
        { keys: "/activity", desc: "Open Teams-style notifications" },
        { keys: "/hooks", desc: "Subscribe to app events → notifications" },
        { keys: "paperclip / drop", desc: "Attach files for chat context" },
        { keys: "/attach", desc: "open | list | clear attachments" },
      ],
    },
    {
      id: "columns",
      title: "Blades",
      surfaces: ["columns"],
      rows: [
        { keys: "← / h", desc: "Reload nav at parent path" },
        { keys: "→ / l", desc: "Reload nav into selected dir (or detail)" },
        { keys: "↑ ↓ / j k", desc: "Move within the nav list" },
        { keys: "Enter", desc: "Open dir (reload nav) or file detail" },
        { keys: "Space", desc: "Expand / collapse one level (dirs)" },
        { keys: "i / Esc", desc: "Editor: insert / normal (files)" },
        { keys: "+ / −", desc: "Expand or collapse one level" },
        { keys: "Backspace / << on nav", desc: "Back to parent — reload nav",
          when: function (ctx) { return !ctx.hasFilter; } },
        { keys: "Esc / × on detail / Backspace on detail",
          desc: "Close detail pane (nav fills row)" },
        { keys: "z / Alt+Z", desc: "Collapse / expand nav rail" },
        { keys: "i or :", desc: "Focus the prompt" },
        { keys: "/", desc: "Filter the nav list" },
        { keys: "Backspace", desc: "Clear filter character",
          when: function (ctx) { return ctx.hasFilter; } },
        { keys: "R", desc: "Load queued posts",
          when: function (ctx) { return ctx.hasPending; } },
        { keys: "T", desc: "Next theme",
          when: function (ctx) { return ctx.focus === "columns"; } },
      ],
    },
    {
      id: "thread",
      title: "Thread",
      surfaces: ["thread"],
      when: function (ctx) { return ctx.hasThread; },
      rows: [
        { keys: "− / +", desc: "Fold or expand a chain" },
        { keys: "nest rail", desc: "Collapse that depth" },
        { keys: "▲ ▼", desc: "Upvote / downvote" },
        { keys: "reply", desc: "Arm the prompt" },
        { keys: "v", desc: "Cycle sort",
          note: function (ctx) { return "now: " + (ctx.sort || "hot"); } },
        { keys: "hot new top best", desc: "Sort the tree" },
        { keys: "share", desc: "Copy nightboard: link" },
      ],
    },
    {
      id: "panel",
      title: "Terminal panel",
      surfaces: ["terminal"],
      rows: [
        { keys: "Alt+T", desc: "New isolated workspace (default home)" },
        { keys: "Alt+J", desc: function (ctx) {
          return ctx.terminalMin ? "Restore terminal" : "Minimise terminal";
        } },
        { keys: "Alt+M", desc: function (ctx) {
          return ctx.terminalMax ? "Restore size" : "Maximise terminal";
        } },
        { keys: "Alt+D", desc: function (ctx) {
          return "Dock (now: " + (ctx.dock || "bottom") + ")";
        } },
        { keys: "z / Alt+Z", desc: function (ctx) {
          return ctx.zoomed
            ? "Expand navigation panes"
            : "Collapse navigation panes (detail fills width)";
        } },
        { keys: "drag sash", desc: "Resize panes" },
        { keys: "dblclick sash", desc: "Collapse / reopen pane" },
      ],
    },
    {
      id: "tabs",
      title: "Workspaces",
      surfaces: ["tabs"],
      when: function (ctx) { return ctx.sessions > 1; },
      rows: [
        { keys: "tab strip", desc: "Switch isolated worktree" },
        { keys: "× on tab", desc: "Close workspace" },
        { keys: "Alt+T", desc: "Add isolated workspace (default home)" },
      ],
    },
  ];

  function surfaceActive(need, surfaces) {
    if (!need || !need.length) return true;
    for (var i = 0; i < need.length; i++) {
      if (surfaces.indexOf(need[i]) === -1) return false;
    }
    return true;
  }

  function helpRowDesc(row, ctx) {
    var d = typeof row.desc === "function" ? row.desc(ctx) : row.desc;
    var note = row.note ? (typeof row.note === "function" ? row.note(ctx) : row.note) : "";
    return note ? d + " · " + note : d;
  }

  function renderHelpOverlay(open, ctx) {
    ctx = ctx || { surfaces: ["workspace", "columns", "terminal", "prompt"], focus: "prompt", path: "/", leaf: "board", sessions: 1, session: 1, sort: "hot", dock: "bottom", ai: true, hasThread: false, hasFilter: false, hasPending: false, terminalMin: false, terminalMax: false, zoomed: false, intel: true };
    // Intel is always on while this overlay is up (Ctrl+Space opens both).
    ctx = Object.assign({}, ctx, { intel: true, surfaces: (ctx.surfaces || []).concat(ctx.surfaces && ctx.surfaces.indexOf("prompt") >= 0 ? [] : ["prompt"]) });

    var groups = HELP_GROUPS.filter(function (g) {
      if (g.when && !g.when(ctx)) return false;
      // Group surfaces: show if any required surface is active, or none listed.
      if (!g.surfaces || !g.surfaces.length) return true;
      return g.surfaces.some(function (s) { return ctx.surfaces.indexOf(s) >= 0; });
    }).map(function (g, gi) {
      var rows = (g.rows || []).filter(function (r) {
        if (r.when && !r.when(ctx)) return false;
        if (r.surfaces && !surfaceActive(r.surfaces, ctx.surfaces)) return false;
        return true;
      }).map(function (r, ri) {
        return '<div class="cn-help-row" data-key="hr-' + gi + "-" + ri + '">' +
          '<span class="cn-help-key"><kbd>' + esc(r.keys) + "</kbd></span>" +
          '<span class="cn-help-desc">' + esc(helpRowDesc(r, ctx)) + "</span></div>";
      }).join("");
      if (!rows) return "";
      return '<section class="cn-help-group" data-key="hg-' + esc(g.id || String(gi)) + '">' +
        "<h3>" + esc(g.title) + "</h3>" + rows + "</section>";
    }).filter(Boolean).join("");

    var chips = [];
    chips.push("ws " + (ctx.session || 1) + "/" + (ctx.sessions || 1));
    chips.push(ctx.path || "/");
    chips.push(ctx.focus === "columns" ? "columns" : "prompt");
    if (ctx.hasThread) chips.push("thread · " + (ctx.sort || "hot"));
    chips.push("dock " + (ctx.dock || "bottom"));
    if (ctx.terminalMin) chips.push("minimised");
    if (ctx.terminalMax) chips.push("maximised");
    if (ctx.zoomed) chips.push("zoomed");
    if (ctx.hasFilter) chips.push("filter");
    if (ctx.pendingCount) chips.push(ctx.pendingCount + " pending");
    chips.push(ctx.ai ? "ai" : "cli");
    if (ctx.speech) chips.push(ctx.speechListening ? "mic on" : "mic");

    var chipHtml = chips.map(function (c, i) {
      return '<span class="cn-help-chip" data-key="hc-' + i + '">' + esc(c) + "</span>";
    }).join("");

    return '<div class="cn-help" data-key="help" data-open="' + !!open + '"' +
      ' data-focus="' + esc(ctx.focus || "prompt") + '"' +
      ' role="dialog" aria-modal="true" aria-label="Keyboard shortcuts for this workspace"' +
      (open ? "" : " hidden") + ">" +
      '<div class="cn-help-card" data-key="help-card">' +
      '<div class="cn-help-head">' +
      "<b>Hotkeys</b>" +
      '<span class="cn-help-scope">this workspace</span>' +
      '<button type="button" class="cn-help-close" data-help-close>close</button>' +
      "</div>" +
      '<div class="cn-help-chips" data-key="help-chips">' + chipHtml + "</div>" +
      '<p class="cn-help-lead">Keys for surfaces active here. Ctrl+Space toggles · Esc closes.</p>' +
      '<div class="cn-help-grid">' + (groups || '<p class="cn-help-empty">No shortcuts for this context.</p>') +
      "</div></div></div>";
  }

  /* ── Columns ───────────────────────────────────────────────────────────── */

  /** Activity per channel, bucketed, for the column sparkline. */
  function activityOf(entry, path) {
    if (entry.kind !== "dir") return null;
    var A = window.NB_ASCII;
    var full = MAP.resolve(path, entry.name);
    var live = (window.NB_APP && window.NB_APP.state && window.NB_APP.state.merged) || [];
    var kids = MAP.list(full, live) || [];
    var posts = kids.filter(function (k) { return k.post; }).map(function (k) { return k.post; });
    // Under four posts a resampled line is all one height — a solid bar that
    // reads as a badge and says nothing. A reading that cannot vary is noise.
    if (posts.length < 4) return null;
    var buckets = [0, 0, 0, 0, 0, 0, 0, 0];
    var mins = posts.map(function (p) {
      var t = String(p.at).split(":");
      return Number(t[0]) * 60 + Number(t[1]);
    });
    var lo = Math.min.apply(null, mins), hi = Math.max.apply(null, mins);
    mins.forEach(function (m) {
      var i = hi === lo ? 0 : Math.floor(((m - lo) / (hi - lo)) * (buckets.length - 1));
      buckets[i] += 1;
    });
    var line = A.sparkline(buckets, 8);
    var distinct = {};
    line.split("").forEach(function (ch) { distinct[ch] = 1; });
    return Object.keys(distinct).length > 1 ? line : null;
  }

  /** What a channel is, above what it contains. */
  function contextStrip(label, extra) {
    var chan = null;
    for (var i = 0; i < D.channels.length; i++) if (D.channels[i].label === label) chan = D.channels[i];
    if (!chan) return "";
    var posts = D.posts.concat(extra || []).filter(function (p) { return p.channel === chan.id; });
    var last = posts.length ? posts[posts.length - 1] : null;
    var spark = activityOf({ kind: "dir", name: label }, "/projects/community/channels");
    return '<div class="cn-ctx" data-key="ctx-' + esc(label) + '">' +
      '<b class="cn-ctx-name">#' + esc(label) + "</b>" +
      '<span class="cn-ctx-kind" data-kind="' + esc(chan.kind) + '">' + esc(chan.kind) + "</span>" +
      '<span class="cn-ctx-fact">' + posts.length + (posts.length === 1 ? " post" : " posts") + "</span>" +
      (chan.unread ? '<span class="cn-badge">' + chan.unread + " new</span>" : "") +
      (spark ? '<span class="cn-spark" aria-hidden="true">' + spark + "</span>" : "") +
      (last ? '<span class="cn-ctx-fact">last ' + esc(last.at) + " by " + esc(last.who) + "</span>" : "") +
      "</div>";
  }

  /** What a DM thread is, above the conversation — sibling of channel context. */
  function dmContextStrip(peer, extra) {
    var dm = null;
    var list = D.dms || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === peer || list[i].peer === peer) { dm = list[i]; break; }
    }
    var member = window.NB_MAP && window.NB_MAP.findMember
      ? window.NB_MAP.findMember(peer)
      : null;
    if (!member) {
      for (var j = 0; j < D.members.length; j++) {
        if (D.members[j].handle === peer || (dm && D.members[j].handle === dm.peer)) {
          member = D.members[j];
          break;
        }
      }
    }
    if (!dm && !member) return "";
    if (!dm) {
      dm = {
        id: peer,
        peer: peer,
        kind: (member && member.kind) || "person",
        unread: 0,
        preview: member && member.detail ? member.detail : "",
      };
    }
    var msgs = (D.dmMessages || []).concat(extra || []).filter(function (m) {
      return m.dm === dm.id;
    });
    var last = msgs.length ? msgs[msgs.length - 1] : null;
    var spark = activityOf({ kind: "dir", name: dm.id }, "/dms");
    var kind = dm.kind || (member && member.kind) || "person";
    return '<div class="cn-ctx" data-key="ctx-dm-' + esc(dm.id) + '" data-dm="true">' +
      '<b class="cn-ctx-name">@' + esc(dm.peer) + "</b>" +
      '<span class="cn-ctx-kind" data-kind="' + esc(kind) + '">' +
      (kind === "agent" ? "agent dm" : "direct") + "</span>" +
      (member && member.role
        ? '<span class="cn-ctx-fact">' + esc(member.role) + "</span>"
        : "") +
      '<span class="cn-ctx-fact">' + msgs.length +
      (msgs.length === 1 ? " message" : " messages") + "</span>" +
      (dm.unread ? '<span class="cn-badge">' + dm.unread + " new</span>" : "") +
      (member && member.state
        ? '<span class="cn-ctx-fact">' + esc(member.state) + "</span>"
        : "") +
      (spark ? '<span class="cn-spark" aria-hidden="true">' + spark + "</span>" : "") +
      (last ? '<span class="cn-ctx-fact">last ' + esc(last.at) + " by " + esc(last.who) + "</span>" : "") +
      (dm.preview ? '<span class="cn-ctx-fact">' + esc(dm.preview.slice(0, 72)) + "</span>" : "") +
      "</div>";
  }

  /**
   * Two panes only — never a cascade of duplicated list blades.
   *
   *   [ nav ]  — the single reusable root blade, reloaded as a navbar for
   *              the current path (one branch of first-level subnodes)
   *   [ detail ] — preview / editor / thread for the selected entry
   *
   * Breadcrumb owns path depth. Enter / → reloads the nav blade with the
   * child scope; ← reloads it with the parent. No stack of board → projects →
   * community → channels list columns.
   */
  function buildBladeStack(state) {
    var extra = state.merged || [];
    var path = state.path || "/";
    var parts = MAP.split(path);
    var here = MAP.list(path, extra) || [];
    var cursor = Math.min(state.cursor || 0, Math.max(0, here.length - 1));
    var selected = here[cursor];
    var selectedName = selected ? selected.name : null;
    var navTitle = path === "/" ? "board" : (parts[parts.length - 1] || "board");
    var parentPath = parts.length ? MAP.join(parts.slice(0, -1)) || "/" : null;

    var blades = [
      {
        index: 0,
        path: path,
        title: navTitle,
        kind: "list",
        // Closable only when not at board root — close means go up (reload nav).
        closable: path !== "/",
        parentPath: parentPath,
        entries: here,
        selected: selectedName,
        filter: state.filter || "",
        // Stable key so morph reuses this node instead of stacking clones.
        stable: "nav",
      },
    ];
    // Detail is optional — user closes it with ×; selecting a file reopens it.
    if (state.detailOpen !== false) {
      blades.push({
        index: 1,
        path: path,
        title: selected && selected.post
          ? selected.name
          : (selected && selected.kind === "dir" ? selected.name : "detail"),
        kind: "detail",
        closable: true,
        parentPath: path,
        parentKey: selectedName,
        selected: selected,
        markId: selected && selected.post ? selected.post.id : null,
        stable: "detail",
      });
    }
    return blades;
  }

  /**
   * Whether a first-level directory row is expanded in a list blade.
   * Only user toggles (+ / Space) expand — never auto-unfurl the live path,
   * because the next cascade blade already owns that listing (no duplicates).
   */
  function dirExpanded(dirPath, state) {
    return !!(state && state.treeOpen && state.treeOpen[dirPath]);
  }

  /**
   * List-blade body: first-level parent/child only.
   *
   *   - Rows are the blade path's immediate entries (siblings).
   *   - Expanding a dir reveals ITS children once — those children never
   *     expand further in this blade (no duplicate deep trees).
   *   - Iconography is only + / − (never dots or arrows):
   *       +  dir with children (collapsed, or not expandable in-place)
   *       −  dir expanded (one-level peek open)
   *       (blank spacer) leaf file / empty dir — same column, no glyph
   *   - Child counts are plain numbers (no ›). Enter / → slides into a dir.
   *   - + / − and Space toggle expand; Enter / → slides into a dir.
   */
  function bladeListHtml(blade, focused, filter, state) {
    var shown = blade.entries || [];
    if (filter) {
      shown = shown.filter(function (e) {
        return window.NB_COMPLETE.score(e.name, filter) !== null;
      });
    }
    if (!shown.length) return '<p class="cn-empty">empty</p>';
    state = state || {};
    var extra = state.merged || [];
    var live = state.path || "/";

    function rowHtml(e, parentPath, depth, index) {
      var full = MAP.resolve(parentPath, e.name);
      var isDir = e.kind === "dir";
      // Only first-level rows of this blade may expand (depth 0).
      var canExpand = isDir && depth === 0;
      var kids = isDir ? (MAP.list(full, extra) || []) : [];
      if (filter && kids.length) {
        kids = kids.filter(function (k) {
          return window.NB_COMPLETE.score(k.name, filter) !== null;
        });
      }
      var open = canExpand && dirExpanded(full, state);
      var hasSub = isDir && kids.length > 0;
      // Grandchild count for depth-1 rows (count badge only).
      var subN = 0;
      if (isDir && depth >= 1) subN = kids.length;

      var spark = activityOf(e, parentPath);
      var current = blade.selected != null && e.name === blade.selected && parentPath === blade.path;
      if (!current && isDir) {
        current = live === full || live.indexOf(full + "/") === 0;
      }
      // Path-focus: the immediate next segment under this blade.
      var pathFocus = false;
      if (isDir && live.indexOf(full + "/") === 0) {
        var after = live.slice(full.length + 1);
        pathFocus = after.indexOf("/") === -1 || depth === 0;
      }
      if (live === full) pathFocus = true;

      // One icon language for every tree row: + / − / blank. No ·  ›  ▸  *.
      var twist;
      if (canExpand && hasSub) {
        twist = '<button type="button" class="cn-pm" data-tree-toggle="' + esc(full) + '"' +
          ' aria-expanded="' + open + '" title="' +
          (open ? "Collapse (Space)" : "Expand (Space) — one level") + '">' +
          (open ? "−" : "+") + "</button>";
      } else if (isDir && hasSub) {
        // Has children but cannot expand in-place (depth ≥ 1) — same + mark;
        // Enter / → reloads nav into this dir.
        twist = '<span class="cn-pm cn-pm-more" aria-hidden="true"' +
          ' title="Has children — Enter or → to open">+</span>';
      } else {
        // Leaf file or empty directory: keep the column, no glyph.
        twist = '<span class="cn-pm cn-pm-leaf" aria-hidden="true"></span>';
      }

      var subMark = "";
      if (isDir && depth === 0 && hasSub && !open) {
        subMark = '<span class="cn-subkids" title="' + kids.length +
          ' child' + (kids.length === 1 ? "" : "ren") + '">' + kids.length + "</span>";
      } else if (isDir && depth >= 1 && subN > 0) {
        subMark = '<span class="cn-subkids" title="Open to browse ' + subN +
          ' child' + (subN === 1 ? "" : "ren") + '">' + subN + "</span>";
      }

      var html = '<div class="cn-tree-row" data-key="tr-' + esc(full) + '" data-depth="' + depth + '"' +
        (pathFocus ? ' data-path-focus="true"' : "") +
        (isDir && hasSub ? ' data-has-kids="true"' : "") + ">" +
        '<div class="cn-tree-line">' +
        twist +
        '<button type="button" class="cn-item" data-key="' + esc(e.name) + '"' +
        ' data-path="' + esc(full) + '"' +
        ' data-blade="' + blade.index + '" data-col="' + blade.index + '" data-i="' + index + '"' +
        ' data-kind="' + esc(e.kind) + '"' +
        (e.openDm ? ' data-open-dm="' + esc(e.openDm) + '"' : "") +
        (isDir && hasSub ? ' data-has-kids="true"' : "") +
        (e.meta ? ' data-meta="' + esc(e.meta) + '"' : "") +
        (current ? ' aria-current="true"' : "") + ">" +
        '<span class="cn-name">' + esc(e.name) + "</span>" +
        subMark +
        (e.unread ? '<span class="cn-badge">' + e.unread + "</span>" :
          '<span class="cn-hint">' + (spark ? '<span class="cn-spark" aria-hidden="true">' + spark + "</span> " : "") +
          esc(e.hint || "") + "</span>") +
        "</button></div>";

      // Only first-level expand: children render as a flat list (depth 1), never nested further.
      if (canExpand && open && kids.length) {
        html += '<div class="cn-tree-kids" data-key="tk-' + esc(full) + '">' +
          kids.map(function (k, ki) {
            return rowHtml(k, full, 1, ki);
          }).join("") +
          "</div>";
      } else if (canExpand && open && !kids.length) {
        html += '<div class="cn-tree-kids cn-tree-empty" data-key="tk-' + esc(full) + '">' +
          '<p class="cn-empty">empty</p></div>';
      }
      html += "</div>";
      return html;
    }

    return '<div class="cn-blade-tree" data-key="tree-' + blade.index +
      '" data-tree-mode="first-level">' +
      shown.map(function (e, i) { return rowHtml(e, blade.path, 0, i); }).join("") +
      "</div>";
  }

  /**
   * One blade (list or detail). When nav is collapsed, list blades render as
   * thin rails so detail can claim the width without losing path context.
   */
  function bladeHtml(blade, focused, bodyHtml, navCollapsed) {
    var title = blade.kind === "detail"
      ? (blade.title || "detail")
      : (blade.path === "/" ? "board" : blade.title);
    var subtitle = blade.kind === "detail" ? "detail" : "blade";
    var isList = blade.kind !== "detail";
    var collapsed = !!(navCollapsed && isList);

    // Collapsed nav rail — same stable blade, slimmed; click expands.
    if (collapsed) {
      return '<section class="cn-blade cn-col cn-blade-rail" data-blade="' + blade.index + '"' +
        ' data-column="' + blade.index + '" data-blade-path="' + esc(blade.path) + '"' +
        ' data-blade-kind="list" data-collapsed="true" data-nav="true"' +
        (focused ? ' data-focus="true"' : "") +
        ' data-key="blade-nav">' +
        '<button type="button" class="cn-blade-rail-hit" data-nav-expand' +
        ' data-blade-path="' + esc(blade.path) + '"' +
        ' title="Expand navigation — ' + esc(title) + ' (z)"' +
        ' aria-label="Expand navigation: ' + esc(title) + '">' +
        '<span class="cn-blade-rail-mark" aria-hidden="true">›</span>' +
        '<span class="cn-blade-rail-title">' + esc(title) + "</span>" +
        "</button></section>";
    }

    var kicker = isList
      ? (blade.path === "/" ? "nav" : "nav")
      : subtitle;
    var closeTitle = isList
      ? "Back — up to parent (reload nav)"
      : "Close detail pane";
    // When nav has drilled below board root, lead the chrome with << so the
    // reused blade always shows how to step back (not only a trailing ×).
    var navBack = isList && blade.closable && blade.path && blade.path !== "/";
    var parentLabel = blade.parentPath && blade.parentPath !== "/"
      ? blade.parentPath
      : "board";
    // Stable morph keys: always blade-nav / blade-detail so the root blade is
    // reused and reloaded, never cloned for each path segment.
    var morphKey = blade.stable || (isList ? "nav" : "detail");
    return '<section class="cn-blade cn-col" data-blade="' + blade.index + '"' +
      ' data-column="' + blade.index + '" data-blade-path="' + esc(blade.path) + '"' +
      ' data-blade-kind="' + esc(blade.kind) + '"' +
      ' data-collapsed="false"' +
      (isList ? ' data-nav="true"' : "") +
      (navBack ? ' data-nav-drilled="true"' : "") +
      (focused ? ' data-focus="true"' : "") +
      ' data-key="blade-' + morphKey + '">' +
      '<header class="cn-blade-head cn-col-head" data-key="blade-head-' + morphKey + '">' +
      (navBack
        ? '<button type="button" class="cn-blade-back cn-pane-act" data-blade-close="' + blade.index + '"' +
          ' data-nav-back title="' + esc(closeTitle + " · " + parentLabel) + '"' +
          ' aria-label="' + esc(closeTitle) + '">' +
          '<span class="cn-blade-back-mark" aria-hidden="true">&lt;&lt;</span>' +
          '<span class="cn-blade-back-label">back</span></button>'
        : "") +
      '<span class="cn-blade-kicker">' + esc(kicker) + "</span>" +
      '<span class="cn-col-title cn-blade-title">' + esc(title) +
      (blade.filter ? '<span class="cn-filter">/' + esc(blade.filter) + "</span>" : "") +
      "</span>" +
      (isList && blade.path && blade.path !== "/"
        ? '<span class="cn-blade-path" title="' + esc(blade.path) + '">' +
          esc(blade.path) + "</span>"
        : "") +
      (isList
        ? '<button type="button" class="cn-pane-act" data-nav-collapse' +
          ' title="Collapse navigation (z / Alt+Z) — give detail the width"' +
          ' aria-label="Collapse navigation">—</button>'
        : '<button type="button" class="cn-pane-act" data-pane-zoom data-nav-collapse' +
          ' title="' + (navCollapsed
            ? "Expand navigation (z / Alt+Z)"
            : "Collapse navigation (z / Alt+Z) — detail fills the row") + '"' +
          ' aria-label="' + (navCollapsed ? "Expand navigation" : "Collapse navigation") + '"' +
          ' aria-pressed="' + !!navCollapsed + '">' +
          (navCollapsed ? "▣" : "▭") + "</button>") +
      // Detail keeps trailing ×; nav uses leading << only (no double chrome).
      (!isList && blade.closable
        ? '<button type="button" class="cn-blade-close cn-pane-act" data-blade-close="' + blade.index + '"' +
          ' title="' + esc(closeTitle) + '" aria-label="' + esc(closeTitle) + '">×</button>'
        : "") +
      "</header>" +
      '<div class="cn-blade-body cn-col-body" data-key="blade-body-' + morphKey + '">' +
      bodyHtml + "</div></section>";
  }

  /* ── The experience ────────────────────────────────────────────────────── */

  var CONSOLE = {
    id: "console",
    name: "Console",
    thesis: "The board as a filesystem. One nav blade is the navbar — it reloads for the current path with one branch of subnodes. Detail is the other pane. Breadcrumb owns depth; never stack cloned list blades.",
    keys: "[Ctrl+Space] intellisense  [←→] parent/child  [↑↓] entry  [Space] expand  [Enter] open  [z] collapse nav  [:] command",

    css: `
    /* Workbench shell: cascading blades + VS Code-style terminal panel. */
    [data-exp="console"]{display:grid;grid-template-rows:auto minmax(0,1fr) auto;height:100%;min-height:0;position:relative}
    [data-exp="console"]:has(.cn-panel[data-dock="right"]){
      grid-template-columns:minmax(0,1fr) auto;grid-template-rows:auto minmax(0,1fr)}
    [data-exp="console"]:has(.cn-panel[data-dock="left"]){
      grid-template-columns:auto minmax(0,1fr);grid-template-rows:auto minmax(0,1fr)}
    [data-exp="console"]:has(.cn-panel[data-dock="right"]) .cn-path,
    [data-exp="console"]:has(.cn-panel[data-dock="left"]) .cn-path{grid-column:1/-1;grid-row:1}
    [data-exp="console"]:has(.cn-panel[data-dock="right"]) .cn-blades{grid-column:1;grid-row:2;min-width:0}
    [data-exp="console"]:has(.cn-panel[data-dock="right"]) .cn-panel{grid-column:2;grid-row:2}
    [data-exp="console"]:has(.cn-panel[data-dock="left"]) .cn-blades{grid-column:2;grid-row:2;min-width:0}
    [data-exp="console"]:has(.cn-panel[data-dock="left"]) .cn-panel{grid-column:1;grid-row:2}
    /* Maximize: the terminal claims the workbench; columns keep a thin strip
       so you still know where you are. */
    [data-exp="console"]:has(.cn-panel[data-out-max="true"][data-dock="bottom"]){
      grid-template-rows:auto minmax(0,4.5rem) minmax(0,1fr)}
    [data-exp="console"]:has(.cn-panel[data-out-max="true"][data-dock="right"]){
      grid-template-columns:minmax(0,6rem) minmax(0,1fr)}
    [data-exp="console"]:has(.cn-panel[data-out-max="true"][data-dock="left"]){
      grid-template-columns:minmax(0,1fr) minmax(0,6rem)}

    /* Breadcrumb. Clickable, because the path is also the navigation. */
    [data-exp="console"] .cn-path{display:flex;gap:.15rem;align-items:center;flex-wrap:wrap;
      padding:.4rem .8rem;border-block-end:1px solid var(--nb-rule);font-size:.9em}
    [data-exp="console"] .cn-crumb{background:none;border:0;font:inherit;color:var(--nb-ink-dim);
      cursor:pointer;padding:.1rem .2rem;border-radius:var(--nb-radius)}
    [data-exp="console"] .cn-crumb:hover{color:var(--nb-ink);text-decoration:underline}
    [data-exp="console"] .cn-crumb:last-of-type{color:var(--nb-ink);font-weight:700}
    [data-exp="console"] .cn-sep{color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-views{margin-inline-start:auto;display:flex;gap:.25rem;align-items:center;flex-wrap:wrap}
    [data-exp="console"] .cn-feed-bar{display:flex;flex-direction:column;gap:.3rem;width:100%;min-width:0}
    [data-exp="console"] .cn-feed-views{display:flex;flex-wrap:wrap;gap:.25rem;align-items:center}
    [data-exp="console"] .cn-feed-query-row{display:flex;flex-wrap:wrap;gap:.3rem;align-items:center;width:100%}
    [data-exp="console"] .cn-feed-q-label{font-size:.75em;color:var(--nb-ink-faint);text-transform:lowercase}
    [data-exp="console"] .cn-feed-query{
      flex:1 1 12rem;min-width:8rem;font:inherit;font-size:.85em;color:var(--nb-ink);
      background:var(--nb-bg);border:1px solid var(--nb-rule);border-radius:var(--nb-radius);
      min-height:1.8rem;padding:0 .45rem}
    [data-exp="console"] .cn-feed-query:focus{outline:2px solid var(--nb-accent);outline-offset:1px}
    [data-exp="console"] .cn-feed-q-btn{
      font:inherit;font-size:.8em;color:var(--nb-ink-dim);background:none;border:1px solid var(--nb-rule);
      border-radius:var(--nb-radius);min-height:1.8rem;padding:0 .45rem;cursor:pointer}
    [data-exp="console"] .cn-feed-q-btn:hover{color:var(--nb-ink);border-color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-feed-match{font-size:.8em;color:var(--nb-ink-faint);padding:.15rem .55rem 0}
    [data-exp="console"] .cn-feed-err,[data-exp="console"] .cn-feed-err-line{
      font-size:.8em;color:var(--nb-danger);padding:.1rem .55rem 0}
    [data-exp="console"] .cn-sort{background:none;border:1px solid var(--nb-rule);font:inherit;
      color:var(--nb-ink-dim);cursor:pointer;padding:0 .55rem;min-height:1.7rem;border-radius:var(--nb-radius);
      text-transform:lowercase}
    [data-exp="console"] .cn-sort[aria-pressed=true]{background:var(--nb-accent);color:var(--nb-accent-ink);
      border-color:var(--nb-accent)}
    [data-exp="console"] .cn-share{background:none;border:1px solid var(--nb-rule);font:inherit;
      color:var(--nb-ink-dim);cursor:pointer;padding:0 .55rem;min-height:1.7rem;border-radius:var(--nb-radius)}
    [data-exp="console"] .cn-share:hover,[data-exp="console"] .cn-sort:hover{color:var(--nb-ink);border-color:var(--nb-ink-faint)}

    /* Cascading blades (Azure model). Each blade depends on its parent's
       selection; close or re-scope a parent and every child re-evaluates.
       Nav panes collapse to thin rails so detail can claim the width. */
    [data-exp="console"] .cn-blades,[data-exp="console"] .cn-cols{
      display:flex;min-height:0;overflow-x:auto;overflow-y:hidden;
      scroll-snap-type:x proximity;background:var(--nb-bg)}
    [data-exp="console"] .cn-blade,[data-exp="console"] .cn-col{
      display:grid;grid-template-rows:auto minmax(0,1fr);min-width:0;min-height:0;
      flex:0 0 clamp(12rem,22vw,18rem);max-width:22rem;
      border-inline-end:1px solid var(--nb-rule);background:var(--nb-bg);
      opacity:.7;scroll-snap-align:start;position:relative;
      box-shadow:inset 0 0 0 1px transparent;
      transition:flex-basis .16s ease,max-width .16s ease,opacity .12s ease}
    [data-exp="console"] .cn-blade[data-blade-kind=detail],[data-exp="console"] .cn-pane{
      flex:1 1 24rem;max-width:none;opacity:.92}
    /* Nav-only: when detail is closed, the nav blade fills the workbench. */
    [data-exp="console"] .cn-blades:not(:has(.cn-blade[data-blade-kind=detail])) .cn-blade[data-blade-kind=list],
    [data-exp="console"] .cn-blades:not(:has(.cn-blade[data-blade-kind=detail])) .cn-blade[data-nav=true]{
      flex:1 1 auto;max-width:none;opacity:1}
    /* Collapsed nav: thin rails keep path context without eating detail width. */
    [data-exp="console"] .cn-blades[data-nav-collapsed=true],
    [data-exp="console"] .cn-blades[data-zoom=true]{/* alias: zoom = nav collapsed */}
    [data-exp="console"] .cn-blade[data-collapsed=true],
    [data-exp="console"] .cn-blade-rail{
      flex:0 0 2.15rem;max-width:2.15rem;min-width:2.15rem;opacity:1;
      grid-template-rows:minmax(0,1fr);background:var(--nb-surface)}
    [data-exp="console"] .cn-blade-rail-hit{
      display:flex;flex-direction:column;align-items:center;justify-content:flex-start;
      gap:.45rem;width:100%;height:100%;min-height:100%;margin:0;padding:.45rem .15rem;
      border:0;background:transparent;color:var(--nb-ink-dim);font:inherit;cursor:pointer;
      writing-mode:vertical-rl;text-orientation:mixed}
    [data-exp="console"] .cn-blade-rail-hit:hover,
    [data-exp="console"] .cn-blade-rail-hit:focus-visible{
      color:var(--nb-ink);background:color-mix(in srgb,var(--nb-accent) 12%,var(--nb-surface));
      outline:none}
    [data-exp="console"] .cn-blade[data-collapsed=true][data-focus=true] .cn-blade-rail-hit{
      color:var(--nb-accent)}
    [data-exp="console"] .cn-blade-rail-mark{
      writing-mode:horizontal-tb;font-size:.85em;color:var(--nb-accent);line-height:1}
    [data-exp="console"] .cn-blade-rail-title{
      font-size:.72em;letter-spacing:.06em;text-transform:lowercase;
      overflow:hidden;text-overflow:ellipsis;max-height:12rem;white-space:nowrap}
    [data-exp="console"] .cn-blades[data-nav-collapsed=true] .cn-blade[data-blade-kind=detail],
    [data-exp="console"] .cn-blades[data-zoom=true] .cn-blade[data-blade-kind=detail]{
      flex:1 1 auto;min-width:min(100%,28rem);opacity:1}
    @media (prefers-reduced-motion:reduce){
      [data-exp="console"] .cn-blade,[data-exp="console"] .cn-col{transition:none}
    }
    [data-exp="console"] .cn-blade[data-focus=true],[data-exp="console"] .cn-col[data-focus=true]{
      opacity:1;z-index:1;
      box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--nb-accent) 35%,transparent),
        4px 0 18px color-mix(in srgb,var(--nb-bg) 70%,#000)}
    [data-exp="console"] .cn-blade + .cn-blade{border-inline-start:0}
    /* Depth tint — later blades sit slightly lifted, like Azure's stack. */
    [data-exp="console"] .cn-blade[data-blade="1"]{background:color-mix(in srgb,var(--nb-surface) 35%,var(--nb-bg))}
    [data-exp="console"] .cn-blade[data-blade="2"]{background:color-mix(in srgb,var(--nb-surface) 55%,var(--nb-bg))}
    [data-exp="console"] .cn-blade[data-blade="3"],
    [data-exp="console"] .cn-blade[data-blade="4"],
    [data-exp="console"] .cn-blade[data-blade-kind=detail]{
      background:color-mix(in srgb,var(--nb-surface) 70%,var(--nb-bg))}

    [data-exp="console"] .cn-split{cursor:col-resize;position:relative;touch-action:none;min-width:6px;display:none}
    [data-exp="console"] .cn-split-row{cursor:row-resize;height:6px;min-width:0;width:100%;flex:none;display:block;
      position:relative;touch-action:none}
    [data-exp="console"] .cn-split-row::before{content:"";position:absolute;inset-inline:0;inset-block-start:2px;
      height:2px;background:var(--nb-rule)}
    [data-exp="console"] .cn-split-row:hover::before,
    [data-exp="console"] .cn-split-row:focus-visible::before{background:var(--nb-accent)}
    [data-exp="console"] .cn-split-row:focus-visible{outline:none}
    [data-exp="console"] .cn-split-row[data-closed=true]::before{background:var(--nb-accent);opacity:.55}

    @media (max-width: 64rem){
      [data-exp="console"] .cn-blade[data-blade-kind=list]{flex-basis:clamp(11rem,40vw,16rem)}
      [data-exp="console"]:has(.cn-panel[data-dock="right"]),
      [data-exp="console"]:has(.cn-panel[data-dock="left"]){
        grid-template-columns:minmax(0,1fr);grid-template-rows:auto minmax(0,1fr) auto}
      [data-exp="console"]:has(.cn-panel[data-dock="right"]) .cn-blades,
      [data-exp="console"]:has(.cn-panel[data-dock="left"]) .cn-blades,
      [data-exp="console"]:has(.cn-panel[data-dock="right"]) .cn-panel,
      [data-exp="console"]:has(.cn-panel[data-dock="left"]) .cn-panel{grid-column:1;grid-row:auto}
      [data-exp="console"] .cn-panel[data-dock="right"],
      [data-exp="console"] .cn-panel[data-dock="left"]{width:auto!important;height:var(--nb-out-h,12rem);
        border-inline:0;border-block-start:1px solid var(--nb-rule)}
      [data-exp="console"] .cn-panel[data-dock="right"] .cn-split-row,
      [data-exp="console"] .cn-panel[data-dock="left"] .cn-split-row{display:block;cursor:row-resize}
    }
    @media (max-width: 40rem){
      [data-exp="console"] .cn-blades{scroll-snap-type:x mandatory}
      [data-exp="console"] .cn-blade{flex:0 0 85%;max-width:85%;scroll-snap-align:start;opacity:1}
      [data-exp="console"] .cn-blade[data-blade-kind=detail]{flex:0 0 92%;max-width:92%}
      [data-exp="console"] .cn-pane-act{min-width:2rem;min-height:2rem}
    }
    @media (max-height: 40rem){
      [data-exp="console"] .cn-panel[data-dock="bottom"]:not([data-out-min=true]):not([data-out-max=true]){
        height:min(var(--nb-out-h,12rem),38vh)}
    }
    [data-exp="console"] .cn-blade-head,[data-exp="console"] .cn-col-head{
      display:flex;align-items:center;gap:.35rem;
      padding:.3rem .5rem .3rem .65rem;border-block-end:1px solid var(--nb-rule);
      color:var(--nb-ink-faint);font-size:.8em;background:var(--nb-surface)}
    [data-exp="console"] .cn-blade-kicker{font-size:.7em;letter-spacing:.1em;text-transform:uppercase;
      color:var(--nb-ink-faint);flex:none}
    [data-exp="console"] .cn-blade-title,[data-exp="console"] .cn-col-title{
      flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--nb-ink-dim)}
    [data-exp="console"] .cn-blade[data-focus=true] .cn-blade-title{color:var(--nb-ink);font-weight:700}
    [data-exp="console"] .cn-blade-path{
      font-size:.72em;color:var(--nb-ink-faint);max-width:12rem;overflow:hidden;
      text-overflow:ellipsis;white-space:nowrap;flex:none}
    /* Drill-down back control: leading << when the single nav blade is reused. */
    [data-exp="console"] .cn-blade-back{
      display:inline-flex;align-items:center;gap:.28rem;flex:none;
      min-width:auto;padding:0 .4rem;border:1px solid var(--nb-rule);
      color:var(--nb-agent);font-weight:700;letter-spacing:.02em;
      background:color-mix(in srgb,var(--nb-agent) 8%,var(--nb-surface))}
    [data-exp="console"] .cn-blade-back:hover{
      color:var(--nb-accent-ink);background:var(--nb-agent);border-color:var(--nb-agent)}
    [data-exp="console"] .cn-blade-back-mark{font-size:1em;line-height:1;font-variant-ligatures:none}
    [data-exp="console"] .cn-blade-back-label{
      font-size:.72em;letter-spacing:.08em;text-transform:uppercase;opacity:.9}
    [data-exp="console"] .cn-blade[data-nav-drilled=true] .cn-blade-head{gap:.4rem}
    [data-exp="console"] .cn-blade-close{font-size:1.05em;line-height:1}
    [data-exp="console"] .cn-pane-act{background:none;border:1px solid transparent;font:inherit;
      color:var(--nb-ink-faint);cursor:pointer;min-width:1.5rem;min-height:1.5rem;padding:0;
      border-radius:var(--nb-radius);line-height:1}
    [data-exp="console"] .cn-pane-act:hover{color:var(--nb-ink);border-color:var(--nb-rule);background:var(--nb-bg)}
    [data-exp="console"] .cn-blade-close:hover{color:var(--nb-danger);border-color:var(--nb-danger)}
    [data-exp="console"] .cn-filter{color:var(--nb-accent);margin-inline-start:.4rem}
    [data-exp="console"] .cn-blade-body,[data-exp="console"] .cn-col-body{overflow:auto}
    /* +/− tree nav inside list blades (channels and every other dir listing). */
    [data-exp="console"] .cn-blade-tree{padding:.15rem 0 .35rem}
    [data-exp="console"] .cn-tree-row{min-width:0}
    /* First-level tree: twist + row. Kids indent once; no recursive nest rails. */
    [data-exp="console"] .cn-tree-line{display:grid;grid-template-columns:auto minmax(0,1fr);
      align-items:center;gap:0 .15rem;min-height:1.9rem;padding-inline-end:.35rem}
    [data-exp="console"] .cn-tree-line .cn-pm{margin-inline:.15rem 0;min-width:1.15rem;text-align:center;
      font-variant-numeric:tabular-nums}
    /* +/− only — blank leaf keeps the same column width (no ·  ›  ▸). */
    [data-exp="console"] .cn-pm-leaf{visibility:hidden}
    [data-exp="console"] .cn-pm-more{color:var(--nb-ink-faint);font-weight:700;opacity:.9}
    [data-exp="console"] .cn-subkids{font-size:.72em;color:var(--nb-ink-faint);letter-spacing:.02em;
      flex:none;padding-inline:.15rem;opacity:.9;font-variant-numeric:tabular-nums}
    [data-exp="console"] .cn-item[aria-current=true] .cn-subkids{color:inherit;opacity:.85}
    [data-exp="console"] .cn-tree-row[data-depth="1"] .cn-tree-line{padding-inline-start:.85rem}
    [data-exp="console"] .cn-tree-row[data-path-focus=true] > .cn-tree-line .cn-name{font-weight:700}
    [data-exp="console"] .cn-tree-line .cn-item{display:flex;align-items:baseline;gap:.45rem;
      min-width:0;width:100%;padding:.18rem .45rem .18rem .25rem;background:none;border:0;font:inherit;
      color:var(--nb-ink);cursor:pointer;text-align:start;min-height:1.9rem}
    [data-exp="console"] .cn-tree-line .cn-item:hover{background:var(--nb-surface)}
    [data-exp="console"] .cn-blade[data-focus=true] .cn-tree-line .cn-item[aria-current=true],
    [data-exp="console"] .cn-col[data-focus=true] .cn-tree-line .cn-item[aria-current=true]{
      background:var(--nb-accent);color:var(--nb-accent-ink)}
    [data-exp="console"] .cn-blade[data-focus=true] .cn-tree-line .cn-item[aria-current=true] .cn-hint,
    [data-exp="console"] .cn-col[data-focus=true] .cn-tree-line .cn-item[aria-current=true] .cn-hint{
      color:inherit;opacity:.8}
    [data-exp="console"] .cn-tree-line .cn-item[aria-current=true]{background:var(--nb-surface)}
    [data-exp="console"] .cn-tree-kids{margin:0;padding:0;border-inline-start:1px solid var(--nb-rule);
      margin-inline-start:.7rem}
    [data-exp="console"] .cn-tree-empty{padding-inline-start:1.6rem}
    [data-exp="console"] .cn-item{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.45rem;
      align-items:baseline;width:100%;padding:.18rem .6rem;background:none;border:0;font:inherit;
      color:var(--nb-ink);cursor:pointer;text-align:start;min-height:1.9rem}
    [data-exp="console"] .cn-item:hover{background:var(--nb-surface)}
    [data-exp="console"] .cn-blade[data-focus=true] .cn-item[aria-current=true],
    [data-exp="console"] .cn-col[data-focus=true] .cn-item[aria-current=true]{
      background:var(--nb-accent);color:var(--nb-accent-ink)}
    [data-exp="console"] .cn-blade[data-focus=true] .cn-item[aria-current=true] .cn-hint,
    [data-exp="console"] .cn-col[data-focus=true] .cn-item[aria-current=true] .cn-hint{color:inherit;opacity:.8}
    [data-exp="console"] .cn-item[aria-current=true]{background:var(--nb-surface)}
    [data-exp="console"] .cn-sig{color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-item[data-kind=agent] .cn-sig{color:var(--nb-agent)}
    [data-exp="console"] .cn-item[data-meta=promoted] .cn-name{color:var(--nb-accent)}
    [data-exp="console"] .cn-item[data-meta="needs-review"] .cn-name{color:var(--nb-warn)}
    [data-exp="console"] .cn-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0}
    [data-exp="console"] .cn-hint{color:var(--nb-ink-faint);font-size:.82em;white-space:nowrap;flex:none}
    /* ASCII carries readings here, so it takes ink weight rather than decoration. */
    [data-exp="console"] .cn-spark{color:var(--nb-live);letter-spacing:-.06em;opacity:.7;font-size:.9em}
    /* On a selected row the live ink fights the selection wash, so it defers. */
    [data-exp="console"] [aria-current="true"] .cn-spark{color:currentColor}
    [data-exp="console"] .cn-sigil{color:var(--nb-signed);letter-spacing:-.05em;margin-inline-end:.35rem}
    [data-exp="console"] .cn-merge{font-variant-numeric:tabular-nums}
    [data-exp="console"] .cn-badge{background:var(--nb-accent);color:var(--nb-accent-ink);padding:0 .35rem;font-size:.8em}

    /* Detail blade: Reddit-style comment tree. Always a tree — sort changes
       order, not costume. Nest rails trace depth; ± folds a chain. */
    [data-exp="console"] .cn-blade[data-blade-kind=detail] .cn-blade-body,
    [data-exp="console"] .cn-pane > .cn-col-body{overflow:auto;padding:.35rem 0 .6rem}
    [data-exp="console"] .cn-empty{color:var(--nb-ink-faint);padding:.6rem .8rem}

    /* MS Teams-style Activity / notifications feed */
    [data-exp="console"] .cn-activity{display:flex;flex-direction:column;gap:.35rem;padding:.35rem .55rem .7rem}
    [data-exp="console"] .cn-activity-card{display:grid;grid-template-columns:1.8rem minmax(0,1fr);gap:.55rem;
      padding:.45rem .55rem;border:1px solid var(--nb-rule);background:var(--nb-surface);border-radius:var(--nb-radius)}
    [data-exp="console"] .cn-activity-card[data-unread=true]{border-color:var(--nb-accent)}
    [data-exp="console"] .cn-activity-card[data-here=true]{outline:1px solid var(--nb-accent);outline-offset:1px}
    [data-exp="console"] .cn-activity-glyph{font-weight:700;color:var(--nb-ink-faint);text-align:center;
      line-height:1.6;font-size:1.05em}
    [data-exp="console"] .cn-activity-card[data-kind=mention] .cn-activity-glyph{color:var(--nb-accent)}
    [data-exp="console"] .cn-activity-card[data-kind=subscription] .cn-activity-glyph{color:var(--nb-signed)}
    [data-exp="console"] .cn-activity-card[data-kind=dm] .cn-activity-glyph{color:var(--nb-agent)}
    [data-exp="console"] .cn-activity-card[data-kind=reply] .cn-activity-glyph{color:var(--nb-live)}
    [data-exp="console"] .cn-activity-main{min-width:0}
    [data-exp="console"] .cn-activity-head{display:flex;flex-wrap:wrap;align-items:baseline;gap:.2rem .55rem}
    [data-exp="console"] .cn-activity-dot{width:.45rem;height:.45rem;border-radius:50%;background:var(--nb-accent);
      display:inline-block;flex:none}
    [data-exp="console"] .cn-activity-who{font-weight:700;color:var(--nb-ink)}
    [data-exp="console"] .cn-activity-reason{color:var(--nb-ink-dim);font-size:.9em}
    [data-exp="console"] .cn-activity-when{color:var(--nb-ink-faint);font-size:.85em;margin-inline-start:auto}
    [data-exp="console"] .cn-activity-subject{font-weight:700;margin-block-start:.15rem;color:var(--nb-ink)}
    [data-exp="console"] .cn-activity-body{margin:.15rem 0 0;color:var(--nb-ink-dim);max-width:76ch}
    [data-exp="console"] .cn-activity-foot{display:flex;flex-wrap:wrap;align-items:center;gap:.4rem .6rem;
      margin-block-start:.35rem}
    [data-exp="console"] .cn-activity-where{color:var(--nb-ink-faint);font-size:.85em}
    [data-exp="console"] .cn-activity-open,
    [data-exp="console"] .cn-activity-read{font:inherit;font-size:.85em;color:var(--nb-ink-dim);background:none;
      border:1px solid var(--nb-rule);border-radius:var(--nb-radius);min-height:1.7rem;padding:0 .5rem;cursor:pointer}
    [data-exp="console"] .cn-activity-open:hover,
    [data-exp="console"] .cn-activity-read:hover{color:var(--nb-ink);border-color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-activity-open{color:var(--nb-accent-ink);background:var(--nb-accent);border-color:var(--nb-accent)}
    [data-exp="console"] .cn-activity-hint{color:var(--nb-ink-faint);font-size:.85em;padding:.4rem .2rem 0}
    [data-exp="console"] .cn-activity-ctx{flex-wrap:wrap}
    [data-exp="console"] .cn-activity-filters{display:flex;flex-wrap:wrap;gap:.3rem;width:100%;margin-block-start:.25rem}
    [data-exp="console"] .cn-activity-filter{font:inherit;font-size:.85em;color:var(--nb-ink-dim);background:none;
      border:1px solid var(--nb-rule);border-radius:var(--nb-radius);min-height:1.7rem;padding:0 .55rem;
      cursor:pointer;display:inline-flex;align-items:center;gap:.35rem}
    [data-exp="console"] .cn-activity-filter[aria-pressed=true]{background:var(--nb-accent);color:var(--nb-accent-ink);
      border-color:var(--nb-accent)}
    [data-exp="console"] .cn-activity-count{font-size:.85em;opacity:.85}
    [data-exp="console"] .cn-activity-watching{display:flex;flex-wrap:wrap;align-items:center;gap:.3rem .45rem;
      width:100%;margin-block-start:.2rem}
    [data-exp="console"] .cn-activity-sub{font-size:.8em;color:var(--nb-ink-faint);border:1px solid var(--nb-rule);
      padding:0 .35rem;min-height:1.4rem;display:inline-flex;align-items:center}
    [data-exp="console"] .cn-activity-enable{font:inherit;font-size:.85em;color:var(--nb-accent-ink);
      background:var(--nb-accent);border:1px solid var(--nb-accent);border-radius:var(--nb-radius);
      min-height:1.7rem;padding:0 .55rem;cursor:pointer}

    /* Space hub: relay + workspace + subreddit */
    /* Terminal file editor (vim-like + pointer/touch) */
    [data-exp="console"] .nb-ed{
      display:grid;grid-template-rows:auto minmax(0,1fr) auto auto;height:100%;min-height:12rem;
      background:var(--nb-bg);border:1px solid var(--nb-rule);border-radius:var(--nb-radius);
      font:inherit;color:var(--nb-ink);outline:none;overflow:hidden}
    [data-exp="console"] .nb-ed:focus,[data-exp="console"] .nb-ed[data-focused=true]{
      box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--nb-accent) 45%,transparent)}
    [data-exp="console"] .nb-ed-chrome{
      display:flex;flex-wrap:wrap;align-items:baseline;gap:.35rem .65rem;
      padding:.3rem .55rem;border-block-end:1px solid var(--nb-rule);
      background:var(--nb-surface);font-size:.78em;color:var(--nb-ink-dim)}
    [data-exp="console"] .nb-ed-chrome-name{color:var(--nb-accent);font-weight:700}
    [data-exp="console"] .nb-ed-chrome-lang{color:var(--nb-agent);text-transform:lowercase}
    [data-exp="console"] .nb-ed-chrome-hint{margin-inline-start:auto;color:var(--nb-ink-faint);font-size:.92em}
    [data-exp="console"] .nb-ed-body{
      min-height:0;overflow:auto;padding:.25rem 0;touch-action:pan-y;cursor:text;
      user-select:none;-webkit-user-select:none}
    [data-exp="console"] .nb-ed-row{
      display:grid;grid-template-columns:auto minmax(0,1fr);gap:0;min-height:1.25em;
      line-height:1.35;padding:0}
    [data-exp="console"] .nb-ed-row-cur{background:color-mix(in srgb,var(--nb-surface) 70%,transparent)}
    [data-exp="console"] .nb-ed-gutter{
      min-width:2.6ch;padding:0 .45rem 0 .4rem;text-align:end;color:var(--nb-ink-faint);
      font-variant-numeric:tabular-nums;user-select:none;flex:none}
    [data-exp="console"] .nb-ed-line{white-space:pre;padding-inline-end:.5rem;min-width:0}
    [data-exp="console"] .nb-ed-ch{display:inline;white-space:pre}
    [data-exp="console"] .nb-ed-caret{
      background:var(--nb-accent);color:var(--nb-accent-ink);
      box-shadow:0 0 0 1px var(--nb-accent)}
    [data-exp="console"] .nb-ed[data-mode=insert] .nb-ed-caret{
      background:var(--nb-live);box-shadow:0 0 0 1px var(--nb-live)}
    [data-exp="console"] .nb-ed-sel{
      background:color-mix(in srgb,var(--nb-accent) 35%,var(--nb-surface));color:var(--nb-ink)}
    [data-exp="console"] .nb-ed-status{
      display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:.5rem;
      padding:.2rem .55rem;font-size:.78em;background:var(--nb-surface);
      border-block-start:1px solid var(--nb-rule);color:var(--nb-ink-dim)}
    [data-exp="console"] .nb-ed-status[data-mode=insert]{background:color-mix(in srgb,var(--nb-live) 18%,var(--nb-surface))}
    [data-exp="console"] .nb-ed-status[data-mode=visual]{background:color-mix(in srgb,var(--nb-warn) 18%,var(--nb-surface))}
    [data-exp="console"] .nb-ed-status-mode{font-weight:700;color:var(--nb-ink);letter-spacing:.04em}
    [data-exp="console"] .nb-ed-status-file{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    [data-exp="console"] .nb-ed-status-pos{font-variant-numeric:tabular-nums;color:var(--nb-ink-faint)}
    [data-exp="console"] .nb-ed-msg{
      padding:.15rem .55rem;font-size:.78em;color:var(--nb-ink-dim);
      border-block-start:1px solid var(--nb-rule)}
    [data-exp="console"] .nb-ed-msg[data-mode=insert]{color:var(--nb-live)}
    [data-exp="console"] .nb-ed-msg[data-mode=visual]{color:var(--nb-warn)}
    [data-exp="console"] .cn-blade[data-blade-kind=detail] .nb-ed{min-height:100%;border-radius:0;border:0}
    @media (pointer:coarse){
      [data-exp="console"] .nb-ed-row{min-height:1.55em}
      [data-exp="console"] .nb-ed-chrome-hint{display:none}
    }

    /* Vercel Eve agent cards (board + project .agents) */
    [data-exp="console"] .cn-agent-card{border:1px solid var(--nb-rule);background:var(--nb-surface);
      border-radius:var(--nb-radius);padding:.65rem .75rem;display:grid;gap:.4rem;max-width:48ch}
    [data-exp="console"] .cn-agent-head{display:flex;flex-wrap:wrap;align-items:baseline;gap:.4rem .6rem}
    [data-exp="console"] .cn-agent-lead{margin:0;color:var(--nb-ink-dim);font-size:.9em;max-width:76ch}
    [data-exp="console"] .cn-agent-section{display:grid;gap:.25rem;margin-block-start:.2rem}
    [data-exp="console"] .cn-agent-list{margin:0;padding-inline-start:1.1rem;color:var(--nb-ink);font-size:.9em}
    [data-exp="console"] .cn-agent-list code{color:var(--nb-agent)}
    [data-exp="console"] .cn-agent-md{margin:0;padding:.45rem .5rem;font:inherit;font-size:.85em;
      white-space:pre-wrap;color:var(--nb-ink);background:var(--nb-bg);border:1px solid var(--nb-rule);
      border-radius:var(--nb-radius);max-height:16rem;overflow:auto}
    [data-exp="console"] .cn-item[data-meta=eve] .cn-name{color:var(--nb-agent)}
    [data-exp="console"] .cn-space-card{border:1px solid var(--nb-rule);background:var(--nb-surface);
      padding:.7rem .8rem;display:grid;gap:.35rem;margin:.35rem .55rem}
    [data-exp="console"] .cn-space-card-head{display:flex;flex-wrap:wrap;align-items:baseline;gap:.4rem .6rem}
    [data-exp="console"] .cn-space-card-lead{margin:0;color:var(--nb-ink-dim);font-size:.9em;max-width:76ch}
    [data-exp="console"] .cn-space-card-note{margin:0;color:var(--nb-ink-faint);font-size:.85em}
    [data-exp="console"] .cn-space-card-foot{display:flex;flex-wrap:wrap;gap:.4rem;margin-block-start:.25rem}
    [data-exp="console"] .cn-space-pill{font-size:.75em;border:1px solid var(--nb-rule);padding:0 .35rem;
      color:var(--nb-ink-dim);min-height:1.3rem;display:inline-flex;align-items:center}
    [data-exp="console"] .cn-space-pill[data-status=connected]{border-color:var(--nb-live);color:var(--nb-live)}
    [data-exp="console"] .cn-space-pill[data-status=idle]{border-color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-space-pill[data-status=offline]{border-color:var(--nb-danger);color:var(--nb-danger)}
    [data-exp="console"] .cn-space-rules ul{margin:.2rem 0 0;padding-inline-start:1.1rem;color:var(--nb-ink-dim);
      font-size:.9em}
    [data-exp="console"] .cn-space-ctx{flex-wrap:wrap}
    [data-exp="console"] .cn-tree{padding:.15rem 0}
    @media (prefers-reduced-motion: no-preference){
      [data-exp="console"] [data-live=true]{animation:cn-arrive .45s cubic-bezier(.2,.8,.2,1) both}
      [data-exp="console"] .cn-comment[data-here=true]{animation:cn-ping-bg 1.2s ease-out 1}
      [data-exp="console"] .cn-badge{animation:cn-arrive .3s ease-out both}
    }
    @keyframes cn-arrive{from{opacity:0;translate:0 .5rem}to{opacity:1;translate:0 0}}
    @keyframes cn-ping-bg{0%{box-shadow:inset 0 0 0 0 transparent}
      40%{box-shadow:inset 3px 0 0 var(--nb-accent)}100%{box-shadow:inset 3px 0 0 var(--nb-accent)}}

    [data-exp="console"] .cn-comment{display:grid;grid-template-columns:auto auto minmax(0,1fr);
      gap:0 .45rem;padding:.4rem .7rem .35rem 0;align-items:start}
    [data-exp="console"] .cn-comment[data-here=true]{background:var(--nb-surface);
      box-shadow:inset 3px 0 0 var(--nb-accent)}
    [data-exp="console"] .cn-comment[data-state-of=promoted] .cn-comment-head [data-c=state]{color:var(--nb-accent)}
    [data-exp="console"] .cn-comment[data-kind=agent] [data-c=handle]{color:var(--nb-agent)}

    /* Nest lines: one column per ancestor depth. Hover brightens the bar so
       the level you would collapse is obvious before the click. */
    [data-exp="console"] .cn-rails{display:flex;align-self:stretch;flex:none}
    [data-exp="console"] .cn-rail{position:relative;width:.85rem;align-self:stretch;min-height:100%;
      background:none;border:0;padding:0;cursor:pointer;flex:none}
    [data-exp="console"] .cn-rail::after{content:"";position:absolute;inset-block:0;inset-inline-start:50%;
      width:2px;translate:-50% 0;background:var(--nb-rule);border-radius:1px}
    [data-exp="console"] .cn-rail:hover::after,
    [data-exp="console"] .cn-rail:focus-visible::after{background:var(--nb-accent);width:3px}
    [data-exp="console"] .cn-rail:focus-visible{outline:none}

    [data-exp="console"] .cn-vote{display:flex;flex-direction:column;align-items:center;gap:.05rem;
      min-width:1.6rem;padding-block-start:.05rem;user-select:none}
    [data-exp="console"] .cn-vup,[data-exp="console"] .cn-vdn{background:none;border:0;font:inherit;
      font-size:.7rem;line-height:1;color:var(--nb-ink-faint);cursor:pointer;padding:.1rem;
      min-width:1.4rem;min-height:1.2rem;border-radius:var(--nb-radius)}
    [data-exp="console"] .cn-vup:hover,[data-exp="console"] .cn-vdn:hover{color:var(--nb-ink);background:var(--nb-surface)}
    [data-exp="console"] .cn-vup[aria-pressed=true]{color:var(--nb-accent)}
    [data-exp="console"] .cn-vdn[aria-pressed=true]{color:var(--nb-agent)}
    [data-exp="console"] .cn-score{font-size:.78em;font-weight:700;font-variant-numeric:tabular-nums;
      color:var(--nb-ink-dim);line-height:1.2}
    [data-exp="console"] .cn-score[data-score=pos]{color:var(--nb-accent)}
    [data-exp="console"] .cn-score[data-score=neg]{color:var(--nb-agent)}

    [data-exp="console"] .cn-comment-main{min-width:0;padding-block-end:.15rem}
    [data-exp="console"] .cn-comment-head{display:flex;flex-wrap:wrap;align-items:baseline;gap:.15rem .55rem}
    [data-exp="console"] .cn-pm{background:var(--nb-surface);border:1px solid var(--nb-rule);font:inherit;
      font-size:.75em;font-weight:700;color:var(--nb-ink-dim);cursor:pointer;width:1.15rem;height:1.15rem;
      line-height:1;padding:0;border-radius:var(--nb-radius);flex:none}
    [data-exp="console"] .cn-pm:hover{color:var(--nb-ink);border-color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-pm-leaf{display:inline-flex;align-items:center;justify-content:center;
      border-color:transparent;background:none;color:var(--nb-ink-faint);cursor:default}
    [data-exp="console"] .cn-subject{display:block;margin-block-start:.2rem}
    [data-exp="console"] .cn-comment-body{margin:.15rem 0 0;max-width:76ch;color:var(--nb-ink)}

    /* Markdown + colourised ASCII (tables, code, marks) — theme via tokens. */
    [data-exp="console"] .nb-md{display:grid;gap:.4rem;max-width:80ch}
    [data-exp="console"] .nb-md-p{margin:0;line-height:1.45}
    [data-exp="console"] .nb-md-h{font-weight:700;letter-spacing:.02em;margin:0;color:var(--nb-ink)}
    [data-exp="console"] .nb-md-h1{font-size:1.1em;color:var(--nb-accent)}
    [data-exp="console"] .nb-md-h2{font-size:1.05em;color:var(--nb-signed)}
    [data-exp="console"] .nb-md-h3,[data-exp="console"] .nb-md-h4{font-size:1em;color:var(--nb-ink)}
    [data-exp="console"] .nb-md-strong{color:var(--nb-ink);font-weight:700}
    [data-exp="console"] .nb-md-em{color:var(--nb-ink-dim);font-style:italic}
    [data-exp="console"] .nb-md-del{color:var(--nb-ink-faint);text-decoration:line-through}
    [data-exp="console"] .nb-md-code,[data-exp="console"] .nb-md-codeblock{
      font:inherit;color:var(--nb-agent);background:var(--nb-surface);
      border:1px solid var(--nb-rule);padding:0 .3rem;border-radius:var(--nb-radius)}
    [data-exp="console"] .nb-md-pre{margin:0;padding:.4rem .5rem;overflow:auto;
      background:var(--nb-surface);border:1px solid var(--nb-rule);max-width:100%}
    [data-exp="console"] .nb-md-pre .nb-md-codeblock{border:0;background:transparent;padding:0;display:block;
      white-space:pre;color:var(--nb-agent)}
    [data-exp="console"] .nb-md-a{color:var(--nb-accent);text-decoration:underline;text-underline-offset:2px}
    [data-exp="console"] .nb-md-mention{color:var(--nb-accent);font-weight:700}
    [data-exp="console"] .nb-md-topic{color:var(--nb-signed);font-weight:700}
    /* Reusable ASCII link preview cards (generated summary, terminal frame). */
    [data-exp="console"] .nb-md-with-previews{display:grid;gap:.45rem;max-width:80ch}
    [data-exp="console"] .nb-link-previews{display:grid;gap:.35rem;margin-block-start:.15rem}
    [data-exp="console"] .nb-link-preview{
      margin:0;max-width:48ch;background:var(--nb-surface);border:1px solid var(--nb-rule);
      border-radius:var(--nb-radius);overflow:hidden}
    [data-exp="console"] .nb-link-preview-hit{
      display:block;width:100%;margin:0;padding:0;border:0;background:transparent;
      color:inherit;text-decoration:none;outline:none;text-align:start;cursor:pointer;
      font:inherit}
    [data-exp="console"] .nb-link-preview-hit:hover .nb-link-preview-title,
    [data-exp="console"] .nb-link-preview-hit:focus-visible .nb-link-preview-title{
      color:var(--nb-accent)}
    [data-exp="console"] .nb-link-preview-hit:focus-visible{
      box-shadow:inset 0 0 0 1px var(--nb-accent)}
    [data-exp="console"] .nb-link-preview-ascii{
      margin:0;padding:.35rem .5rem;font:inherit;line-height:1.3;white-space:pre;
      overflow:auto;color:var(--nb-ink)}
    [data-exp="console"] .nb-link-preview-rule{color:var(--nb-ink-faint)}
    [data-exp="console"] .nb-link-preview-title{color:var(--nb-ink);font-weight:700}
    [data-exp="console"] .nb-link-preview-desc{color:var(--nb-ink-dim)}
    [data-exp="console"] .nb-link-preview-url{color:var(--nb-accent)}
    [data-exp="console"] .nb-link-preview[data-kind="repo"] .nb-link-preview-rule{color:var(--nb-signed)}
    [data-exp="console"] .nb-link-preview[data-kind="docs"] .nb-link-preview-rule{color:var(--nb-agent)}
    [data-exp="console"] .nb-link-preview[data-kind="board"] .nb-link-preview-rule{color:var(--nb-live)}
    [data-exp="console"] .nb-link-preview[data-kind="identity"] .nb-link-preview-rule{color:var(--nb-accent)}
    [data-exp="console"] .cn-comment-body .nb-link-preview,
    [data-exp="console"] .cn-body .nb-link-preview{max-width:min(48ch,100%)}
    [data-exp="console"] .nb-md-quote{margin:0;padding:.2rem .6rem;border-inline-start:2px solid var(--nb-rule);
      color:var(--nb-ink-dim)}
    [data-exp="console"] .nb-md-ul,[data-exp="console"] .nb-md-ol{margin:0;padding-inline-start:1.2rem;
      color:var(--nb-ink)}
    [data-exp="console"] .nb-md-hr{color:var(--nb-ink-faint);white-space:pre;overflow:hidden;margin:0}
    [data-exp="console"] .nb-md-atable{margin:0;padding:.35rem .45rem;overflow:auto;font:inherit;
      line-height:1.35;background:var(--nb-surface);border:1px solid var(--nb-rule);max-width:100%;
      white-space:pre}
    [data-exp="console"] .nb-md-trule{color:var(--nb-ink-faint)}
    [data-exp="console"] .nb-md-tedge,[data-exp="console"] .nb-md-tsep{color:var(--nb-ink-faint)}
    [data-exp="console"] .nb-md-thead .nb-md-th{color:var(--nb-accent);font-weight:700}
    [data-exp="console"] .nb-md-td{color:var(--nb-ink)}
    [data-exp="console"] .nb-md-trow:nth-child(even of .nb-md-trow) .nb-md-td{color:var(--nb-ink-dim)}
    [data-exp="console"] .nb-md-box{color:var(--nb-ink-faint)}
    [data-exp="console"] .nb-md-block{color:var(--nb-live)}
    [data-exp="console"] .nb-md-sigil{color:var(--nb-signed)}
    [data-exp="console"] .nb-md-ascii{white-space:pre-wrap}
    [data-exp="console"] .nb-md-plain{margin:0;font:inherit;white-space:pre-wrap;color:var(--nb-ink)}
    [data-exp="console"] .cn-banner .nb-md-box{color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-banner .nb-md-block{color:var(--nb-live)}
    [data-exp="console"] .cn-body .nb-md,[data-exp="console"] .cn-comment-body .nb-md{max-width:76ch}
    [data-exp="console"] .cn-tool-result .nb-md,[data-exp="console"] .cn-tool-args .nb-md{font-size:.95em}
    [data-exp="console"] .cn-actions{display:flex;flex-wrap:wrap;gap:.15rem .55rem;margin-block-start:.3rem}
    /* GitHub/Slack-style reaction pills */
    [data-exp="console"] .cn-reacts{display:flex;flex-wrap:wrap;align-items:center;gap:.3rem;
      margin-block-start:.4rem;position:relative}
    [data-exp="console"] .cn-react-pill{
      display:inline-flex;align-items:center;gap:.3rem;font:inherit;font-size:.8em;
      color:var(--nb-ink-dim);background:var(--nb-surface);border:1px solid var(--nb-rule);
      border-radius:999px;min-height:1.7rem;padding:0 .5rem;cursor:pointer}
    [data-exp="console"] .cn-react-pill:hover{border-color:var(--nb-ink-faint);color:var(--nb-ink)}
    [data-exp="console"] .cn-react-pill[aria-pressed=true]{
      border-color:var(--nb-accent);color:var(--nb-ink);background:color-mix(in srgb,var(--nb-accent) 14%,var(--nb-surface))}
    [data-exp="console"] .cn-react-emoji{line-height:1;font-size:1.05em}
    [data-exp="console"] .cn-react-count{font-weight:700;font-variant-numeric:tabular-nums}
    [data-exp="console"] .cn-react-add{
      font:inherit;font-size:.9em;font-weight:700;color:var(--nb-ink-faint);background:none;
      border:1px dashed var(--nb-rule);border-radius:999px;min-width:1.7rem;min-height:1.7rem;
      padding:0 .4rem;cursor:pointer}
    [data-exp="console"] .cn-react-add:hover,[data-exp="console"] .cn-react-add[aria-expanded=true]{
      color:var(--nb-ink);border-color:var(--nb-ink-faint);border-style:solid}
    [data-exp="console"] .cn-react-picker{
      position:absolute;z-index:5;left:0;bottom:calc(100% + .25rem);
      display:none;flex-wrap:wrap;gap:.2rem;padding:.35rem;
      background:var(--nb-surface);border:1px solid var(--nb-rule);
      box-shadow:0 8px 24px color-mix(in srgb,var(--nb-bg) 70%,#000);max-width:16rem}
    [data-exp="console"] .cn-react-picker[data-open=true]{display:flex}
    [data-exp="console"] .cn-react-opt{
      display:inline-flex;flex-direction:column;align-items:center;gap:.1rem;
      font:inherit;font-size:1.15em;background:none;border:1px solid transparent;
      border-radius:var(--nb-radius);min-width:2.2rem;min-height:2.2rem;padding:.15rem;cursor:pointer;
      color:var(--nb-ink)}
    [data-exp="console"] .cn-react-opt:hover{border-color:var(--nb-rule);background:var(--nb-bg)}
    [data-exp="console"] .cn-react-opt[aria-pressed=true]{border-color:var(--nb-accent)}
    [data-exp="console"] .cn-react-opt-label{font-size:.55em;color:var(--nb-ink-faint);font-weight:700;
      text-transform:lowercase;letter-spacing:.02em}
    [data-exp="console"] .cn-act{background:none;border:0;font:inherit;font-size:.8em;font-weight:700;
      color:var(--nb-ink-faint);cursor:pointer;padding:.1rem .2rem;border-radius:var(--nb-radius);
      text-transform:lowercase}
    [data-exp="console"] .cn-act:hover{color:var(--nb-ink);background:var(--nb-surface)}
    [data-exp="console"] .cn-act-fold{color:var(--nb-accent)}

    /* Children hang under the parent; rails continue the visual chain. */
    [data-exp="console"] .cn-replies{display:flex;flex-direction:column}

    /* What the channel is, before what it contains. One line of facts. */
    [data-exp="console"] .cn-ctx{display:flex;gap:.7rem;align-items:baseline;flex-wrap:wrap;
      padding:.45rem .8rem;border-block-end:1px solid var(--nb-rule);font-size:.9em}
    [data-exp="console"] .cn-ctx-name{color:var(--nb-ink)}
    [data-exp="console"] .cn-ctx-kind{color:var(--nb-ink-faint);border:1px solid var(--nb-rule);
      padding:0 .35rem;border-radius:var(--nb-radius);font-size:.85em}
    [data-exp="console"] .cn-ctx-fact{color:var(--nb-ink-faint)}

    [data-exp="console"] .cn-card{padding:.7rem .8rem}
    [data-exp="console"] .cn-fact{display:flex;gap:.7rem;padding:.15rem 0}
    [data-exp="console"] .cn-fact dt{color:var(--nb-ink-faint);min-width:4rem}
    [data-exp="console"] .cn-fact dd{margin:0}

    /* Terminal panel — VS Code panel chrome, nightboard ink.
       Title tab row, sash, dock/min/max actions, resizable body. */
    [data-exp="console"] .cn-panel{display:grid;grid-template-rows:auto auto minmax(0,1fr);
      min-height:0;min-width:0;background:var(--nb-bg);position:relative}
    [data-exp="console"] .cn-panel[data-dock="bottom"]{height:var(--nb-out-h,12rem);
      border-block-start:1px solid var(--nb-rule)}
    [data-exp="console"] .cn-panel[data-dock="right"]{width:var(--nb-out-w,28rem);height:auto;
      border-inline-start:1px solid var(--nb-rule);grid-template-columns:auto minmax(0,1fr);
      grid-template-rows:auto minmax(0,1fr)}
    [data-exp="console"] .cn-panel[data-dock="left"]{width:var(--nb-out-w,28rem);height:auto;
      border-inline-end:1px solid var(--nb-rule);grid-template-columns:minmax(0,1fr) auto;
      grid-template-rows:auto minmax(0,1fr)}
    [data-exp="console"] .cn-panel[data-dock="right"] .cn-split-row,
    [data-exp="console"] .cn-panel[data-dock="left"] .cn-split-row{cursor:col-resize;width:6px;height:auto;
      grid-row:1/-1}
    [data-exp="console"] .cn-panel[data-dock="right"] .cn-split-row{grid-column:1}
    [data-exp="console"] .cn-panel[data-dock="left"] .cn-split-row{grid-column:2}
    [data-exp="console"] .cn-panel[data-dock="right"] .cn-panel-head{grid-column:2;grid-row:1}
    [data-exp="console"] .cn-panel[data-dock="right"] .cn-panel-body{grid-column:2;grid-row:2;min-height:0}
    [data-exp="console"] .cn-panel[data-dock="left"] .cn-panel-head{grid-column:1;grid-row:1}
    [data-exp="console"] .cn-panel[data-dock="left"] .cn-panel-body{grid-column:1;grid-row:2;min-height:0}
    [data-exp="console"] .cn-panel[data-out-max="true"][data-dock="bottom"]{height:auto;min-height:0}
    [data-exp="console"] .cn-panel[data-out-max="true"][data-dock="right"],
    [data-exp="console"] .cn-panel[data-out-max="true"][data-dock="left"]{width:auto;min-width:0}
    [data-exp="console"] .cn-panel[data-out-min="true"]{height:auto!important;width:auto!important}
    [data-exp="console"] .cn-panel[data-out-min="true"] .cn-panel-body{display:none}
    [data-exp="console"] .cn-panel[data-out-min="true"] .cn-split-row{display:none}
    /* Side-docked + minimised collapses to the tab strip only — same affordance
       as bottom, without vertical writing-mode tricks that break hit targets. */
    [data-exp="console"] .cn-panel[data-out-min="true"][data-dock="right"],
    [data-exp="console"] .cn-panel[data-out-min="true"][data-dock="left"]{max-width:12rem}

    [data-exp="console"] .cn-panel-head{display:flex;align-items:center;gap:.35rem;min-height:1.9rem;
      padding:0 .35rem 0 .55rem;background:var(--nb-surface);border-block-end:1px solid var(--nb-rule)}
    [data-exp="console"] .cn-panel-tabs{display:flex;align-items:stretch;gap:0;min-width:0;flex:1;
      overflow-x:auto;scrollbar-width:thin}
    [data-exp="console"] .cn-panel-tab{background:none;border:0;border-block-end:2px solid transparent;
      font:inherit;font-size:.8em;color:var(--nb-ink-dim);cursor:pointer;padding:.35rem .55rem;
      min-height:1.9rem;white-space:nowrap;display:inline-flex;align-items:center;gap:.35rem}
    [data-exp="console"] .cn-panel-tab[aria-selected=true]{color:var(--nb-ink);
      border-block-end-color:var(--nb-accent);background:color-mix(in srgb,var(--nb-accent) 8%,transparent)}
    [data-exp="console"] .cn-panel-tab:hover{color:var(--nb-ink)}
    [data-exp="console"] .cn-tab-close{background:none;border:0;font:inherit;color:var(--nb-ink-faint);
      cursor:pointer;padding:0 .15rem;line-height:1;border-radius:var(--nb-radius)}
    [data-exp="console"] .cn-tab-close:hover{color:var(--nb-danger)}
    [data-exp="console"] .cn-tab-new{font-size:1em;letter-spacing:0;min-width:1.9rem;justify-content:center;
      color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-tab-new:hover{color:var(--nb-accent);border-block-end-color:transparent}
    [data-exp="console"] .cn-panel-actions{display:flex;align-items:center;gap:.15rem;margin-inline-start:auto;
      flex:none}
    [data-exp="console"] .cn-panel-act{background:none;border:1px solid transparent;font:inherit;
      color:var(--nb-ink-faint);cursor:pointer;min-width:1.55rem;min-height:1.55rem;padding:0;
      border-radius:var(--nb-radius);line-height:1}
    [data-exp="console"] .cn-panel-act:hover{color:var(--nb-ink);border-color:var(--nb-rule);background:var(--nb-bg)}
    [data-exp="console"] .cn-panel-act[aria-pressed=true]{color:var(--nb-accent);border-color:var(--nb-accent)}

    [data-exp="console"] .cn-panel-body{display:grid;grid-template-rows:minmax(0,1fr) auto;min-height:0;
      overflow:hidden}
    [data-exp="console"] .cn-prompt-stack{position:relative;min-width:0}
    [data-exp="console"] .cn-menu{position:absolute;inset-block-end:100%;inset-inline:0;
      max-height:14rem;overflow:auto;background:var(--nb-bg);border:1px solid var(--nb-rule);
      border-block-end:0;display:none;z-index:5}
    [data-exp="console"] .cn-panel[data-open=true] .cn-menu{display:block}
    [data-exp="console"] .cn-menu-head{padding:.3rem .8rem;font-size:.78em;color:var(--nb-ink-faint);
      border-block-end:1px solid var(--nb-rule);letter-spacing:.06em;text-transform:uppercase}

    /* Hotkey cheatsheet — Ctrl+Space overlay. */
    [data-exp="console"] .cn-help{position:absolute;inset:0;z-index:30;display:none;
      align-items:center;justify-content:center;padding:1rem;
      background:color-mix(in srgb,var(--nb-bg) 78%,transparent);backdrop-filter:blur(2px)}
    [data-exp="console"] .cn-help[data-open=true]{display:flex}
    [data-exp="console"] .cn-help-card{width:min(46rem,100%);max-height:min(82vh,38rem);overflow:auto;
      background:var(--nb-surface);border:1px solid var(--nb-rule);padding:.7rem .9rem 1rem;
      box-shadow:0 12px 40px color-mix(in srgb,var(--nb-bg) 80%,#000)}
    [data-exp="console"] .cn-help-head{display:flex;align-items:baseline;gap:.7rem;flex-wrap:wrap;
      margin-block-end:.4rem}
    [data-exp="console"] .cn-help-head b{color:var(--nb-ink);letter-spacing:.08em;font-size:.9em}
    [data-exp="console"] .cn-help-scope{color:var(--nb-accent);font-size:.78em;letter-spacing:.06em;
      text-transform:uppercase}
    [data-exp="console"] .cn-help-close{margin-inline-start:auto;background:none;border:1px solid var(--nb-rule);
      font:inherit;color:var(--nb-ink-faint);cursor:pointer;min-height:1.7rem;padding:0 .55rem;
      border-radius:var(--nb-radius)}
    [data-exp="console"] .cn-help-close:hover{color:var(--nb-ink);border-color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-help-chips{display:flex;flex-wrap:wrap;gap:.3rem;margin-block-end:.45rem}
    [data-exp="console"] .cn-help-chip{font-size:.75em;color:var(--nb-ink-dim);border:1px solid var(--nb-rule);
      background:var(--nb-bg);padding:.1rem .4rem;border-radius:var(--nb-radius);max-width:100%;
      overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    [data-exp="console"] .cn-help-lead{margin:0 0 .65rem;font-size:.82em;color:var(--nb-ink-faint);
      padding-block-end:.45rem;border-block-end:1px solid var(--nb-rule)}
    [data-exp="console"] .cn-help-empty{color:var(--nb-ink-faint);margin:0;padding:.4rem 0}
    [data-exp="console"] .cn-help-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(12.5rem,1fr));
      gap:.85rem 1.2rem}
    [data-exp="console"] .cn-help-group h3{margin:0 0 .35rem;font-size:.75em;font-weight:700;
      letter-spacing:.1em;text-transform:uppercase;color:var(--nb-accent)}
    [data-exp="console"] .cn-help-row{display:grid;grid-template-columns:minmax(0,7.5rem) minmax(0,1fr);
      gap:.45rem;align-items:baseline;padding:.12rem 0;font-size:.88em}
    [data-exp="console"] .cn-help-key{color:var(--nb-ink);font-variant-numeric:tabular-nums;
      white-space:nowrap}
    [data-exp="console"] .cn-help-key kbd{display:inline-block;border:1px solid var(--nb-rule);
      background:var(--nb-bg);padding:0 .28rem;margin-inline-end:.15rem;border-radius:var(--nb-radius);
      font:inherit;font-size:.85em;color:var(--nb-ink-dim)}
    [data-exp="console"] .cn-help-desc{color:var(--nb-ink-dim)}
    [data-exp="console"] .cn-cand{display:grid;grid-template-columns:minmax(0,14rem) minmax(0,1fr);gap:.8rem;
      padding:.18rem .8rem;cursor:pointer}
    [data-exp="console"] .cn-cand[aria-current=true]{background:var(--nb-accent);color:var(--nb-accent-ink)}
    [data-exp="console"] .cn-cand i{font-style:normal;color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-cand[aria-current=true] i{color:inherit;opacity:.8}
    [data-exp="console"] .cn-prompt{display:flex;align-items:center;gap:.4rem;padding:.35rem .8rem;
      border-block-start:1px solid var(--nb-rule);background:var(--nb-bg)}
    [data-exp="console"] .cn-prompt-stack[data-drop=true] .cn-prompt{
      box-shadow:inset 0 0 0 1px var(--nb-live)}
    [data-exp="console"] .cn-ps1{color:var(--nb-accent);white-space:nowrap}
    [data-exp="console"] .cn-mode{font:inherit;background:none;border:1px solid var(--nb-rule);
      color:var(--nb-ink-dim);cursor:pointer;padding:0 .5rem;min-height:1.7rem;border-radius:var(--nb-radius)}
    [data-exp="console"] .cn-mode[aria-pressed=true]{background:var(--nb-agent);color:var(--nb-bg);
      border-color:var(--nb-agent)}
    /* File attach for chat context — paperclip next to the prompt. */
    [data-exp="console"] .cn-attach{font:inherit;background:none;border:1px solid var(--nb-rule);
      color:var(--nb-ink-dim);cursor:pointer;padding:0 .45rem;min-height:1.7rem;min-width:1.7rem;
      border-radius:var(--nb-radius);line-height:1;flex:none}
    [data-exp="console"] .cn-attach:hover{color:var(--nb-ink);border-color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-attach[data-count]:not([data-count="0"]){
      color:var(--nb-accent);border-color:var(--nb-accent)}
    [data-exp="console"] .cn-attach-input{position:absolute;width:1px;height:1px;opacity:0;overflow:hidden;
      clip:rect(0,0,0,0);pointer-events:none}
    [data-exp="console"] .cn-attach-tray{display:flex;flex-wrap:wrap;align-items:center;gap:.35rem;
      padding:.3rem .8rem 0;border-block-start:1px solid var(--nb-rule);background:var(--nb-bg)}
    [data-exp="console"] .cn-attach-chip{
      display:inline-flex;align-items:center;gap:.3rem;font:inherit;font-size:.78em;
      color:var(--nb-ink-dim);background:var(--nb-surface);border:1px solid var(--nb-rule);
      border-radius:var(--nb-radius);padding:.15rem .35rem .15rem .45rem;max-width:100%;
      min-height:1.6rem}
    [data-exp="console"] .cn-attach-chip[data-kind=image]{border-color:var(--nb-signed)}
    [data-exp="console"] .cn-attach-chip[data-kind=text]{border-color:var(--nb-agent)}
    [data-exp="console"] .cn-attach-chip[data-error=true]{border-color:var(--nb-danger);color:var(--nb-danger)}
    [data-exp="console"] .cn-attach-chip-sent{padding-inline:.45rem;opacity:.9}
    [data-exp="console"] .cn-attach-thumb{width:1.2rem;height:1.2rem;object-fit:cover;border-radius:2px;
      border:1px solid var(--nb-rule);flex:none}
    [data-exp="console"] .cn-attach-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:18ch}
    [data-exp="console"] .cn-attach-rm{font:inherit;background:none;border:0;color:var(--nb-ink-faint);
      cursor:pointer;padding:0 .2rem;line-height:1;min-width:1.2rem;min-height:1.2rem}
    [data-exp="console"] .cn-attach-rm:hover{color:var(--nb-danger)}
    [data-exp="console"] .cn-attach-clear{font:inherit;font-size:.75em;background:none;border:0;
      color:var(--nb-ink-faint);cursor:pointer;text-decoration:underline;text-underline-offset:2px;
      padding:.1rem .2rem}
    [data-exp="console"] .cn-attach-sent{display:flex;flex-wrap:wrap;gap:.3rem;margin-block-start:.3rem}
    /* Speech-to-text mic: 16-bit pixelarticons glyph; only when SpeechRecognition exists. */
    [data-exp="console"] .cn-mic{font:inherit;background:none;border:1px solid var(--nb-rule);
      color:var(--nb-ink-dim);cursor:pointer;padding:0;min-height:1.7rem;min-width:1.7rem;
      border-radius:var(--nb-radius);line-height:0;flex:none;
      display:inline-flex;align-items:center;justify-content:center}
    [data-exp="console"] .cn-mic .nb-ico{width:16px;height:16px;display:block;
      image-rendering:pixelated;image-rendering:crisp-edges;flex:none}
    [data-exp="console"] .cn-mic:hover{color:var(--nb-ink);border-color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-mic[aria-pressed=true],
    [data-exp="console"] .cn-mic[data-listening=true]{background:var(--nb-danger);color:var(--nb-accent-ink);
      border-color:var(--nb-danger)}
    [data-exp="console"] .cn-prompt[data-speech=ptt],
    [data-exp="console"] .cn-prompt[data-speech=toggle]{box-shadow:inset 0 0 0 1px var(--nb-live)}
    [data-exp="console"] .cn-speech-tag{font-size:.72em;color:var(--nb-live);letter-spacing:.04em;
      text-transform:uppercase;white-space:nowrap;flex:none}
    /* Listening state is a solid live mark — no infinite pulse (contract forbids forever animations). */
    [data-exp="console"] .cn-mic[data-listening=true]{box-shadow:0 0 0 1px var(--nb-danger)}
    /* Transcript: one who-rail, one body column. Identity is the left edge;
       content never has to invent its own indent. */
    [data-exp="console"] .cn-out{min-height:0;overflow:auto;padding:.35rem .6rem .5rem;font-size:.9em}
    [data-exp="console"] .cn-out:empty::before{content:"ready.";color:var(--nb-ink-faint);padding:.2rem .2rem}
    [data-exp="console"] .cn-log{display:flex;flex-direction:column;gap:.15rem}
    [data-exp="console"] .cn-line{display:grid;grid-template-columns:3.6rem minmax(0,1fr);gap:.55rem;
      align-items:start;padding:.12rem 0}
    [data-exp="console"] .cn-line[data-kind=banner]{display:block;padding:.15rem 0 .35rem}
    [data-exp="console"] .cn-banner{margin:0;font:inherit;font-size:.85em;color:var(--nb-ink-faint);
      white-space:pre;overflow-x:auto;line-height:1.35}
    [data-exp="console"] .cn-who{text-align:end;font-size:.78em;font-weight:700;color:var(--nb-ink-faint);
      line-height:1.45;padding-block-start:.05rem;user-select:none;letter-spacing:.02em}
    [data-exp="console"] .cn-line[data-kind=user] .cn-who{color:var(--nb-accent)}
    [data-exp="console"] .cn-who[data-kind=agent],
    [data-exp="console"] .cn-line[data-kind=agent] .cn-who,
    [data-exp="console"] .cn-line[data-kind=tool] .cn-who{color:var(--nb-agent)}
    [data-exp="console"] .cn-line[data-kind=error] .cn-who{color:var(--nb-danger)}
    [data-exp="console"] .cn-body{min-width:0;color:var(--nb-ink);white-space:pre-wrap;overflow-wrap:anywhere;
      line-height:1.45}
    [data-exp="console"] .cn-line[data-kind=out] .cn-body,
    [data-exp="console"] .cn-line[data-kind=progress] .cn-body{color:var(--nb-ink-dim)}
    [data-exp="console"] .cn-line[data-kind=error] .cn-body{color:var(--nb-danger)}
    [data-exp="console"] .cn-mode-tag{display:inline-block;font-size:.75em;color:var(--nb-ink-faint);
      border:1px solid var(--nb-rule);padding:0 .3rem;margin-inline-end:.25rem;border-radius:var(--nb-radius);
      vertical-align:baseline;text-transform:lowercase}
    [data-exp="console"] .cn-line[data-kind=user] .cn-mode-tag[data-mode=ai],
    [data-exp="console"] .cn-mode-tag{/* mode chip is neutral; who-rail carries identity */}
    [data-exp="console"] .cn-tool-sum{display:flex;flex-wrap:wrap;align-items:baseline;gap:.35rem .55rem;
      width:100%;background:var(--nb-surface);border:1px solid var(--nb-rule);font:inherit;font-size:.9em;
      color:var(--nb-ink);cursor:pointer;text-align:start;padding:.2rem .45rem;border-radius:var(--nb-radius);
      min-height:1.7rem}
    [data-exp="console"] .cn-tool-sum:hover{border-color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-twist-mark{color:var(--nb-ink-faint);width:.8rem}
    [data-exp="console"] .cn-tool-name{color:var(--nb-agent);font-weight:700}
    [data-exp="console"] .cn-tool-mark{font-size:.78em;text-transform:lowercase;color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-tool-mark[data-ok=true]{color:var(--nb-live)}
    [data-exp="console"] .cn-tool-mark[data-ok=false]{color:var(--nb-danger)}
    [data-exp="console"] .cn-tool-brief{color:var(--nb-ink-dim);flex:1;min-width:0;
      overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    [data-exp="console"] .cn-tool-detail{margin-block-start:.3rem;padding:.4rem .5rem;background:var(--nb-surface);
      border:1px solid var(--nb-rule);border-radius:var(--nb-radius);color:var(--nb-ink-dim);font-size:.85em;
      display:grid;gap:.3rem}
    [data-exp="console"] .cn-tool-args{color:var(--nb-ink-faint);white-space:pre-wrap}
    [data-exp="console"] .cn-tool-result{color:var(--nb-ink);white-space:pre-wrap}
    [data-exp="console"] .cn-input-wrap{position:relative;flex:1;min-width:0}
    [data-exp="console"] .cn-ghost{position:absolute;inset:0;pointer-events:none;color:var(--nb-ink-faint);
      white-space:pre;overflow:hidden}
    [data-exp="console"] .cn-input{width:100%;background:transparent;border:0;color:var(--nb-ink);
      font:inherit;outline:0;position:relative}

    /* Touch is a peer, not an afterthought: every control clears the 32px floor
       wherever the pointer is coarse, which is also where the keyboard is not
       available to compensate. */
    @media (pointer:coarse),(max-width:900px){
      [data-exp="console"] .cn-item{min-height:2.5rem;padding-block:.4rem}
      [data-exp="console"] .cn-sort,[data-exp="console"] .cn-share{min-height:2.25rem;padding-inline:.75rem}
      [data-exp="console"] .cn-crumb{min-height:2.25rem;padding-inline:.45rem}
      [data-exp="console"] .cn-cand{min-height:2.5rem;align-items:center}
      [data-exp="console"] .cn-path{gap:.25rem}
      [data-exp="console"] .cn-panel-act,[data-exp="console"] .cn-pane-act{min-width:2.25rem;min-height:2.25rem}
      [data-exp="console"] .cn-panel-tab{min-height:2.25rem}
      [data-exp="console"] .cn-rail{width:1.1rem}
      [data-exp="console"] .cn-vup,[data-exp="console"] .cn-vdn,[data-exp="console"] .cn-pm{min-width:2rem;min-height:2rem}
      [data-exp="console"] .cn-act{min-height:2rem;padding-inline:.4rem}
    }`,

    render: function (state) {
      var extra = state.merged;
      var path = state.path || "/";
      var parts = MAP.split(path);
      var here = MAP.list(path, extra) || [];
      var cursor = Math.min(state.cursor || 0, Math.max(0, here.length - 1));
      var selected = here[cursor];
      var blades = buildBladeStack(state);
      // Focus maps onto a blade index; clamp if the stack shrank after a close.
      var focusBlade = Math.min(state.focus != null ? state.focus : blades.length - 2,
        blades.length - 1);

      var sort = state.sort || "hot";
      var votes = state.votes || {};
      var preview;
      var ctxLabel = null;
      var activityFilter = null;
      // Standing inside a notifications filter: Teams-style Activity feed.
      if (parts[0] === "notifications" && parts[1] &&
          (parts[1] === "all" || parts[1] === "mentions" || parts[1] === "subscribed" ||
           parts[1] === "hooks" || parts[1] === "hook")) {
        activityFilter = parts[1] === "hook" ? "hooks" : parts[1];
        var markNotif = selected && selected.notification
          ? selected.name
          : (selected && selected.name) || null;
        preview = viewNotifications(here, markNotif);
      } else if (selected && selected.kind === "dir") {
        var childPath = MAP.resolve(path, selected.name);
        var child = MAP.list(childPath, extra) || [];
        // Notifications filter dir selected from /notifications → show that feed.
        if (parts[0] === "notifications" && !parts[1] && selected &&
            (selected.name === "all" || selected.name === "mentions" ||
             selected.name === "subscribed" || selected.name === "hooks")) {
          activityFilter = selected.name;
          preview = viewNotifications(child, null);
        } else {
          preview = viewTree(child, null, state.folded, sort, votes,
            state.reactions, state.reactPick, state.feedQuery);
          if (!child.some(function (e) { return e.post; }) &&
              !child.some(function (e) { return e.notification; })) {
            // No posts — show the next listing as a dependent blade body.
            preview = bladeListHtml({
              path: childPath, entries: child, selected: null, index: blades.length - 1,
            }, false, "");
          }
          if (child.some(function (e) { return e.notification; })) {
            activityFilter = selected.name;
            preview = viewNotifications(child, null);
          }
        }
        // Selecting a channel under …/channels shows what it is before posts.
        if (parts[0] === "projects" && parts[2] === "channels" && !parts[3] && selected) {
          ctxLabel = selected.name;
        }
        // Selecting a DM under /dms shows who you are talking to before messages.
        if (parts[0] === "dms" && !parts[1] && selected) {
          ctxLabel = { dm: selected.name };
        }
      } else if (selected && selected.post) {
        // → into a post activates the terminal editor on the message body;
        // when the editor is not focused, keep the comment-tree reading view.
        var postPath = MAP.resolve(path, selected.name);
        var ed = state.editor;
        if (ed && ed.focused && ed.active && ed.active.path === postPath) {
          preview = viewFileEditor(selected, postPath, state);
        } else {
          preview = viewTree(here, selected.post.id, state.folded, sort, votes,
            state.reactions, state.reactPick, state.feedQuery);
        }
      } else if (selected && selected.notification) {
        preview = viewNotification(selected.notification,
          MAP.resolve(path, selected.name));
        if (parts[0] === "notifications" && parts[1]) activityFilter = parts[1];
      } else if (
        selected && (selected.openDm || selected.name) &&
        (parts[0] === "members" ||
          (parts[0] === "projects" && parts[2] === "members"))
      ) {
        // Board or project members roll: open pane is the DM (not a profile card).
        var dmPeer = selected.openDm || selected.name;
        var dmPath = MAP.dmPath ? MAP.dmPath(dmPeer) : ("/dms/" + dmPeer);
        var dmMsgs = MAP.list(dmPath, extra) || [];
        preview = dmMsgs.length
          ? viewTree(dmMsgs, null, state.folded, sort, votes,
            state.reactions, state.reactPick, state.feedQuery)
          : '<p class="cn-empty">No messages yet with @' + esc(dmPeer) +
            " — Enter opens the thread · send from the prompt.</p>";
        ctxLabel = { dm: dmPeer };
      } else if (selected && isEditableFile(selected)) {
        preview = viewFileEditor(selected, MAP.resolve(path, selected.name), state);
      } else if (selected && (selected.agent || selected.agentFile ||
          selected.agentSkill || selected.agentTool)) {
        preview = viewAgent(selected, MAP.resolve(path, selected.name));
      } else {
        preview = viewEntry(selected, MAP.resolve(path, selected ? selected.name : ""), state);
      }
      // Standing inside a channel keeps its context above the conversation.
      if (!ctxLabel && parts[0] === "projects" && parts[2] === "channels" && parts[3]) {
        ctxLabel = parts[3];
      }
      // Standing inside a DM thread keeps peer facts above the conversation.
      if (!ctxLabel && parts[0] === "dms" && parts[1]) {
        ctxLabel = { dm: parts[1] };
      }
      if (activityFilter) {
        preview = notificationsContextStrip(activityFilter, state) + preview;
      } else if (parts[0] === "notifications" && !parts[1]) {
        preview = notificationsContextStrip("all", state) + (preview || "");
      } else if (parts[0] === "spaces" && parts[1]) {
        preview = spaceContextStrip(parts[1], parts[2] || null) + (preview || "");
      } else if (ctxLabel) {
        if (ctxLabel.dm) preview = dmContextStrip(ctxLabel.dm, extra) + preview;
        else preview = contextStrip(ctxLabel, extra) + preview;
      }

      // Selecting a space from the catalogue: show about card in preview.
      if (parts[0] === "spaces" && !parts[1] && selected && selected.space) {
        preview = spaceContextStrip(selected.space.id, null) + viewSpaceAbout(selected.space,
          MAP.resolve(path, selected.name));
      }

      var crumbs = ['<button type="button" class="cn-crumb" data-goto="/">board</button>'];
      parts.forEach(function (seg, i) {
        crumbs.push('<span class="cn-sep">/</span>');
        crumbs.push('<button type="button" class="cn-crumb" data-goto="' +
          esc(MAP.join(parts.slice(0, i + 1))) + '">' + esc(seg) + "</button>");
      });

      // Feed views: Lucene-style projections, not just thumbs-up ranking.
      var presets = (window.NB_QUERY && window.NB_QUERY.presets)
        ? window.NB_QUERY.presets()
        : SORTS.map(function (s) { return { id: s, label: s, query: "sort:" + s }; });
      var activeView = state.feedView || sort || "hot";
      var qVal = state.feedQuery != null ? state.feedQuery : "";
      var views = '<div class="cn-feed-bar" data-key="feed-bar">' +
        '<div class="cn-feed-views" role="toolbar" aria-label="Feed views">' +
        presets.map(function (v) {
          return '<button type="button" class="cn-sort" data-feed-view="' + esc(v.id) + '"' +
            ' data-sort="' + esc(v.id) + '"' +
            ' title="' + esc(v.query || v.label) + '"' +
            (activeView === v.id ? ' aria-pressed="true"' : "") + ">" +
            esc(v.label) + "</button>";
        }).join("") +
        "</div>" +
        '<div class="cn-feed-query-row">' +
        '<label class="cn-feed-q-label" for="nb-feed-q">view</label>' +
        '<input id="nb-feed-q" class="cn-feed-query" data-feed-query data-morph-keep' +
        ' type="search" spellcheck="false" autocomplete="off"' +
        ' placeholder=\'state:needs-review who:maya sort:new\'' +
        ' value="' + esc(qVal) + '"' +
        ' aria-label="Lucene-style feed query" />' +
        '<button type="button" class="cn-feed-q-btn" data-feed-query-run title="Run query">run</button>' +
        '<button type="button" class="cn-feed-q-btn" data-feed-query-clear title="Clear view">clear</button>' +
        '<button type="button" class="cn-feed-q-btn" data-feed-query-help title="Query help">?</button>' +
        '<button type="button" class="cn-share" data-share title="Copy a share link for this place">share</button>' +
        "</div>" +
        (state.feedQueryError
          ? '<div class="cn-feed-err-line" data-key="feed-err">' + esc(state.feedQueryError) + "</div>"
          : "") +
        "</div>";

      var cand = state.completion || { candidates: [], ghost: "" };
      var intel = !!state.intelOpen;
      // Mirror app.menuShouldOpen: intel forces open; typing needs text + choice.
      var hasTyped = !!(cand.query || (cand.kind && cand.kind !== "command") || intel);
      var menuOpen = !!(cand.candidates.length && (intel || (cand.candidates.length > 1 && hasTyped)));
      // Empty command catalogue after Enter must not hang open without intel.
      if (!intel && cand.kind === "command" && !cand.query) menuOpen = false;
      // Slash catalogue: open while typing `/…` (agent chat intellisense).
      if (!intel && (cand.kind === "slash" || cand.kind === "slash-arg") && cand.candidates.length) {
        menuOpen = true;
      }
      // Smart markers: `@` mentions and `#` topics/channels open on first match.
      if (!intel && window.NB_COMPLETE && window.NB_COMPLETE.isMarkerKind &&
          window.NB_COMPLETE.isMarkerKind(cand.kind) && cand.candidates.length) {
        menuOpen = true;
      }
      var menuLabel = cand.kind === "mention" ? "Mentions"
        : cand.kind === "topic" || cand.kind === "channel" ? "Topics"
        : cand.kind || "";
      var menu = (menuOpen
        ? '<div class="cn-menu-head" data-key="menu-head">' +
          (intel ? "Intellisense" : "Suggestions") +
          (menuLabel ? " · " + esc(menuLabel) : "") + "</div>"
        : "") +
        cand.candidates.slice(0, 40).map(function (c, i) {
          return '<div class="cn-cand" data-cand="' + i + '"' +
            (c.kind ? ' data-cand-kind="' + esc(c.kind) + '"' : "") +
            (i === (state.candIndex || 0) ? ' aria-current="true"' : "") + ">" +
            "<span>" + esc(c.value) + "</span><i>" + esc(c.hint || "") + "</i></div>";
        }).join("");

      var panes = state.panes || {
        c0: 15, c1: 20, mc0: false, mc1: false,
        out: false, outH: 12, outW: 28, outMax: false, dock: "bottom", zoom: false,
      };
      var dock = panes.dock === "left" || panes.dock === "right" ? panes.dock : "bottom";
      var outH = (panes.outH || 12) + "rem";
      var outW = (panes.outW || 28) + "rem";
      var side = dock !== "bottom";
      var dockLabel = dock === "bottom" ? "Dock right" : dock === "right" ? "Dock left" : "Dock bottom";
      var dockGlyph = dock === "bottom" ? "▢" : dock === "right" ? "◧" : "◨";
      var outSplitOri = side ? "vertical" : "horizontal";
      var outSplitLabel = side
        ? "Resize terminal width — drag or arrow keys; Enter collapses"
        : "Resize terminal height — drag or arrow keys; Enter collapses";

      // Cascade: list blades for each path segment, then the detail blade.
      // When nav is collapsed, list blades become thin rails; detail expands.
      var navCollapsed = !!(panes.zoom || panes.navCollapsed);
      var bladeHtmls = blades.map(function (b) {
        if (b.kind === "detail") {
          return bladeHtml(b, focusBlade === b.index, preview, navCollapsed);
        }
        return bladeHtml(b, focusBlade === b.index,
          bladeListHtml(b, focusBlade === b.index, b.filter, state), navCollapsed);
      }).join("");

      // Structured lines only; HTML is produced here so app state stays data.
      // Bounded so a long session does not bloat the morph tree.
      var lines = (state.lines || []).slice(-80);
      var transcript = renderTranscript(lines, state.openTools || {});
      var sessions = state.sessions || [{ id: "1", path: path }];
      var activeSess = state.activeSession || 0;
      var tabs = sessions.map(function (sess, i) {
        var isSel = i === activeSess;
        return '<button type="button" class="cn-panel-tab" data-session="' + i + '"' +
          (isSel ? ' aria-selected="true"' : "") +
          ' title="Workspace ' + (i + 1) + " — " + esc(sess.path || "/") + '">' +
          esc(sessionTabLabel(sess, i)) +
          (sessions.length > 1
            ? '<span class="cn-tab-close" data-session-close="' + i +
              '" title="Close workspace" aria-label="Close workspace">×</span>'
            : "") +
          "</button>";
      }).join("") +
        '<button type="button" class="cn-panel-tab cn-tab-new" data-session-new' +
        ' title="New isolated workspace at default home (Alt+T)"' +
        ' aria-label="New isolated workspace">+</button>';
      return (
        '<div class="cn-path" data-key="path">' + crumbs.join("") +
        '<div class="cn-views">' + views + "</div></div>" +
        '<div class="cn-blades cn-cols" data-key="blades" data-zoom="' + !!navCollapsed +
        '" data-nav-collapsed="' + (navCollapsed ? "true" : "false") +
        '" role="group" aria-label="Navigation blades">' +
        bladeHtmls +
        "</div>" +
        '<div class="cn-panel" data-key="panel" data-dock="' + dock +
        '" data-out-min="' + !!panes.out + '" data-out-max="' + !!panes.outMax +
        '" data-open="' + menuOpen +
        '" style="--nb-out-h:' + outH + ";--nb-out-w:" + outW + '">' +
        '<div class="cn-split cn-split-row" data-split="out" data-closed="' + !!panes.out +
        '" role="separator" aria-orientation="' + outSplitOri + '" tabindex="0" data-key="split-out"' +
        ' aria-label="' + outSplitLabel + '"></div>' +
        '<div class="cn-panel-head" data-key="panel-head">' +
        '<div class="cn-panel-tabs" role="tablist" aria-label="Terminal workspaces">' + tabs + "</div>" +
        '<div class="cn-panel-actions">' +
        '<button type="button" class="cn-panel-act" data-panel-dock title="' + dockLabel +
        ' (Alt+D)" aria-label="' + dockLabel + '">' + dockGlyph + "</button>" +
        '<button type="button" class="cn-panel-act" data-panel-max title="Maximize panel (Alt+M)"' +
        ' aria-label="Maximize panel" aria-pressed="' + !!panes.outMax + '">' +
        (panes.outMax ? "▣" : "□") + "</button>" +
        '<button type="button" class="cn-panel-act" data-panel-min title="Minimize panel (Alt+J)"' +
        ' aria-label="Minimize panel" aria-pressed="' + !!panes.out + '">—</button>' +
        "</div></div>" +
        '<div class="cn-panel-body" data-key="panel-body">' +
        '<div class="cn-out" data-key="out">' + transcript + "</div>" +
        '<div class="cn-prompt-stack" data-key="prompt-stack" data-drop="' +
        (state.attachDrop ? "true" : "false") + '">' +
        '<div class="cn-menu" data-key="menu">' + menu + "</div>" +
        renderAttachTray(state.attachments || []) +
        '<div class="cn-prompt" data-key="prompt" data-speech="' +
        (state.speech && state.speech.listening ? esc(state.speech.mode || "on") : "off") + '"' +
        ' data-attach-count="' + ((state.attachments || []).length) + '">' +
        '<button type="button" class="cn-mode" data-mode-toggle aria-pressed="' + (state.ai ? "true" : "false") +
        '" title="Alt+A — in AI mode your words are interpreted before they run">' +
        (state.ai ? "ai" : "cli") + "</button>" +
        '<span class="cn-ps1">' + esc(path) + (state.ai ? " ›" : " $") + "</span>" +
        '<span class="cn-input-wrap"><span class="cn-ghost" data-ghost></span>' +
        '<input class="cn-input" data-cli data-morph-keep autocomplete="off" spellcheck="false" aria-label="Command"></span>' +
        '<button type="button" class="cn-attach" data-attach-pick' +
        ' data-count="' + ((state.attachments || []).length) + '"' +
        ' title="Attach files for chat context — click, drop, or paste" aria-label="Attach files">' +
        (((state.attachments || []).length) ? String((state.attachments || []).length) : "+") +
        "</button>" +
        '<input type="file" class="cn-attach-input" data-attach-input data-morph-keep multiple' +
        ' accept="*/*" tabindex="-1" aria-hidden="true" />' +
        // Mic only when the browser exposes SpeechRecognition — no dead control.
        (state.speech && state.speech.supported
          ? '<button type="button" class="cn-mic" data-speech-mic' +
            ' aria-pressed="' + (state.speech.listening ? "true" : "false") + '"' +
            ' data-listening="' + (state.speech.listening ? "true" : "false") + '"' +
            ' data-mode="' + esc(state.speech.mode || "") + '"' +
            ' aria-label="' + (state.speech.listening ? "Stop speech-to-text" : "Speech-to-text") + '"' +
            ' title="Speech-to-text — hold ` (push-to-talk) or Alt+V to toggle">' +
            (window.NB_ICONS && window.NB_ICONS.mic
              ? window.NB_ICONS.mic()
              : (state.speech.listening ? "●" : "mic")) +
            "</button>" +
            (state.speech.listening
              ? '<span class="cn-speech-tag" data-speech-tag>' +
                (state.speech.mode === "ptt" ? "ptt" : "dictation") + "</span>"
              : "")
          : "") +
        "</div></div></div></div>" +
        renderHelpOverlay(!!state.helpOpen, state.helpCtx || buildHelpContext(state))
      );
    },
  };

  window.NB_EXPERIENCES = [CONSOLE];
  window.NB_CONSOLE_VIEWS = { tree: viewTree, SORTS: SORTS };
  window.NB_TRANSCRIPT = { render: renderTranscript };
  window.NB_HELP = { buildContext: buildHelpContext, groups: HELP_GROUPS };
})();
