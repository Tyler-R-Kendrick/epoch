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
 *   ↑↓ / jk   entry         Tab    swap prompt ↔ panels (complete when suggestions open)
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
   * Terminal reaction marks — ASCII labels only (Discord-style keys, no emoji).
   * Typical set: +1, -1, eyes, rocket, heart, laugh, tada, thinking.
   */
  var REACTIONS = [
    { key: "+1", mark: "+1", label: "+1" },
    { key: "-1", mark: "-1", label: "-1" },
    { key: "eyes", mark: "eyes", label: "eyes" },
    { key: "rocket", mark: "rocket", label: "rocket" },
    { key: "heart", mark: "heart", label: "heart" },
    { key: "laugh", mark: "laugh", label: "laugh" },
    { key: "tada", mark: "tada", label: "hooray" },
    { key: "thinking", mark: "think", label: "thinking" },
  ];

  function reactionDef(key) {
    for (var i = 0; i < REACTIONS.length; i++) {
      if (REACTIONS[i].key === key) return REACTIONS[i];
    }
    return { key: key, mark: key, label: key };
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
    // Show reactions that have a count, or that I reacted with.
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
        '<span class="cn-react-mark">' + esc(r.mark) + "</span>" +
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
        '<span class="cn-react-mark">' + esc(def.mark) + "</span>" +
        '<span class="cn-react-count">' + n + "</span></button>"
      );
    });
    var picker = REACTIONS.map(function (r) {
      var me = !!st.mine[r.key];
      return '<button type="button" class="cn-react-opt" data-react="' + esc(r.key) + '"' +
        ' data-react-id="' + esc(postId) + '" aria-pressed="' + me + '"' +
        ' title="' + esc(r.label) + '">' +
        '<span class="cn-react-mark">' + esc(r.mark) + "</span></button>";
    }).join("");
    return '<div class="cn-reacts" data-key="react-' + esc(postId) + '">' +
      pills.join("") +
      '<button type="button" class="cn-react-add" data-react-pick="' + esc(postId) + '"' +
      ' aria-keyshortcuts="a"' +
      ' aria-expanded="' + !!pickOpen + '" title="Add reaction (a)" aria-label="Add reaction">+</button>' +
      '<div class="cn-react-picker" data-react-picker="' + esc(postId) + '"' +
      ' data-open="' + (pickOpen ? "true" : "false") + '"' +
      (pickOpen ? "" : " hidden") + ' role="menu" aria-label="Choose a reaction">' +
      picker +
      "</div></div>";
  }

  /* ── Tree (Reddit-style comment hierarchy) ─────────────────────────────── */

  var SORTS = ["hot", "new", "top", "best"];
  var DEFAULT_SORTS = ["hot", "new", "top"];

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

  function visibleFeedViews(state) {
    if (window.NB_QUERY && window.NB_QUERY.visibleViews) {
      return window.NB_QUERY.visibleViews(state && state.feedPinnedViews);
    }
    return DEFAULT_SORTS.map(function (s) {
      return { id: s, label: s, query: "sort:" + s };
    });
  }

  function availableFeedViews(state) {
    if (window.NB_QUERY && window.NB_QUERY.availableViews) {
      return window.NB_QUERY.availableViews(state && state.feedPinnedViews);
    }
    return [{ id: "best", label: "best", query: "sort:best" }];
  }

  /** Feed sort chips belong on channel / space feeds — not over every blade. */
  function isFeedSortContext(parts, selected) {
    parts = parts || [];
    if (parts[0] === "projects" && parts[2] === "channels" && parts[3]) return true;
    if (parts[0] === "spaces" && parts[2] === "channels" && parts[3]) return true;
    if (parts[0] === "spaces" && parts[2] === "feed") return true;
    if (parts[0] === "projects" && parts[2] === "channels" && !parts[3] && selected &&
        selected.kind === "channel" && !selected.voice) {
      return true;
    }
    if (parts[0] === "spaces" && parts[2] === "channels" && !parts[3] && selected &&
        selected.kind === "channel" && !selected.voice) {
      return true;
    }
    if (parts[0] === "spaces" && parts[1] && !parts[2] && selected && selected.name === "feed") {
      return true;
    }
    return false;
  }

  /** Post entries for detail — channels keep posts out of the navbar. */
  function detailFeedEntries(path, extra) {
    if (MAP.feedEntriesAt) return MAP.feedEntriesAt(path, extra) || [];
    return MAP.list(path, extra) || [];
  }

  /**
   * Navbar listing + selection for the current address. Terminal channel paths
   * still address the channel for compose/feed, but the list is the parent.
   */
  function navListing(state) {
    var path = (state && state.path) || "/";
    var extra = (state && state.merged) || [];
    var listPath = MAP.navParentPath ? MAP.navParentPath(path) : path;
    var here = MAP.list(listPath, extra) || [];
    var cursor = Math.min((state && state.cursor) || 0, Math.max(0, here.length - 1));
    var selected = here[cursor] || null;
    if (MAP.isTerminalNavPath && MAP.isTerminalNavPath(path)) {
      var leaf = MAP.split(path).pop();
      var ix = here.findIndex(function (e) { return e.name === leaf; });
      if (ix >= 0) {
        cursor = ix;
        selected = here[cursor];
      }
    }
    return { path: path, listPath: listPath, here: here, cursor: cursor, selected: selected };
  }

  /** Sticky new-posts queue — only when a channel/space feed is open in detail. */
  function feedNoticeHtml(state) {
    var open = window.NB_APP && typeof window.NB_APP.feedNoticeOpen === "function"
      ? window.NB_APP.feedNoticeOpen()
      : false;
    var n = state && state.pending ? state.pending.length : 0;
    if (!open || n < 1) return "";
    return '<button type="button" class="cn-feed-notice" data-c="notice" data-state="pending"' +
      ' data-merge data-key="feed-notice">' +
      '<span data-c="count">' + n + "</span> new " + (n === 1 ? "post" : "posts") +
      " — press R to load</button>";
  }

  function feedBarHtml(state, sort) {
    var pinned = state.feedPinnedViews || [];
    var views = visibleFeedViews(state);
    var available = availableFeedViews(state);
    var activeView = state.feedView || sort || "hot";
    var qVal = state.feedQuery != null ? state.feedQuery : "";
    var addOpen = !!state.feedAddOpen;
    var queryOpen = !!(state.feedQueryOpen || qVal || state.feedQueryError);
    var chips = views.map(function (v) {
      var isDefault = DEFAULT_SORTS.indexOf(v.id) >= 0;
      return '<button type="button" class="cn-sort" data-feed-view="' + esc(v.id) + '"' +
        ' data-sort="' + esc(v.id) + '"' +
        (isDefault ? "" : ' data-pinned="true"') +
        ' title="' + esc(v.query || v.label) + '"' +
        (activeView === v.id ? ' aria-pressed="true"' : "") + ">" +
        esc(v.label) + "</button>";
    }).join("");
    var addMenu = "";
    if (addOpen) {
      addMenu = '<div class="cn-feed-add-menu" role="menu" aria-label="Add feed view">' +
        (available.length
          ? available.map(function (v) {
            return '<button type="button" class="cn-feed-add-opt" role="menuitem"' +
              ' data-feed-pin="' + esc(v.id) + '" title="' + esc(v.query || v.label) + '">' +
              esc(v.label) + "</button>";
          }).join("")
          : '<span class="cn-feed-add-empty">all views pinned</span>') +
        (pinned.length
          ? '<div class="cn-feed-add-unpin">' +
            pinned.map(function (id) {
              return '<button type="button" class="cn-feed-add-opt" data-feed-unpin="' + esc(id) + '"' +
                ' title="Remove ' + esc(id) + ' from toolbar">− ' + esc(id) + "</button>";
            }).join("") + "</div>"
          : "") +
        "</div>";
    }
    var queryRow = "";
    if (queryOpen) {
      queryRow = '<div class="cn-feed-query-row" data-key="feed-query-row">' +
        '<label class="cn-feed-q-label" for="nb-feed-q">view</label>' +
        '<input id="nb-feed-q" class="cn-feed-query" data-feed-query data-morph-keep' +
        ' type="search" spellcheck="false" autocomplete="off"' +
        ' placeholder="field:value — try ? for examples"' +
        ' value="' + esc(qVal) + '"' +
        ' aria-label="Lucene-style feed query" />' +
        '<button type="button" class="cn-feed-q-btn" data-feed-query-run title="Run query">run</button>' +
        '<button type="button" class="cn-feed-q-btn" data-feed-query-clear title="Clear view">clear</button>' +
        '<button type="button" class="cn-feed-q-btn" data-feed-query-help title="Query help">?</button>' +
        "</div>";
    }
    return '<div class="cn-feed-bar" data-key="feed-bar">' +
      '<div class="cn-feed-views" role="toolbar" aria-label="Feed sort">' +
      chips +
      '<button type="button" class="cn-feed-add" data-feed-add' +
      ' aria-expanded="' + (addOpen ? "true" : "false") + '"' +
      ' title="Add feed view" aria-label="Add feed view">+</button>' +
      '<button type="button" class="cn-feed-view-toggle" data-feed-query-toggle' +
      ' aria-expanded="' + (queryOpen ? "true" : "false") + '"' +
      ' title="Lucene feed view query" aria-label="Toggle feed view query">' +
      (queryOpen ? "view−" : "view") + "</button>" +
      (queryOpen
        ? '<button type="button" class="cn-share" data-share title="Copy a share link for this place">share</button>'
        : "") +
      addMenu +
      "</div>" +
      queryRow +
      (state.feedQueryError
        ? '<div class="cn-feed-err-line" data-key="feed-err">' + esc(state.feedQueryError) + "</div>"
        : "") +
      "</div>";
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
  function viewTree(entries, markId, folded, sort, votes, reactions, reposts, reactPick, feedQuery, opts) {
    opts = opts || {};
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
    reposts = reposts || {};
    reactPick = reactPick || null;
    sort = SORTS.indexOf(sort) >= 0 ? sort : "hot";

    var byId = {}, kids = {}, roots = [];
    posts.forEach(function (p) { byId[p.id] = p; });
    posts.forEach(function (p) {
      if (p.re && byId[p.re]) (kids[p.re] = kids[p.re] || []).push(p);
      else roots.push(p);
    });

    // Thread detail: keep only the root conversation that contains threadOf.
    if (opts.threadOf && byId[opts.threadOf]) {
      var walk = byId[opts.threadOf];
      while (walk.re && byId[walk.re]) walk = byId[walk.re];
      roots = [walk];
      if (!markId) markId = opts.threadOf;
    }
    var keyboardId = markId || null;

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
      var reposted = !!reposts[p.id];
      var member = who(p.who);

      // Nest rails: one clickable │ per ancestor depth so you can collapse
      // any level of the chain by hitting its line (terminal tree, not pills).
      var rails = ancestors.map(function (anc) {
        return '<button type="button" class="cn-rail" data-fold="' + esc(anc.id) + '"' +
          ' title="Collapse thread" aria-label="Collapse thread by ' + esc(anc.who) + '">' +
          '<span class="cn-rail-mark" aria-hidden="true">|</span></button>';
      }).join("");

      var foldCtl = replies.length
        ? '<button type="button" class="cn-pm" data-fold="' + esc(p.id) + '"' +
          ' aria-keyshortcuts="f"' +
          ' aria-expanded="' + !isFolded + '" aria-label="' +
          (isFolded ? "Expand" : "Collapse") + ' replies" title="' +
          (isFolded ? "Expand" : "Collapse") + ' replies (f)">' +
          (isFolded ? "+" : "-") + "</button>"
        : '<span class="cn-pm cn-pm-leaf" aria-hidden="true"> </span>';

      var html = '<article class="cn-comment" data-key="' + esc(p.id) + '"' +
        ' role="article" tabindex="' + (p.id === keyboardId ? "0" : "-1") + '"' +
        ' aria-current="' + (p.id === keyboardId ? "true" : "false") + '"' +
        ' aria-label="Message by ' + esc(p.who) + ': ' +
          esc(String(p.subject || p.body || "").slice(0, 120)) + '"' +
        ' data-kind="' + esc(member.kind) + '" data-state-of="' + esc(p.state) + '"' +
        ' data-depth="' + depth + '"' +
        (p.id === keyboardId ? ' data-here="true"' : "") +
        (String(p.id).indexOf("live-") === 0 ? ' data-live="true"' : "") + ">" +
        '<div class="cn-rails" data-key="rails-' + esc(p.id) + '">' + rails + "</div>" +
        '<div class="cn-vote" data-key="vote-' + esc(p.id) + '">' +
        '<button type="button" class="cn-vup" data-vote="up" data-vote-id="' + esc(p.id) + '"' +
        ' aria-pressed="' + (myVote === 1) + '" aria-keyshortcuts="u" aria-label="Upvote">+</button>' +
        '<span class="cn-score" data-score="' + (sc > 0 ? "pos" : sc < 0 ? "neg" : "zero") + '">' +
        sc + "</span>" +
        '<button type="button" class="cn-vdn" data-vote="down" data-vote-id="' + esc(p.id) + '"' +
        ' aria-pressed="' + (myVote === -1) + '" aria-keyshortcuts="d" aria-label="Downvote">-</button>' +
        "</div>" +
        '<div class="cn-comment-main">' +
        '<header class="cn-comment-head">' +
        foldCtl +
        '<span data-c="actor"><b data-c="handle">' + esc(p.who) + "</b>" +
        '<span data-c="role">' + esc(member.role) + "</span></span>" +
        '<span class="cn-head-sep" aria-hidden="true">|</span>' +
        '<span data-c="meta"><time data-c="time">' + esc(p.at) + "</time>" +
        '<span class="cn-head-sep" aria-hidden="true">|</span>' +
        '<span data-c="state">' + esc(p.state) + "</span></span>" +
        "</header>" +
        (p.subject ? '<div class="cn-subject">' + esc(p.subject) + "</div>" : "") +
        '<div class="cn-comment-body">' + formatBody(p.body) + "</div>" +
        (p.anchor ? '<div data-c="anchor" class="cn-anchor">-&gt; ' + esc(p.anchor) + "</div>" : "") +
        '<div data-c="receipt" class="cn-receipt">' +
        '<span class="cn-sigil" aria-hidden="true">' + window.NB_ASCII.sigil(p.sig, 4) + "</span>" +
        '<span class="cn-sig-text">' + esc(p.sig) + "</span></div>" +
        '<div class="cn-actions">' +
        '<button type="button" class="cn-act" data-reply="' + esc(p.id) + '"' +
        ' data-reply-who="' + esc(p.who) + '" aria-keyshortcuts="r" title="Reply (r)">reply</button>' +
        '<button type="button" class="cn-act" data-repost="' + esc(p.id) + '"' +
        ' aria-pressed="' + reposted + '" aria-keyshortcuts="Shift+R" title="Repost (Shift+R)">' +
        (reposted ? "reposted" : "repost") + '</button>' +
        '<button type="button" class="cn-act" data-share data-share-post="' + esc(p.id) + '"' +
        ' aria-keyshortcuts="s" title="Share (s)">share</button>' +
        '<button type="button" class="cn-act" data-copy-post="' + esc(p.id) + '"' +
        ' aria-keyshortcuts="y" title="Copy this thread in an optimized paste format (y)">copy</button>' +
        (isFolded && below
          ? '<button type="button" class="cn-act cn-act-fold" data-fold="' + esc(p.id) + '">' +
            below + (below === 1 ? " more" : " more") + "</button>"
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
    if (!keyboardId && sortedRoots[0]) keyboardId = sortedRoots[0].id;
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
      '<div class="cn-tree" role="feed" aria-label="Channel messages" data-feed-sort="' + esc(sort) + '"' +
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

  /** Space connection detail — kept for deep links; not listed in the hub. */
  function viewRelay(space, relay) {
    space = space || {};
    relay = relay || space.relay || {};
    return '<div class="cn-space-card" data-key="conn-' + esc(space.id || "space") + '">' +
      '<header class="cn-space-card-head">' +
      '<b>' + esc(space.name || "Space") + "</b>" +
      '<span class="cn-space-pill" data-status="' + esc(relay.status || "idle") + '">' +
      esc(relay.status || "idle") + "</span>" +
      "</header>" +
      '<p class="cn-space-card-lead">' + esc(space.description || "Joined space.") + "</p>" +
      '<div class="cn-fact"><dt>access</dt><dd>' +
      (relay.write ? "read · write" : "read") + "</dd></div>" +
      "</div>";
  }

  /** About card for a space. */
  function viewSpaceAbout(space, path) {
    space = space || {};
    var rules = (space.rules || []).map(function (r) {
      return "<li>" + esc(r) + "</li>";
    }).join("");
    return '<div class="cn-space-card" data-key="about-' + esc(space.id || "space") + '">' +
      '<header class="cn-space-card-head">' +
      '<b>' + esc(space.slug || space.name || "space") + "</b>" +
      '<span class="cn-space-pill">' + esc(space.kind || "community") + "</span>" +
      "</header>" +
      '<p class="cn-space-card-lead">' + esc(space.description || "") + "</p>" +
      '<div class="cn-fact"><dt>name</dt><dd>' + esc(space.name || "") +
      (space.guestsAllowed === false ? " · members only" : " · guests ok") + "</dd></div>" +
      '<div class="cn-fact"><dt>members</dt><dd>' + (space.subscribers || 0) + "</dd></div>" +
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
    var feedN = window.NB_MAP && window.NB_MAP.postsForSpace
      ? window.NB_MAP.postsForSpace(space.id).length
      : 0;
    return '<div class="cn-ctx cn-space-ctx" data-key="ctx-space-' + esc(space.id) + '" data-space="true">' +
      '<b class="cn-ctx-name">' + esc(space.slug || space.name) + "</b>" +
      '<span class="cn-ctx-kind" data-kind="' + esc(space.kind || "community") + '">' +
      esc(space.kind || "space") + "</span>" +
      '<span class="cn-ctx-fact">' + (space.subscribers || 0) + " members</span>" +
      '<span class="cn-ctx-fact">' + feedN + " feed posts</span>" +
      (space.guestsAllowed === false
        ? '<span class="cn-badge">members</span>'
        : '<span class="cn-ctx-fact">guests ok</span>') +
      (leaf ? '<span class="cn-ctx-fact">' + esc(leaf) + "</span>" : "") +
      '<span class="cn-ctx-fact">' + esc(space.description || "").slice(0, 72) + "</span>" +
      "</div>";
  }

  /**
   * Activity / notifications feed for a filter blade.
   * Rows read as a log, not a card list.
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
    if (kind === "subscription") return "*";
    if (kind === "reply") return ">";
    if (kind === "dm") return "dm";
    if (kind === "hook") return "!";
    return ".";
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
        ? '<button type="button" class="cn-activity-read" data-notif-dismiss="' + esc(n.id) +
          '" data-notif-read="' + esc(n.id) +
          '" title="Dismiss (d) — clear from unread">Dismiss</button>'
        : "") +
      "</footer></div></article>";
  }

  function viewNotification(n, path) {
    return '<div class="cn-activity cn-activity-solo" data-key="notif-detail">' +
      notificationCard(n, path, true) +
      '<p class="cn-activity-hint">Open jumps to the source. Mentions of you and rooms you watch land here.</p>' +
      "</div>";
  }

  /**
   * Home feed in the detail pane when selection is closed — Following plus
   * announcements, featured projects, and featured creators. Each tab shows
   * an unread count. Following stays dense TUI rows; the other three use
   * showcase layouts (long-form ann, README summary, creator + chart).
   */
  function viewFollowingFeed(state) {
    var view = (state && state.homeFeed) || "following";
    var readSet = (state && state.homeFeedRead) || {};
    var dismissed = (state && state.homeFeedDismissed) || {};
    var annCollapsed = (state && state.homeAnnCollapsed) || {};
    var homeCursor = state && state.homeCursor != null ? state.homeCursor : 0;
    var followOpts = view === "following"
      ? {
        dismissed: dismissed,
        limit: state && state.homeFollowVisible != null ? state.homeFollowVisible : undefined,
      }
      : { dismissed: dismissed };
    var counts = MAP.homeFeedUnreadCounts
      ? MAP.homeFeedUnreadCounts(state && state.merged, readSet, { dismissed: dismissed })
      : {};
    var items = MAP.homeFeedItems
      ? MAP.homeFeedItems(view, state && state.merged, readSet, followOpts)
      : (MAP.followingStacks
        ? MAP.followingStacks(state && state.merged, readSet, dismissed)
        : (MAP.followingFeed ? MAP.followingFeed(state && state.merged) : []));
    if (homeCursor < 0) homeCursor = 0;
    if (items.length && homeCursor >= items.length) homeCursor = items.length - 1;
    var follows = MAP.followsList ? MAP.followsList() : ((D.follows) || []);
    var views = MAP.homeFeedViews ? MAP.homeFeedViews() : [
      { id: "following", label: "following" },
      { id: "announcements", label: "announcements" },
      { id: "featured", label: "featured" },
      { id: "creators", label: "creators" },
    ];
    var tabs = views.map(function (v) {
      var n = counts[v.id] || 0;
      var on = view === v.id;
      return '<button type="button" class="cn-home-tab" role="tab" data-home-feed="' + esc(v.id) + '"' +
        ' aria-selected="' + (on ? "true" : "false") + '"' +
        ' aria-pressed="' + (on ? "true" : "false") + '"' +
        ' tabindex="' + (on ? "0" : "-1") + '"' +
        ' title="' + esc(v.label) + (n ? " · " + n + " unread" : "") + '">' +
        esc(v.label) +
        '<span class="cn-home-unread" data-count="' + n + '"' +
        (n ? "" : " hidden") + ">" + n + "</span></button>";
    }).join("");

    var meta = "";
    if (view === "following") {
      var avail = MAP.homeFeedItems
        ? MAP.homeFeedItems("following", state && state.merged, readSet, {
          dismissed: dismissed,
          limit: undefined,
        }).length
        : items.length;
      meta = follows.length + " people · " + items.length + " showing" +
        (avail > items.length ? " · " + (avail - items.length) + " more" : "");
    } else if (view === "announcements") {
      meta = items.length + " announcements";
    } else if (view === "featured") {
      meta = items.length + " projects";
    } else if (view === "creators") {
      meta = items.length + " creators";
    }

    var rows;
    if (view === "announcements") {
      rows = items.map(function (it, i) {
        return renderAnnPost(it, annCollapsed, i === homeCursor);
      }).join("");
    } else if (view === "featured") {
      rows = items.map(function (it, i) {
        return renderFeatCard(it, i === homeCursor);
      }).join("");
    } else if (view === "creators") {
      rows = items.map(function (it, i) {
        return renderCreCard(it, i === homeCursor);
      }).join("");
    } else {
      rows = items.map(function (it, i) {
        return renderFollowStack(it, i === homeCursor, items.length, i);
      }).join("");
    }

    var empty = view === "following"
      ? (items.length ? "" : "Caught up — nobody you follow has more to show.")
      : view === "announcements" ? "No announcements."
        : view === "featured" ? "No featured projects."
          : "No featured creators.";
    var listRole = view === "following" ? "listbox" : "feed";
    var emptyHtml = (!items.length && empty)
      ? '<p class="cn-empty" data-follow-empty>' + esc(empty) + "</p>"
      : "";

    return '<div class="cn-follow-feed" data-key="following-feed" data-region="following"' +
      ' data-home-view="' + esc(view) + '">' +
      '<div class="cn-follow-banner" data-key="following-banner">' +
      '<div class="cn-home-tabs" role="tablist" aria-label="Home feed">' + tabs + "</div>" +
      '<span class="cn-follow-banner-meta">' + esc(meta) + "</span>" +
      "</div>" +
      '<div class="cn-follow-list" role="' + listRole + '" aria-label="Home feed">' +
      (rows || emptyHtml) +
      "</div></div>";
  }

  /** One identity card on the following stack — latest post face + dismiss/read. */
  function renderFollowStack(it, current, setSize, index) {
    var member = who(it.who);
    var kind = member.kind || it.kind || "post";
    var tags = "";
    if (it.re) tags += '<span class="cn-follow-tag">reply</span>';
    if (it.state) tags += '<span class="cn-follow-tag">' + esc(it.state) + "</span>";
    if (it.more) {
      tags += '<span class="cn-follow-more" title="' + it.more +
        ' older from @' + esc(it.who) + '">+' + it.more + "</span>";
    }
    var summary = it.summary || it.body || it.title || "";
    return '<article class="cn-follow-row" role="option"' +
      ' data-key="follow-' + esc(it.id) + '"' +
      ' data-follow-id="' + esc(it.id) + '" data-kind="' + esc(kind) + '"' +
      ' data-home-item="' + esc(it.id) + '"' +
      ' data-stack-who="' + esc(it.who) + '"' +
      (current ? ' data-home-cursor="true" aria-current="true"' : "") +
      ' data-unread="' + (it.unread ? "true" : "false") + '"' +
      ' aria-posinset="' + (index + 1) + '" aria-setsize="' + setSize + '"' +
      ' aria-selected="' + (current ? "true" : "false") + '"' +
      ' aria-label="' + esc("@" + it.who + " · " + summary) + '">' +
      '<header class="cn-follow-head">' +
      '<span class="cn-follow-who" data-c="handle">@' + esc(it.who) + "</span>" +
      '<time class="cn-follow-when">' + esc(it.at || "") + "</time>" +
      tags +
      "</header>" +
      '<p class="cn-follow-summary">' + esc(summary) + "</p>" +
      '<footer class="cn-follow-foot">' +
      '<span class="cn-follow-where">' + esc(it.whereLabel || "") + "</span>" +
      '<button type="button" class="cn-follow-open" data-follow-open="' + esc(it.id) + '"' +
      ' data-goto="' + esc(it.where || "/") + '">Open</button>' +
      (it.unread
        ? '<button type="button" class="cn-follow-read" data-follow-read="' + esc(it.id) +
          '" title="Mark read (m) — keep in stack, clear unread">Mark read</button>'
        : "") +
      '<button type="button" class="cn-follow-dismiss" data-follow-dismiss="' + esc(it.id) +
        '" title="Dismiss (d) — next post from this person fills in">Dismiss</button>' +
      "</footer></article>";
  }

  function renderAnnPost(it, collapsedMap, current) {
    var collapsed = !!(collapsedMap && collapsedMap[it.id]);
    var expanded = !collapsed;
    var member = who(it.who);
    var kind = member.kind || it.kind || "announcement";
    return '<article class="cn-ann-post" data-key="ann-' + esc(it.id) + '"' +
      ' data-home-item="' + esc(it.id) + '" data-ann-id="' + esc(it.id) + '"' +
      ' data-kind="' + esc(kind) + '"' +
      (current ? ' data-home-cursor="true" aria-current="true"' : "") +
      ' data-unread="' + (it.unread ? "true" : "false") + '"' +
      ' data-collapsed="' + (collapsed ? "true" : "false") + '">' +
      '<header class="cn-ann-head">' +
      '<button type="button" class="cn-ann-toggle" data-ann-toggle="' + esc(it.id) + '"' +
      ' aria-expanded="' + (expanded ? "true" : "false") + '"' +
      ' aria-controls="ann-body-' + esc(it.id) + '"' +
      ' title="' + (expanded ? "Collapse announcement" : "Expand announcement") + '">' +
      '<span class="cn-ann-chev" aria-hidden="true">' + (expanded ? "−" : "+") + "</span>" +
      '<time class="cn-follow-when">' + esc(it.at || "") + "</time>" +
      '<span class="cn-follow-who" data-c="handle">' + esc(it.who) + "</span>" +
      (it.pin ? '<span class="cn-ann-pin" title="Pinned">pin</span>' : "") +
      '<span class="cn-ann-title">' + esc(it.title || "") + "</span>" +
      "</button>" +
      '<button type="button" class="cn-home-open" data-goto="' + esc(it.where || "/") + '"' +
      ' data-follow-open="' + esc(it.id) + '"' +
      ' data-home-item="' + esc(it.id) + '"' +
      ' title="Open ' + esc(it.whereLabel || it.where || "") + '">' +
      '<span class="cn-follow-where">' + esc(it.whereLabel || "") + "</span>" +
      '<span class="cn-follow-open">open</span></button>' +
      "</header>" +
      '<div class="cn-ann-body" id="ann-body-' + esc(it.id) + '"' +
      (collapsed ? " hidden" : "") + ' data-c="body">' +
      formatBody(it.body || "") +
      "</div></article>";
  }

  function renderFeatCard(it, current) {
    var tags = "";
    if (it.stars != null) tags += '<span class="cn-follow-tag">' + esc(String(it.stars)) + "★</span>";
    if (it.language) tags += '<span class="cn-follow-tag">' + esc(it.language) + "</span>";
    var hasExcerpt = !!(it.readmeExcerpt);
    return '<article class="cn-feat-card" data-key="feat-' + esc(it.id) + '"' +
      ' data-home-item="' + esc(it.id) + '" data-kind="project"' +
      (current ? ' data-home-cursor="true" aria-current="true"' : "") +
      ' data-unread="' + (it.unread ? "true" : "false") + '">' +
      '<header class="cn-feat-head">' +
      '<span class="cn-feat-slug">' + esc(it.title || it.who || "") + "</span>" +
      tags +
      '<button type="button" class="cn-home-open" data-goto="' + esc(it.where || "/projects") + '"' +
      ' data-follow-open="' + esc(it.id) + '"' +
      ' data-home-item="' + esc(it.id) + '"' +
      ' title="Open project">' +
      '<span class="cn-follow-where">' + esc(it.whereLabel || "") + "</span>" +
      '<span class="cn-follow-open">open</span></button>' +
      "</header>" +
      (it.blurb ? '<p class="cn-feat-blurb">' + esc(it.blurb) + "</p>" : "") +
      (it.readmeSummary
        ? '<div class="cn-feat-summary">' +
          '<div class="cn-feat-label">readme summary</div>' +
          '<div class="cn-feat-summary-body" data-c="body">' + esc(it.readmeSummary) + "</div></div>"
        : "") +
      (hasExcerpt
        ? '<details class="cn-feat-readme">' +
          '<summary class="cn-feat-readme-sum">readme</summary>' +
          '<div class="cn-feat-readme-body" data-c="body">' + formatBody(it.readmeExcerpt) + "</div>" +
          "</details>"
        : "") +
      "</article>";
  }

  function contribChart(contrib) {
    var A = window.NB_ASCII;
    if (!A || !A.sparkline || !contrib) return "";
    var lines = [];
    var weeks = contrib.weeks;
    if (weeks && weeks.length) {
      lines.push("activity  " + A.sparkline(weeks, Math.min(12, weeks.length)) + "  " + weeks.length + "w");
    }
    if (contrib.commits && contrib.commits.length) {
      lines.push("commits   " + A.sparkline(contrib.commits, Math.min(12, contrib.commits.length)) +
        "  " + contrib.commits.length + "w");
    }
    if (contrib.reviews && contrib.reviews.length) {
      lines.push("reviews   " + A.sparkline(contrib.reviews, Math.min(12, contrib.reviews.length)) +
        "  " + contrib.reviews.length + "w");
    }
    if (!lines.length) return "";
    return '<pre class="cn-cre-chart" aria-label="Contribution history">' +
      esc(lines.join("\n")) + "</pre>";
  }

  function renderCreCard(it, current) {
    var member = who(it.who);
    var kind = member.kind || it.kind || "person";
    var chart = contribChart(it.contrib);
    return '<article class="cn-cre-card" data-key="cre-' + esc(it.id) + '"' +
      ' data-home-item="' + esc(it.id) + '" data-kind="' + esc(kind) + '"' +
      (current ? ' data-home-cursor="true" aria-current="true"' : "") +
      ' data-unread="' + (it.unread ? "true" : "false") + '">' +
      '<header class="cn-cre-head">' +
      '<span class="cn-follow-who" data-c="handle">' + esc(it.who) + "</span>" +
      (it.role ? '<span class="cn-follow-tag">' + esc(it.role) + "</span>" : "") +
      '<button type="button" class="cn-home-open" data-goto="' + esc(it.where || "/") + '"' +
      ' data-follow-open="' + esc(it.id) + '"' +
      ' data-home-item="' + esc(it.id) + '"' +
      ' title="Open ' + esc(it.whereLabel || it.who) + '">' +
      '<span class="cn-follow-where">' + esc(it.whereLabel || "") + "</span>" +
      '<span class="cn-follow-open">open</span></button>' +
      "</header>" +
      (it.blurb ? '<p class="cn-cre-why">' + esc(it.blurb) + "</p>" : "") +
      (it.bioSnippet
        ? '<p class="cn-cre-bio">' + esc(it.bioSnippet) + "</p>"
        : "") +
      chart +
      "</article>";
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
        (filter === f.id ? ' aria-pressed="true"' : ' aria-pressed="false"') + ">" +
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
    var browserChip = "";
    if (window.NB_NOTIFY && window.NB_NOTIFY.isSupported()) {
      if (browserPerm === "granted") {
        browserChip = '<span class="cn-ctx-fact" data-browser-perm="granted">alerts on</span>';
      } else if (browserPerm === "denied") {
        browserChip = '<details class="cn-activity-alerts" data-browser-perm="denied">' +
          "<summary>alerts blocked</summary>" +
          '<p class="cn-activity-alerts-how">Open the lock icon in the address bar → Site settings → Notifications → Allow.</p>' +
          "</details>";
      } else {
        browserChip = '<button type="button" class="cn-activity-enable" data-activity-perm-inline' +
          ' title="Enable browser notifications for mentions and subscriptions">Enable alerts</button>';
      }
    }
    var extras = "";
    if (watch || hookChips) {
      extras = '<details class="cn-activity-more">' +
        "<summary>watching · hooks</summary>" +
        (watch
          ? '<div class="cn-activity-watching" title="Subscriptions">' + watch + "</div>"
          : "") +
        (hookChips
          ? '<div class="cn-activity-hooks" title="Custom event hooks">' + hookChips +
            ' <button type="button" class="cn-activity-filter" data-goto="/notifications/hooks"' +
            ' title="Hook-fired activity">view</button></div>'
          : "") +
        "</details>";
    }
    return '<div class="cn-ctx cn-activity-ctx" data-key="ctx-notifications" data-activity="true">' +
      '<b class="cn-ctx-name">Activity</b>' +
      '<span class="cn-ctx-kind" data-kind="activity">notifications</span>' +
      '<span class="cn-ctx-fact">' + all.length + " items</span>" +
      (unread ? '<span class="cn-badge">' + unread + " new</span>" : "") +
      browserChip +
      '<div class="cn-activity-filters" role="toolbar" aria-label="Activity filters">' + chips + "</div>" +
      extras +
      "</div>";
  }

  /* ── Transcript ────────────────────────────────────────────────────────── */

  /**
   * Structured session chat. Fixed who-rail (you / agent / sys / error), turn
   * breaks before each new speaker, tools nested under the agent rail, mode
   * chips above the message body — so a long transcript stays scannable.
   */
  function renderTranscript(lines, openTools) {
    lines = lines || [];
    openTools = openTools || {};
    if (!lines.length) return "";
    var prevSpeak = null;
    return '<div class="cn-log" data-key="log">' + lines.map(function (line) {
      var id = line.id || "";
      var kind = line.kind || "out";
      if (kind === "banner") {
        prevSpeak = "banner";
        return '<div class="cn-line" data-kind="banner" data-key="' + esc(id) + '">' +
          '<pre class="cn-banner">' + formatAscii(line.text || "") + "</pre></div>";
      }

      var speak = kind === "user" ? "user"
        : (kind === "agent" || kind === "tool" || kind === "progress") ? "agent"
        : kind === "error" ? "error"
        : "sys";
      var turnStart = speak !== prevSpeak;
      // Always label people + prose; sys/error keep their rail every line.
      var showWho = turnStart || kind === "user" || kind === "agent" ||
        kind === "out" || kind === "error";
      prevSpeak = speak;

      if (kind === "tool") {
        var open = !!openTools[id];
        var mark = line.ok === false ? "failed" : line.ok === true ? "ok" : "…";
        return '<div class="cn-line" data-kind="tool" data-key="' + esc(id) + '"' +
          ' data-open="' + open + '"' +
          (turnStart ? ' data-turn="start"' : "") + ">" +
          '<span class="cn-who" data-kind="agent">' + (showWho ? "agent" : "") + "</span>" +
          '<div class="cn-body">' +
          '<button type="button" class="cn-tool-sum" data-tool-toggle="' + esc(id) + '"' +
          ' aria-expanded="' + open + '">' +
          '<span class="cn-twist-mark" aria-hidden="true">' + (open ? "v" : ">") + "</span>" +
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

      var whoRail = "";
      if (showWho) {
        whoRail = kind === "user" ? "you"
          : kind === "agent" ? "agent"
          : kind === "error" ? "error"
          : kind === "progress" ? "…"
          : "sys";
      }
      var whoKind = kind === "user" ? "person"
        : (kind === "agent" || kind === "progress") ? "agent"
        : "";

      var body;
      if (kind === "out" && line.format === "search" && line.html) {
        body = line.html;
      } else if (kind === "agent" || kind === "out" || kind === "error") {
        body = formatBody(line.text || "");
      } else {
        body = formatAscii(line.text || "");
      }
      var meta = "";
      if (kind === "user" && line.mode) {
        meta = '<span class="cn-mode-tag" data-mode="' + esc(line.mode) + '">' +
          esc(line.mode) + "</span>";
      }
      var msg = '<div class="cn-msg">' + body + "</div>";
      if (kind === "user" && line.attachments && line.attachments.length) {
        msg += '<div class="cn-attach-sent" aria-label="Attachments">' +
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
      return '<div class="cn-line" data-kind="' + esc(kind) + '" data-key="' + esc(id) + '"' +
        (turnStart ? ' data-turn="start"' : "") + ">" +
        '<span class="cn-who"' + (whoKind ? ' data-kind="' + whoKind + '"' : "") + ">" +
        esc(whoRail) + "</span>" +
        '<div class="cn-body">' + meta + msg + "</div></div>";
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

  /** Bound right-click context chips — listed above the prompt input by id/name. */
  function renderBoundContextTray(chips) {
    chips = chips || [];
    if (!chips.length) return "";
    var rows = chips.map(function (c, i) {
      var id = c.id || c.name || ("ctx-" + i);
      var name = c.name || id;
      var kind = c.kind || "ctx";
      var label = kind + ":" + name;
      return '<span class="cn-ctx-bound-chip" data-ctx-bound-chip' +
        ' data-ctx-id="' + esc(id) + '"' +
        ' data-ctx-name="' + esc(name) + '"' +
        ' data-ctx-kind="' + esc(kind) + '"' +
        ' title="' + esc(kind + " · " + id) + '">' +
        '<span class="cn-attach-label">' + esc(label) + "</span>" +
        '<button type="button" class="cn-attach-rm" data-ctx-bound-rm="' + esc(id) + '"' +
        ' aria-label="Remove context ' + esc(name) + '">×</button>' +
        "</span>";
    }).join("");
    return '<div class="cn-ctx-bound-tray cn-attach-tray" data-key="ctx-bound-tray" data-ctx-bound-tray' +
      ' role="list" aria-label="Context bound to next prompt">' +
      rows +
      '<button type="button" class="cn-attach-clear" data-ctx-bound-clear title="Clear bound context">clear</button>' +
      "</div>";
  }

  /**
   * Themed context menu (TTY chrome). Prompt… first, then ≤3 learned actions.
   */
  function renderContextMenu(menu) {
    if (!menu || !menu.open || !menu.target) return "";
    var t = menu.target;
    var actions = (menu.actions || []).slice(0, 3);
    var actionHtml = actions.map(function (a, i) {
      return '<button type="button" role="menuitem" class="cn-ctxmenu-item" data-ctx-action="' +
        esc(a.id || a.verb || String(i)) + '"' +
        ' data-ctx-verb="' + esc(a.verb || "") + '">' +
        esc(a.label || a.verb || "action") + "</button>";
    }).join("");
    var x = Number(menu.x) || 0;
    var y = Number(menu.y) || 0;
    return '<div class="cn-ctxmenu" data-key="ctx-menu" data-ctx-menu data-open="true" role="menu"' +
      ' aria-label="Context actions for ' + esc(t.name || t.id || "control") + '"' +
      ' style="left:' + x + "px;top:" + y + 'px">' +
      '<div class="cn-ctxmenu-head" data-key="ctx-head">' +
      '<span class="cn-ctxmenu-kind">' + esc(t.kind || "ctx") + "</span>" +
      '<span class="cn-ctxmenu-name">' + esc(t.name || t.id || "") + "</span>" +
      "</div>" +
      '<button type="button" role="menuitem" class="cn-ctxmenu-item cn-ctxmenu-prompt" data-ctx-prompt' +
      ' title="Bind this control into the agent prompt">Prompt…</button>' +
      (actionHtml
        ? '<div class="cn-ctxmenu-sep" role="separator" data-key="ctx-sep"></div>' + actionHtml
        : "") +
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
  /**
   * Resolve which interactive component currently owns the keyboard.
   * Frozen into helpCtx before Ctrl+Space steals focus into the prompt.
   */
  function resolveHelpComponent(state) {
    var editorOn = !!(state && state.editor && state.editor.focused &&
      state.editor.active);
    if (editorOn) return "editor";

    if (!(state && state.columnFocus)) return "prompt";

    var focusIdx = state.focus != null ? state.focus : 0;
    var onDetail = focusIdx >= 1;
    if (!onDetail) return "nav";

    if (state.detailOpen === false) return "following";

    var path = (state && state.path) || "/";
    var parts = MAP.split(path);
    if (parts[0] === "dms" && parts[1]) return "dm";
    if (parts[0] === "notifications") return "activity";

    var listing = navListing(state);
    var here = listing.here;
    var selected = listing.selected;
    var listPath = listing.listPath;
    var extra = (state && state.merged) || [];

    // File open in detail → editor keys (even before insert focus lands).
    if (selected && isEditableFile(selected)) return "editor";
    if (state.editor && state.editor.active && state.editor.active.path) {
      var ap = state.editor.active.path;
      if (ap === path || ap.indexOf(path + "/") === 0 ||
          (selected && MAP.resolve(listPath, selected.name) === ap)) {
        return "editor";
      }
    }

    if (state.threadFocus || state.feedMark) return "thread";
    if (selected && selected.post) return "thread";
    if (here.some(function (e) { return e.post; })) return "thread";
    if (selected && selected.kind === "channel" && !selected.voice) return "thread";
    if (selected && selected.kind === "dir") {
      var child = MAP.list(MAP.resolve(listPath, selected.name), extra) || [];
      if (child.some(function (e) { return e.post; })) return "thread";
    }
    // Channel address — posts live in detail, not nav.
    if ((parts[0] === "projects" || parts[0] === "spaces") &&
        parts[2] === "channels" && parts[3]) {
      var feed = detailFeedEntries(path, extra);
      if (feed.some(function (e) { return e.post; })) return "thread";
    }
    return "detail";
  }

  var HELP_CONTEXT_LABELS = {
    prompt: "prompt",
    nav: "navigation",
    editor: "file editor",
    thread: "thread",
    following: "following",
    dm: "messages",
    activity: "activity",
    detail: "detail",
  };

  function buildHelpContext(state) {
    var path = (state && state.path) || "/";
    var parts = MAP.split(path);
    var extra = (state && state.merged) || [];
    var listing = navListing(state);
    var here = listing.here;
    var selected = listing.selected;
    var listPath = listing.listPath;
    var postsHere = here.some(function (e) { return e.post; });
    var postsChild = false;
    if (selected && selected.kind === "dir") {
      var child = MAP.list(MAP.resolve(listPath, selected.name), extra) || [];
      postsChild = child.some(function (e) { return e.post; });
    }
    if (!postsHere && !postsChild &&
        (parts[0] === "projects" || parts[0] === "spaces") &&
        parts[2] === "channels" && parts[3]) {
      postsHere = detailFeedEntries(path, extra).some(function (e) { return e.post; });
    }
    if (!postsHere && selected && selected.kind === "channel" && !selected.voice) {
      postsChild = detailFeedEntries(MAP.resolve(listPath, selected.name), extra)
        .some(function (e) { return e.post; });
    }
    var panes = (state && state.panes) || {};
    var sessions = (state && state.sessions) || [];
    var focus = state && state.columnFocus ? "columns" : "prompt";
    var context = resolveHelpComponent(state);
    var pendingCount = state && state.pending ? state.pending.length : 0;
    var speechOn = !!(state && state.speech && state.speech.ready);
    var voiceOn = !!(state && state.voice && state.voice.joined);
    var editorMode = state && state.editor && state.editor.active
      ? (state.editor.active.mode || "normal")
      : null;
    var compose = null;
    try {
      if (window.NB_APP && typeof window.NB_APP.composeContext === "function") {
        compose = window.NB_APP.composeContext();
      }
    } catch { /* fine */ }
    return {
      context: context,
      contextLabel: HELP_CONTEXT_LABELS[context] || context,
      path: path,
      leaf: parts.length ? parts[parts.length - 1] : "board",
      focus: focus,
      focusBlade: state && state.focus != null ? state.focus : 0,
      ai: !!(state && state.ai),
      sort: (state && state.sort) || "hot",
      dock: "page",
      session: ((state && state.activeSession) || 0) + 1,
      sessions: Math.max(1, sessions.length),
      hasThread: postsHere || postsChild || !!(selected && selected.post) ||
        !!(state && (state.threadFocus || state.feedMark)),
      hasFilter: !!(state && state.filter),
      hasPending: pendingCount > 0,
      pendingCount: pendingCount,
      terminalMin: false,
      terminalMax: false,
      zoomed: Number.isInteger(panes.focusMax),
      speech: speechOn,
      speechListening: !!(state && state.speech && state.speech.listening),
      voiceIntent: (state && state.speech && state.speech.intent) || "default",
      voiceJoined: voiceOn,
      voiceMode: (state && state.voice && state.voice.inputMode) || "vad",
      detailOpen: !(state && state.detailOpen === false),
      editorMode: editorMode,
      fileName: state && state.editor && state.editor.active
        ? (state.editor.active.name || null)
        : (selected && isEditableFile(selected) ? selected.name : null),
      composeKind: compose && compose.kind ? compose.kind : null,
      dmPeer: parts[0] === "dms" ? parts[1] : null,
      surfaces: [context],
      onboard: !!(state && state.keysOnboard),
    };
  }

  /**
   * Cheatsheet catalogue — keys for the focused component only.
   * `contexts` lists which resolveHelpComponent() values show the group.
   */
  var HELP_GROUPS = [
    {
      id: "sheet",
      title: "this sheet",
      always: true,
      rows: [
        { keys: "esc", desc: "Close this sheet + intellisense" },
        { keys: "Ctrl+Space", desc: "Toggle cheatsheet for the focused component" },
      ],
    },
    {
      id: "states",
      title: "post states",
      always: true,
      rows: [
        { keys: "open", desc: "Default — still cooking" },
        { keys: "needs-review", desc: "Waiting on a maintainer (amber)" },
        { keys: "promoted", desc: "Raised in the channel (magenta)" },
        { keys: "signed", desc: "Cryptographic receipt (mint)" },
      ],
    },
    {
      id: "verbs",
      title: "verbs (shared)",
      always: true,
      rows: [
        { keys: "d", desc: "Dismiss — clear the current item from attention (home · Activity · notifications · DM alerts)" },
        { keys: "m", desc: "Mark read — keep visible, clear unread (home)" },
        { keys: "y", desc: "Yank / copy focused post, channel feed, or chat (optimized paste format)" },
        { keys: "esc", desc: "Leave / close the current surface (not dismiss)" },
        { keys: "Enter", desc: "Open / activate the current item" },
        { keys: "j k / ↑ ↓", desc: "Move within the focused list" },
      ],
    },
    {
      id: "prompt",
      title: "Prompt",
      contexts: ["prompt"],
      rows: [
        { keys: "Tab", desc: "Swap to panels — or complete / cycle candidates while suggestions are open (Shift+Tab cycles back)" },
        { keys: "Enter", desc: "Submit / run (never steals autocomplete)" },
        { keys: "↑ ↓", desc: "Candidates (menu open) or history" },
        { keys: "→ / End", desc: "Accept ghost text at caret end" },
        { keys: "/", desc: "Slash commands (agent chat)",
          when: function (ctx) { return ctx.ai; } },
        { keys: "@", desc: "Mention a person or agent" },
        { keys: "#", desc: "Trending topic or channel" },
        { keys: "Alt+A", desc: "Toggle ai / cli mode",
          note: function (ctx) { return ctx.ai ? "now: ai" : "now: cli"; } },
        { keys: "Alt+T", desc: "New isolated workspace" },
        { keys: "Alt+Z", desc: function (ctx) {
          return ctx.zoomed ? "Restore panel layout" : "Expand focused panel";
        } },
        { keys: "esc", desc: "Hand steering to navigation / detail" },
        { keys: "compose", desc: function (ctx) {
          if (ctx.composeKind === "reply") return "Armed reply — Enter posts under the parent";
          if (ctx.composeKind === "post") return "Channel post — Enter publishes";
          if (ctx.composeKind === "dm") return "DM — Enter sends to @" + (ctx.dmPeer || "peer");
          return "Nav scope — Enter runs AI/CLI in the current path";
        } },
        { keys: "Hold `", desc: "Push-to-talk speech-to-text",
          when: function (ctx) { return !!ctx.speech; } },
        { keys: "Alt+V", desc: "Toggle continuous listening",
          when: function (ctx) { return !!ctx.speech; },
          note: function (ctx) { return ctx.speechListening ? "listening" : "idle"; } },
        { keys: "Alt+Shift+V", desc: "Cycle voice mode (default / dictation / commands)",
          when: function (ctx) { return !!ctx.speech; },
          note: function (ctx) { return ctx.voiceIntent || "default"; } },
        { keys: "esc", desc: "Stop speech listening",
          when: function (ctx) { return !!ctx.speechListening; } },
        { keys: "Hold `", desc: "Voice push-to-talk (joined · PTT)",
          when: function (ctx) { return !!ctx.voiceJoined && ctx.voiceMode === "ptt"; } },
        { keys: "Ctrl+Shift+M", desc: "Mute / unmute channel voice",
          when: function (ctx) { return !!ctx.voiceJoined; } },
        { keys: "paperclip / drop", desc: "Attach files for chat context" },
        { keys: "/attach", desc: "open | list | clear attachments" },
        { keys: "/act", desc: "Context action — reply, channel, project, voice, share" },
        { keys: "/activity", desc: "Open Activity notifications" },
        { keys: "macro / skill", desc: "Define or run a saved prompt · agent · voice action" },
      ],
    },
    {
      id: "nav",
      title: "Navigation",
      contexts: ["nav"],
      rows: [
        { keys: "↑ ↓ / j k", desc: "Move within the nav list — detail previews the selection" },
        { keys: "← / h", desc: "Reload nav at parent path" },
        { keys: "→ / l", desc: "Slide into dir · open post thread · or text editor" },
        { keys: "Enter", desc: "Focus preview and activate (edit · reply · write · slide into dir)" },
        { keys: "double-click", desc: "Same as Enter — activate the preview" },
        { keys: "e", desc: "Open the terminal editor for the selected leaf" },
        { keys: "Space", desc: "Expand / collapse one level (dirs)" },
        { keys: "+ / −", desc: "Expand or collapse one level" },
        { keys: "Backspace / <<", desc: "Back to parent — reload nav",
          when: function (ctx) { return !ctx.hasFilter; } },
        { keys: "/", desc: "Filter the nav list" },
        { keys: "Backspace", desc: "Clear filter character",
          when: function (ctx) { return ctx.hasFilter; } },
        { keys: "esc", desc: "Clear filter",
          when: function (ctx) { return ctx.hasFilter; } },
        { keys: "esc", desc: "Leave columns → prompt",
          when: function (ctx) { return !ctx.hasFilter; } },
        { keys: "Tab", desc: "Swap to prompt" },
        { keys: "i or :", desc: "Focus the prompt" },
        { keys: "z / Alt+Z", desc: "Expand / restore focused panel" },
        { keys: "R", desc: "Load queued posts",
          when: function (ctx) { return ctx.hasPending; } },
        { keys: "T", desc: "Re-apply Grid theme" },
        { keys: "Alt+T", desc: "New isolated workspace" },
        { keys: "Ctrl+Shift+M", desc: "Mute / unmute channel voice",
          when: function (ctx) { return !!ctx.voiceJoined; } },
      ],
    },
    {
      id: "editor",
      title: "File editor",
      contexts: ["editor"],
      rows: [
        { keys: "i / a / o", desc: "Insert (before / after / new line)",
          when: function (ctx) { return !ctx.editorMode || ctx.editorMode === "normal"; } },
        { keys: "v", desc: "Visual select",
          when: function (ctx) { return !ctx.editorMode || ctx.editorMode === "normal"; } },
        { keys: "h j k l / arrows", desc: "Move caret" },
        { keys: "w / b", desc: "Word forward / back",
          when: function (ctx) { return !ctx.editorMode || ctx.editorMode === "normal"; } },
        { keys: "0 / $ / g / G", desc: "Line start / end · top / bottom",
          when: function (ctx) { return !ctx.editorMode || ctx.editorMode === "normal"; } },
        { keys: "x / d", desc: "Delete char / line (editor only — not the shared Dismiss verb)" },
        { keys: "u", desc: "Undo",
          when: function (ctx) { return !ctx.editorMode || ctx.editorMode === "normal"; } },
        { keys: "Ctrl+d / Ctrl+u", desc: "Page down / up",
          when: function (ctx) { return !ctx.editorMode || ctx.editorMode === "normal"; } },
        { keys: "esc", desc: "Insert/visual → normal" },
        { keys: "Enter", desc: "Newline (insert) or move down (normal)" },
        { keys: "click / tap", desc: "Place caret · double-click inserts" },
        { keys: "Shift+click / drag", desc: "Visual selection" },
        { keys: "←", desc: "Leave editor focus → navigation" },
        { keys: "i or :", desc: "Focus the prompt (from normal)" },
        { keys: "z / Alt+Z", desc: "Expand / restore focused panel" },
      ],
    },
    {
      id: "thread",
      title: "Thread",
      contexts: ["thread"],
      rows: [
        { keys: "f", desc: "Fold or expand the focused chain" },
        { keys: "nest rail", desc: "Collapse that depth" },
        { keys: "u / d", desc: "Upvote / downvote the focused post" },
        { keys: "a", desc: "Open reactions for the focused post" },
        { keys: "r / Shift+R", desc: "Reply / repost the focused post" },
        { keys: "s / y", desc: "Share link / copy the focused thread" },
        { keys: "j k / ↑ ↓", desc: "Previous / next visible message (roots and replies)" },
        { keys: "Home / End", desc: "First / last visible message" },
        { keys: "v", desc: "Cycle feed sort",
          note: function (ctx) { return "now: " + (ctx.sort || "hot"); } },
        { keys: "hot new top", desc: "Default sorts — pin more with [+]" },
        { keys: "esc", desc: "Leave thread → channel feed" },
        { keys: "Backspace", desc: "Same as esc — channel feed" },
        { keys: "← / h", desc: "Focus navigation (detail stays open)" },
        { keys: "i or :", desc: "Focus the prompt" },
        { keys: "e", desc: "Open the post in the terminal editor" },
        { keys: "z / Alt+Z", desc: "Expand / restore focused panel" },
      ],
    },
    {
      id: "dm",
      title: "Messages",
      contexts: ["dm"],
      rows: [
        { keys: "tabs", desc: "messages (default) · profile" },
        { keys: "f", desc: "Fold or expand the focused chain" },
        { keys: "u / d", desc: "Upvote / downvote the focused message" },
        { keys: "a", desc: "Open reactions for the focused message" },
        { keys: "r / Shift+R", desc: "Reply / repost the focused message" },
        { keys: "s / y", desc: "Share link / copy the focused thread" },
        { keys: "d", desc: "Dismiss — use in Activity for DM alerts (not leave thread)" },
        { keys: "i or :", desc: "Focus the prompt · Enter sends" },
        { keys: "esc", desc: "Leave selection → Following log" },
        { keys: "← / h", desc: "Focus navigation (detail stays open)" },
        { keys: "z / Alt+Z", desc: "Expand / restore focused panel" },
      ],
    },
    {
      id: "following",
      title: "Home feed",
      contexts: ["following"],
      rows: [
        { keys: "↑ ↓ / j k", desc: "Move between home-feed rows" },
        { keys: "Enter / → / l", desc: "Open the current row (mark read)" },
        { keys: "d", desc: "Dismiss — following: next post from that person fills in · other tabs: clear unread" },
        { keys: "m", desc: "Mark read — keep in stack, clear unread badge" },
        { keys: "[ ]", desc: "Cycle tabs · following · announcements · featured · creators" },
        { keys: "← / h", desc: "Focus the nav sidebar (from home)" },
        { keys: "i or :", desc: "Focus the prompt" },
        { keys: "esc", desc: "Leave columns → prompt" },
        { keys: "z / Alt+Z", desc: "Expand / restore focused panel" },
        { keys: "/", desc: "Filter the nav list (focus nav first)" },
      ],
    },
    {
      id: "activity",
      title: "Activity",
      contexts: ["activity"],
      rows: [
        { keys: "↑ ↓ / j k", desc: "Move between notifications (nav)" },
        { keys: "Enter / →", desc: "Open the selected notification" },
        { keys: "d", desc: "Dismiss — clear unread (same verb as home / DM alerts)" },
        { keys: "Open", desc: "Jump to source and mark read" },
        { keys: "Dismiss", desc: "Same as d — clear from unread without opening" },
        { keys: "filters", desc: "all · mentions · subscribed · hooks" },
        { keys: "esc", desc: "Leave selection → Following, or columns → prompt" },
        { keys: "i or :", desc: "Focus the prompt" },
        { keys: "← / h", desc: "Focus navigation / parent" },
      ],
    },
    {
      id: "detail",
      title: "Detail",
      contexts: ["detail"],
      rows: [
        { keys: "esc", desc: "Leave selection → Following log" },
        { keys: "Backspace", desc: "Same as esc — Following log" },
        { keys: "← / h", desc: "Focus navigation (detail stays open)" },
        { keys: "i or :", desc: "Focus the prompt" },
        { keys: "z / Alt+Z", desc: "Expand / restore focused panel" },
        { keys: "Enter / click", desc: "Follow links and actions in the pane" },
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

  function helpGroupMatches(g, ctx) {
    if (g.always) return true;
    if (g.when && !g.when(ctx)) return false;
    var want = g.contexts || (g.context ? [g.context] : null);
    if (!want || !want.length) {
      if (!g.surfaces || !g.surfaces.length) return true;
      return (g.surfaces || []).some(function (s) {
        return (ctx.surfaces || []).indexOf(s) >= 0;
      });
    }
    if (want.indexOf("*") >= 0) return true;
    return want.indexOf(ctx.context) >= 0;
  }

  function helpRowsForGroup(g, ctx, onboardOnly) {
    return (g.rows || []).filter(function (r) {
      if (r.when && !r.when(ctx)) return false;
      if (r.surfaces && !surfaceActive(r.surfaces, ctx.surfaces || [])) return false;
      // Onboard: keep the shared verbs that unlock the first channel read.
      if (onboardOnly && g.id === "verbs") {
        return /^(j k|Enter|esc)/i.test(String(r.keys || ""));
      }
      return true;
    });
  }

  function visibleHelpGroups(ctx) {
    ctx = ctx || {};
    // First-visit sheet: four keys to a first win — not the full encyclopaedia.
    // Drop Navigation + state colour table; the lead already teaches ↑↓ Enter R Tab Esc.
    var onboardOnly = ctx.onboard
      ? { sheet: true, verbs: true }
      : null;
    return HELP_GROUPS.filter(function (g) {
      if (onboardOnly && !onboardOnly[g.id]) return false;
      if (!helpGroupMatches(g, ctx)) return false;
      return helpRowsForGroup(g, ctx, onboardOnly).length > 0;
    }).map(function (g) {
      // Return trimmed row sets so render cannot re-inflate the encyclopaedia.
      return Object.assign({}, g, { rows: helpRowsForGroup(g, ctx, onboardOnly) });
    });
  }

  function helpRowDesc(row, ctx) {
    var d = typeof row.desc === "function" ? row.desc(ctx) : row.desc;
    var note = row.note ? (typeof row.note === "function" ? row.note(ctx) : row.note) : "";
    return note ? d + " · " + note : d;
  }

  function renderHelpOverlay(open, ctx) {
    ctx = ctx || {
      context: "prompt", contextLabel: "prompt",
      surfaces: ["prompt"], focus: "prompt", path: "/", leaf: "board",
      sessions: 1, session: 1, sort: "hot", dock: "page", ai: true,
      hasThread: false, hasFilter: false, hasPending: false,
      terminalMin: false, terminalMax: false, zoomed: false, intel: true,
    };
    // Stay on the frozen component context — do not invent extra surfaces.
    ctx = Object.assign({}, ctx, { intel: true });

    var matched = visibleHelpGroups(ctx);
    var groups = matched.map(function (g, gi) {
      // Rows already trimmed by visibleHelpGroups (including onboard predicates).
      var rows = (g.rows || []).map(function (r, ri) {
        return '<div class="cn-help-row" data-key="hr-' + gi + "-" + ri + '">' +
          '<span class="cn-help-key"><kbd>' + esc(r.keys) + "</kbd></span>" +
          '<span class="cn-help-desc">' + esc(helpRowDesc(r, ctx)) + "</span></div>";
      }).join("");
      if (!rows) return "";
      return '<section class="cn-help-group" data-key="hg-' + esc(g.id || String(gi)) + '"' +
        ' data-help-context="' + esc(g.id === "sheet" ? "sheet" : (ctx.context || "")) + '">' +
        "<h3>" + esc(g.title) + "</h3>" + rows + "</section>";
    }).filter(Boolean).join("");

    var label = ctx.onboard
      ? "first keys"
      : (ctx.contextLabel || HELP_CONTEXT_LABELS[ctx.context] || ctx.context || "prompt");
    var chips = [];
    chips.push(label);
    if (!ctx.onboard) {
      chips.push("ws " + (ctx.session || 1) + "/" + (ctx.sessions || 1));
      chips.push(ctx.path || "/");
      if (ctx.fileName) chips.push(ctx.fileName);
      if (ctx.editorMode) chips.push(ctx.editorMode);
      if (ctx.dmPeer) chips.push("@" + ctx.dmPeer);
      if (ctx.composeKind) chips.push(ctx.composeKind);
      if (ctx.hasFilter) chips.push("filter");
      if (ctx.pendingCount) chips.push(ctx.pendingCount + " pending");
      if (ctx.context === "prompt") chips.push(ctx.ai ? "ai" : "cli");
      if (ctx.speech && ctx.context === "prompt") {
        chips.push(ctx.speechListening ? "mic on" : "mic");
      }
    } else {
      chips.push("board");
    }

    var chipHtml = chips.map(function (c, i) {
      return '<span class="cn-help-chip" data-key="hc-' + i + '">' + esc(c) + "</span>";
    }).join("");

    return '<div class="cn-help" data-key="help" data-open="' + !!open + '"' +
      ' data-focus="' + esc(ctx.focus || "prompt") + '"' +
      ' data-context="' + esc(ctx.context || "prompt") + '"' +
      ' role="dialog" aria-modal="true"' +
      ' aria-label="Keyboard shortcuts for ' + esc(label) + '"' +
      (open ? "" : " hidden") + ">" +
      '<div class="cn-help-card" data-key="help-card">' +
      '<div class="cn-help-head">' +
      "<b>keys</b>" +
      '<span class="cn-help-scope">' + esc(label) + "</span>" +
      '<button type="button" class="cn-esc" data-help-close data-esc-dismiss' +
      ' title="Esc — close this sheet" aria-label="Close shortcuts (Esc)">esc</button>' +
      "</div>" +
      '<div class="cn-help-chips" data-key="help-chips">' + chipHtml + "</div>" +
      '<p class="cn-help-lead">' +
      (ctx.onboard
        ? "Keyboard is the default — <kbd>↑</kbd><kbd>↓</kbd> move, <kbd>Enter</kbd> open, " +
          "<kbd>R</kbd> load new posts, <kbd>Tab</kbd> prompt. " +
          '<kbd class="cn-esc-inline">esc</kbd> closes this sheet; Ctrl+Space opens full keys later.'
        : "Shortcuts for the focused component only. " +
          '<kbd class="cn-esc-inline">esc</kbd> closes this sheet, then whatever that component listens for.') +
      "</p>" +
      '<div class="cn-help-grid">' + (groups || '<p class="cn-help-empty">No shortcuts for this context.</p>') +
      "</div></div></div>";
  }

  /* ── Columns ───────────────────────────────────────────────────────────── */

  /** Activity per channel, bucketed, for the column sparkline. */
  function activityOf(entry, path) {
    if (entry.kind !== "dir" && entry.kind !== "channel") return null;
    var A = window.NB_ASCII;
    var full = MAP.resolve(path, entry.name);
    var live = (window.NB_APP && window.NB_APP.state && window.NB_APP.state.merged) || [];
    var kids = entry.kind === "channel"
      ? detailFeedEntries(full, live)
      : (MAP.list(full, live) || []);
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

  /** Discord-style voice dock — persists while joined, above the compose foot. */
  function renderVoiceDock(state) {
    var vs = state && state.voice;
    if (!vs || !vs.joined) return "";
    var peers = vs.peers || {};
    var ids = Object.keys(peers);
    var people = [{
      id: "self",
      handle: vs.handle || "you",
      speaking: !!vs.speaking,
      muted: !!vs.muted,
      self: true,
    }].concat(ids.map(function (id) {
      return {
        id: id,
        handle: peers[id].handle || id,
        speaking: !!peers[id].speaking,
        muted: !!peers[id].muted,
        self: false,
      };
    }));
    var roster = people.map(function (p) {
      return '<span class="cn-voice-user" data-speaking="' + !!p.speaking + '"' +
        ' data-muted="' + !!p.muted + '"' + (p.self ? ' data-self="true"' : "") + ">" +
        esc(p.handle) + (p.muted ? " · mute" : "") +
        (p.speaking ? " · talk" : "") + "</span>";
    }).join("");
    var rtt = vs.latencyMs != null ? (vs.latencyMs + " ms") : "…";
    return '<div class="cn-voice-dock" data-key="voice-dock" data-region="voice"' +
      ' data-channel="' + esc(vs.channelId || "") + '"' +
      ' data-input="' + esc(vs.inputMode || "vad") + '"' +
      ' role="region" aria-label="Channel voice">' +
      '<div class="cn-voice-dock-meta">' +
      '<b class="cn-voice-dock-name">voice/' + esc(vs.channelId || "room") + "</b>" +
      '<span class="cn-voice-rtt" title="WebRTC round-trip (candidate-pair)">' + esc(rtt) + "</span>" +
      '<span class="cn-voice-mode-tag">' + esc(vs.inputMode || "vad") + "</span>" +
      "</div>" +
      '<div class="cn-voice-roster" aria-label="In call">' + roster + "</div>" +
      '<div class="cn-voice-controls" role="toolbar" aria-label="Voice controls">' +
      '<button type="button" class="cn-voice-act" data-voice-mute aria-pressed="' + !!vs.muted + '"' +
      ' title="Mute" aria-label="' + (vs.muted ? "Unmute" : "Mute") + '">' +
      (vs.muted ? "unmute" : "mute") + "</button>" +
      '<button type="button" class="cn-voice-act" data-voice-deafen aria-pressed="' + !!vs.deafened + '"' +
      ' title="Deafen" aria-label="' + (vs.deafened ? "Undeafen" : "Deafen") + '">' +
      (vs.deafened ? "undeafen" : "deafen") + "</button>" +
      '<button type="button" class="cn-voice-act" data-voice-input="' +
      (vs.inputMode === "ptt" ? "vad" : "ptt") + '"' +
      ' title="Toggle VAD / push-to-talk" aria-label="Input mode ' + esc(vs.inputMode || "vad") + '">' +
      (vs.inputMode === "ptt" ? "vad" : "ptt") + "</button>" +
      '<button type="button" class="cn-voice-act cn-voice-leave" data-voice-leave' +
      ' title="Disconnect" aria-label="Leave voice">leave</button>' +
      "</div></div>";
  }

  /** Detail body for a voice channel when not yet using the dock-only view. */
  function renderVoiceRoom(chan, state) {
    var vs = state && state.voice;
    var inHere = vs && vs.joined && vs.channelId === chan.id;
    return '<div class="cn-voice-room" data-key="voice-room-' + esc(chan.id) + '">' +
      '<p class="cn-voice-lead">Low-latency channel voice — WebRTC mesh, Opus @ 48&nbsp;kHz / 20&nbsp;ms frames, ' +
      "VAD or push-to-talk. Open a second tab to prove peer audio.</p>" +
      (inHere
        ? '<p class="cn-voice-status">Connected' +
          (vs.latencyMs != null ? " · " + vs.latencyMs + " ms rtt" : "") +
          " · " + esc(vs.inputMode || "vad") + "</p>"
        : '<button type="button" class="cn-voice-act cn-voice-join" data-voice-join="' +
          esc(chan.id) + '" data-voice-path="/projects/community/channels/' + esc(chan.label) + '"' +
          ' aria-label="Join voice channel ' + esc(chan.label) + '">Join Voice</button>') +
      "</div>";
  }

  /** What a channel is, above what it contains. */
  function contextStrip(label, extra) {
    var chan = null;
    for (var i = 0; i < D.channels.length; i++) if (D.channels[i].label === label) chan = D.channels[i];
    if (!chan) return "";
    if (chan.voice || chan.kind === "voice") {
      var vs = (window.NB_APP && window.NB_APP.state && window.NB_APP.state.voice) || {};
      var inHere = vs.joined && vs.channelId === chan.id;
      var n = inHere ? (1 + (vs.peerCount || 0)) : 0;
      return '<div class="cn-ctx cn-voice-ctx" data-key="ctx-' + esc(label) + '" data-voice="true">' +
        '<b class="cn-ctx-name">voice/' + esc(label) + "</b>" +
        '<span class="cn-ctx-kind" data-kind="voice">voice</span>' +
        '<span class="cn-ctx-fact">Opus · 48 kHz · 20 ms</span>' +
        '<span class="cn-ctx-fact">' + (inHere ? n + " in call" : "empty") + "</span>" +
        (inHere && vs.latencyMs != null
          ? '<span class="cn-ctx-fact" data-voice-rtt>' + vs.latencyMs + " ms rtt</span>"
          : "") +
        (inHere
          ? '<button type="button" class="cn-voice-act" data-voice-leave title="Disconnect">Leave</button>'
          : '<button type="button" class="cn-voice-act cn-voice-join" data-voice-join="' +
            esc(chan.id) + '" data-voice-path="/projects/community/channels/' + esc(label) + '"' +
            ' title="Join low-latency voice">Join Voice</button>') +
        "</div>";
    }
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

  /** Thread detail chrome — one conversation, with a way back to the channel feed. */
  function threadContextStrip(channelLabel, focusId, rootWho) {
    return '<div class="cn-ctx cn-thread-ctx" data-key="ctx-thread" data-thread="true">' +
      '<b class="cn-ctx-name">thread</b>' +
      (channelLabel
        ? '<span class="cn-ctx-kind">#' + esc(channelLabel) + "</span>"
        : "") +
      (rootWho ? '<span class="cn-ctx-fact">from ' + esc(rootWho) + "</span>" : "") +
      (focusId ? '<span class="cn-ctx-fact" data-c="meta">' + esc(focusId) + "</span>" : "") +
      '<button type="button" class="cn-act" data-thread-back' +
      ' title="Back to channel feed (Esc)">back</button>' +
      "</div>";
  }

  /** What a DM thread is, above the conversation — sibling of channel context. */
  function dmContextStrip(peer, extra, state) {
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
    var pane = (state && state.personPane) === "profile" ? "profile" : "messages";
    var tabs = [
      { id: "messages", label: "messages" },
      { id: "profile", label: "profile" },
    ].map(function (t) {
      return '<button type="button" class="cn-person-tab" data-person-pane="' + esc(t.id) + '"' +
        ' aria-pressed="' + (pane === t.id ? "true" : "false") + '">' +
        esc(t.label) + "</button>";
    }).join("");
    return '<div class="cn-ctx cn-person-ctx" data-key="ctx-dm-' + esc(dm.id) + '" data-dm="true"' +
      ' data-person-pane="' + esc(pane) + '">' +
      '<b class="cn-ctx-name">@' + esc(dm.peer) + "</b>" +
      '<span class="cn-ctx-kind" data-kind="' + esc(kind) + '">' +
      (kind === "agent" ? "agent" : "person") + "</span>" +
      (member && member.role
        ? '<span class="cn-ctx-fact">' + esc(member.role) + "</span>"
        : "") +
      (pane === "messages"
        ? '<span class="cn-ctx-fact">' + msgs.length +
          (msgs.length === 1 ? " message" : " messages") + "</span>"
        : '<span class="cn-ctx-fact">profile</span>') +
      (dm.unread && pane === "messages"
        ? '<span class="cn-badge">' + dm.unread + " new</span>" : "") +
      (member && member.state
        ? '<span class="cn-ctx-fact">' + esc(member.state) + "</span>"
        : "") +
      (spark && pane === "messages"
        ? '<span class="cn-spark" aria-hidden="true">' + spark + "</span>" : "") +
      (last && pane === "messages"
        ? '<span class="cn-ctx-fact">last ' + esc(last.at) + " by " + esc(last.who) + "</span>"
        : "") +
      '<div class="cn-person-tabs" role="toolbar" aria-label="Person views">' + tabs + "</div>" +
      "</div>";
  }

  /**
   * GitHub-style person profile in terminal TUI form — dense facts + bio,
   * not a web card. Shown when the person pane toggle is set to profile.
   */
  function viewPersonProfile(peer) {
    var member = window.NB_MAP && window.NB_MAP.findMember
      ? window.NB_MAP.findMember(peer)
      : null;
    if (!member) {
      for (var j = 0; j < (D.members || []).length; j++) {
        if (D.members[j].handle === peer) { member = D.members[j]; break; }
      }
    }
    if (!member) {
      return '<div class="cn-person-profile" data-key="person-profile">' +
        '<p class="cn-empty">No profile for @' + esc(peer) + ".</p></div>";
    }
    var display = member.name || member.handle;
    var initials = String(display).replace(/[^A-Za-z0-9]/g, " ").trim()
      .split(/\s+/).slice(0, 2).map(function (w) { return w.charAt(0).toUpperCase(); }).join("") ||
      String(member.handle || "?").slice(0, 2).toUpperCase();
    var facts = [];
    if (member.company) facts.push(["company", member.company]);
    if (member.location) facts.push(["location", member.location]);
    if (member.url) facts.push(["url", member.url]);
    if (member.joined) facts.push(["joined", member.joined]);
    if (member.detail) facts.push(["runtime", member.detail]);
    if (member.role) facts.push(["role", member.role]);
    if (member.state) facts.push(["state", member.state]);
    var factRows = facts.map(function (pair) {
      return '<div class="cn-person-fact">' +
        '<span class="cn-person-fact-k">' + esc(pair[0]) + "</span>" +
        '<span class="cn-person-fact-v">' + esc(pair[1]) + "</span></div>";
    }).join("");
    var bio = member.bio
      ? '<div class="cn-person-bio" data-c="body">' + formatBody(member.bio) + "</div>"
      : '<p class="cn-empty">No profile description yet.</p>';
    var pinned = (member.pinned || []).map(function (p) {
      var slug = p.slug || p.id || "";
      var where = "/projects";
      if (window.NB_MAP && window.NB_MAP.slug && slug) {
        where = "/projects/" + window.NB_MAP.slug(slug);
      } else if (slug) {
        where = "/projects/" + String(slug).toLowerCase().replace(/[^a-z0-9]+/g, "-");
      }
      return '<button type="button" class="cn-person-pin" data-goto="' + esc(where) + '"' +
        ' data-key="pin-' + esc(slug) + '">' +
        '<span class="cn-person-pin-slug">' + esc(slug) + "</span>" +
        '<span class="cn-person-pin-blurb">' + esc(p.blurb || "") + "</span>" +
        '<span class="cn-follow-open" aria-hidden="true">open</span></button>';
    }).join("");
    return '<div class="cn-person-profile" data-key="person-profile" data-region="profile"' +
      ' data-peer="' + esc(member.handle) + '">' +
      '<div class="cn-person-head">' +
      '<span class="cn-person-avatar" aria-hidden="true">' + esc(initials) + "</span>" +
      '<div class="cn-person-id">' +
      '<div class="cn-person-display">' + esc(display) + "</div>" +
      '<div class="cn-person-handle">@' + esc(member.handle) +
      (member.kind === "agent" ? ' <span class="cn-person-kind">agent</span>' : "") +
      "</div></div></div>" +
      bio +
      (factRows
        ? '<div class="cn-person-facts" data-key="person-facts">' +
          '<div class="cn-person-section">facts</div>' + factRows + "</div>"
        : "") +
      (pinned
        ? '<div class="cn-person-pins" data-key="person-pins">' +
          '<div class="cn-person-section">pinned</div>' + pinned + "</div>"
        : "") +
      "</div>";
  }

  /** Person detail body: messages thread (default) or GitHub-style profile. */
  function viewPersonPane(peer, extra, state, sort, votes) {
    var pane = (state && state.personPane) === "profile" ? "profile" : "messages";
    if (pane === "profile") return viewPersonProfile(peer);
    var dmPath = MAP.dmPath ? MAP.dmPath(peer) : ("/dms/" + peer);
    var dmMsgs = MAP.list(dmPath, extra) || [];
    if (!dmMsgs.length) {
      return '<p class="cn-empty">No messages yet with @' + esc(peer) +
        " — send from the prompt.</p>";
    }
    return viewTree(dmMsgs, null, state.folded, sort, votes,
      state.reactions, state.reposts, state.reactPick, state.feedQuery);
  }

  /**
   * Up to three panes:
   *
   *   [ nav ]  — the single reusable root blade, reloaded as a navbar for
   *              the current path (one branch of first-level subnodes)
   *   [ detail ] — preview / editor / thread / home feed for the selection
   *   [ session ] — CLI/AI transcript when there are useful lines (dedicated;
   *                 never appended under creators/following/thread content)
   *
   * Breadcrumb owns path depth. Enter / → reloads the nav blade with the
   * child scope; ← reloads it with the parent. No stack of board → projects →
   * community → channels list columns.
   */
  function usefulSessionLines(lines) {
    return (lines || []).filter(function (ln) { return ln.kind !== "banner"; });
  }

  function buildBladeStack(state) {
    var extra = state.merged || [];
    var path = state.path || "/";
    var parts = MAP.split(path);
    // Terminal channel leaves keep a deep address for compose/feed, but the
    // navbar lists the parent branch so it is never an empty sibling pane.
    var listPath = MAP.navParentPath ? MAP.navParentPath(path) : path;
    var listParts = MAP.split(listPath);
    var here = MAP.list(listPath, extra) || [];
    var cursor = Math.min(state.cursor || 0, Math.max(0, here.length - 1));
    var selected = here[cursor];
    var selectedName = selected ? selected.name : null;
    if (MAP.isTerminalNavPath && MAP.isTerminalNavPath(path)) {
      selectedName = parts[parts.length - 1] || selectedName;
      var termIx = here.findIndex(function (e) { return e.name === selectedName; });
      if (termIx >= 0) {
        cursor = termIx;
        selected = here[cursor];
      }
    }
    var navTitle = listPath === "/" ? "board" : (listParts[listParts.length - 1] || "board");
    var parentPath = listParts.length ? MAP.join(listParts.slice(0, -1)) || "/" : null;

    var blades = [
      {
        index: 0,
        path: listPath,
        title: navTitle,
        kind: "list",
        // Closable only when not at board root — close means go up (reload nav).
        closable: listPath !== "/",
        parentPath: parentPath,
        entries: here,
        selected: selectedName,
        filter: state.filter || "",
        // Stable key so morph reuses this node instead of stacking clones.
        stable: "nav",
      },
    ];
    // Detail always present: selection preview, or Following feed when closed
    // so the nav never expands to fill the workbench alone.
    var showingFollow = state.detailOpen === false;
    blades.push({
      index: 1,
      path: path,
      title: showingFollow
        ? ((state.homeFeed || "following"))
        : (state.threadFocus
          ? "thread"
          : (selected && selected.post
            ? selected.name
            : (selected && (selected.kind === "dir" || selected.kind === "channel")
              ? selected.name
              : (parts[0] === "projects" && parts[2] === "channels" && parts[3]
                ? parts[3]
                : "detail")))),
      kind: "detail",
      // [esc] leaves selection for the Following feed; the feed itself has no dismiss.
      closable: !showingFollow,
      parentPath: path,
      parentKey: selectedName,
      selected: showingFollow ? null : selected,
      markId: !showingFollow
        ? (state.threadFocus || state.feedMark ||
          (selected && selected.post ? selected.post.id : null))
        : null,
      following: showingFollow,
      thread: !!(state.threadFocus),
      stable: "detail",
    });
    if (usefulSessionLines(state.lines).length && !state.sessionClosed) {
      blades.push({
        index: blades.length,
        path: path,
        title: "session",
        kind: "session",
        closable: true,
        parentPath: path,
        stable: "session",
        active: !!state.sessionOutFocus,
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
      var isChannel = e.kind === "channel";
      // Only first-level directory rows may expand (depth 0). Channels are leaves.
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
      if (isChannel) {
        subN = detailFeedEntries(full, extra).length;
      }

      var spark = activityOf(e, parentPath);
      var current = blade.selected != null && e.name === blade.selected && parentPath === blade.path;
      if (!current && (isDir || isChannel)) {
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
        '<span class="cn-name">' + esc(e.label || e.name) + "</span>" +
        subMark +
        (e.unread
          ? '<span class="cn-badge" title="Unread">' +
            (typeof e.unread === "number" ? e.unread : "new") + "</span>"
          : '<span class="cn-hint">' + (spark ? '<span class="cn-spark" aria-hidden="true">' + spark + "</span> " : "") +
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
   * One blade (list, detail, or session). When nav is collapsed, list blades
   * render as thin rails so detail/session can claim the width without losing
   * path context.
   */
  function bladeHtml(blade, focused, bodyHtml, navCollapsed, focusExpanded) {
    var isSession = blade.kind === "session";
    var title = isSession
      ? "session"
      : (blade.kind === "detail"
        ? (blade.title || "detail")
        : (blade.path === "/" ? "board" : blade.title));
    var subtitle = isSession ? "chat" : (blade.kind === "detail" ? "detail" : "blade");
    var isList = blade.kind !== "detail" && !isSession;
    var collapsed = !!(navCollapsed && isList);
    var focusHidden = focusExpanded != null && blade.index !== focusExpanded;

    // Collapsed nav rail — same stable blade, slimmed; click expands.
    if (collapsed) {
      return '<section class="cn-blade cn-col cn-blade-rail" data-blade="' + blade.index + '"' +
        ' data-column="' + blade.index + '" data-blade-path="' + esc(blade.path) + '"' +
        ' data-blade-kind="list" data-collapsed="true" data-nav="true"' +
        ' data-focus-hidden="' + focusHidden + '"' +
        (focused ? ' data-focus="true"' : "") +
        ' data-key="blade-nav">' +
        '<button type="button" class="cn-blade-rail-hit" data-nav-expand' +
        ' data-blade-path="' + esc(blade.path) + '"' +
        ' title="Expand navigation — ' + esc(title) + '"' +
        ' aria-label="Expand navigation: ' + esc(title) + '">' +
        '<span class="cn-blade-rail-mark" aria-hidden="true">›</span>' +
        '<span class="cn-blade-rail-title">' + esc(title) + "</span>" +
        "</button></section>";
    }

    var kicker = isList
      ? (blade.path === "/" ? "nav" : "nav")
      : subtitle;
    var closeTitle = isSession
      ? "Close session chat"
      : (isList
        ? "Back — up to parent (reload nav)"
        : "Esc — leave selection for Following log");
    // When nav has drilled below board root, lead the chrome with << so the
    // reused blade always shows how to step back (not only a trailing dismiss).
    var navBack = isList && blade.closable && blade.path && blade.path !== "/";
    var parentLabel = blade.parentPath && blade.parentPath !== "/"
      ? blade.parentPath
      : "board";
    // Stable morph keys: always blade-nav / blade-detail / blade-session so
    // panes are reused and reloaded, never cloned for each path segment.
    var morphKey = blade.stable || (isSession ? "session" : (isList ? "nav" : "detail"));
    return '<section class="cn-blade cn-col" data-blade="' + blade.index + '"' +
      ' data-column="' + blade.index + '" data-blade-path="' + esc(blade.path) + '"' +
      ' data-blade-kind="' + esc(blade.kind) + '"' +
      ' data-collapsed="false"' +
      ' data-focus-hidden="' + focusHidden + '"' +
      (isList ? ' data-nav="true"' : "") +
      (isSession && blade.active ? ' data-session-active="true"' : "") +
      (navBack ? ' data-nav-drilled="true"' : "") +
      (focused ? ' data-focus="true"' : "") +
      ' data-key="blade-' + morphKey + '">' +
      '<header class="cn-blade-head cn-col-head" data-key="blade-head-' + morphKey + '">' +
      (navBack
        ? '<button type="button" class="cn-blade-back cn-pane-act" data-blade-close="' + blade.index + '"' +
          ' data-nav-back title="' + esc(closeTitle + " · " + parentLabel) + '"' +
          ' aria-label="' + esc(closeTitle) + '">' +
          '<span class="cn-blade-back-mark" aria-hidden="true">&lt;&lt;</span>' +
          '<span class="cn-blade-back-label" aria-hidden="true">back</span></button>'
        : "") +
      '<span class="cn-blade-kicker" aria-hidden="true">' + esc(kicker) + "</span>" +
      '<span class="cn-col-title cn-blade-title">' + esc(title) +
      (blade.filter ? '<span class="cn-filter">/' + esc(blade.filter) + "</span>" : "") +
      "</span>" +
      (isList && blade.path && blade.path !== "/"
        ? '<span class="cn-blade-path" aria-hidden="true" title="' + esc(blade.path) + '">' +
          esc(blade.path) + "</span>"
        : "") +
      '<button type="button" class="cn-pane-act" data-pane-zoom' +
        ' title="' + (focusExpanded === blade.index
          ? "Restore panel layout (z / Alt+Z)"
          : "Expand focused panel (z / Alt+Z)") + '"' +
        ' aria-label="' + (focusExpanded === blade.index
          ? "Restore panel layout"
          : "Expand focused panel") + '"' +
        ' aria-pressed="' + (focusExpanded === blade.index) + '">' +
        (focusExpanded === blade.index ? "▣" : "▭") + "</button>" +
      (isSession
        ? '<button type="button" class="cn-pane-act" data-copy-chat' +
          ' title="Copy session chat in an optimized paste format"' +
          ' aria-label="Copy session chat">copy</button>'
        : "") +
      // Detail/session dismiss is [esc] — same verb as the Escape key (no ×).
      ((!isList && blade.closable)
        ? '<button type="button" class="cn-esc cn-blade-close" data-blade-close="' + blade.index + '"' +
          ' data-esc-dismiss title="' + esc(closeTitle) + '"' +
          ' aria-label="' + esc(closeTitle) + '">esc</button>'
        : "") +
      "</header>" +
      '<div class="cn-blade-body cn-col-body" data-key="blade-body-' + morphKey + '">' +
      bodyHtml + "</div></section>";
  }

  /* ── The experience ────────────────────────────────────────────────────── */

  var CONSOLE = {
    id: "console",
    name: "Console",
    thesis: "The board as a filesystem. One nav blade is the navbar — it reloads for the current path with one branch of subnodes. Detail is the content pane. Session is a dedicated CLI/AI chat blade when there is transcript. Breadcrumb owns depth; never stack cloned list blades.",
    keys: "[←→] parent/child  [↑↓] preview  [Enter] activate  [Space] expand  [z] collapse nav  [:] command  ·  [Ctrl+Space] keys",

    css: `
    /* Whole page is the TUI: workspace tabs + blades + prompt foot. No side terminal. */
    [data-exp="console"]{display:grid;grid-template-rows:auto auto minmax(0,1fr) auto auto;height:100%;min-height:0;position:relative}
    [data-exp="console"][data-tui=true]{/* contract hook */}

    /* Workspace tabs — isolated worktrees, not a dockable panel. */
    [data-exp="console"] .cn-workspace-tabs{display:flex;align-items:stretch;gap:0;min-width:0;
      padding:0 .4rem;border-block-end:1px solid var(--nb-rule);background:var(--nb-bg);min-height:1.9rem}
    [data-exp="console"] .cn-workspace-tablist{display:flex;align-items:stretch;gap:0;min-width:0;
      flex:1 1 auto;overflow:auto}
    [data-exp="console"] .cn-panel-tab,[data-exp="console"] .cn-workspace-tab{
      background:none;border:0;border-block-end:2px solid transparent;
      font:inherit;font-size:.85em;color:var(--nb-ink-dim);cursor:pointer;padding:.35rem .55rem;
      border-radius:0;display:inline-flex;align-items:center;gap:.35rem}
    [data-exp="console"] .cn-panel-tab[aria-selected=true],
    [data-exp="console"] .cn-workspace-tab[aria-selected=true]{color:var(--nb-ink);
      border-block-end-color:var(--nb-accent);font-weight:700}
    [data-exp="console"] .cn-panel-tab:hover,[data-exp="console"] .cn-workspace-tab:hover{color:var(--nb-ink)}
    [data-exp="console"] .cn-tab-close{font-size:.9em;opacity:.7;padding:0 .15rem}
    [data-exp="console"] .cn-tab-close:hover{opacity:1;color:var(--nb-danger)}
    [data-exp="console"] .cn-tab-new{font-weight:700;color:var(--nb-ink-dim)}

    /* Breadcrumb. Clickable, because the path is also the navigation. */
    [data-exp="console"] .cn-path{display:flex;gap:.15rem;align-items:center;flex-wrap:wrap;
      padding:.4rem .8rem;border-block-end:1px solid var(--nb-rule);font-size:.9em}
    [data-exp="console"] .cn-crumb{background:none;border:0;font:inherit;color:var(--nb-ink-dim);
      cursor:pointer;padding:.1rem .15rem;border-radius:0}
    [data-exp="console"] .cn-crumb:hover{color:var(--nb-ink);text-decoration:underline}
    [data-exp="console"] .cn-crumb:last-of-type{color:var(--nb-ink);font-weight:700}
    [data-exp="console"] .cn-sep{color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-path-preview{margin-inline-start:auto;color:var(--nb-warn);font-weight:700}
    [data-exp="console"] .cn-views{margin-inline-start:auto;display:flex;gap:.15rem;align-items:center;flex-wrap:wrap}
    [data-exp="console"] .cn-feed-notice{position:sticky;top:0;z-index:2;width:100%;
      margin:0;border:0;border-block-end:1px solid var(--nb-rule);
      background:color-mix(in srgb,var(--nb-accent) 88%,var(--nb-bg));
      color:var(--nb-accent-ink);font:inherit;font-weight:700;text-align:start;
      padding:.45rem .7rem;cursor:pointer;letter-spacing:.01em}
    [data-exp="console"] .cn-feed-notice:hover{filter:brightness(1.08)}
    [data-exp="console"] .cn-feed-notice [data-c="count"]{color:inherit;font-weight:800}
    [data-exp="console"] .cn-feed-bar{display:flex;flex-direction:column;gap:.3rem;width:100%;min-width:0;
      padding:.35rem .55rem .25rem;border-block-end:1px solid var(--nb-rule);background:var(--nb-bg)}
    [data-exp="console"] .cn-feed-views{display:flex;flex-wrap:wrap;gap:.1rem;align-items:center;position:relative}
    [data-exp="console"] .cn-feed-add{font:inherit;font-size:.85em;font-weight:700;color:var(--nb-ink-dim);
      background:none;border:0;border-radius:0;min-height:1.6rem;padding:0 .05rem;cursor:pointer}
    [data-exp="console"] .cn-feed-add::before{content:"[";color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-feed-add::after{content:"]";color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-feed-add:hover,[data-exp="console"] .cn-feed-add[aria-expanded=true]{
      color:var(--nb-accent)}
    [data-exp="console"] .cn-feed-add:hover::before,[data-exp="console"] .cn-feed-add:hover::after,
    [data-exp="console"] .cn-feed-add[aria-expanded=true]::before,
    [data-exp="console"] .cn-feed-add[aria-expanded=true]::after{color:var(--nb-accent)}
    [data-exp="console"] .cn-feed-add-menu{display:flex;flex-wrap:wrap;gap:.15rem .35rem;width:100%;
      margin-block-start:.25rem;padding:.2rem 0;border-block-start:1px dotted var(--nb-rule)}
    [data-exp="console"] .cn-feed-add-opt{font:inherit;font-size:.8em;color:var(--nb-ink-dim);background:none;
      border:0;border-radius:0;min-height:1.5rem;padding:0 .05rem;cursor:pointer;text-transform:lowercase}
    [data-exp="console"] .cn-feed-add-opt::before{content:"[";color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-feed-add-opt::after{content:"]";color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-feed-add-opt:hover{color:var(--nb-ink);text-decoration:underline}
    [data-exp="console"] .cn-feed-add-empty{font-size:.8em;color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-feed-add-unpin{display:flex;flex-wrap:wrap;gap:.15rem .35rem;width:100%;
      margin-block-start:.2rem;padding-block-start:.2rem;border-block-start:1px dotted var(--nb-rule)}
    [data-exp="console"] .cn-sort[data-pinned=true]{color:var(--nb-ink)}
    [data-exp="console"] .cn-feed-query-row{display:flex;flex-wrap:wrap;gap:.35rem;align-items:center;width:100%}
    [data-exp="console"] .cn-feed-view-toggle{
      font:inherit;font-size:.85em;font-weight:700;color:var(--nb-ink-dim);background:none;
      border:0;border-radius:0;min-height:1.75rem;padding:0 .15rem;cursor:pointer}
    [data-exp="console"] .cn-feed-view-toggle::before{content:"[";color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-feed-view-toggle::after{content:"]";color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-feed-view-toggle:hover,
    [data-exp="console"] .cn-feed-view-toggle[aria-expanded=true]{color:var(--nb-accent)}
    [data-exp="console"] .cn-feed-view-toggle:hover::before,
    [data-exp="console"] .cn-feed-view-toggle:hover::after,
    [data-exp="console"] .cn-feed-view-toggle[aria-expanded=true]::before,
    [data-exp="console"] .cn-feed-view-toggle[aria-expanded=true]::after{color:var(--nb-accent)}
    [data-exp="console"] .cn-feed-q-label{font-size:.75em;color:var(--nb-ink-faint);text-transform:lowercase}
    [data-exp="console"] .cn-feed-query{
      flex:1 1 12rem;min-width:8rem;font:inherit;font-size:.85em;color:var(--nb-ink);
      background:var(--nb-bg);border:0;border-block-end:1px solid var(--nb-rule);border-radius:0;
      min-height:1.8rem;padding:0 .2rem}
    [data-exp="console"] .cn-feed-query:focus{outline:none;border-block-end-color:var(--nb-accent);
      box-shadow:inset 0 -1px 0 var(--nb-accent)}
    /* Terminal chrome: [label] brackets + reverse video — never rounded web pills. */
    [data-exp="console"] .cn-feed-q-btn,
    [data-exp="console"] .cn-sort,
    [data-exp="console"] .cn-share,
    [data-exp="console"] .cn-activity-filter,
    [data-exp="console"] .cn-activity-open,
    [data-exp="console"] .cn-activity-read,
    [data-exp="console"] .cn-activity-enable,
    [data-exp="console"] .cn-follow-open{
      font:inherit;font-size:.85em;color:var(--nb-ink-dim);background:none;border:0;
      border-radius:0;min-height:1.6rem;padding:0 .05rem;cursor:pointer;
      text-transform:lowercase;box-shadow:none}
    [data-exp="console"] .cn-feed-q-btn::before,
    [data-exp="console"] .cn-sort::before,
    [data-exp="console"] .cn-share::before,
    [data-exp="console"] .cn-activity-filter::before,
    [data-exp="console"] .cn-activity-open::before,
    [data-exp="console"] .cn-activity-read::before,
    [data-exp="console"] .cn-activity-enable::before,
    [data-exp="console"] .cn-follow-open::before{content:"[";color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-feed-q-btn::after,
    [data-exp="console"] .cn-sort::after,
    [data-exp="console"] .cn-share::after,
    [data-exp="console"] .cn-activity-filter::after,
    [data-exp="console"] .cn-activity-open::after,
    [data-exp="console"] .cn-activity-read::after,
    [data-exp="console"] .cn-activity-enable::after,
    [data-exp="console"] .cn-follow-open::after{content:"]";color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-feed-q-btn:hover,
    [data-exp="console"] .cn-sort:hover,
    [data-exp="console"] .cn-share:hover,
    [data-exp="console"] .cn-activity-filter:hover,
    [data-exp="console"] .cn-activity-open:hover,
    [data-exp="console"] .cn-activity-read:hover,
    [data-exp="console"] .cn-activity-enable:hover{color:var(--nb-ink);text-decoration:underline}
    [data-exp="console"] .cn-follow-row:hover .cn-follow-open{color:inherit;text-decoration:underline}
    [data-exp="console"] .cn-feed-q-btn:hover::before,
    [data-exp="console"] .cn-feed-q-btn:hover::after,
    [data-exp="console"] .cn-sort:hover::before,
    [data-exp="console"] .cn-sort:hover::after,
    [data-exp="console"] .cn-share:hover::before,
    [data-exp="console"] .cn-share:hover::after,
    [data-exp="console"] .cn-activity-filter:hover::before,
    [data-exp="console"] .cn-activity-filter:hover::after,
    [data-exp="console"] .cn-activity-open:hover::before,
    [data-exp="console"] .cn-activity-open:hover::after,
    [data-exp="console"] .cn-activity-read:hover::before,
    [data-exp="console"] .cn-activity-read:hover::after,
    [data-exp="console"] .cn-activity-enable:hover::before,
    [data-exp="console"] .cn-activity-enable:hover::after,
    [data-exp="console"] .cn-follow-row:hover .cn-follow-open::before,
    [data-exp="console"] .cn-follow-row:hover .cn-follow-open::after{color:inherit}
    [data-exp="console"] .cn-sort[aria-pressed=true],
    [data-exp="console"] .cn-activity-filter[aria-pressed=true]{
      color:var(--nb-bg);background:var(--nb-ink);text-decoration:none}
    [data-exp="console"] .cn-sort[aria-pressed=true]::before,
    [data-exp="console"] .cn-sort[aria-pressed=true]::after,
    [data-exp="console"] .cn-activity-filter[aria-pressed=true]::before,
    [data-exp="console"] .cn-activity-filter[aria-pressed=true]::after{color:var(--nb-bg)}
    [data-exp="console"] .cn-activity-open,
    [data-exp="console"] .cn-activity-enable{color:var(--nb-accent);font-weight:700}
    [data-exp="console"] .cn-activity-open::before,
    [data-exp="console"] .cn-activity-open::after,
    [data-exp="console"] .cn-activity-enable::before,
    [data-exp="console"] .cn-activity-enable::after{color:var(--nb-accent)}
    [data-exp="console"] .cn-feed-match{font-size:.8em;color:var(--nb-ink-faint);padding:.15rem .55rem 0}
    [data-exp="console"] .cn-feed-err,[data-exp="console"] .cn-feed-err-line{
      font-size:.8em;color:var(--nb-danger);padding:.1rem .55rem 0}

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
      /* Clip always — nav rows / selection wash must not paint into the detail blade. */
      overflow:hidden;
      box-shadow:inset 0 0 0 1px transparent;
      transition:flex-basis .16s ease,max-width .16s ease,opacity .12s ease}
    [data-exp="console"] .cn-blade[data-blade-kind=detail],[data-exp="console"] .cn-pane{
      flex:1 1 24rem;max-width:none;opacity:.92}
    [data-exp="console"] .cn-blades[data-focus-expanded]:not([data-focus-expanded=""]) .cn-blade[data-focus-hidden=true]{display:none}
    [data-exp="console"] .cn-blades[data-focus-expanded]:not([data-focus-expanded=""]) .cn-blade[data-focus=true]{
      flex:1 1 100%;max-width:none;min-width:100%;opacity:1}
    /* Nav stays a sidebar; detail always hosts selection or the Following feed. */
    [data-exp="console"] .cn-blade[data-blade-kind=list],[data-exp="console"] .cn-blade[data-nav=true]{
      flex:0 0 clamp(12rem,28vw,18rem);max-width:clamp(12rem,28vw,18rem)}
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
    /* Nav + detail stay opaque so a neighbour cannot show through during morph/back. */
    [data-exp="console"] .cn-blade[data-nav=true],
    [data-exp="console"] .cn-blade[data-blade-kind=detail]{opacity:1}
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
    }
    [data-exp="console"] .cn-blade-pager{display:none;flex-wrap:wrap;gap:.25rem .4rem;
      padding:.2rem .55rem;border-block-end:1px solid var(--nb-rule);align-items:center}
    [data-exp="console"] .cn-blade-dot{
      font:inherit;font-size:.78em;font-weight:700;color:var(--nb-ink-faint);background:none;
      border:0;border-radius:0;min-height:1.75rem;padding:0 .2rem;cursor:pointer}
    [data-exp="console"] .cn-blade-dot::before{content:"[";color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-blade-dot::after{content:"]";color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-blade-dot[aria-selected=true]{color:var(--nb-accent)}
    [data-exp="console"] .cn-blade-dot[aria-selected=true]::before,
    [data-exp="console"] .cn-blade-dot[aria-selected=true]::after{color:var(--nb-accent)}
    [data-exp="console"] .cn-state-legend{display:inline-flex;flex-wrap:wrap;gap:.2rem .45rem;
      width:100%;margin-block-start:.2rem;font-size:max(.85em,11px);color:var(--nb-ink-faint);
      line-height:1.35}
    [data-exp="console"] .cn-state-legend i{font-style:normal;font-weight:700}
    [data-exp="console"] .cn-state-legend i[data-state=open]{color:var(--nb-ink-dim)}
    [data-exp="console"] .cn-state-legend i[data-state=needs-review]{color:var(--nb-warn)}
    [data-exp="console"] .cn-state-legend i[data-state=promoted]{color:var(--nb-accent)}
    [data-exp="console"] .cn-state-legend i[data-state=signed]{color:var(--nb-signed)}
    @media (max-width: 40rem){
      /* Single-blade ranger mode: list/detail each claim nearly full width.
         More-specific list max-width rules above must be overridden here or
         both blades shrink to ~half a phone screen (Impeccable P1). */
      [data-exp="console"] .cn-path{display:none}
      [data-exp="console"] .cn-blade-pager{display:flex}
      [data-exp="console"] .cn-blades{scroll-snap-type:x mandatory}
      [data-exp="console"] .cn-blade,
      [data-exp="console"] .cn-blade[data-blade-kind=list],
      [data-exp="console"] .cn-blade[data-nav=true],
      [data-exp="console"] .cn-col{
        flex:0 0 100%;max-width:100%;scroll-snap-align:start;opacity:1}
      [data-exp="console"] .cn-blade[data-blade-kind=detail],
      [data-exp="console"] .cn-blade[data-blade-kind=session],
      [data-exp="console"] .cn-pane{
        flex:0 0 100%;max-width:100%}
      [data-exp="console"] .cn-blade[data-collapsed=true],
      [data-exp="console"] .cn-blade-rail{
        flex:0 0 2.15rem;max-width:2.15rem;min-width:2.15rem}
      [data-exp="console"] .cn-pane-act{min-width:2rem;min-height:2rem}
      [data-exp="console"] .cn-blades::after{content:none}
      [data-exp="console"] .cn-sort,[data-exp="console"] .cn-feed-q-btn,
      [data-exp="console"] .cn-feed-view-toggle,[data-exp="console"] .cn-share,
      [data-exp="console"] .cn-activity-open,[data-exp="console"] .cn-activity-read,
      [data-exp="console"] .cn-blade-dot{
        min-height:2.25rem;min-width:2.25rem;padding:0 .35rem}
      [data-exp="console"] .cn-react-pill,[data-exp="console"] .cn-react-add{
        min-height:2.25rem;min-width:2.25rem}
    }
    [data-exp="console"] .cn-blade-head,[data-exp="console"] .cn-col-head{
      display:flex;align-items:center;gap:.35rem;min-width:0;overflow:hidden;
      padding:.3rem .5rem .3rem .65rem;border-block-end:1px solid var(--nb-rule);
      color:var(--nb-ink-dim);font-size:.8em;background:var(--nb-surface)}
    [data-exp="console"] .cn-blade-kicker{font-size:.7em;letter-spacing:.1em;text-transform:uppercase;
      color:var(--nb-ink-dim);flex:none}
    [data-exp="console"] .cn-blade-title,[data-exp="console"] .cn-col-title{
      flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--nb-ink-dim)}
    [data-exp="console"] .cn-blade[data-focus=true] .cn-blade-title{color:var(--nb-ink);font-weight:700}
    [data-exp="console"] .cn-blade-path{
      font-size:.72em;color:var(--nb-ink-dim);max-width:12rem;overflow:hidden;
      text-overflow:ellipsis;white-space:nowrap;flex:0 1 auto;min-width:0}
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
    /* [esc] dismiss chrome — same verb as the Escape key (help, detail, auth). */
    [data-exp="console"] .cn-esc,[data-exp="console"] .cn-esc-inline{
      font:inherit;line-height:1;color:var(--nb-ink-faint);border-radius:0}
    [data-exp="console"] .cn-esc{
      margin-inline-start:auto;background:none;border:0;cursor:pointer;
      min-width:auto;min-height:1.5rem;padding:0 .05rem}
    [data-exp="console"] .cn-esc::before,[data-exp="console"] .cn-esc-inline::before{
      content:"[";color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-esc::after,[data-exp="console"] .cn-esc-inline::after{
      content:"]";color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-esc:hover{color:var(--nb-ink);text-decoration:underline;
      background:transparent}
    [data-exp="console"] .cn-blade-close{flex:none}
    [data-exp="console"] .cn-pane-act{background:none;border:0;font:inherit;
      color:var(--nb-ink-dim);cursor:pointer;min-width:1.5rem;min-height:1.5rem;padding:0;
      border-radius:0;line-height:1}
    [data-exp="console"] .cn-pane-act:hover{background:var(--nb-ink);color:var(--nb-bg)}
    [data-exp="console"] .cn-filter{color:var(--nb-accent);margin-inline-start:.4rem}
    [data-exp="console"] .cn-blade-body,[data-exp="console"] .cn-col-body{
      overflow:auto;min-width:0;min-height:0;max-width:100%}
    /* +/− tree nav inside list blades (channels and every other dir listing). */
    [data-exp="console"] .cn-blade-tree{padding:.15rem 0 .35rem;min-width:0;max-width:100%;overflow:hidden}
    [data-exp="console"] .cn-tree-row{min-width:0;max-width:100%}
    /* First-level tree: twist + row. Kids indent once; no recursive nest rails. */
    [data-exp="console"] .cn-tree-line{display:grid;grid-template-columns:auto minmax(0,1fr);
      align-items:center;gap:0 .15rem;min-height:1.9rem;min-width:0;max-width:100%;
      padding-inline-end:.35rem;box-sizing:border-box}
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
      min-width:0;width:100%;max-width:100%;box-sizing:border-box;
      padding:.18rem .45rem .18rem .25rem;background:none;border:0;font:inherit;
      color:var(--nb-ink);cursor:pointer;text-align:start;min-height:1.9rem;
      overflow:hidden}
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
      align-items:baseline;width:100%;max-width:100%;box-sizing:border-box;
      padding:.18rem .6rem;background:none;border:0;font:inherit;
      color:var(--nb-ink);cursor:pointer;text-align:start;min-height:1.9rem;
      min-width:0;overflow:hidden}
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
    [data-exp="console"] .cn-hint{color:var(--nb-ink-dim);font-size:.82em;white-space:nowrap;
      flex:0 1 auto;min-width:0;max-width:48%;overflow:hidden;text-overflow:ellipsis}
    /* ASCII carries readings here, so it takes ink weight rather than decoration. */
    [data-exp="console"] .cn-spark{color:var(--nb-live);letter-spacing:-.06em;opacity:.7;font-size:.9em}
    /* On a selected row the live ink fights the selection wash, so it defers. */
    [data-exp="console"] [aria-current="true"] .cn-spark{color:currentColor}
    [data-exp="console"] .cn-sigil{color:var(--nb-signed);letter-spacing:-.05em;margin-inline-end:.35rem}
    [data-exp="console"] .cn-merge{font-variant-numeric:tabular-nums}
    [data-exp="console"] .cn-badge{background:var(--nb-accent);color:var(--nb-accent-ink);padding:0 .35rem;font-size:.8em}

    /* Detail blade: terminal message log (Discord-rich body, ASCII chrome). */
    [data-exp="console"] .cn-blade[data-blade-kind=detail] .cn-blade-body,
    [data-exp="console"] .cn-pane > .cn-col-body{
      overflow:auto;padding:.2rem 0 3.25rem;scroll-padding-block-end:3.25rem}
    [data-exp="console"] .cn-empty{color:var(--nb-ink-faint);padding:.6rem .8rem}

    [data-exp="console"] .cn-comment{display:grid;grid-template-columns:auto auto minmax(0,1fr);
      gap:0 .4rem;padding:.28rem .55rem .28rem 0;align-items:start;
      border-block-end:1px dotted var(--nb-rule);cursor:pointer}
    [data-exp="console"] .cn-comment:hover{background:color-mix(in srgb,var(--nb-surface) 65%,transparent)}
    [data-exp="console"] .cn-comment[data-here=true]{background:var(--nb-surface);
      box-shadow:inset 2px 0 0 var(--nb-accent)}
    [data-exp="console"] .cn-comment:focus-visible{outline:2px solid var(--nb-accent);
      outline-offset:-2px;background:var(--nb-surface)}
    [data-exp="console"] .cn-comment button,
    [data-exp="console"] .cn-comment a{cursor:pointer}
    [data-exp="console"] .cn-comment[data-state-of=open] .cn-comment-head [data-c=state]{color:var(--nb-ink-dim)}
    [data-exp="console"] .cn-comment[data-state-of=needs-review] .cn-comment-head [data-c=state]{color:var(--nb-warn)}
    [data-exp="console"] .cn-comment[data-state-of=promoted] .cn-comment-head [data-c=state]{color:var(--nb-accent)}
    [data-exp="console"] .cn-comment[data-state-of=signed] .cn-comment-head [data-c=state]{color:var(--nb-signed)}
    [data-exp="console"] .cn-comment[data-kind=agent] [data-c=handle]{color:var(--nb-agent)}

    /* Nest rails: literal | columns — no rounded bars. */
    [data-exp="console"] .cn-rails{display:flex;align-self:stretch;flex:none;gap:0}
    [data-exp="console"] .cn-rail{display:flex;align-items:stretch;justify-content:center;
      width:1ch;min-width:1ch;padding:0;margin:0;background:none;border:0;
      color:var(--nb-ink-faint);cursor:pointer;flex:none;font:inherit;line-height:1.2}
    [data-exp="console"] .cn-rail-mark{display:block;width:100%;text-align:center;
      color:inherit;user-select:none}
    [data-exp="console"] .cn-rail:hover,[data-exp="console"] .cn-rail:focus-visible{
      color:var(--nb-accent);outline:none}

    /* Votes as [+] n [-] — terminal brackets, never triangles or circles. */
    [data-exp="console"] .cn-vote{display:flex;flex-direction:column;align-items:center;gap:0;
      min-width:2.2ch;padding-block-start:.05rem;user-select:none;font-variant-numeric:tabular-nums}
    [data-exp="console"] .cn-vup,[data-exp="console"] .cn-vdn{
      background:none;border:0;font:inherit;font-size:.85em;font-weight:700;line-height:1.2;
      color:var(--nb-ink-faint);cursor:pointer;padding:0;min-width:0;min-height:0;border-radius:0}
    [data-exp="console"] .cn-vup::before,[data-exp="console"] .cn-vdn::before{content:"[";color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-vup::after,[data-exp="console"] .cn-vdn::after{content:"]";color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-vup:hover,[data-exp="console"] .cn-vdn:hover{color:var(--nb-ink);text-decoration:underline}
    [data-exp="console"] .cn-vup[aria-pressed=true]{color:var(--nb-accent)}
    [data-exp="console"] .cn-vup[aria-pressed=true]::before,
    [data-exp="console"] .cn-vup[aria-pressed=true]::after{color:var(--nb-accent)}
    [data-exp="console"] .cn-vdn[aria-pressed=true]{color:var(--nb-agent)}
    [data-exp="console"] .cn-vdn[aria-pressed=true]::before,
    [data-exp="console"] .cn-vdn[aria-pressed=true]::after{color:var(--nb-agent)}
    [data-exp="console"] .cn-score{font-size:.78em;font-weight:700;font-variant-numeric:tabular-nums;
      color:var(--nb-ink-dim);line-height:1.2;padding:.05rem 0}
    [data-exp="console"] .cn-score[data-score=pos]{color:var(--nb-accent)}
    [data-exp="console"] .cn-score[data-score=neg]{color:var(--nb-agent)}

    [data-exp="console"] .cn-comment-main{min-width:0;padding-block-end:.05rem;display:grid;gap:.12rem}
    [data-exp="console"] .cn-comment-head{display:flex;flex-wrap:wrap;align-items:baseline;gap:.15rem .4rem;
      font-size:.92em;color:var(--nb-ink-dim)}
    [data-exp="console"] .cn-head-sep{color:var(--nb-ink-faint);user-select:none}
    [data-exp="console"] .cn-comment-head [data-c=handle]{color:var(--nb-ink);font-weight:700}
    [data-exp="console"] .cn-comment-head [data-c=role]{color:var(--nb-ink-faint);font-size:.9em;
      margin-inline-start:.25rem}
    [data-exp="console"] .cn-comment-head [data-c=time]{color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-comment-head [data-c=state]{color:var(--nb-ink-dim);text-transform:lowercase}
    [data-exp="console"] .cn-pm{background:none;border:0;font:inherit;font-size:.85em;font-weight:700;
      color:var(--nb-ink-dim);cursor:pointer;min-width:0;min-height:0;line-height:1;padding:0;
      border-radius:0;flex:none}
    [data-exp="console"] .cn-pm::before{content:"[";color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-pm::after{content:"]";color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-pm:hover{color:var(--nb-ink);text-decoration:underline}
    [data-exp="console"] .cn-pm-leaf{display:inline-block;visibility:hidden;cursor:default}
    [data-exp="console"] .cn-pm-leaf::before,[data-exp="console"] .cn-pm-leaf::after{content:none}
    [data-exp="console"] .cn-subject{margin:0;font-weight:700;color:var(--nb-ink);letter-spacing:.01em}
    [data-exp="console"] .cn-comment-body{margin:0;max-width:76ch;color:var(--nb-ink);line-height:1.45}
    [data-exp="console"] .cn-anchor{color:var(--nb-ink-faint);font-size:.9em}
    [data-exp="console"] .cn-receipt{display:flex;align-items:baseline;gap:.35rem;font-size:.85em;
      color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-sig-text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    [data-exp="console"] .cn-activity{display:flex;flex-direction:column;gap:0;padding:.15rem .55rem .7rem}
    /* Activity + Following: dense TUI scrollback rows, not web cards. */
    [data-exp="console"] .cn-activity-card{display:grid;grid-template-columns:1.2rem minmax(0,1fr);gap:.35rem .55rem;
      padding:.18rem .2rem;border:0;border-block-end:1px dotted var(--nb-rule);
      background:transparent;border-radius:0;cursor:pointer}
    [data-exp="console"] .cn-activity-card:hover{background:var(--nb-surface)}
    [data-exp="console"] .cn-follow-feed{display:flex;flex-direction:column;min-height:0;padding:0;min-width:0}
    [data-exp="console"] .cn-follow-list{display:flex;flex-direction:column;min-height:0;min-width:0}
    [data-exp="console"] .cn-follow-banner{padding:.2rem .55rem;border-block-end:1px solid var(--nb-rule);
      display:flex;flex-direction:column;align-items:stretch;gap:.2rem;background:transparent;
      font-size:.9em;color:var(--nb-ink-dim);min-width:0}
    [data-exp="console"] .cn-home-tabs{display:flex;flex-wrap:wrap;gap:.15rem .35rem;align-items:center;
      width:100%;min-width:0}
    [data-exp="console"] .cn-home-tab{appearance:none;border:0;background:transparent;font:inherit;
      font-size:.9em;color:var(--nb-ink-faint);cursor:pointer;padding:.1rem .25rem;min-height:1.7rem;
      display:inline-flex;align-items:baseline;gap:.2rem}
    [data-exp="console"] .cn-home-tab[aria-pressed=true],
    [data-exp="console"] .cn-home-tab[aria-selected=true]{color:var(--nb-ink);font-weight:700;
      box-shadow:inset 0 -2px 0 var(--nb-accent)}
    [data-exp="console"] .cn-home-tab:hover,[data-exp="console"] .cn-home-tab:focus-visible{
      color:var(--nb-ink);outline:none}
    [data-exp="console"] .cn-home-unread{font-size:.8em;font-variant-numeric:tabular-nums;
      color:var(--nb-accent-ink);background:var(--nb-accent);padding:0 .3rem;min-width:1rem;
      text-align:center;line-height:1.35}
    [data-exp="console"] .cn-home-tab[aria-pressed=true] .cn-home-unread,
    [data-exp="console"] .cn-home-tab[aria-selected=true] .cn-home-unread{opacity:.95}
    [data-exp="console"] .cn-person-tabs{display:flex;flex-wrap:wrap;gap:.15rem .35rem;width:100%;
      margin-block-start:.2rem}
    [data-exp="console"] .cn-person-tab{appearance:none;border:0;background:transparent;font:inherit;
      font-size:.9em;color:var(--nb-ink-faint);cursor:pointer;padding:.1rem .25rem;min-height:1.7rem}
    [data-exp="console"] .cn-person-tab[aria-pressed=true]{color:var(--nb-ink);font-weight:700;
      box-shadow:inset 0 -2px 0 var(--nb-accent)}
    [data-exp="console"] .cn-person-tab:hover,[data-exp="console"] .cn-person-tab:focus-visible{
      color:var(--nb-ink);outline:none}
    [data-exp="console"] .cn-person-profile{display:flex;flex-direction:column;gap:0;
      padding:.15rem .55rem .7rem;min-width:0}
    [data-exp="console"] .cn-person-head{display:grid;grid-template-columns:2.4rem minmax(0,1fr);
      gap:.45rem .55rem;align-items:center;padding:.25rem 0;border-block-end:1px solid var(--nb-rule)}
    [data-exp="console"] .cn-person-avatar{display:inline-flex;align-items:center;justify-content:center;
      width:2.2rem;height:2.2rem;font-size:.85em;font-weight:700;letter-spacing:.04em;
      color:var(--nb-accent-ink);background:var(--nb-accent);border-radius:0}
    [data-exp="console"] .cn-person-display{font-weight:700;color:var(--nb-ink);line-height:1.25}
    [data-exp="console"] .cn-person-handle{font-size:.9em;color:var(--nb-ink-dim)}
    [data-exp="console"] .cn-person-kind{color:var(--nb-agent);font-weight:700;font-size:.85em;
      text-transform:lowercase}
    [data-exp="console"] .cn-person-bio{padding:.45rem 0;border-block-end:1px dotted var(--nb-rule);
      max-width:76ch}
    [data-exp="console"] .cn-person-section{font-size:.78em;color:var(--nb-ink-faint);letter-spacing:.04em;
      text-transform:lowercase;padding:.35rem 0 .1rem}
    [data-exp="console"] .cn-person-facts{display:flex;flex-direction:column;gap:0;padding:0 0 .25rem}
    [data-exp="console"] .cn-person-fact{display:grid;grid-template-columns:6.5rem minmax(0,1fr);
      gap:.35rem .55rem;align-items:baseline;padding:.12rem 0;border-block-end:1px dotted var(--nb-rule);
      font-size:.92em}
    [data-exp="console"] .cn-person-fact-k{color:var(--nb-ink-faint);text-transform:lowercase}
    [data-exp="console"] .cn-person-fact-v{color:var(--nb-ink);min-width:0;overflow:hidden;
      text-overflow:ellipsis;white-space:nowrap}
    [data-exp="console"] .cn-person-pins{display:flex;flex-direction:column;gap:0}
    [data-exp="console"] .cn-person-pin{display:grid;grid-template-columns:minmax(0,12rem) minmax(0,1fr) auto;
      gap:.35rem .55rem;align-items:baseline;width:100%;box-sizing:border-box;
      padding:.18rem 0;margin:0;border:0;border-block-end:1px dotted var(--nb-rule);
      background:none;font:inherit;color:var(--nb-ink);text-align:start;cursor:pointer;
      min-height:1.9rem;border-radius:0}
    [data-exp="console"] .cn-person-pin:hover,[data-exp="console"] .cn-person-pin:focus-visible{
      background:var(--nb-accent);color:var(--nb-accent-ink);outline:none}
    [data-exp="console"] .cn-person-pin-slug{font-weight:700;overflow:hidden;text-overflow:ellipsis;
      white-space:nowrap}
    [data-exp="console"] .cn-person-pin-blurb{font-size:.9em;color:var(--nb-ink-dim);overflow:hidden;
      text-overflow:ellipsis;white-space:nowrap}
    [data-exp="console"] .cn-person-pin:hover .cn-person-pin-blurb,
    [data-exp="console"] .cn-person-pin:focus-visible .cn-person-pin-blurb{color:inherit;opacity:.9}
    [data-exp="console"] .cn-follow-banner-meta{font-size:.9em;color:var(--nb-ink-dim)}
    [data-exp="console"] .cn-follow-row{display:grid;gap:.2rem .55rem;width:100%;box-sizing:border-box;
      padding:.35rem .55rem .4rem;margin:0;border:0;border-block-end:1px dotted var(--nb-rule);
      background:none;font:inherit;color:var(--nb-ink);text-align:start;
      min-height:2.4rem;border-radius:0}
    [data-exp="console"] .cn-follow-head{display:flex;flex-wrap:wrap;align-items:baseline;gap:.35rem .55rem;
      min-width:0}
    [data-exp="console"] .cn-follow-foot{display:flex;flex-wrap:wrap;align-items:baseline;gap:.35rem .55rem;
      min-width:0}
    [data-exp="console"] .cn-follow-more{font-size:.8em;color:var(--nb-ink-faint);font-weight:700}
    [data-exp="console"] .cn-follow-read,[data-exp="console"] .cn-follow-dismiss{
      font:inherit;font-size:.8em;background:none;border:0;color:var(--nb-ink-dim);cursor:pointer;
      padding:0 .05rem;min-height:1.6rem}
    [data-exp="console"] .cn-follow-read::before,[data-exp="console"] .cn-follow-dismiss::before{content:"[";color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-follow-read::after,[data-exp="console"] .cn-follow-dismiss::after{content:"]";color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-follow-read:hover,[data-exp="console"] .cn-follow-dismiss:hover{
      color:var(--nb-ink);text-decoration:underline}
    [data-exp="console"] .cn-follow-dismiss:hover{color:var(--nb-warn)}
    [data-exp="console"] .cn-follow-row[data-unread=true]{box-shadow:inset 2px 0 0 var(--nb-accent)}
    /* Keyboard cursor: soft wash + rail (distinct from hover fill). */
    [data-exp="console"] .cn-follow-row[aria-current=true],
    [data-exp="console"] .cn-ann-post[aria-current=true],
    [data-exp="console"] .cn-feat-card[aria-current=true],
    [data-exp="console"] .cn-cre-card[aria-current=true]{
      background:color-mix(in srgb,var(--nb-accent) 18%,transparent);
      box-shadow:inset 2px 0 0 var(--nb-accent)}
    [data-exp="console"] .cn-follow-row:hover{
      background:color-mix(in srgb,var(--nb-accent) 10%,transparent)}
    [data-exp="console"] .cn-follow-row[aria-current=true] .cn-follow-when,
    [data-exp="console"] .cn-follow-row[aria-current=true] .cn-follow-where{color:inherit;opacity:.85}
    [data-exp="console"] .cn-follow-when{font-variant-numeric:tabular-nums;color:var(--nb-ink-faint);
      font-size:.85em}
    [data-exp="console"] .cn-follow-who{font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    [data-exp="console"] .cn-follow-row[data-kind=agent] .cn-follow-who{color:var(--nb-agent)}
    [data-exp="console"] .cn-follow-summary{min-width:0;margin:0;overflow:hidden;text-overflow:ellipsis;
      white-space:nowrap;font-size:.92em;max-width:100%}
    [data-exp="console"] .cn-follow-tag{margin-inline-start:.15rem;color:var(--nb-ink-faint);font-size:.85em}

    /* Home showcase: announcements / featured / creators (TUI, not web cards). */
    [data-exp="console"] .cn-ann-post,[data-exp="console"] .cn-feat-card,[data-exp="console"] .cn-cre-card{
      display:flex;flex-direction:column;gap:.35rem;padding:.45rem .55rem .55rem;
      border:0;border-block-end:1px solid var(--nb-rule);background:transparent;border-radius:0;
      min-width:0}
    [data-exp="console"] .cn-ann-post[data-unread=true],
    [data-exp="console"] .cn-feat-card[data-unread=true],
    [data-exp="console"] .cn-cre-card[data-unread=true]{box-shadow:inset 2px 0 0 var(--nb-accent)}
    [data-exp="console"] .cn-ann-head,[data-exp="console"] .cn-feat-head,[data-exp="console"] .cn-cre-head{
      display:flex;flex-wrap:wrap;align-items:baseline;gap:.25rem .45rem;min-width:0}
    [data-exp="console"] .cn-ann-toggle{appearance:none;border:0;background:transparent;font:inherit;
      color:inherit;cursor:pointer;display:flex;flex-wrap:wrap;align-items:baseline;gap:.25rem .45rem;
      padding:0;margin:0;text-align:start;flex:1 1 auto;min-width:0;min-height:1.7rem}
    [data-exp="console"] .cn-ann-toggle:hover .cn-ann-title,
    [data-exp="console"] .cn-ann-toggle:focus-visible .cn-ann-title{text-decoration:underline;outline:none}
    [data-exp="console"] .cn-ann-chev{color:var(--nb-ink-faint);font-weight:700;min-width:0.9rem}
    [data-exp="console"] .cn-ann-pin{color:var(--nb-accent);font-size:.8em;letter-spacing:.04em;text-transform:uppercase}
    [data-exp="console"] .cn-ann-title{font-weight:700;color:var(--nb-ink);min-width:0}
    [data-exp="console"] .cn-ann-body{max-width:72ch;line-height:1.45;color:var(--nb-ink);padding:.15rem 0 .1rem 1.15rem}
    [data-exp="console"] .cn-ann-post[data-collapsed=true] .cn-ann-body{display:none}
    [data-exp="console"] .cn-home-open{appearance:none;border:0;background:transparent;font:inherit;
      color:var(--nb-ink-dim);cursor:pointer;display:inline-flex;align-items:baseline;gap:.35rem;
      padding:.1rem .15rem;min-height:1.7rem;margin-inline-start:auto}
    [data-exp="console"] .cn-home-open:hover,[data-exp="console"] .cn-home-open:focus-visible{
      color:var(--nb-ink);outline:none}
    [data-exp="console"] .cn-home-open:hover .cn-follow-open,
    [data-exp="console"] .cn-home-open:focus-visible .cn-follow-open{text-decoration:underline}
    [data-exp="console"] .cn-feat-slug{font-weight:700;color:var(--nb-ink)}
    [data-exp="console"] .cn-feat-blurb,[data-exp="console"] .cn-cre-why{
      margin:0;font-size:.92em;color:var(--nb-ink-dim);max-width:72ch}
    [data-exp="console"] .cn-feat-summary{display:flex;flex-direction:column;gap:.2rem;max-width:72ch}
    [data-exp="console"] .cn-feat-label{font-size:.8em;letter-spacing:.06em;text-transform:uppercase;
      color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-feat-summary-body{color:var(--nb-ink);line-height:1.4;font-size:.95em}
    [data-exp="console"] .cn-feat-readme{margin:0;max-width:72ch;border:0;padding:0}
    [data-exp="console"] .cn-feat-readme-sum{cursor:pointer;color:var(--nb-ink-dim);font-size:.9em;
      list-style:none}
    [data-exp="console"] .cn-feat-readme-sum::before{content:"[+]";color:var(--nb-ink-faint);margin-inline-end:.35rem}
    [data-exp="console"] .cn-feat-readme[open] .cn-feat-readme-sum::before{content:"[−]"}
    [data-exp="console"] .cn-feat-readme-body{padding:.35rem 0 0;color:var(--nb-ink);line-height:1.4}
    [data-exp="console"] .cn-cre-bio{margin:0;font-size:.92em;color:var(--nb-ink);max-width:72ch;line-height:1.4}
    [data-exp="console"] .cn-cre-chart{margin:0;padding:.2rem 0;font:inherit;font-size:.9em;
      color:var(--nb-live);letter-spacing:-.04em;line-height:1.35;white-space:pre;overflow:auto}
    [data-exp="console"] .cn-cre-card[data-kind=agent] .cn-follow-who{color:var(--nb-agent)}
    [data-exp="console"] .cn-follow-tag::before{content:"· ";color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-follow-where{color:var(--nb-ink-faint);font-size:.82em;white-space:nowrap;
      max-width:12rem;overflow:hidden;text-overflow:ellipsis}
    [data-exp="console"] .cn-follow-open{color:var(--nb-accent);font-weight:700;white-space:nowrap;
      justify-self:end;min-height:0;padding:0}
    [data-exp="console"] .cn-activity-card[data-unread=true]{box-shadow:inset 2px 0 0 var(--nb-accent)}
    [data-exp="console"] .cn-activity-card[data-here=true]{background:var(--nb-surface)}
    [data-exp="console"] .cn-activity-glyph{font-weight:700;color:var(--nb-ink-faint);text-align:center;
      line-height:1.4;font-size:1em;width:1.2rem}
    [data-exp="console"] .cn-activity-card[data-kind=mention] .cn-activity-glyph{color:var(--nb-accent)}
    [data-exp="console"] .cn-activity-card[data-kind=subscription] .cn-activity-glyph{color:var(--nb-signed)}
    [data-exp="console"] .cn-activity-card[data-kind=dm] .cn-activity-glyph{color:var(--nb-agent)}
    [data-exp="console"] .cn-activity-card[data-kind=reply] .cn-activity-glyph{color:var(--nb-live)}
    [data-exp="console"] .cn-activity-main{min-width:0}
    [data-exp="console"] .cn-activity-head{display:flex;flex-wrap:wrap;align-items:baseline;gap:.2rem .55rem}
    [data-exp="console"] .cn-activity-dot{display:inline-block;flex:none;color:var(--nb-accent);
      font-weight:700;line-height:1;width:auto;height:auto;border-radius:0;background:none}
    [data-exp="console"] .cn-activity-dot::before{content:"*"}
    [data-exp="console"] .cn-activity-who{font-weight:700;color:var(--nb-ink)}
    [data-exp="console"] .cn-activity-reason{color:var(--nb-ink-dim);font-size:.9em}
    [data-exp="console"] .cn-activity-when{color:var(--nb-ink-faint);font-size:.85em;margin-inline-start:auto}
    [data-exp="console"] .cn-activity-subject{font-weight:700;margin-block-start:0;color:var(--nb-ink);
      overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    [data-exp="console"] .cn-activity-body{margin:.05rem 0 0;color:var(--nb-ink-dim);max-width:76ch;
      overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    [data-exp="console"] .cn-activity-foot{display:flex;flex-wrap:wrap;align-items:baseline;gap:.25rem .55rem;
      margin-block-start:.1rem}
    [data-exp="console"] .cn-activity-where{color:var(--nb-ink-faint);font-size:.85em}
    [data-exp="console"] .cn-activity-hint{color:var(--nb-ink-faint);font-size:.85em;padding:.4rem .2rem 0}
    [data-exp="console"] .cn-activity-ctx{flex-wrap:wrap}
    [data-exp="console"] .cn-activity-alerts,
    [data-exp="console"] .cn-activity-more{
      display:inline-block;font-size:.85em;color:var(--nb-ink-dim);max-width:100%}
    [data-exp="console"] .cn-activity-alerts > summary,
    [data-exp="console"] .cn-activity-more > summary{
      cursor:pointer;list-style:none;color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-activity-alerts > summary::before,
    [data-exp="console"] .cn-activity-more > summary::before{content:"[";color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-activity-alerts > summary::after,
    [data-exp="console"] .cn-activity-more > summary::after{content:"]";color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-activity-alerts[data-browser-perm=denied] > summary{color:var(--nb-warn)}
    [data-exp="console"] .cn-activity-alerts-how{margin:.35rem 0 0;max-width:42ch;color:var(--nb-ink-dim);
      font-size:.92em;line-height:1.35}
    [data-exp="console"] .cn-activity-filters{display:flex;flex-wrap:wrap;gap:.15rem .35rem;width:100%;margin-block-start:.25rem}
    [data-exp="console"] .cn-activity-count{font-size:.85em;opacity:.85;margin-inline-start:.15rem}
    [data-exp="console"] .cn-activity-watching,
    [data-exp="console"] .cn-activity-hooks{display:flex;flex-wrap:wrap;align-items:center;gap:.3rem .45rem;
      width:100%;margin-block-start:.2rem}
    [data-exp="console"] .cn-activity-sub{font-size:.8em;color:var(--nb-ink-faint);border:0;padding:0;
      min-height:0;display:inline-flex;align-items:center}
    [data-exp="console"] .cn-activity-sub::before{content:"[";color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-activity-sub::after{content:"]";color:var(--nb-ink-faint)}

    /* Space hub cards */
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
    [data-exp="console"] .cn-space-pill{font-size:.75em;border:0;padding:0;color:var(--nb-ink-dim);
      min-height:0;display:inline-flex;align-items:center}
    [data-exp="console"] .cn-space-pill::before{content:"[";color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-space-pill::after{content:"]";color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-space-pill[data-status=connected],
    [data-exp="console"] .cn-space-pill[data-status=connected]::before,
    [data-exp="console"] .cn-space-pill[data-status=connected]::after{color:var(--nb-live)}
    [data-exp="console"] .cn-space-pill[data-status=idle]{color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-space-pill[data-status=offline],
    [data-exp="console"] .cn-space-pill[data-status=offline]::before,
    [data-exp="console"] .cn-space-pill[data-status=offline]::after{color:var(--nb-danger)}
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

    /* Markdown + colourised ASCII (tables, code, marks) — theme via tokens. */
    [data-exp="console"] .nb-md{display:grid;gap:.4rem;max-width:80ch}
    [data-exp="console"] .nb-md-p{margin:0;line-height:1.45}
    [data-exp="console"] .nb-md-h{font-weight:700;letter-spacing:.02em;margin:0;color:var(--nb-ink)}
    [data-exp="console"] .nb-md-h1{font-size:1.1em;color:var(--nb-accent)}
    [data-exp="console"] .nb-md-h2{font-size:1.05em;color:var(--nb-signed)}
    [data-exp="console"] .nb-md-h3,[data-exp="console"] .nb-md-h4{font-size:1em;color:var(--nb-ink)}
    [data-exp="console"] .nb-md-strong{color:var(--nb-ink);font-weight:700}
    [data-exp="console"] .nb-md-em{color:var(--nb-ink-dim);font-style:italic}
    [data-exp="console"] .nb-md-u{text-decoration:underline;text-underline-offset:2px;color:var(--nb-ink)}
    [data-exp="console"] .nb-md-del{color:var(--nb-ink-faint);text-decoration:line-through}
    /* Discord spoilers — blackout until clicked (terminal: reverse video block). */
    [data-exp="console"] .nb-md-spoiler{
      font:inherit;border:0;border-radius:0;padding:0 .15em;margin:0;cursor:pointer;
      background:var(--nb-ink);color:transparent;vertical-align:baseline}
    [data-exp="console"] .nb-md-spoiler:hover{outline:1px dotted var(--nb-ink-faint);outline-offset:1px}
    [data-exp="console"] .nb-md-spoiler[aria-expanded=true],
    [data-exp="console"] .nb-md-spoiler[data-open=true]{
      background:var(--nb-surface);color:var(--nb-ink)}
    [data-exp="console"] .nb-md-code,[data-exp="console"] .nb-md-codeblock{
      font:inherit;color:var(--nb-agent);background:var(--nb-surface);
      border:1px solid var(--nb-rule);padding:0 .3rem;border-radius:0}
    [data-exp="console"] .nb-md-pre{margin:0;padding:.4rem .5rem;overflow:auto;
      background:var(--nb-surface);border:1px solid var(--nb-rule);max-width:100%;
      position:relative;max-height:min(24rem,50vh)}
    [data-exp="console"] .nb-md-pre:focus-visible{outline:2px solid var(--nb-accent);outline-offset:1px}
    [data-exp="console"] .nb-md-pre[data-lang]:not([data-lang=""]):not([data-lang="text"])::before{
      content:attr(data-lang);position:absolute;inset-block-start:.2rem;inset-inline-end:.45rem;
      font-size:.7em;letter-spacing:.06em;text-transform:lowercase;color:var(--nb-ink-faint);
      pointer-events:none}
    [data-exp="console"] .nb-md-pre .nb-md-codeblock{border:0;background:transparent;padding:0;display:block;
      white-space:pre;color:var(--nb-ink)}
    /* Syntax tokens — theme via board inks (no hard-coded neon). */
    [data-exp="console"] .nb-tok-kw{color:var(--nb-accent);font-weight:700}
    [data-exp="console"] .nb-tok-str{color:var(--nb-signed)}
    [data-exp="console"] .nb-tok-path{color:var(--nb-agent)}
    [data-exp="console"] .nb-tok-flag{color:var(--nb-warn)}
    [data-exp="console"] .nb-tok-enum{color:var(--nb-live)}
    [data-exp="console"] .nb-tok-field{color:var(--nb-accent)}
    [data-exp="console"] .nb-tok-num{color:var(--nb-live)}
    [data-exp="console"] .nb-tok-com{color:var(--nb-ink-faint);font-style:italic}
    [data-exp="console"] .nb-tok-fn{color:var(--nb-agent)}
    [data-exp="console"] .nb-tok-type{color:var(--nb-warn)}
    [data-exp="console"] .nb-tok-prop{color:var(--nb-agent)}
    [data-exp="console"] .nb-tok-op{color:var(--nb-ink-dim)}
    [data-exp="console"] .nb-tok-pun{color:var(--nb-ink-faint)}
    [data-exp="console"] .nb-tok-ident{color:var(--nb-ink)}
    [data-exp="console"] .nb-tok-text{color:var(--nb-ink)}
    [data-exp="console"] .nb-tok-add{color:var(--nb-live)}
    [data-exp="console"] .nb-tok-del{color:var(--nb-danger)}
    [data-exp="console"] .nb-ed-ch.nb-tok-kw{color:var(--nb-accent)}
    [data-exp="console"] .nb-ed-ch.nb-tok-str{color:var(--nb-signed)}
    [data-exp="console"] .nb-ed-ch.nb-tok-num{color:var(--nb-live)}
    [data-exp="console"] .nb-ed-ch.nb-tok-com{color:var(--nb-ink-faint)}
    [data-exp="console"] .nb-ed-ch.nb-tok-fn{color:var(--nb-agent)}
    [data-exp="console"] .nb-ed-ch.nb-tok-type{color:var(--nb-warn)}
    [data-exp="console"] .nb-ed-ch.nb-tok-prop{color:var(--nb-agent)}
    [data-exp="console"] .nb-ed-ch.nb-ed-caret{color:var(--nb-accent-ink)}
    [data-exp="console"] .nb-ed-ch.nb-ed-sel{color:var(--nb-accent-ink)}
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
      overflow:hidden;color:var(--nb-ink)}
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
    [data-exp="console"] .cn-actions{display:flex;flex-wrap:wrap;gap:.15rem .45rem;margin-block-start:.1rem}
    [data-exp="console"] .cn-act{background:none;border:0;font:inherit;font-size:.85em;font-weight:700;
      color:var(--nb-ink-faint);cursor:pointer;padding:0;border-radius:0;min-height:0}
    [data-exp="console"] .cn-act::before{content:"[";color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-act::after{content:"]";color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-act:hover{color:var(--nb-ink);text-decoration:underline}
    /* Terminal reactions — [mark n], reverse when yours; ASCII labels only */
    [data-exp="console"] .cn-reacts{display:flex;flex-wrap:wrap;align-items:center;gap:.2rem .3rem;
      margin-block-start:.15rem}
    [data-exp="console"] .cn-react-pill{
      display:inline-flex;align-items:baseline;gap:.25rem;font:inherit;font-size:.82em;
      color:var(--nb-ink-dim);background:none;border:0;border-radius:0;
      min-height:0;padding:0;cursor:pointer}
    [data-exp="console"] .cn-react-pill::before{content:"[";color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-react-pill::after{content:"]";color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-react-pill:hover{color:var(--nb-ink);text-decoration:underline}
    [data-exp="console"] .cn-react-pill:hover::before,
    [data-exp="console"] .cn-react-pill:hover::after{color:var(--nb-ink)}
    [data-exp="console"] .cn-react-pill[aria-pressed=true]{
      color:var(--nb-bg);background:var(--nb-ink);text-decoration:none}
    [data-exp="console"] .cn-react-pill[aria-pressed=true]::before,
    [data-exp="console"] .cn-react-pill[aria-pressed=true]::after{color:var(--nb-bg)}
    [data-exp="console"] .cn-react-mark{font-weight:700;letter-spacing:.02em}
    [data-exp="console"] .cn-react-count{font-weight:700;font-variant-numeric:tabular-nums}
    [data-exp="console"] .cn-react-add{
      font:inherit;font-size:.85em;font-weight:700;color:var(--nb-ink-faint);background:none;
      border:0;border-radius:0;min-width:2rem;min-height:2rem;padding:0 .25rem;cursor:pointer}
    [data-exp="console"] .cn-react-add::before{content:"[";color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-react-add::after{content:"]";color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-react-add:hover,[data-exp="console"] .cn-react-add[aria-expanded=true]{
      color:var(--nb-accent)}
    [data-exp="console"] .cn-react-picker{
      display:none;flex-wrap:wrap;gap:.2rem .35rem;width:100%;margin-block-start:.2rem;
      padding:.25rem 0;background:transparent;border:0;border-block-start:1px dotted var(--nb-rule);
      border-radius:0}
    [data-exp="console"] .cn-react-picker[data-open=true]{display:flex}
    [data-exp="console"] .cn-react-opt{
      font:inherit;font-size:.82em;font-weight:700;color:var(--nb-ink-dim);background:none;border:0;
      border-radius:0;min-width:0;min-height:0;padding:0;cursor:pointer}
    [data-exp="console"] .cn-react-opt::before{content:"[";color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-react-opt::after{content:"]";color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-react-opt:hover{color:var(--nb-ink);text-decoration:underline}
    [data-exp="console"] .cn-react-opt[aria-pressed=true]{color:var(--nb-bg);background:var(--nb-ink)}
    [data-exp="console"] .cn-react-opt[aria-pressed=true]::before,
    [data-exp="console"] .cn-react-opt[aria-pressed=true]::after{color:var(--nb-bg)}
    [data-exp="console"] .cn-react-opt .cn-react-mark{letter-spacing:.02em}
    [data-exp="console"] .cn-act-fold{color:var(--nb-accent)}

    /* Children hang under the parent; rails continue the visual chain. */
    [data-exp="console"] .cn-replies{display:flex;flex-direction:column}

    /* What the channel is, before what it contains. One line of facts. */
    [data-exp="console"] .cn-ctx{display:flex;gap:.7rem;align-items:baseline;flex-wrap:wrap;
      padding:.45rem .8rem;border-block-end:1px solid var(--nb-rule);font-size:.9em}
    [data-exp="console"] .cn-ctx-name{color:var(--nb-ink)}
    [data-exp="console"] .cn-ctx-kind{color:var(--nb-ink-faint);border:0;padding:0;border-radius:0;font-size:.85em}
    [data-exp="console"] .cn-ctx-kind::before{content:"[";color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-ctx-kind::after{content:"]";color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-ctx-fact{color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-thread-ctx .cn-act[data-thread-back]{margin-inline-start:auto}

    [data-exp="console"] .cn-card{padding:.7rem .8rem}
    [data-exp="console"] .cn-fact{display:flex;gap:.7rem;padding:.15rem 0}
    [data-exp="console"] .cn-fact dt{color:var(--nb-ink-faint);min-width:4rem}
    [data-exp="console"] .cn-fact dd{margin:0}

    /* TUI foot: compose label + prompt only. No transcript panel — the page is the terminal. */
    [data-exp="console"] .cn-tui-foot{display:flex;flex-direction:column;min-height:0;min-width:0;
      background:var(--nb-bg);border-block-start:1px solid var(--nb-rule);position:relative;flex:none}
    [data-exp="console"] .cn-tui-foot[data-open=true] .cn-menu{display:block}
    /* Discord-parity voice dock — above compose while connected. */
    [data-exp="console"] .cn-voice-dock{display:grid;grid-template-columns:minmax(0,1fr) auto;
      gap:.35rem .8rem;align-items:center;padding:.35rem .65rem;border-block-start:1px solid var(--nb-rule);
      background:var(--nb-surface);flex:none}
    [data-exp="console"] .cn-voice-dock-meta{display:flex;align-items:baseline;gap:.55rem;min-width:0;
      grid-column:1 / -1}
    [data-exp="console"] .cn-voice-dock-name{color:var(--nb-live);font-size:.85em}
    [data-exp="console"] .cn-voice-rtt{font-size:.75em;color:var(--nb-ink-dim);font-variant-numeric:tabular-nums}
    [data-exp="console"] .cn-voice-mode-tag{font-size:.72em;color:var(--nb-ink-dim);text-transform:uppercase;
      letter-spacing:.04em}
    [data-exp="console"] .cn-voice-roster{display:flex;flex-wrap:wrap;gap:.35rem .55rem;min-width:0}
    [data-exp="console"] .cn-voice-user{font-size:.8em;color:var(--nb-ink-dim);padding:0 .15rem}
    [data-exp="console"] .cn-voice-user[data-speaking=true]{color:var(--nb-live);font-weight:700}
    [data-exp="console"] .cn-voice-user[data-muted=true]{opacity:.55}
    [data-exp="console"] .cn-voice-user[data-self=true]{color:var(--nb-accent)}
    [data-exp="console"] .cn-voice-controls{display:flex;gap:.35rem;flex-wrap:wrap;justify-content:flex-end}
    [data-exp="console"] .cn-voice-act{font:inherit;font-size:.8em;background:none;border:0;color:var(--nb-ink-dim);
      cursor:pointer;padding:0 .1rem}
    [data-exp="console"] .cn-voice-act::before{content:"[";color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-voice-act::after{content:"]";color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-voice-act:hover{color:var(--nb-ink)}
    [data-exp="console"] .cn-voice-act[aria-pressed=true]{color:var(--nb-danger)}
    [data-exp="console"] .cn-voice-join{color:var(--nb-live)}
    [data-exp="console"] .cn-voice-leave:hover{color:var(--nb-danger)}
    [data-exp="console"] .cn-voice-room{padding:.6rem .8rem;display:grid;gap:.55rem}
    [data-exp="console"] .cn-voice-lead{margin:0;color:var(--nb-ink-dim);font-size:.9em;max-width:42ch}
    [data-exp="console"] .cn-voice-status{margin:0;color:var(--nb-live);font-size:.85em}
    [data-exp="console"] .cn-voice-ctx{display:flex;flex-wrap:wrap;align-items:baseline;gap:.45rem}
    [data-exp="console"] .cn-voice-ctx .cn-voice-act{margin-inline-start:auto}
    [data-exp="console"] .cn-item[data-meta=voice] .cn-name{color:var(--nb-live)}
    [data-exp="console"] .cn-item[data-meta=voice] .cn-hint{color:var(--nb-live);opacity:.85}
    /* Session output — dedicated blade (never docked under home/detail content). */
    [data-exp="console"] .cn-blade[data-blade-kind=session]{
      flex:1 1 22rem;max-width:min(28rem,46vw);opacity:1;
      background:color-mix(in srgb,var(--nb-surface) 55%,var(--nb-bg))}
    [data-exp="console"] .cn-blade[data-blade-kind=session][data-session-active=true],
    [data-exp="console"] .cn-blade[data-blade-kind=session][data-focus=true]{
      max-width:none;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--nb-accent) 35%,transparent),
        4px 0 18px color-mix(in srgb,var(--nb-bg) 70%,#000)}
    [data-exp="console"] .cn-blade[data-blade-kind=session] .cn-blade-body{
      display:flex;flex-direction:column;min-height:0}
    [data-exp="console"] .cn-blade-out{flex:1 1 auto;min-height:0;overflow:auto;margin:0;
      padding:.55rem .7rem .75rem;border:0;
      font-size:.9em;background:transparent;line-height:1.5}
    [data-exp="console"] .cn-blade-out:empty{display:none}
    /* Session chat rhythm — turns breathe; tools nest under agent. */
    [data-exp="console"] .cn-blade-out .cn-log{display:flex;flex-direction:column;gap:.4rem}
    [data-exp="console"] .cn-blade-out .cn-line{
      display:grid;grid-template-columns:4.2rem minmax(0,1fr);gap:.65rem;
      align-items:start;padding:.1rem 0}
    [data-exp="console"] .cn-blade-out .cn-line[data-turn=start]{
      margin-block-start:.65rem;padding-block-start:.55rem;
      border-block-start:1px solid color-mix(in srgb,var(--nb-rule) 85%,transparent)}
    [data-exp="console"] .cn-blade-out .cn-line[data-turn=start]:first-child{
      margin-block-start:0;padding-block-start:0;border-block-start:0}
    [data-exp="console"] .cn-blade-out .cn-who{
      text-align:end;font-size:.72em;font-weight:700;letter-spacing:.04em;
      text-transform:lowercase;line-height:1.5;padding-block-start:.2rem;
      color:var(--nb-ink-faint);user-select:none;min-height:1.2rem}
    [data-exp="console"] .cn-blade-out .cn-line[data-kind=user] .cn-who{color:var(--nb-accent)}
    [data-exp="console"] .cn-blade-out .cn-line[data-kind=agent] .cn-who,
    [data-exp="console"] .cn-blade-out .cn-line[data-kind=tool] .cn-who,
    [data-exp="console"] .cn-blade-out .cn-who[data-kind=agent]{color:var(--nb-agent)}
    [data-exp="console"] .cn-blade-out .cn-line[data-kind=error] .cn-who{color:var(--nb-danger)}
    [data-exp="console"] .cn-blade-out .cn-line[data-kind=out] .cn-who{color:var(--nb-ink-faint);font-weight:600}
    [data-exp="console"] .cn-blade-out .cn-body{
      min-width:0;display:flex;flex-direction:column;gap:.3rem;
      color:var(--nb-ink);line-height:1.5}
    [data-exp="console"] .cn-blade-out .cn-msg{
      min-width:0;white-space:pre-wrap;overflow-wrap:anywhere;max-width:72ch}
    [data-exp="console"] .cn-blade-out .cn-line[data-kind=user] .cn-body{
      background:color-mix(in srgb,var(--nb-accent) 10%,var(--nb-surface));
      padding:.4rem .55rem .45rem;border:1px solid color-mix(in srgb,var(--nb-accent) 22%,var(--nb-rule))}
    [data-exp="console"] .cn-blade-out .cn-line[data-kind=agent] .cn-body{
      padding:.15rem .1rem .25rem}
    [data-exp="console"] .cn-blade-out .cn-line[data-kind=out] .cn-msg,
    [data-exp="console"] .cn-blade-out .cn-line[data-kind=progress] .cn-msg{
      color:var(--nb-ink-dim);font-size:.92em}
    [data-exp="console"] .cn-blade-out .cn-line[data-kind=error] .cn-msg{color:var(--nb-danger)}
    [data-exp="console"] .cn-blade-out .cn-line[data-kind=tool]{
      font-size:.88em;opacity:.95}
    [data-exp="console"] .cn-blade-out .cn-line[data-kind=tool] .cn-body{gap:.2rem}
    [data-exp="console"] .cn-blade-out .cn-mode-tag{
      display:inline-block;align-self:flex-start;font-size:.7em;font-weight:700;
      letter-spacing:.06em;text-transform:uppercase;color:var(--nb-ink-faint);
      border:0;padding:0;margin:0;border-radius:0;line-height:1.2}
    [data-exp="console"] .cn-blade-out .cn-mode-tag::before{content:"[";color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-blade-out .cn-mode-tag::after{content:"]";color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-blade-out .cn-mode-tag[data-mode=ai]{color:var(--nb-agent)}
    [data-exp="console"] .cn-blade-out .cn-mode-tag[data-mode=cli]{color:var(--nb-signed)}
    /* Active session chat — accent rail, fill the blade. */
    [data-exp="console"] .cn-blade-out[data-active=true]{
      border-inline-start:2px solid var(--nb-accent);
      background:color-mix(in srgb,var(--nb-surface) 70%,transparent);
      box-shadow:none;outline:none}
    [data-exp="console"] .cn-blade-out[data-active=true]:focus-visible{
      outline:1px solid color-mix(in srgb,var(--nb-agent) 50%,transparent);outline-offset:-2px}
    [data-exp="console"] .cn-prompt-stack{position:relative;min-width:0}
    [data-exp="console"] .cn-menu{position:absolute;inset-block-end:100%;inset-inline:0;
      max-height:14rem;overflow:auto;background:var(--nb-bg);border:1px solid var(--nb-rule);
      border-block-end:0;display:none;z-index:5}
    [data-exp="console"] .cn-compose-label{font-size:.8em;color:var(--nb-ink-dim);padding:.2rem .8rem 0;
      display:flex;align-items:baseline;gap:.45rem;flex-wrap:wrap}
    [data-exp="console"] .cn-compose-label[data-compose-kind=reply]{color:var(--nb-accent)}
    [data-exp="console"] .cn-compose-label[data-compose-kind=post]{color:var(--nb-signed)}
    [data-exp="console"] .cn-compose-label[data-compose-kind=dm]{color:var(--nb-agent)}
    [data-exp="console"] .cn-compose-label::before{content:"[";color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-compose-label::after{content:"]";color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-compose-clear{background:none;border:0;font:inherit;font-size:.85em;
      color:var(--nb-ink-faint);cursor:pointer;padding:0;margin-inline-start:.35rem}
    [data-exp="console"] .cn-compose-clear:hover{color:var(--nb-ink);text-decoration:underline}

    [data-exp="console"] .cn-panel-tab{/* also used as workspace tabs */}
    [data-exp="console"] .cn-tab-close{background:none;border:0;font:inherit;color:var(--nb-ink-faint);
      cursor:pointer;padding:0 .15rem;line-height:1;border-radius:0}
    [data-exp="console"] .cn-tab-close:hover{color:var(--nb-danger)}
    [data-exp="console"] .cn-tab-new{font-size:1em;letter-spacing:0;min-width:1.9rem;justify-content:center;
      color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-tab-new:hover{color:var(--nb-accent);border-block-end-color:transparent}

    [data-exp="console"] .cn-prompt-stack{position:relative;min-width:0}
    [data-exp="console"] .cn-menu-head{padding:.3rem .8rem;font-size:.78em;color:var(--nb-ink-faint);
      border-block-end:1px solid var(--nb-rule);letter-spacing:.06em;text-transform:uppercase}

    /* Right-click popup menu — TTY chrome (do not reuse .cn-ctx detail headers). */
    [data-exp="console"] .cn-ctxmenu{position:fixed;z-index:60;min-width:14rem;max-width:min(22rem,92vw);
      background:var(--nb-bg);border:1px solid var(--nb-rule);border-radius:0;padding:.2rem 0;
      box-shadow:none;color:var(--nb-ink);display:block}
    [data-exp="console"] .cn-ctxmenu-head{display:flex;gap:.45rem;align-items:baseline;flex-wrap:wrap;
      padding:.25rem .7rem .35rem;font-size:.72em;letter-spacing:.06em;text-transform:uppercase;
      color:var(--nb-ink-faint);border-block-end:1px solid var(--nb-rule)}
    [data-exp="console"] .cn-ctxmenu-kind{color:var(--nb-accent)}
    [data-exp="console"] .cn-ctxmenu-name{color:var(--nb-ink-dim);text-transform:none;letter-spacing:0;
      font-size:1.05em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:16rem}
    [data-exp="console"] .cn-ctxmenu-item{display:block;width:100%;text-align:start;font:inherit;
      background:none;border:0;border-radius:0;color:var(--nb-ink);cursor:pointer;
      padding:.28rem .7rem;line-height:1.35}
    [data-exp="console"] .cn-ctxmenu-item::before{content:"[";color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-ctxmenu-item::after{content:"]";color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-ctxmenu-item:hover,[data-exp="console"] .cn-ctxmenu-item:focus-visible{
      background:var(--nb-accent);color:var(--nb-accent-ink);outline:none}
    [data-exp="console"] .cn-ctxmenu-item:hover::before,[data-exp="console"] .cn-ctxmenu-item:hover::after,
    [data-exp="console"] .cn-ctxmenu-item:focus-visible::before,
    [data-exp="console"] .cn-ctxmenu-item:focus-visible::after{color:inherit;opacity:.8}
    [data-exp="console"] .cn-ctxmenu-prompt{color:var(--nb-accent);font-weight:700}
    [data-exp="console"] .cn-ctxmenu-sep{height:0;border:0;border-block-start:1px solid var(--nb-rule);
      margin:.2rem 0}
    [data-exp="console"] .cn-ctx-bound-tray{border-block-start:1px solid var(--nb-rule)}
    [data-exp="console"] .cn-ctx-bound-chip{
      display:inline-flex;align-items:center;gap:.25rem;font:inherit;font-size:.78em;
      color:var(--nb-accent);background:none;border:0;border-radius:0;padding:0;max-width:100%;
      min-height:1.4rem}
    [data-exp="console"] .cn-ctx-bound-chip::before{content:"[";color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-ctx-bound-chip::after{content:"]";color:var(--nb-ink-faint)}

    /* Hotkey cheatsheet — Ctrl+Space overlay. */
    [data-exp="console"] .cn-help{position:absolute;inset:0;z-index:30;display:none;
      align-items:center;justify-content:center;padding:1rem;
      background:color-mix(in srgb,var(--nb-bg) 78%,transparent);backdrop-filter:blur(2px)}
    [data-exp="console"] .cn-help[data-open=true]{display:flex}
    [data-exp="console"] .cn-help-card{width:min(36rem,100%);max-height:min(84vh,42rem);overflow:auto;
      background:var(--nb-bg);border:1px solid var(--nb-rule);padding:.7rem .9rem 1rem;
      box-shadow:none;border-radius:0;max-width:100%;box-sizing:border-box}
    @media (max-width:40rem){
      [data-exp="console"] .cn-help{padding:.45rem;align-items:stretch}
      [data-exp="console"] .cn-help-card{width:100%;max-height:min(88vh,100%);padding:.55rem .6rem .8rem}
      [data-exp="console"] .cn-help-row{grid-template-columns:minmax(5.5rem,8rem) minmax(0,1fr);gap:.4rem .55rem;font-size:.84em}
    }
    [data-exp="console"] .cn-help-head{display:flex;align-items:baseline;gap:.7rem;flex-wrap:wrap;
      margin-block-end:.4rem}
    [data-exp="console"] .cn-help-head b{color:var(--nb-ink);letter-spacing:.08em;font-size:.9em}
    [data-exp="console"] .cn-help-scope{color:var(--nb-accent);font-size:.78em;letter-spacing:.06em;
      text-transform:uppercase}
    [data-exp="console"] .cn-help-head .cn-esc{margin-inline-start:auto}
    [data-exp="console"] .cn-help-chips{display:flex;flex-wrap:wrap;gap:.25rem;margin-block-end:.45rem}
    [data-exp="console"] .cn-help-chip{font-size:.75em;color:var(--nb-ink-dim);border:0;
      background:none;padding:0;border-radius:0;max-width:100%;
      overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    [data-exp="console"] .cn-help-chip::before{content:"[";color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-help-chip::after{content:"]";color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-help-lead{margin:0 0 .65rem;font-size:.82em;color:var(--nb-ink-faint);
      padding-block-end:.45rem;border-block-end:1px solid var(--nb-rule)}
    [data-exp="console"] .cn-help-empty{color:var(--nb-ink-faint);margin:0;padding:.4rem 0}
    [data-exp="console"] .cn-help-grid{display:flex;flex-direction:column;gap:1rem}
    [data-exp="console"] .cn-help-group h3{margin:0 0 .35rem;font-size:.75em;font-weight:700;
      letter-spacing:.1em;text-transform:uppercase;color:var(--nb-accent)}
    [data-exp="console"] .cn-help-row{display:grid;grid-template-columns:minmax(10rem,13rem) minmax(0,1fr);
      gap:.65rem 1rem;align-items:baseline;padding:.14rem 0;font-size:.9em}
    [data-exp="console"] .cn-help-key{color:var(--nb-ink);font-variant-numeric:tabular-nums;
      white-space:normal;overflow-wrap:anywhere}
    [data-exp="console"] .cn-help-key kbd{display:inline;border:0;
      background:none;padding:0;margin-inline-end:.05rem;border-radius:0;
      font:inherit;font-size:.85em;color:var(--nb-ink)}
    [data-exp="console"] .cn-help-key kbd::before{content:"[";color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-help-key kbd::after{content:"]";color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-help-desc{color:var(--nb-ink-dim);line-height:1.35;
      overflow-wrap:break-word}
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
    [data-exp="console"] .cn-mode{font:inherit;background:none;border:0;
      color:var(--nb-ink-dim);cursor:pointer;padding:0 .05rem;min-height:1.5rem;border-radius:0}
    [data-exp="console"] .cn-mode::before{content:"[";color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-mode::after{content:"]";color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-mode[aria-pressed=true]{background:var(--nb-ink);color:var(--nb-bg)}
    [data-exp="console"] .cn-mode[aria-pressed=true]::before,
    [data-exp="console"] .cn-mode[aria-pressed=true]::after{color:var(--nb-bg)}
    /* File attach for chat context — paperclip next to the prompt. */
    [data-exp="console"] .cn-attach{font:inherit;background:none;border:0;
      color:var(--nb-ink-dim);cursor:pointer;padding:0 .05rem;min-height:1.5rem;min-width:1.5rem;
      border-radius:0;line-height:1;flex:none}
    [data-exp="console"] .cn-attach::before{content:"[";color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-attach::after{content:"]";color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-attach:hover{color:var(--nb-ink);text-decoration:underline}
    [data-exp="console"] .cn-attach[data-count]:not([data-count="0"]){color:var(--nb-accent)}
    [data-exp="console"] .cn-attach[data-count]:not([data-count="0"])::before,
    [data-exp="console"] .cn-attach[data-count]:not([data-count="0"])::after{color:var(--nb-accent)}
    [data-exp="console"] .cn-attach-input{position:absolute;width:1px;height:1px;opacity:0;overflow:hidden;
      clip:rect(0,0,0,0);pointer-events:none}
    [data-exp="console"] .cn-attach-tray{display:flex;flex-wrap:wrap;align-items:center;gap:.35rem;
      padding:.3rem .8rem 0;border-block-start:1px solid var(--nb-rule);background:var(--nb-bg)}
    [data-exp="console"] .cn-attach-chip{
      display:inline-flex;align-items:center;gap:.25rem;font:inherit;font-size:.78em;
      color:var(--nb-ink-dim);background:none;border:0;
      border-radius:0;padding:0;max-width:100%;min-height:1.4rem}
    [data-exp="console"] .cn-attach-chip::before{content:"[";color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-attach-chip::after{content:"]";color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-attach-chip[data-kind=image],
    [data-exp="console"] .cn-attach-chip[data-kind=image]::before,
    [data-exp="console"] .cn-attach-chip[data-kind=image]::after{color:var(--nb-signed)}
    [data-exp="console"] .cn-attach-chip[data-kind=text],
    [data-exp="console"] .cn-attach-chip[data-kind=text]::before,
    [data-exp="console"] .cn-attach-chip[data-kind=text]::after{color:var(--nb-agent)}
    [data-exp="console"] .cn-attach-chip[data-error=true],
    [data-exp="console"] .cn-attach-chip[data-error=true]::before,
    [data-exp="console"] .cn-attach-chip[data-error=true]::after{color:var(--nb-danger)}
    [data-exp="console"] .cn-attach-chip-sent{padding-inline:0;opacity:.9}
    [data-exp="console"] .cn-attach-thumb{width:1.2rem;height:1.2rem;object-fit:cover;border-radius:0;
      border:1px solid var(--nb-rule);flex:none}
    [data-exp="console"] .cn-attach-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:18ch}
    [data-exp="console"] .cn-attach-rm{font:inherit;background:none;border:0;color:var(--nb-ink-faint);
      cursor:pointer;padding:0 .2rem;line-height:1;min-width:1.2rem;min-height:1.2rem}
    [data-exp="console"] .cn-attach-rm:hover{color:var(--nb-danger)}
    [data-exp="console"] .cn-attach-clear{font:inherit;font-size:.75em;background:none;border:0;
      color:var(--nb-ink-faint);cursor:pointer;text-decoration:underline;text-underline-offset:2px;
      padding:.1rem .2rem}
    [data-exp="console"] .cn-attach-sent{display:flex;flex-wrap:wrap;gap:.3rem;margin-block-start:.3rem}
    /* Speech-to-text mic: always painted; muted until on-device model is ready. */
    [data-exp="console"] .cn-mic{font:inherit;background:none;border:0;
      color:var(--nb-ink-dim);cursor:pointer;padding:0 .05rem;min-height:1.5rem;min-width:1.5rem;
      border-radius:0;line-height:0;flex:none;
      display:inline-flex;align-items:center;justify-content:center}
    [data-exp="console"] .cn-mic::before{content:"[";color:var(--nb-ink-faint);font-size:.85em;line-height:1}
    [data-exp="console"] .cn-mic::after{content:"]";color:var(--nb-ink-faint);font-size:.85em;line-height:1}
    [data-exp="console"] .cn-mic .nb-ico{width:16px;height:16px;display:block;
      image-rendering:pixelated;image-rendering:crisp-edges;flex:none}
    [data-exp="console"] .cn-mic:hover{color:var(--nb-ink)}
    [data-exp="console"] .cn-mic[data-ready=false]{color:var(--nb-ink-faint);opacity:.55;cursor:help}
    [data-exp="console"] .cn-mic[data-ready=false]:hover{color:var(--nb-warn);opacity:.9}
    [data-exp="console"] .cn-mic[data-avail=downloading],
    [data-exp="console"] .cn-mic[data-avail=downloadable]{color:var(--nb-warn);opacity:.85}
    [data-exp="console"] .cn-mic[aria-pressed=true],
    [data-exp="console"] .cn-mic[data-listening=true]{background:var(--nb-danger);color:var(--nb-accent-ink);opacity:1}
    [data-exp="console"] .cn-mic[aria-pressed=true]::before,
    [data-exp="console"] .cn-mic[aria-pressed=true]::after,
    [data-exp="console"] .cn-mic[data-listening=true]::before,
    [data-exp="console"] .cn-mic[data-listening=true]::after{color:var(--nb-accent-ink)}
    [data-exp="console"] .cn-prompt[data-speech=ptt],
    [data-exp="console"] .cn-prompt[data-speech=toggle]{box-shadow:inset 0 0 0 1px var(--nb-live)}
    [data-exp="console"] .cn-prompt[data-voice-intent=commands]{box-shadow:inset 0 0 0 1px var(--nb-accent)}
    [data-exp="console"] .cn-speech-tag{font-size:.72em;color:var(--nb-live);letter-spacing:.04em;
      text-transform:uppercase;white-space:nowrap;flex:none}
    [data-exp="console"] .cn-speech-tag[data-avail=off],
    [data-exp="console"] .cn-speech-tag[data-avail=absent],
    [data-exp="console"] .cn-speech-tag[data-avail=unavailable]{color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-speech-tag[data-avail=downloadable],
    [data-exp="console"] .cn-speech-tag[data-avail=downloading]{color:var(--nb-warn)}
    [data-exp="console"] .cn-voice-intent{font:inherit;font-size:.72em;background:none;border:0;
      color:var(--nb-ink-dim);cursor:pointer;padding:0 .15rem;letter-spacing:.04em;text-transform:lowercase}
    [data-exp="console"] .cn-voice-intent::before{content:"[";color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-voice-intent::after{content:"]";color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-voice-intent[data-intent=commands]{color:var(--nb-accent)}
    [data-exp="console"] .cn-voice-intent[data-intent=dictation]{color:var(--nb-live)}
    [data-exp="console"] .cn-voice-intent:hover{color:var(--nb-ink)}
    /* Listening state is a solid live mark — no infinite pulse (contract forbids forever animations). */
    [data-exp="console"] .cn-mic[data-listening=true]{box-shadow:none}
    /* Session output (fallback if used outside the session blade). */
    [data-exp="console"] .cn-out .cn-log{display:flex;flex-direction:column;gap:.4rem}
    [data-exp="console"] .cn-line{display:grid;grid-template-columns:4.2rem minmax(0,1fr);gap:.65rem;
      align-items:start;padding:.12rem 0}
    [data-exp="console"] .cn-line[data-kind=banner]{display:block;padding:.15rem 0 .35rem}
    [data-exp="console"] .cn-banner{margin:0;font:inherit;font-size:.85em;color:var(--nb-ink-faint);
      white-space:pre;overflow-x:auto;line-height:1.35}
    [data-exp="console"] .cn-who{text-align:end;font-size:.72em;font-weight:700;color:var(--nb-ink-faint);
      line-height:1.5;padding-block-start:.05rem;user-select:none;letter-spacing:.04em;
      text-transform:lowercase}
    [data-exp="console"] .cn-line[data-kind=user] .cn-who{color:var(--nb-accent)}
    [data-exp="console"] .cn-who[data-kind=agent],
    [data-exp="console"] .cn-line[data-kind=agent] .cn-who,
    [data-exp="console"] .cn-line[data-kind=tool] .cn-who{color:var(--nb-agent)}
    [data-exp="console"] .cn-line[data-kind=error] .cn-who{color:var(--nb-danger)}
    [data-exp="console"] .cn-body{min-width:0;color:var(--nb-ink);line-height:1.5}
    [data-exp="console"] .cn-msg{min-width:0;white-space:pre-wrap;overflow-wrap:anywhere}
    [data-exp="console"] .cn-line[data-kind=out] .cn-msg,
    [data-exp="console"] .cn-line[data-kind=progress] .cn-msg{color:var(--nb-ink-dim)}
    [data-exp="console"] .cn-line[data-kind=error] .cn-msg{color:var(--nb-danger)}
    /* legacy body text nodes (pre-msg wrap) */
    [data-exp="console"] .cn-line[data-kind=out] .cn-body,
    [data-exp="console"] .cn-line[data-kind=progress] .cn-body{color:var(--nb-ink-dim)}
    [data-exp="console"] .cn-line[data-kind=error] .cn-body{color:var(--nb-danger)}
    /* Board-wide Lucene search hits — color-coded marks, clickable paths */
    [data-exp="console"] .cn-search-results{display:grid;gap:.2rem;white-space:normal;max-width:88ch}
    [data-exp="console"] .cn-search-head{color:var(--nb-ink-dim);font-size:.92em;margin-block-end:.15rem}
    [data-exp="console"] .cn-search-count{color:var(--nb-accent);font-weight:700}
    [data-exp="console"] .cn-search-q{color:var(--nb-signed);font-weight:700}
    [data-exp="console"] .cn-search-more{color:var(--nb-ink-faint);font-size:.85em}
    [data-exp="console"] .cn-search-empty{color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-search-hit{
      display:grid;grid-template-columns:1.6rem minmax(0,1fr);gap:.15rem .45rem;
      align-items:baseline;width:100%;background:none;border:0;border-block-end:1px dotted var(--nb-rule);
      font:inherit;font-size:.92em;color:var(--nb-ink);cursor:pointer;text-align:start;
      padding:.2rem .15rem;border-radius:0}
    [data-exp="console"] .cn-search-hit:hover{background:var(--nb-surface);border-color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-search-idx{color:var(--nb-ink-faint);font-variant-numeric:tabular-nums}
    [data-exp="console"] .cn-search-meta{display:flex;flex-wrap:wrap;align-items:baseline;gap:.25rem .55rem;
      min-width:0}
    [data-exp="console"] .cn-search-kind{color:var(--nb-agent);font-size:.78em;font-weight:700;
      text-transform:lowercase}
    [data-exp="console"] .cn-search-where{color:var(--nb-accent);font-weight:700}
    [data-exp="console"] .cn-search-who{color:var(--nb-signed);font-weight:700}
    [data-exp="console"] .cn-search-state{font-size:.78em;color:var(--nb-ink-faint)}
    [data-exp="console"] .cn-search-state[data-state=needs-review]{color:var(--nb-warn)}
    [data-exp="console"] .cn-search-state[data-state=promoted]{color:var(--nb-accent)}
    [data-exp="console"] .cn-search-state[data-state=signed]{color:var(--nb-signed)}
    [data-exp="console"] .cn-search-snip{grid-column:2;color:var(--nb-ink-dim);
      overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    [data-exp="console"] .cn-search-hint{color:var(--nb-ink-faint);font-size:.85em}
    [data-exp="console"] .cn-search-mark{
      color:var(--nb-accent-ink, var(--nb-ink));background:var(--nb-accent);
      padding:0 .12em;font-weight:700;border-radius:0}
    [data-exp="console"] .cn-mode-tag{display:inline-block;font-size:.75em;color:var(--nb-ink-faint);
      border:1px solid var(--nb-rule);padding:0 .3rem;margin-inline-end:.25rem;border-radius:var(--nb-radius);
      vertical-align:baseline;text-transform:lowercase}
    /* Session blade overrides the generic bordered mode chip. */
    [data-exp="console"] .cn-blade-out .cn-mode-tag{border:0;padding:0;margin:0;border-radius:0;
      font-size:.7em;font-weight:700;letter-spacing:.06em;text-transform:uppercase}
    [data-exp="console"] .cn-tool-sum{display:flex;flex-wrap:wrap;align-items:baseline;gap:.35rem .55rem;
      width:100%;background:none;border:0;border-block-end:1px dotted var(--nb-rule);font:inherit;font-size:.9em;
      color:var(--nb-ink);cursor:pointer;text-align:start;padding:.2rem .2rem;border-radius:0;
      min-height:1.7rem}
    [data-exp="console"] .cn-tool-sum:hover{background:var(--nb-surface);border-color:var(--nb-ink-faint)}
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
    [data-exp="console"] .cn-input-wrap{position:relative;flex:1;min-width:0;min-height:1.5rem}
    [data-exp="console"] .cn-cli-mirror,[data-exp="console"] .cn-ghost{
      position:absolute;inset:0;pointer-events:none;white-space:pre;overflow:hidden;
      font:inherit;line-height:inherit;display:block}
    [data-exp="console"] .cn-ghost-rest{color:var(--nb-ink-faint);opacity:.85}
    [data-exp="console"] .cn-input{width:100%;background:transparent;border:0;
      color:transparent;caret-color:var(--nb-ink);font:inherit;outline:0;position:relative;
      z-index:1}
    [data-exp="console"] .cn-input::selection{
      background:color-mix(in srgb,var(--nb-accent) 40%,transparent);color:transparent}

    /* Touch is a peer, not an afterthought: every control clears the 32px floor
       wherever the pointer is coarse, which is also where the keyboard is not
       available to compensate. */
    @media (pointer:coarse),(max-width:900px){
      [data-exp="console"] .cn-item{min-height:2.5rem;padding-block:.4rem}
      [data-exp="console"] .cn-sort,[data-exp="console"] .cn-share,
      [data-exp="console"] .cn-activity-filter,[data-exp="console"] .cn-feed-q-btn{min-height:2.25rem;padding-inline:.2rem}
      [data-exp="console"] .cn-crumb{min-height:2.25rem;padding-inline:.45rem}
      [data-exp="console"] .cn-cand{min-height:2.5rem;align-items:center}
      [data-exp="console"] .cn-path{gap:.25rem}
      [data-exp="console"] .cn-panel-act,[data-exp="console"] .cn-pane-act{min-width:2.25rem;min-height:2.25rem}
      [data-exp="console"] .cn-panel-tab{min-height:2.25rem}
      [data-exp="console"] .cn-rail{width:1.25ch;min-height:2rem}
      [data-exp="console"] .cn-vup,[data-exp="console"] .cn-vdn,[data-exp="console"] .cn-pm{
        min-height:2rem;padding-block:.25rem}
      [data-exp="console"] .cn-act,[data-exp="console"] .cn-react-pill,
      [data-exp="console"] .cn-react-add,[data-exp="console"] .cn-react-opt{min-height:2rem}
    }`,

    render: function (state) {
      var extra = state.merged;
      var path = state.path || "/";
      var parts = MAP.split(path);
      var listing = navListing(state);
      var here = listing.here;
      var selected = listing.selected;
      var listPath = listing.listPath;
      var blades = buildBladeStack(state);
      // Focus maps onto a blade index; clamp if the stack shrank after a close.
      var focusBlade = Math.min(state.focus != null ? state.focus : blades.length - 2,
        blades.length - 1);
      if (state.sessionOutFocus) {
        for (var sfi = 0; sfi < blades.length; sfi++) {
          if (blades[sfi].kind === "session") {
            focusBlade = sfi;
            break;
          }
        }
      }

      var sort = state.sort || "hot";
      var votes = state.votes || {};
      var preview;
      var ctxLabel = null;
      var activityFilter = null;
      var showingFollow = state.detailOpen === false;
      // Closed selection detail → Following timeline (nav stays a sidebar).
      if (showingFollow) {
        preview = viewFollowingFeed(state);
      } else if (parts[0] === "notifications" && parts[1] &&
          (parts[1] === "all" || parts[1] === "mentions" || parts[1] === "subscribed" ||
           parts[1] === "hooks" || parts[1] === "hook")) {
        activityFilter = parts[1] === "hook" ? "hooks" : parts[1];
        var markNotif = selected && selected.notification
          ? selected.name
          : (selected && selected.name) || null;
        preview = viewNotifications(here, markNotif);
      } else if (selected && selected.kind === "channel") {
        // Channel selected from …/channels — preview its feed (nav stays put).
        var chPreviewPath = MAP.resolve(listPath, selected.name);
        ctxLabel = selected.name;
        if (selected.voice && selected.channel) {
          preview = renderVoiceRoom(selected.channel, state);
        } else {
          var chFeed = detailFeedEntries(chPreviewPath, extra);
          var chMark = state.threadFocus || state.feedMark || null;
          var chEdPost = state.editor && state.editor.focused && state.editor.active
            ? chFeed.find(function (e) {
              return e.post && state.editor.active.path === MAP.resolve(chPreviewPath, e.name);
            })
            : null;
          if (chEdPost) {
            preview = viewFileEditor(chEdPost, state.editor.active.path, state);
          } else if (state.threadFocus) {
            preview = viewTree(chFeed, state.threadFocus, state.folded, sort, votes,
              state.reactions, state.reposts, state.reactPick, null, { threadOf: state.threadFocus });
          } else {
            preview = viewTree(chFeed, chMark, state.folded, sort, votes,
              state.reactions, state.reposts, state.reactPick, state.feedQuery);
          }
        }
      } else if (selected && selected.kind === "dir") {
        var childPath = MAP.resolve(listPath, selected.name);
        var child = MAP.list(childPath, extra) || [];
        // Notifications filter dir selected from /notifications → show that feed.
        if (parts[0] === "notifications" && !parts[1] && selected &&
            (selected.name === "all" || selected.name === "mentions" ||
             selected.name === "subscribed" || selected.name === "hooks")) {
          activityFilter = selected.name;
          preview = viewNotifications(child, null);
        } else {
          preview = viewTree(child, null, state.folded, sort, votes,
            state.reactions, state.reposts, state.reactPick, state.feedQuery);
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
        // Selecting a DM under /dms shows who you are talking to before messages.
        if (parts[0] === "dms" && !parts[1] && selected) {
          ctxLabel = { dm: selected.name };
          preview = viewPersonPane(selected.name, extra, state, sort, votes);
        }
      } else if (selected && selected.post) {
        // Posts still listed in nav (e.g. space feed) — detail shows the feed/thread.
        var postPath = MAP.resolve(listPath, selected.name);
        var ed = state.editor;
        var feedPath = MAP.channelFeedPath ? MAP.channelFeedPath(path) : path;
        var feedEntries = detailFeedEntries(feedPath, extra);
        if (!feedEntries.length) feedEntries = here;
        if (ed && ed.focused && ed.active && ed.active.path === postPath) {
          preview = viewFileEditor(selected, postPath, state);
        } else if (state.threadFocus) {
          preview = viewTree(feedEntries, state.feedMark || state.threadFocus, state.folded, sort, votes,
            state.reactions, state.reposts, state.reactPick, null, { threadOf: state.threadFocus });
        } else {
          preview = viewTree(feedEntries, selected.post.id, state.folded, sort, votes,
            state.reactions, state.reposts, state.reactPick, state.feedQuery);
        }
      } else if (
        (parts[0] === "projects" && parts[2] === "channels" && parts[3]) ||
        (parts[0] === "spaces" && parts[2] === "channels" && parts[3])
      ) {
        // Channel address with no channel row selected — feed lives in detail.
        var insideFeed = detailFeedEntries(
          MAP.channelFeedPath ? MAP.channelFeedPath(path) : path,
          extra,
        );
        var insideMark = state.threadFocus || state.feedMark || null;
        var edPost = state.editor && state.editor.focused && state.editor.active
          ? insideFeed.find(function (e) {
            return e.post && state.editor.active.path === MAP.resolve(path, e.name);
          })
          : null;
        if (edPost) {
          preview = viewFileEditor(edPost, state.editor.active.path, state);
        } else if (state.threadFocus) {
          preview = viewTree(insideFeed, state.feedMark || state.threadFocus, state.folded, sort, votes,
            state.reactions, state.reposts, state.reactPick, null, { threadOf: state.threadFocus });
        } else {
          preview = viewTree(insideFeed, insideMark, state.folded, sort, votes,
            state.reactions, state.reposts, state.reactPick, state.feedQuery);
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
        // Board or project members roll: messages by default, profile via toggle.
        var dmPeer = selected.openDm || selected.name;
        preview = viewPersonPane(dmPeer, extra, state, sort, votes);
        ctxLabel = { dm: dmPeer };
      } else if (selected && selected.voice && selected.channel) {
        preview = renderVoiceRoom(selected.channel, state);
      } else if (selected && isEditableFile(selected)) {
        preview = viewFileEditor(selected, MAP.resolve(listPath, selected.name), state);
      } else if (selected && (selected.agent || selected.agentFile ||
          selected.agentSkill || selected.agentTool)) {
        preview = viewAgent(selected, MAP.resolve(listPath, selected.name));
      } else {
        preview = viewEntry(selected, MAP.resolve(listPath, selected ? selected.name : ""), state);
      }
      // Standing inside a channel keeps its context above the conversation.
      if (!showingFollow && !ctxLabel && parts[0] === "projects" && parts[2] === "channels" && parts[3]) {
        ctxLabel = parts[3];
      }
      // Standing inside a DM thread keeps peer facts above the conversation.
      if (!showingFollow && !ctxLabel && parts[0] === "dms" && parts[1]) {
        ctxLabel = { dm: parts[1] };
      }
      // Person profile toggle replaces the message tree while still on /dms/<peer>.
      if (!showingFollow && parts[0] === "dms" && parts[1] &&
          state.personPane === "profile") {
        preview = viewPersonProfile(parts[1]);
        ctxLabel = { dm: parts[1] };
      }
      if (showingFollow) {
        // Following feed is self-contained — no channel/space strips.
      } else if (state.threadFocus) {
        var threadChan = (parts[0] === "projects" && parts[2] === "channels" && parts[3])
          ? parts[3] : null;
        var focusPost = null;
        var threadPool = detailFeedEntries(
          MAP.channelFeedPath ? MAP.channelFeedPath(path) : path,
          extra,
        );
        if (!threadPool.length) threadPool = here || [];
        threadPool.some(function (e) {
          if (e.post && e.post.id === state.threadFocus) { focusPost = e.post; return true; }
          return false;
        });
        var rootWho = focusPost ? focusPost.who : null;
        if (focusPost && focusPost.re) {
          threadPool.some(function (e) {
            if (e.post && e.post.id === focusPost.re) { rootWho = e.post.who; return true; }
            return false;
          });
        }
        preview = threadContextStrip(threadChan, state.threadFocus, rootWho) + (preview || "");
      } else if (activityFilter) {
        preview = notificationsContextStrip(activityFilter, state) + preview;
      } else if (parts[0] === "notifications" && !parts[1]) {
        preview = notificationsContextStrip("all", state) + (preview || "");
      } else if (parts[0] === "spaces" && parts[1]) {
        preview = spaceContextStrip(parts[1], parts[2] || null) + (preview || "");
      } else if (ctxLabel) {
        if (ctxLabel.dm) preview = dmContextStrip(ctxLabel.dm, extra, state) + preview;
        else preview = contextStrip(ctxLabel, extra) + preview;
      }

      // Selecting a space from the catalogue: show about card in preview.
      if (!showingFollow && parts[0] === "spaces" && !parts[1] && selected && selected.space) {
        preview = spaceContextStrip(selected.space.id, null) + viewSpaceAbout(selected.space,
          MAP.resolve(path, selected.name));
      }

      var crumbs = ['<button type="button" class="cn-crumb" data-goto="/">board</button>'];
      parts.forEach(function (seg, i) {
        crumbs.push('<span class="cn-sep">/</span>');
        crumbs.push('<button type="button" class="cn-crumb" data-goto="' +
          esc(MAP.join(parts.slice(0, i + 1))) + '">' + esc(seg) + "</button>");
      });
      if (state.cdPreviewPath) {
        crumbs.push('<span class="cn-path-preview" data-cd-preview role="status">' +
          "[preview · Enter accept · Esc cancel]</span>");
      }

      // Sort / Lucene bar + feed-scoped new-posts notice — not inside a thread.
      if (!showingFollow && !state.threadFocus && isFeedSortContext(parts, selected, extra)) {
        preview = feedBarHtml(state, sort) + feedNoticeHtml(state) + (preview || "");
      }

      // Session CLI/AI output — dedicated session blade only (never under home/detail).
      var sessionBody = "";
      var useful = usefulSessionLines(state.lines);
      if (useful.length) {
        var transcript = renderTranscript(useful.slice(-60), state.openTools || {});
        var outActive = !!state.sessionOutFocus;
        sessionBody =
          '<div class="cn-out cn-blade-out" data-key="out" data-active="' +
          (outActive ? "true" : "false") + '"' +
          ' aria-label="' + (outActive ? "Session chat history" : "Session output") + '"' +
          (outActive ? ' tabindex="-1"' : "") + ">" +
          transcript + "</div>";
      }

      var cand = state.completion || { candidates: [], ghost: "" };
      var intel = !!state.intelOpen;
      // Single source of truth: app.menuShouldOpen (requires typed `/` for slash,
      // markers/CLI tokens for other kinds, intelOpen for Ctrl+Space). Never open
      // the AI slash catalogue from an empty prompt after mouse nav / reload.
      var menuOpen = !!(window.NB_APP && typeof window.NB_APP.menuShouldOpen === "function"
        ? window.NB_APP.menuShouldOpen()
        : (intel && cand.candidates && cand.candidates.length));
      var menuLabel = cand.kind === "mention" ? "Mentions"
        : cand.kind === "topic" || cand.kind === "channel" ? "Topics"
        : cand.kind || "";
      var menu = !menuOpen ? ""
        : ('<div class="cn-menu-head" data-key="menu-head">' +
          (intel ? "Intellisense" : "Suggestions") +
          (menuLabel ? " · " + esc(menuLabel) : "") + "</div>" +
        cand.candidates.slice(0, 40).map(function (c, i) {
          return '<div class="cn-cand" role="option" id="cn-cand-' + i + '" data-cand="' + i + '"' +
            (c.kind ? ' data-cand-kind="' + esc(c.kind) + '"' : "") +
            ' aria-selected="' + (i === (state.candIndex || 0) ? "true" : "false") + '"' +
            (i === (state.candIndex || 0) ? ' aria-current="true"' : "") + ">" +
            "<span>" + esc(c.label || c.value) + "</span><i>" + esc(c.hint || "") + "</i></div>";
        }).join(""));

      var panes = state.panes || {
        c0: 15, c1: 20, mc0: false, mc1: false, zoom: false,
      };

      // Cascade: list + detail (+ session when transcript exists).
      var navCollapsed = !!(panes.zoom || panes.navCollapsed);
      var focusExpanded = Number.isInteger(panes.focusMax) ? panes.focusMax : null;
      var bladeHtmls = blades.map(function (b) {
        if (b.kind === "session") {
          return bladeHtml(b, focusBlade === b.index, sessionBody, navCollapsed, focusExpanded);
        }
        if (b.kind === "detail") {
          return bladeHtml(b, focusBlade === b.index, preview, navCollapsed, focusExpanded);
        }
        return bladeHtml(b, focusBlade === b.index,
          bladeListHtml(b, focusBlade === b.index, b.filter, state), navCollapsed, focusExpanded);
      }).join("");

      // Structured lines are rendered into the session blade (above), not a foot panel.
      var sessions = state.sessions || [{ id: "1", path: path }];
      var activeSess = state.activeSession || 0;
      var tabs = sessions.map(function (sess, i) {
        var isSel = i === activeSess;
        return '<button type="button" role="tab" class="cn-panel-tab cn-workspace-tab" data-session="' + i + '"' +
          ' aria-selected="' + (isSel ? "true" : "false") + '"' +
          (isSel ? "" : ' tabindex="-1"') +
          ' title="Workspace ' + (i + 1) + " — " + esc(sess.path || "/") + '"' +
          ' aria-label="Workspace ' + (i + 1) + ": " + esc(sessionTabLabel(sess, i)) + '">' +
          esc(sessionTabLabel(sess, i)) +
          (sessions.length > 1
            ? '<span class="cn-tab-close" data-session-close="' + i +
              '" title="Close workspace" aria-hidden="true">×</span>'
            : "") +
          "</button>";
      }).join("");
      var tabStrip =
        '<div class="cn-workspace-tablist" role="tablist" aria-label="Workspaces">' + tabs + "</div>" +
        '<button type="button" class="cn-panel-tab cn-workspace-tab cn-tab-new" data-session-new' +
        ' title="New isolated workspace at default home (Alt+T)"' +
        ' aria-label="New isolated workspace">+</button>';

      var compose = (window.NB_APP && window.NB_APP.composeContext)
        ? window.NB_APP.composeContext()
        : { kind: "nav", scope: "board", path: path };
      var composeLbl = (window.NB_APP && window.NB_APP.composeLabel)
        ? window.NB_APP.composeLabel(compose)
        : "";
      var composeClear = compose.kind === "reply"
        ? '<button type="button" class="cn-compose-clear" data-compose-clear title="Clear reply">' +
          "clear</button>"
        : "";

      return (
        '<div class="cn-workspace-tabs" data-key="workspace-tabs">' +
        tabStrip + "</div>" +
        '<div class="cn-path" data-key="path">' + crumbs.join("") + "</div>" +
        (blades.length > 1
          ? '<div class="cn-blade-pager" role="tablist" aria-label="Board panes" data-key="blade-pager">' +
            blades.map(function (b, i) {
              var sel = focusBlade === b.index;
              return '<button type="button" role="tab" class="cn-blade-dot" data-blade-goto="' +
                b.index + '"' +
                ' aria-selected="' + (sel ? "true" : "false") + '"' +
                ' title="' + esc(b.title || b.kind) + ' · pane ' + (i + 1) + '">' +
                esc(b.kind === "list" ? "nav" : (b.kind === "detail" ? "feed" : b.kind)) +
                "</button>";
            }).join("") +
            "</div>"
          : "") +
        '<div class="cn-blades cn-cols" data-key="blades" data-zoom="' + !!navCollapsed +
        '" data-nav-collapsed="' + (navCollapsed ? "true" : "false") +
        '" data-focus-expanded="' + (focusExpanded == null ? "" : focusExpanded) +
        '" role="group" aria-label="Navigation blades">' +
        bladeHtmls +
        "</div>" +
        renderVoiceDock(state) +
        '<div class="cn-tui-foot" data-key="tui-foot" data-region="composer" data-open="' + menuOpen + '">' +
        '<div class="cn-prompt-stack" data-key="prompt-stack" data-drop="' +
        (state.attachDrop ? "true" : "false") + '">' +
        '<div class="cn-menu" data-key="menu" id="cn-cli-listbox" role="listbox"' +
        ' aria-label="Suggestions"' + (menuOpen ? "" : " hidden") + ">" + menu + "</div>" +
        renderBoundContextTray(state.boundContext || []) +
        renderAttachTray(state.attachments || []) +
        '<div class="cn-compose-label" data-compose-label data-compose-kind="' +
        esc(compose.kind || "nav") + '">' + esc(composeLbl) + composeClear + "</div>" +
        '<div class="cn-prompt" data-key="prompt" data-speech="' +
        (state.speech && state.speech.listening ? esc(state.speech.mode || "on") : "off") + '"' +
        ' data-attach-count="' + ((state.attachments || []).length) + '"' +
        ' data-compose="' + esc(compose.kind || "nav") + '">' +
        '<button type="button" class="cn-mode" data-mode-toggle aria-pressed="' + (state.ai ? "true" : "false") +
        '" title="Alt+A — in AI mode your words are interpreted before they run"' +
        ' aria-label="' + (state.ai ? "AI mode — switch to CLI" : "CLI mode — switch to AI") + '">' +
        (state.ai ? "ai" : "cli") + "</button>" +
        '<span class="cn-ps1" aria-hidden="true">' + esc(path) + (state.ai ? " ›" : " $") + "</span>" +
        '<span class="cn-input-wrap">' +
        '<span class="cn-cli-mirror" data-cli-mirror data-ghost aria-hidden="true"></span>' +
        '<input class="cn-input" data-cli data-morph-keep autocomplete="off" spellcheck="false"' +
        ' role="combobox" aria-autocomplete="list" aria-haspopup="listbox"' +
        ' aria-expanded="' + (menuOpen ? "true" : "false") + '"' +
        ' aria-controls="cn-cli-listbox"' +
        (menuOpen && cand.candidates.length
          ? ' aria-activedescendant="cn-cand-' + (state.candIndex || 0) + '"'
          : "") +
        ' aria-label="Command and compose input"></span>' +
        '<button type="button" class="cn-attach" data-attach-pick' +
        ' data-count="' + ((state.attachments || []).length) + '"' +
        ' title="Attach files for chat context — click, drop, or paste" aria-label="Attach files">' +
        (((state.attachments || []).length) ? String((state.attachments || []).length) : "+") +
        "</button>" +
        '<input type="file" class="cn-attach-input" data-attach-input data-morph-keep multiple' +
        ' accept="*/*" tabindex="-1" aria-hidden="true" />' +
        (function () {
          var sp = state.speech || {};
          var avail = sp.availability || "absent";
          var ready = !!sp.ready;
          var listening = !!sp.listening;
          var reason = sp.reason || (
            avail === "downloading" ? "Downloading on-device speech model…"
            : avail === "downloadable" ? "Speech model needs one download — click to fetch"
            : avail === "unavailable" ? "On-device speech unavailable in this browser"
            : "No SpeechRecognition — need Edge Canary/Dev with local speech model"
          );
          var micLabel = listening ? "Stop listening"
            : ready ? "Speech — dictation and voice commands"
            : avail === "downloadable" || avail === "downloading"
              ? "Fetch on-device speech model"
              : "Speech disabled — " + reason;
          var micTitle = ready
            ? "Hold ` push-to-talk · Alt+V listen · Alt+Shift+V cycle voice mode · say \"what can I say?\""
            : reason;
          var tag = listening
            ? ((sp.mode === "ptt" ? "ptt" : "listen") + " · " + (sp.intent || "default"))
            : ready ? ""
            : avail === "downloading" ? "dl…"
            : avail === "downloadable" ? "fetch"
            : "off";
          return '<button type="button" class="cn-mic" data-speech-mic' +
            ' aria-pressed="' + (listening ? "true" : "false") + '"' +
            ' data-listening="' + (listening ? "true" : "false") + '"' +
            ' data-ready="' + (ready ? "true" : "false") + '"' +
            ' data-avail="' + esc(avail) + '"' +
            ' data-mode="' + esc(sp.mode || "") + '"' +
            ' data-intent="' + esc(sp.intent || "default") + '"' +
            (ready ? "" : ' aria-disabled="true"') +
            ' aria-label="' + esc(micLabel) + '"' +
            ' title="' + esc(micTitle) + '">' +
            (window.NB_ICONS && window.NB_ICONS.mic
              ? window.NB_ICONS.mic()
              : (listening ? "*" : "mic")) +
            "</button>" +
            (ready
              ? '<button type="button" class="cn-voice-intent" data-voice-intent' +
                ' data-intent="' + esc(sp.intent || "default") + '"' +
                ' title="Cycle voice mode: default (mixed), dictation, or commands — Alt+Shift+V"' +
                ' aria-label="Voice mode ' + esc(sp.intent || "default") + ' — cycle">' +
                esc(sp.intent || "default") + "</button>"
              : "") +
            (tag
              ? '<span class="cn-speech-tag" data-speech-tag data-avail="' + esc(avail) + '"' +
                ' aria-live="polite">' + esc(tag) + "</span>"
              : "");
        })() +
        "</div></div></div>" +
        renderHelpOverlay(!!state.helpOpen, state.helpCtx || buildHelpContext(state)) +
        renderContextMenu(state.ctxMenu)
      );
    },
  };

  window.NB_EXPERIENCES = [CONSOLE];
  window.NB_CONSOLE_VIEWS = {
    tree: viewTree,
    SORTS: SORTS,
    DEFAULT_SORTS: DEFAULT_SORTS,
    visibleFeedViews: visibleFeedViews,
    isFeedSortContext: isFeedSortContext,
  };
  window.NB_TRANSCRIPT = { render: renderTranscript };
  window.NB_HELP = {
    buildContext: buildHelpContext,
    resolveComponent: resolveHelpComponent,
    visibleGroups: visibleHelpGroups,
    groups: HELP_GROUPS,
    labels: HELP_CONTEXT_LABELS,
  };
})();
