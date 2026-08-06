/**
 * The board as a filesystem.
 *
 * Every destination has a path, so one navigation model serves the command
 * line, the blades, the breadcrumb and the URL. That is what makes `cd` and
 * clicking a folder the same operation instead of two features that happen to
 * agree.
 *
 *   /projects/community/channels/general/003-scout-plan
 *   /projects/community/members/scout
 *   /projects/civic-tuner/channels/issues
 *   /projects/civic-tuner/members/maya
 *   /dms/scout
 *   /notifications/mentions
 *   /members/scout
 *
 * Board root lists **projects**, **spaces**, **dms**, **notifications**,
 * **.agents** (plus members). A **space** is a joinable board with a feed,
 * channels, and linked projects. Projects own `channels/`, `members/`, and `.agents/`.
 * `.agents` holds Vercel Eve-style agent directories:
 *   board  → /.agents/*           (apply to the space)
 *   project → /projects/<id>/.agents/*  (apply to that project only)
 * Opening a project (or board) member lands on `/dms/<handle>`.
 * Legacy `/channels/…` paths still resolve as aliases to the community project.
 *
 * Nodes are resolved lazily from NB_DATA so the tree never goes stale against
 * the live stream.
 */
(function () {
  "use strict";

  var D = window.NB_DATA;

  function slug(s) {
    return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  /** Stable, sortable, greppable name for a post — like a numbered log file. */
  function postName(p, i) {
    return String(i + 1).padStart(3, "0") + "-" + slug(p.who) + "-" + slug((p.subject || p.body).slice(0, 22));
  }

  function projectPosts(projectSlug, channel) {
    return (D.projectPosts || []).filter(function (p) {
      return p.project === projectSlug && p.channel === channel;
    });
  }

  function postsIn(channel, extra) {
    return D.posts.concat(extra || []).filter(function (p) { return p.channel === channel; });
  }

  function findChannelByLabel(label) {
    var key = String(label || "").toLowerCase();
    return allChannels().filter(function (c) {
      return c.label === label || c.id === key || String(c.label).toLowerCase() === key;
    })[0] || null;
  }

  function allDms() {
    return (D.dms || []).slice();
  }

  function findDm(id) {
    var key = String(id || "").toLowerCase();
    return allDms().filter(function (d) {
      return d.id === key || d.peer === key;
    })[0] || null;
  }

  function messagesInDm(dmId, extra) {
    var base = (D.dmMessages || []).filter(function (m) { return m.dm === dmId; });
    // Merged live items can target a dm the same way channel posts use channel.
    var live = (extra || []).filter(function (m) { return m.dm === dmId; });
    return base.concat(live);
  }

  /**
   * Activity items for the Teams-style notifications feed.
   * `readSet` is an optional map of id → true for items the session has opened.
   * Merges fixture notifications with hook-fired Activity from NB_HOOKS.
   */
  function allNotifications(readSet) {
    var base = (D.notifications || []).map(function (n) {
      var copy = Object.assign({}, n);
      if (readSet && readSet[n.id]) copy.unread = false;
      return copy;
    });
    var hookFired = [];
    if (window.NB_HOOKS && window.NB_HOOKS.fired) {
      hookFired = window.NB_HOOKS.fired(readSet || null);
    }
    // Hook-fired first (newest), then fixtures; de-dupe by id.
    var seen = {};
    var out = [];
    hookFired.concat(base).forEach(function (n) {
      if (!n || !n.id || seen[n.id]) return;
      seen[n.id] = true;
      out.push(n);
    });
    return out;
  }

  function filterNotifications(filter, readSet) {
    var all = allNotifications(readSet);
    if (filter === "mentions") {
      return all.filter(function (n) { return n.kind === "mention"; });
    }
    if (filter === "subscribed" || filter === "subscriptions") {
      return all.filter(function (n) {
        return n.kind === "subscription" || n.kind === "reply";
      });
    }
    if (filter === "hooks" || filter === "hook") {
      return all.filter(function (n) { return n.kind === "hook"; });
    }
    // "all" and unknown filters → full activity stream
    return all;
  }

  function notifName(n, i) {
    return String(i + 1).padStart(3, "0") + "-" + slug(n.who || "activity") + "-" +
      slug((n.subject || n.body || n.kind || "item").slice(0, 28));
  }

  function findNotification(idOrName, readSet) {
    var all = allNotifications(readSet);
    var byId = all.filter(function (n) { return n.id === idOrName; })[0];
    if (byId) return byId;
    for (var i = 0; i < all.length; i++) {
      if (notifName(all[i], i) === idOrName) return all[i];
    }
    return null;
  }

  function unreadNotificationCount(readSet) {
    return allNotifications(readSet).filter(function (n) { return n.unread; }).length;
  }

  function allSpaces() {
    if (window.NB_SESSION && window.NB_SESSION.listSpaces) {
      return window.NB_SESSION.listSpaces();
    }
    return (D.spaces || []).slice();
  }

  function findSpaceNode(id) {
    if (window.NB_SESSION && window.NB_SESSION.findSpace) {
      return window.NB_SESSION.findSpace(id);
    }
    var key = String(id || "").toLowerCase().replace(/^r\//, "");
    return allSpaces().filter(function (s) {
      return s.id === key || String(s.slug || "").replace(/^r\//, "") === key;
    })[0] || null;
  }

  function postsForSpace(spaceId, extra) {
    var space = findSpaceNode(spaceId);
    if (!space) return [];
    var chanIds = {};
    (space.channels || []).forEach(function (c) { chanIds[c] = true; });
    // Also accept channels tagged with spaceId on the channel object.
    (D.channels || []).forEach(function (c) {
      if (c.spaceId === spaceId) chanIds[c.id] = true;
    });
    return D.posts.concat(extra || []).filter(function (p) {
      return chanIds[p.channel];
    });
  }

  /**
   * Flat following timeline (every post from people you follow), newest first.
   * Prefer {@link followingStacks} for the home UI — one card per identity.
   */
  function followingFeed(extra) {
    var follows = {};
    (D.follows || []).forEach(function (h) { follows[h] = true; });
    var items = [];

    function pushPost(p, where, whereLabel, kind) {
      if (!p || !follows[p.who]) return;
      // Prefer root posts; still include replies so agent drafts surface.
      var raw = (p.subject ? p.subject + " — " : "") + (p.body || "");
      var summary = String(raw).replace(/\s+/g, " ").trim();
      if (summary.length > 180) summary = summary.slice(0, 177) + "…";
      items.push({
        id: p.id,
        who: p.who,
        at: p.at || "",
        state: p.state || "",
        subject: p.subject || null,
        body: p.body || "",
        summary: summary || "(empty)",
        where: where,
        whereLabel: whereLabel,
        kind: kind || "post",
        re: p.re || null,
        unread: !!p.homeNew,
      });
    }

    var chById = {};
    (D.channels || []).forEach(function (c) { chById[c.id] = c; });
    var all = D.posts.concat(extra || []);
    var byChannel = {};
    all.forEach(function (p) {
      (byChannel[p.channel] = byChannel[p.channel] || []).push(p);
    });
    all.forEach(function (p) {
      if (!follows[p.who]) return;
      var ch = chById[p.channel];
      var label = (ch && ch.label) || p.channel || "channel";
      var siblings = byChannel[p.channel] || [];
      var ix = siblings.indexOf(p);
      pushPost(p, channelPath(label) + "/" + postName(p, ix >= 0 ? ix : 0),
        "#" + label, "post");
    });

    (D.projectPosts || []).forEach(function (p) {
      if (!follows[p.who]) return;
      var proj = findProject(p.project) || { id: p.project };
      var pid = proj.id || p.project;
      var siblings = projectPosts(pid, p.channel || "issues");
      // projectPosts filters by project slug id — fixture uses civic-tuner style ids
      if (!siblings.length) {
        siblings = (D.projectPosts || []).filter(function (x) {
          return x.project === p.project && x.channel === p.channel;
        });
      }
      var ix = siblings.findIndex(function (x) { return x.id === p.id; });
      pushPost(
        p,
        "/projects/" + pid + "/channels/" + (p.channel || "issues") + "/" +
          postName(p, ix >= 0 ? ix : 0),
        proj.slug || pid,
        "project"
      );
    });

    // Sort by clock string descending (fixture times are HH:MM — good enough).
    items.sort(function (a, b) {
      if (a.at === b.at) return String(b.id).localeCompare(String(a.id));
      return String(b.at).localeCompare(String(a.at));
    });
    return items;
  }

  /**
   * Following home stack: one card per followed identity, face = their latest
   * non-dismissed post. Older posts wait behind `more` until the face is
   * dismissed. Sorted by latest face time.
   */
  function followingStacks(extra, readSet, dismissed) {
    dismissed = dismissed || {};
    readSet = readSet || {};
    var byWho = {};
    followingFeed(extra).forEach(function (it) {
      if (!it || !it.who || dismissed[it.id]) return;
      (byWho[it.who] = byWho[it.who] || []).push(it);
    });
    var stacks = Object.keys(byWho).map(function (who) {
      var posts = byWho[who].slice().sort(function (a, b) {
        if (a.at === b.at) return String(b.id).localeCompare(String(a.id));
        return String(b.at).localeCompare(String(a.at));
      });
      var face = posts[0];
      var copy = Object.assign({}, face);
      copy.stackWho = who;
      copy.stackIds = posts.map(function (p) { return p.id; });
      copy.more = Math.max(0, posts.length - 1);
      copy.unread = posts.some(function (p) {
        return !!p.unread && !readSet[p.id];
      });
      if (readSet[face.id]) {
        // Face itself is read; keep stack unread if older faces still unread.
        copy.faceRead = true;
      }
      return copy;
    });
    stacks.sort(function (a, b) {
      if (a.at === b.at) return String(b.id).localeCompare(String(a.id));
      return String(b.at).localeCompare(String(a.at));
    });
    return stacks;
  }

  function followsList() {
    return (D.follows || []).slice();
  }

  var HOME_FEED_VIEWS = [
    { id: "following", label: "following" },
    { id: "announcements", label: "announcements" },
    { id: "featured", label: "featured" },
    { id: "creators", label: "creators" },
  ];

  function homeFeedViews() {
    return HOME_FEED_VIEWS.slice();
  }

  function applyHomeRead(items, readSet) {
    return (items || []).map(function (it) {
      var copy = Object.assign({}, it);
      if (readSet && readSet[copy.id]) copy.unread = false;
      return copy;
    });
  }

  function bioSnippet(text, max) {
    // Plain snippet of the profile description (strip light markdown marks).
    var s = String(text || "")
      .replace(/\*\*|__/g, "")
      .replace(/`+/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!s) return "";
    var lim = max || 160;
    if (s.length <= lim) return s;
    return s.slice(0, lim - 1).replace(/\s+\S*$/, "") + "…";
  }

  function announcementsFeed(readSet) {
    var items = (D.announcements || []).map(function (a) {
      return {
        id: a.id,
        who: a.who || "board",
        at: a.at || "",
        title: a.title || "",
        summary: a.body || a.title || "",
        body: a.body || "",
        pin: !!a.pin,
        where: a.where || "/",
        whereLabel: a.whereLabel || "",
        kind: "announcement",
        unread: !!a.unread,
      };
    });
    return applyHomeRead(items, readSet);
  }

  function featuredProjectsFeed(readSet) {
    var items = (D.featuredProjects || []).map(function (p) {
      return {
        id: p.id,
        who: p.slug || p.id,
        at: p.language || "",
        title: p.slug || p.id,
        summary: p.blurb || "",
        body: p.blurb || "",
        blurb: p.blurb || "",
        readmeSummary: p.readmeSummary || "",
        readmeExcerpt: p.readmeExcerpt || "",
        stars: p.stars || 0,
        language: p.language || "",
        where: p.where || "/projects",
        whereLabel: p.whereLabel || p.slug || "",
        kind: "project",
        unread: !!p.unread,
      };
    });
    return applyHomeRead(items, readSet);
  }

  function featuredCreatorsFeed(readSet) {
    var items = (D.featuredCreators || []).map(function (c) {
      var member = findMember(c.handle) || {};
      var contrib = c.contrib || member.contrib || null;
      return {
        id: c.id,
        who: c.handle,
        at: c.role || member.role || "",
        title: "@" + c.handle,
        summary: c.blurb || member.detail || "",
        body: c.blurb || "",
        blurb: c.blurb || "",
        bioSnippet: bioSnippet(member.bio || c.blurb || "", 160),
        contrib: contrib,
        role: c.role || member.role || "",
        where: c.where || dmPath(c.handle),
        whereLabel: c.whereLabel || ("@" + c.handle),
        kind: member.kind === "agent" || /agent/i.test(c.role || "") ? "agent" : "person",
        unread: !!c.unread,
      };
    });
    return applyHomeRead(items, readSet);
  }

  /**
   * @param {string} view
   * @param {object[]} [extra]
   * @param {object} [readSet]
   * @param {{ dismissed?: object, limit?: number }} [opts]
   */
  function homeFeedItems(view, extra, readSet, opts) {
    opts = opts || {};
    var v = String(view || "following");
    if (v === "announcements") return announcementsFeed(readSet);
    if (v === "featured") return featuredProjectsFeed(readSet);
    if (v === "creators") return featuredCreatorsFeed(readSet);
    var stacks = followingStacks(extra, readSet, opts.dismissed || {});
    if (opts.limit == null || opts.limit >= stacks.length) return stacks;
    return stacks.slice(0, Math.max(0, opts.limit));
  }

  function homeFeedUnreadCount(view, extra, readSet, opts) {
    // Unread counts ignore the visible window — badge the whole backlog.
    var full = Object.assign({}, opts || {}, { limit: undefined });
    return homeFeedItems(view, extra, readSet, full).filter(function (it) {
      return it.unread;
    }).length;
  }

  function homeFeedUnreadCounts(extra, readSet, opts) {
    var out = {};
    HOME_FEED_VIEWS.forEach(function (v) {
      out[v.id] = homeFeedUnreadCount(v.id, extra, readSet, opts);
    });
    return out;
  }

  /** Session-created channels/projects — live overlay from NB_APP.state.boardOverlay. */
  function boardOverlay() {
    return (window.NB_APP && window.NB_APP.state && window.NB_APP.state.boardOverlay) || {};
  }

  function allChannels() {
    var base = (D.channels || []).slice();
    var extra = boardOverlay().channels || [];
    var seen = {};
    var out = [];
    base.concat(extra).forEach(function (c) {
      if (!c || !c.id || seen[c.id]) return;
      seen[c.id] = true;
      out.push(c);
    });
    return out;
  }

  /** All projects: linked repos plus the community home that owns social rooms. */
  function allProjects() {
    var list = (D.projects || []).map(function (p) {
      return Object.assign({}, p, { id: slug(p.slug), community: false });
    });
    // Community is first: the board's hangout, not a linked repo.
    list.unshift({
      slug: "community",
      id: "community",
      open: allChannels().reduce(function (n, c) { return n + (c.unread || 0); }, 0),
      channels: allChannels().map(function (c) { return c.label; }),
      community: true,
      hint: "social home",
    });
    (boardOverlay().projects || []).forEach(function (p) {
      if (!p || !p.id) return;
      if (list.some(function (x) { return x.id === p.id; })) return;
      list.push(Object.assign({
        community: false,
        open: 0,
        channels: [],
        hint: "created",
      }, p));
    });
    return list;
  }

  /** Channel names for a project, including session-created rooms. */
  function projectChannelNames(proj) {
    if (!proj) return [];
    if (proj.community) return allChannels().map(function (c) { return c.label; });
    var base = (proj.channels || []).slice();
    var bag = boardOverlay().projectChannels || {};
    var extra = bag[proj.id] || bag[slug(proj.slug)] || [];
    var seen = {};
    var out = [];
    base.concat(extra).forEach(function (name) {
      name = String(name || "");
      if (!name || seen[name]) return;
      seen[name] = true;
      out.push(name);
    });
    return out;
  }

  function findProject(id) {
    return allProjects().filter(function (p) { return p.id === id || slug(p.slug) === id; })[0] || null;
  }

  /**
   * Members of a project: community → board roll; linked projects use
   * fixture `members: [handles]` or authors seen on project posts.
   * Eve agents declared under that project are always on the roster too —
   * they are members of the scope they are declared in, and open as DMs.
   */
  function membersForProject(proj) {
    if (!proj) return [];
    var base;
    if (proj.community) {
      base = (D.members || []).slice();
    } else {
      var handles = [];
      var seen = {};
      function pushHandle(h) {
        h = String(h || "").replace(/^@/, "").toLowerCase();
        if (!h || seen[h]) return;
        seen[h] = true;
        handles.push(h);
      }
      (proj.members || []).forEach(pushHandle);
      if (!handles.length) {
        (D.projectPosts || []).forEach(function (p) {
          if (p.project === proj.id || slug(p.project) === proj.id) pushHandle(p.who);
        });
      }
      base = handles.map(function (h) {
        var m = (D.members || []).filter(function (x) { return x.handle === h; })[0];
        return m || { handle: h, role: "contributor", kind: "person", state: "here" };
      });
    }
    return mergeMemberLists(base, projectAgents(proj.id).map(agentToMember));
  }

  /**
   * Board / space members roll: people on the fixture roll plus Eve agents
   * declared at board scope (/.agents). Opening one opens /dms/<handle>.
   */
  function membersForBoard() {
    return mergeMemberLists(D.members || [], boardAgents().map(agentToMember));
  }

  function agentToMember(a) {
    a = a || {};
    var id = String(a.id || "").toLowerCase();
    return {
      handle: id,
      role: a.scope === "project" ? "project agent" : "space agent",
      kind: "agent",
      state: a.status || "idle",
      detail: (a.summary || a.name || id) + (a.model ? " · " + a.model : ""),
      agent: a,
      eve: true,
    };
  }

  function mergeMemberLists(base, extra) {
    var out = [];
    var seen = {};
    function push(m) {
      if (!m || !m.handle) return;
      var h = String(m.handle).toLowerCase();
      if (seen[h]) return;
      seen[h] = true;
      out.push(m);
    }
    (base || []).forEach(push);
    (extra || []).forEach(push);
    return out;
  }

  /** True when handle is a person on the roll or an Eve agent in any scope. */
  function isKnownPeer(handle) {
    handle = String(handle || "").replace(/^@/, "").toLowerCase();
    if (!handle) return false;
    if ((D.members || []).some(function (m) { return m.handle === handle; })) return true;
    if (boardAgents().some(function (a) { return a.id === handle; })) return true;
    var bag = (D.agents && D.agents.projects) || {};
    return Object.keys(bag).some(function (pid) {
      return (bag[pid] || []).some(function (a) { return a.id === handle; });
    });
  }

  /** Resolve a member (person or Eve agent) by handle. */
  function findMember(handle) {
    handle = String(handle || "").replace(/^@/, "").toLowerCase();
    if (!handle) return null;
    var fromRoll = (D.members || []).filter(function (m) { return m.handle === handle; })[0];
    if (fromRoll) return fromRoll;
    var boardHit = boardAgents().filter(function (a) { return a.id === handle; })[0];
    if (boardHit) return agentToMember(boardHit);
    var bag = (D.agents && D.agents.projects) || {};
    var pids = Object.keys(bag);
    for (var i = 0; i < pids.length; i++) {
      var hit = (bag[pids[i]] || []).filter(function (a) { return a.id === handle; })[0];
      if (hit) return agentToMember(hit);
    }
    return null;
  }

  function memberEntry(m, extra) {
    var dm = findDm(m.handle);
    var n = dm ? messagesInDm(dm.id, extra).length : 0;
    return {
      name: m.handle,
      kind: m.kind === "agent" ? "agent" : "file",
      meta: m.role,
      hint: (m.detail || m.state || "member") +
        (n ? " · " + n + " dm" : " · open dm"),
      member: m,
      openDm: m.handle,
    };
  }

  /* ── Vercel Eve-style .agents directories ───────────────────────────────── */

  function boardAgents() {
    return ((D.agents && D.agents.board) || []).slice();
  }

  function projectAgents(projectId) {
    var bag = (D.agents && D.agents.projects) || {};
    var id = String(projectId || "");
    return (bag[id] || bag[slug(id)] || []).slice();
  }

  function findAgent(scope, scopeId, agentId) {
    var list = scope === "project" ? projectAgents(scopeId) : boardAgents();
    return list.filter(function (a) { return a.id === agentId; })[0] || null;
  }

  function agentDirEntry(a) {
    a = a || {};
    return {
      name: a.id,
      kind: "dir",
      meta: "eve",
      hint: (a.status || "agent") + " · " + (a.summary || a.name || a.id),
      agent: a,
      agentScope: a.scope || "space",
    };
  }

  /**
   * List inside one Eve agent directory:
   *   instructions.md, agent.ts, skills/, tools/
   */
  function listAgentInterior(agent, basePath) {
    agent = agent || {};
    var skills = agent.skills || [];
    var tools = agent.tools || [];
    return [
      {
        name: "instructions.md", kind: "file", meta: "instructions",
        hint: "system prompt",
        agentFile: "instructions", agent: agent, agentPath: basePath,
      },
      {
        name: "agent.ts", kind: "file", meta: "config",
        hint: agent.model || "model config",
        agentFile: "agent.ts", agent: agent, agentPath: basePath,
      },
      {
        name: "skills", kind: "dir", meta: "skills",
        hint: skills.length + " skill" + (skills.length === 1 ? "" : "s"),
        agent: agent, agentPath: basePath + "/skills",
      },
      {
        name: "tools", kind: "dir", meta: "tools",
        hint: tools.length + " tool" + (tools.length === 1 ? "" : "s"),
        agent: agent, agentPath: basePath + "/tools",
      },
    ];
  }

  function listAgentSkills(agent) {
    return (agent.skills || []).map(function (s) {
      return {
        name: (s.id || "skill") + ".md",
        kind: "file",
        meta: "skill",
        hint: s.title || s.id,
        agentSkill: s,
        agent: agent,
      };
    });
  }

  function listAgentTools(agent) {
    return (agent.tools || []).map(function (t) {
      return {
        name: (t.id || "tool") + ".ts",
        kind: "file",
        meta: "tool",
        hint: t.title || t.id,
        agentTool: t,
        agent: agent,
      };
    });
  }

  /**
   * Resolve /.agents/… or /projects/<id>/.agents/… listings.
   * Returns entry array, or null if not an agents path.
   */
  function listAgentsPath(parts) {
    // Board: /.agents[/<agent>[/skills|tools|file]]
    // (extra merged posts unused for agent trees — agents are fixture-backed.)
    if (parts[0] === ".agents") {
      if (parts.length === 1) {
        return boardAgents().map(agentDirEntry);
      }
      var ba = findAgent("space", null, parts[1]);
      if (!ba) return null;
      var bBase = "/.agents/" + ba.id;
      if (parts.length === 2) return listAgentInterior(ba, bBase);
      if (parts.length === 3 && parts[2] === "skills") return listAgentSkills(ba);
      if (parts.length === 3 && parts[2] === "tools") return listAgentTools(ba);
      // File leaves under skills/tools are not listable.
      if (parts.length >= 3) return null;
      return null;
    }
    // Project: /projects/<id>/.agents[…]
    if (parts[0] === "projects" && parts[2] === ".agents") {
      var proj = findProject(parts[1]);
      if (!proj) return null;
      if (parts.length === 3) {
        return projectAgents(proj.id).map(agentDirEntry);
      }
      var pa = findAgent("project", proj.id, parts[3]);
      if (!pa) return null;
      var pBase = "/projects/" + proj.id + "/.agents/" + pa.id;
      if (parts.length === 4) return listAgentInterior(pa, pBase);
      if (parts.length === 5 && parts[4] === "skills") return listAgentSkills(pa);
      if (parts.length === 5 && parts[4] === "tools") return listAgentTools(pa);
      if (parts.length >= 5) return null;
      return null;
    }
    return undefined; // not an agents path — caller continues
  }

  /**
   * Map legacy /channels/… onto /projects/community/channels/…
   * so old tools and tests still resolve.
   */
  function canonicalize(path) {
    var parts = split(path);
    if (parts[0] === "channels") {
      return join(["projects", "community", "channels"].concat(parts.slice(1)));
    }
    return join(parts);
  }

  /**
   * List a directory. Returns entries with enough shape for a blade to render
   * and for completion to rank.
   */
  function currentReadSet() {
    try {
      return (window.NB_APP && window.NB_APP.state && window.NB_APP.state.notifRead) || null;
    } catch {
      return null;
    }
  }

  function list(path, extra) {
    var readSet = currentReadSet();
    var parts = split(canonicalize(path));
    // Board root: projects, spaces, dms, notifications, .agents as siblings.
    if (parts.length === 0) {
      var unreadDms = allDms().reduce(function (n, d) { return n + (d.unread || 0); }, 0);
      var unreadAct = unreadNotificationCount(readSet);
      var nSpaces = allSpaces().length;
      var nBoardAgents = boardAgents().length;
      return [
        { name: "projects", kind: "dir", hint: allProjects().length + " projects" },
        { name: "spaces", kind: "dir", meta: "spaces",
          hint: nSpaces + " spaces · join or switch" },
        { name: "dms", kind: "dir", meta: "direct",
          hint: allDms().length + " threads" + (unreadDms ? " · " + unreadDms + " unread" : "") },
        { name: "notifications", kind: "dir", meta: "activity",
          hint: (D.notifications || []).length + " activity" +
            (unreadAct ? " · " + unreadAct + " new" : ""),
          unread: unreadAct },
        { name: "members", kind: "dir", hint: membersForBoard().length + " on the roll" },
        {
          name: ".agents", kind: "dir", meta: "eve",
          hint: nBoardAgents + " space agent" + (nBoardAgents === 1 ? "" : "s") +
            " · vercel/eve",
        },
      ];
    }

    // Board /.agents/… (space-scoped Eve agents)
    var agentsList = listAgentsPath(parts, extra);
    if (agentsList !== undefined) return agentsList;

    // /spaces → space catalogue; /spaces/<id> → hub; /spaces/<id>/feed → posts
    if (parts[0] === "spaces") {
      if (parts.length === 1) {
        return allSpaces().map(function (s) {
          return {
            name: s.id,
            kind: "dir",
            meta: s.kind || "community",
            hint: (s.slug || s.id) + " · " + (s.subscribers || 0) + " members" +
              (s.guestsAllowed === false ? " · members only" : " · open"),
            space: s,
            unread: 0,
          };
        });
      }
      var spaceNode = findSpaceNode(parts[1]);
      if (!spaceNode) return null;
      if (parts.length === 2) {
        var feedCount = postsForSpace(spaceNode.id, extra).length;
        var chCount = (spaceNode.channels || []).length;
        var prCount = (spaceNode.projects || []).length;
        return [
          { name: "feed", kind: "dir", meta: "feed",
            hint: feedCount + " posts · " + (spaceNode.slug || spaceNode.id) },
          { name: "channels", kind: "dir", meta: "channels",
            hint: chCount + " rooms" },
          { name: "projects", kind: "dir", meta: "projects",
            hint: prCount + " linked" },
          { name: "about", kind: "file", meta: spaceNode.kind || "space",
            hint: (spaceNode.subscribers || 0) + " members · " +
              (spaceNode.guestsAllowed === false ? "members only" : "guests ok"),
            space: spaceNode },
        ];
      }
      if (parts.length === 3 && parts[2] === "feed") {
        return postsForSpace(spaceNode.id, extra).map(function (p, i) {
          return {
            name: postName(p, i), kind: "file", post: p, meta: p.state,
            hint: p.who + " · " + p.at + " · #" + p.channel,
            spaceId: spaceNode.id,
          };
        });
      }
      if (parts.length === 3 && parts[2] === "channels") {
        return (spaceNode.channels || []).map(function (label) {
          var ch = (D.channels || []).filter(function (c) {
            return c.label === label || c.id === label;
          })[0];
          var n = ch ? postsIn(ch.id, extra).length : 0;
          return {
            name: label, kind: "dir", meta: ch ? ch.kind : "channel",
            hint: n + " posts",
            channel: ch || { id: label, label: label },
            spaceId: spaceNode.id,
          };
        });
      }
      if (parts.length === 4 && parts[2] === "channels") {
        var chanLabel = parts[3];
        var chObj = (D.channels || []).filter(function (c) {
          return c.label === chanLabel || c.id === chanLabel;
        })[0];
        if (!chObj) {
          // Soft dir: empty if channel name only listed on space
          return [];
        }
        return postsIn(chObj.id, extra).map(function (p, i) {
          return {
            name: postName(p, i), kind: "file", post: p, meta: p.state,
            hint: p.who + " · " + p.at,
            spaceId: spaceNode.id,
          };
        });
      }
      if (parts.length === 3 && parts[2] === "projects") {
        return (spaceNode.projects || []).map(function (pslug) {
          var pid = slug(pslug);
          var p = (D.projects || []).filter(function (x) {
            return x.slug === pslug || slug(x.slug) === pid;
          })[0];
          return {
            name: pid,
            kind: "dir",
            meta: "linked project",
            hint: p ? ((p.channels || []).length + " channels · " + p.open + " open") : pslug,
            projectSlug: pslug,
            spaceId: spaceNode.id,
          };
        });
      }
      return null;
    }

    // /notifications → Teams-style Activity filters; /notifications/<filter> → feed
    if (parts[0] === "notifications") {
      if (parts.length === 1) {
        var allN = allNotifications(readSet);
        var mentionsN = filterNotifications("mentions", readSet);
        var subN = filterNotifications("subscribed", readSet);
        var hooksN = filterNotifications("hooks", readSet);
        return [
          { name: "all", kind: "dir", meta: "activity",
            hint: allN.length + " items · " + allN.filter(function (n) { return n.unread; }).length + " new" },
          { name: "mentions", kind: "dir", meta: "mentions",
            hint: mentionsN.length + " · @you" +
              (mentionsN.filter(function (n) { return n.unread; }).length
                ? " · " + mentionsN.filter(function (n) { return n.unread; }).length + " new" : "") },
          { name: "subscribed", kind: "dir", meta: "watching",
            hint: subN.length + " · watching" +
              (subN.filter(function (n) { return n.unread; }).length
                ? " · " + subN.filter(function (n) { return n.unread; }).length + " new" : "") },
          { name: "hooks", kind: "dir", meta: "hooks",
            hint: hooksN.length + " · custom" +
              (hooksN.filter(function (n) { return n.unread; }).length
                ? " · " + hooksN.filter(function (n) { return n.unread; }).length + " new" : "") },
        ];
      }
      if (parts.length === 2) {
        var filter = parts[1];
        if (filter !== "all" && filter !== "mentions" && filter !== "subscribed" &&
            filter !== "hooks" && filter !== "hook") return null;
        if (filter === "hook") filter = "hooks";
        var items = filterNotifications(filter, readSet);
        // Newest first — Activity feed order (Teams).
        items = items.slice().sort(function (a, b) {
          // HH:MM lexical works for same-day fixture times when newer is larger;
          // unread also floats up when times tie.
          if (a.unread !== b.unread) return a.unread ? -1 : 1;
          return String(b.at || "").localeCompare(String(a.at || ""));
        });
        return items.map(function (n, i) {
          return {
            name: notifName(n, i),
            kind: "file",
            meta: n.kind,
            hint: (n.unread ? "new · " : "") + n.who + " · " + (n.whereLabel || n.where || "") +
              " · " + (n.at || ""),
            notification: n,
            unread: !!n.unread,
          };
        });
      }
      return null;
    }

    // /dms → conversation list; /dms/<peer> → message thread (post-shaped)
    if (parts[0] === "dms") {
      if (parts.length === 1) {
        return allDms().map(function (d) {
          var n = messagesInDm(d.id, extra).length;
          var peer = findMember(d.peer);
          return {
            name: d.id,
            kind: "dir",
            meta: d.kind === "agent" || (peer && peer.kind === "agent") ? "agent" : "person",
            hint: (peer ? peer.role + " · " : "") + n + " messages" +
              (d.unread ? " · " + d.unread + " unread" : ""),
            unread: d.unread || 0,
            dm: d,
          };
        });
      }
      if (parts.length === 2) {
        var thread = findDm(parts[1]);
        // Known members (people + Eve agents) get an openable thread even
        // before the first message — chat with agents in their declared scope.
        if (!thread) {
          var peerMem = findMember(parts[1]);
          if (!peerMem) return null;
          thread = {
            id: parts[1],
            peer: parts[1],
            kind: peerMem.kind || "person",
            unread: 0,
          };
        }
        return messagesInDm(thread.id, extra).map(function (p, i) {
          return {
            name: postName(p, i), kind: "file", post: p, meta: p.state,
            hint: p.who + " · " + p.at,
            dm: thread.id,
          };
        });
      }
      // /dms/<peer>/<message> is a file leaf — not listable
      return null;
    }

    if (parts[0] === "members") {
      if (parts.length === 1) {
        // Opening a member opens DMs with them — not a profile card.
        // Includes Eve agents declared at board scope.
        return membersForBoard().map(function (m) { return memberEntry(m, extra); });
      }
      // /members/<handle> is not a real place — DMs live under /dms/<handle>.
      return null;
    }

    if (parts[0] === "projects") {
      if (parts.length === 1) {
        return allProjects().map(function (p) {
          var nChan = (p.channels || []).length;
          return {
            name: p.id,
            kind: "dir",
            meta: p.community ? "community" : "linked project",
            hint: nChan + " channels" + (p.community ? " · social home" : " · " + p.open + " open"),
          };
        });
      }

      var proj = findProject(parts[1]);
      if (!proj) return null;

      // /projects/<id> → channels + members + .agents
      if (parts.length === 2) {
        var roster = membersForProject(proj);
        var pAgents = projectAgents(proj.id);
        return [
          { name: "channels", kind: "dir", meta: "rooms",
            hint: (proj.channels || []).length + " channels" },
          { name: "members", kind: "dir", meta: "roster",
            hint: roster.length + " member" + (roster.length === 1 ? "" : "s") },
          {
            name: ".agents", kind: "dir", meta: "eve",
            hint: pAgents.length + " project agent" + (pAgents.length === 1 ? "" : "s") +
              " · vercel/eve",
          },
        ];
      }

      // /projects/<id>/.agents/… handled above via listAgentsPath when path
      // is entered as full path; also catch after project id is resolved.
      if (parts[2] === ".agents") {
        var projAgentsList = listAgentsPath(parts, extra);
        if (projAgentsList !== undefined) return projAgentsList;
      }

      // /projects/<id>/members → project roster (open → DM)
      if (parts.length === 3 && parts[2] === "members") {
        return membersForProject(proj).map(function (m) {
          return memberEntry(m, extra);
        });
      }
      // /projects/<id>/members/<handle> is not a place — DMs live under /dms/<handle>.
      if (parts.length >= 4 && parts[2] === "members") return null;

      // /projects/<id>/channels → channel list
      if (parts.length === 3 && parts[2] === "channels") {
        if (proj.community) {
          return allChannels().map(function (c) {
            var voice = !!(c.voice || c.kind === "voice");
            var nPosts = voice ? 0 : postsIn(c.id, extra).length;
            return {
              name: c.label, kind: "dir", meta: c.kind,
              voice: voice,
              hint: voice
                ? "voice · Opus · low-latency"
                : (nPosts + " posts" + (c.unread ? " · " + c.unread + " unread" : "")),
              unread: c.unread || 0,
            };
          });
        }
        return projectChannelNames(proj).map(function (c) {
          return {
            name: c, kind: "dir", meta: "work",
            hint: projectPosts(proj.id, c).length + " posts",
          };
        });
      }

      // /projects/<id>/channels/<channel> → posts (text) or voice roster stub
      if (parts.length === 4 && parts[2] === "channels") {
        var chanName = parts[3];
        if (proj.community) {
          var ch = findChannelByLabel(chanName);
          if (!ch) return null;
          if (ch.voice || ch.kind === "voice") {
            // Voice rooms have no text backlog — roster is painted by the voice dock.
            return [{
              name: ".voice", kind: "file", meta: "voice",
              voice: true, channel: ch,
              hint: "join voice · mute · deafen · VAD/PTT",
            }];
          }
          return postsIn(ch.id, extra).map(function (p, i) {
            return {
              name: postName(p, i), kind: "file", post: p, meta: p.state,
              hint: p.who + " · " + p.at,
            };
          });
        }
        if (projectChannelNames(proj).indexOf(chanName) === -1) return null;
        return projectPosts(proj.id, chanName).map(function (p, i) {
          return {
            name: postName(p, i), kind: "file", post: p, meta: p.state,
            hint: p.who + " · " + p.at,
          };
        });
      }
      return null;
    }

    return null;
  }

  function split(path) {
    return String(path || "/").split("/").filter(Boolean);
  }

  function join(parts) {
    return "/" + (parts || []).join("/");
  }

  /** Resolve a possibly-relative path against a base, honouring . and .. */
  function resolve(base, input) {
    var target = String(input == null ? "" : input).trim();
    if (target === "") return canonicalize(base);
    var parts = target.charAt(0) === "/" ? [] : split(canonicalize(base));
    target.split("/").forEach(function (seg) {
      if (seg === "" || seg === ".") return;
      if (seg === "..") parts.pop();
      else parts.push(seg);
    });
    return canonicalize(join(parts));
  }

  /** Does this path address a directory we can list? */
  function isDir(path, extra) {
    return list(path, extra) !== null;
  }

  /** The post at a path, if the path names one. */
  function postAt(path, extra) {
    var parts = split(canonicalize(path));
    // /projects/<id>/channels/<channel>/<post>
    if (parts[0] === "projects" && parts[2] === "channels" && parts.length === 5) {
      var entries = list(join(parts.slice(0, -1)), extra);
      if (!entries) return null;
      var hit = entries.filter(function (e) { return e.name === parts[parts.length - 1]; })[0];
      return hit ? hit.post : null;
    }
    // /dms/<peer>/<message>
    if (parts[0] === "dms" && parts.length === 3) {
      var dmEntries = list(join(parts.slice(0, -1)), extra);
      if (!dmEntries) return null;
      var dmHit = dmEntries.filter(function (e) { return e.name === parts[parts.length - 1]; })[0];
      return dmHit ? dmHit.post : null;
    }
    // /spaces/<id>/feed/<post> or /spaces/<id>/channels/<ch>/<post>
    if (parts[0] === "spaces" && parts.length >= 4) {
      var spEntries = list(join(parts.slice(0, -1)), extra);
      if (!spEntries) return null;
      var spHit = spEntries.filter(function (e) { return e.name === parts[parts.length - 1]; })[0];
      return spHit ? spHit.post : null;
    }
    return null;
  }

  /** Community channel path helper used by the stream and graph. */
  function channelPath(label) {
    return "/projects/community/channels/" + label;
  }

  function dmPath(peer) {
    return "/dms/" + peer;
  }

  function spacePath(id) {
    return "/spaces/" + id;
  }

  window.NB_MAP = {
    list: list, split: split, join: join, resolve: resolve,
    isDir: isDir, postAt: postAt, postName: postName, slug: slug,
    canonicalize: canonicalize, channelPath: channelPath, dmPath: dmPath,
    spacePath: spacePath,
    findProject: findProject, membersForProject: membersForProject,
    membersForBoard: membersForBoard, findMember: findMember, isKnownPeer: isKnownPeer,
    boardAgents: boardAgents, projectAgents: projectAgents, findAgent: findAgent,
    findDm: findDm, findSpaceNode: findSpaceNode,
    allSpaces: allSpaces, postsForSpace: postsForSpace,
    followingFeed: followingFeed,
    followingStacks: followingStacks,
    followsList: followsList,
    homeFeedViews: homeFeedViews,
    homeFeedItems: homeFeedItems,
    homeFeedUnreadCount: homeFeedUnreadCount,
    homeFeedUnreadCounts: homeFeedUnreadCounts,
    announcementsFeed: announcementsFeed,
    featuredProjectsFeed: featuredProjectsFeed,
    featuredCreatorsFeed: featuredCreatorsFeed,
    allChannels: allChannels, findChannelByLabel: findChannelByLabel,
    allProjects: allProjects, projectChannelNames: projectChannelNames,
    allNotifications: allNotifications,
    filterNotifications: filterNotifications,
    findNotification: findNotification,
    unreadNotificationCount: unreadNotificationCount,
    notifName: notifName,
  };
})();
