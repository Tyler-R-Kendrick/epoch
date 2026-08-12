/**
 * The board as a filesystem.
 *
 * Paths are mounted projections over canonical objects. The same object can
 * therefore appear in several feeds without changing its identity.
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

  function core() {
    if (!window.NB_CORE) throw new Error("Community Core runtime must load before the Nightboard namespace");
    return window.NB_CORE;
  }

  function slug(s) {
    return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  /** New aliases are stable object IDs; pre-object-ID slugs remain aliases. */
  function postName(p) {
    return objectRef(p).objectId;
  }

  function legacyPostName(p) {
    return (D.legacyPostAliases || {})[p && p.id] || null;
  }

  function legacyPostNames(p) {
    return [legacyPostName(p)].concat((D.legacyPostAliasHistory || {})[p && p.id] || [])
      .filter(function (alias, index, aliases) { return alias && aliases.indexOf(alias) === index; });
  }

  function objectRef(post) {
    var ref = post && post.ref && post.ref.objectId ? post.ref : {
      objectId: String(post && (post.objectId || post.id) || ""),
      kind: post && post.tombstone ? "tombstone" : "message",
      ...(post && post.atUri ? { atUri: post.atUri } : {}),
      ...(post && (post.revision || post.cid) ? { revision: post.revision || post.cid } : {}),
    };
    return core().validateObjectRef(ref);
  }

  function entityRef(entity, kind, prefix, stableId) {
    if (entity && entity.ref && entity.ref.objectId) return core().validateObjectRef(entity.ref);
    var objectId = entity && entity.objectId || (prefix + String(stableId || ""));
    return core().validateObjectRef({ objectId: objectId, kind: kind });
  }

  function contextRef(post) {
    if (post.dm) return { objectId: "dm-" + post.dm, kind: "dm" };
    if (post.project) return { objectId: "channel-" + post.project + "-" + post.channel, kind: "channel" };
    return { objectId: "channel-" + post.channel, kind: "channel" };
  }

  function toCommunityMessage(post) {
    var ref = objectRef(post);
    var rootId = (D.threadRoots || {})[ref.objectId] ||
      (post.threadRoot && post.threadRoot.objectId) || post.threadRootId ||
      (post.inReplyTo && post.inReplyTo.objectId) || post.re || ref.objectId;
    var parentId = post.inReplyTo && post.inReplyTo.objectId || post.re;
    return {
      ref: ref,
      context: core().validateObjectRef(post.context || contextRef(post)),
      authorId: post.authorId || post.who || "unavailable",
      title: post.title || post.subject,
      body: post.body || "",
      publishedAt: post.publishedAt || post.at || "unknown",
      ...(post.updatedAt ? { updatedAt: post.updatedAt } : {}),
      ...(parentId ? { inReplyTo: core().validateObjectRef({ objectId: parentId, kind: "message" }) } : {}),
      threadRoot: core().validateObjectRef({ objectId: rootId, kind: "message" }),
      relations: post.relations || [],
      ...(post.reactions ? { reactions: Object.assign({}, post.reactions) } : {}),
      state: post.state || "unavailable",
      aliases: [ref.objectId].concat(legacyPostNames(post)),
      ...(post.tombstone ? { tombstone: post.tombstone } : {}),
      source: post,
    };
  }

  function messageGraph(pool) {
    var messages = (pool || []).map(toCommunityMessage);
    var provisional = core().createMessageGraph(messages);
    return core().createMessageGraph(messages.map(function (message) {
      return Object.assign({}, message, { threadRoot: provisional.rootOf(message.ref) });
    }));
  }

  function postFromMessage(message) {
    if (message.source) return message.source;
    return {
      id: message.ref.objectId,
      objectId: message.ref.objectId,
      ref: message.ref,
      who: message.authorId,
      at: message.publishedAt,
      state: message.state,
      body: message.body,
      sig: "unavailable",
      tombstone: message.tombstone,
    };
  }

  function messageCapabilities(post, hasChildren) {
    var actionable = !(post && post.tombstone);
    return {
      read: true,
      enter: true,
      expand: !!hasChildren,
      composeUnder: actionable,
      execute: false,
    };
  }

  function projectPosts(projectSlug, channel) {
    return (D.projectPosts || []).filter(function (p) {
      return p.project === projectSlug && p.channel === channel;
    });
  }

  function postsIn(channel, extra) {
    return D.posts.concat(extra || []).filter(function (p) { return p.channel === channel; });
  }

  /** Detail-pane entry for a post (posts live in detail — not nav under channels). */
  function postEntry(p, hintExtra, graph) {
    var ref = objectRef(p);
    var children = (graph || messageGraph([p])).childrenOf(ref).length > 0;
    return {
      name: postName(p),
      alias: postName(p),
      aliases: [postName(p)].concat(legacyPostNames(p)),
      kind: p.tombstone ? "tombstone" : "message",
      objectId: ref.objectId,
      ref: ref,
      capabilities: messageCapabilities(p, children),
      post: p,
      meta: p.state,
      hint: p.who + " · " + p.at + (hintExtra ? " · " + hintExtra : ""),
    };
  }

  function postEntries(posts, hintForPost) {
    var pool = posts || [];
    var graph = messageGraph(pool);
    return pool.map(function (post) {
      var hint = typeof hintForPost === "function" ? hintForPost(post) : hintForPost;
      return postEntry(post, hint, graph);
    });
  }

  function allMessages(extra) {
    return (D.posts || []).concat(D.projectPosts || [], D.dmMessages || [], extra || []);
  }

  function projectionIdForPath(path) {
    var parts = split(canonicalize(path));
    if (parts[0] === "projects" && parts[2] === "channels" && parts[3]) {
      var project = findProject(parts[1]);
      var channel = project && project.community ? findChannelByLabel(parts[3]) : null;
      return "channel-" + (channel && channel.id || parts[1] + "-" + parts[3]);
    }
    if (parts[0] === "dms" && parts[1]) return "dm-" + parts[1];
    if (parts[0] === "notifications") return "activity-" + (parts[1] || "all");
    if (parts[0] === "search") return "search-global";
    if (parts[0] === "views" && parts[1]) return parts[1];
    if (parts[0] === "spaces" && parts[1]) {
      return "space-" + parts[1] + "-" + (parts[2] || "home") + (parts[3] ? "-" + parts[3] : "");
    }
    return "namespace-root";
  }

  function registeredProjectionPaths() {
    var paths = ["/", "/search", "/notifications/all", "/notifications/mentions",
      "/notifications/subscribed", "/notifications/hooks"];
    allDms().forEach(function (dm) { paths.push(dmPath(dm.id)); });
    allProjects().forEach(function (project) {
      projectChannelNames(project).forEach(function (channel) {
        paths.push("/projects/" + project.id + "/channels/" + channel);
      });
    });
    allSpaces().forEach(function (space) {
      paths.push(spacePath(space.id) + "/feed");
      (space.channels || []).forEach(function (channel) {
        paths.push(spacePath(space.id) + "/channels/" + channel);
      });
    });
    if (window.NB_SAVED_VIEWS) {
      window.NB_SAVED_VIEWS.list().forEach(function (view) { paths.push("/views/" + view.projectionId); });
    }
    return paths;
  }

  function projectionEntries(entries, path) {
    var list = entries || [];
    var spec = projectionForPath(path);
    var source = list.map(function (entry) {
      var ref = entry.ref;
      if (!ref || entry.kind === "representation" || entry.kind === "relation") {
        ref = {
          objectId: (entry.objectId ? entry.objectId + "." : spec.projectionId + ".") + slug(entry.name),
          kind: "artifact",
        };
      }
      return {
        ref: core().validateObjectRef(ref),
        alias: entry.alias || entry.name,
        aliasPath: resolve(path, entry.name),
        ...(entry.parentRef ? { parentRef: entry.parentRef } : {}),
        capabilities: entry.capabilities || {
          read: true,
          enter: entry.kind !== "file" && entry.kind !== "representation",
          expand: false,
          composeUnder: false,
          execute: false,
        },
      };
    });
    var projected = core().createProjection(spec, source).entries;
    return projected.map(function (entry, index) {
      return Object.assign({}, list[index], entry, { projectionId: spec.projectionId });
    });
  }

  function projectionForPath(path) {
    var canonical = canonicalize(path);
    var parts = split(canonical);
    var projectionId = projectionIdForPath(canonical);
    var kind = "namespace";
    var label = parts[parts.length - 1] || "Board";
    var visibility = "public";
    var saved = parts[0] === "views" && parts[1] && window.NB_SAVED_VIEWS
      ? window.NB_SAVED_VIEWS.get(parts[1]) : null;
    if (saved) {
      kind = "saved-query";
      label = saved.label;
      visibility = saved.visibility;
    } else if (parts[0] === "dms") {
      kind = "dm";
      visibility = "private";
    } else if (parts[0] === "notifications") {
      kind = "notifications";
      visibility = "private";
    } else if (parts[0] === "search") {
      kind = "search";
    } else if ((parts[0] === "projects" || parts[0] === "spaces") && parts.indexOf("channels") >= 0) {
      kind = "channel-feed";
    }
    return {
      projectionId: projectionId,
      kind: kind,
      label: label,
      root: core().validateObjectRef({ objectId: projectionId + ".root", kind: kind === "dm" ? "dm" : "artifact" }),
      parentRelation: "projection",
      order: { by: "manual", direction: "ascending" },
      visibility: visibility,
      ...(saved ? { query: window.NB_QUERY.normalize(saved.query),
        queryLanguageVersion: saved.queryLanguageVersion } : {}),
      version: saved && saved.version || 1,
    };
  }

  function pathForProjection(projectionId) {
    return registeredProjectionPaths().filter(function (path) {
      return projectionIdForPath(path) === projectionId;
    })[0] || null;
  }

  function objectAtPath(path, extra) {
    var parts = split(path);
    if (parts[0] === "notifications" && parts.length === 3) {
      var entry = (list("/notifications/" + parts[1], extra) || []).filter(function (candidate) {
        return candidate.name === parts[2];
      })[0];
      if (entry && entry.ref) return core().validateObjectRef(entry.ref);
    }
    var post = postAt(path, extra);
    return post ? objectRef(post) : null;
  }

  function pathForObject(objectId, projectionId, extra) {
    var base = projectionId ? pathForProjection(projectionId) : null;
    if (base) {
      var match = feedEntriesAt(base, extra).filter(function (entry) {
        return entry.objectId === objectId || entry.post && objectRef(entry.post).objectId === objectId;
      })[0];
      if (match) return base + "/" + match.name;
      if (base.indexOf("/views/") === 0) {
        var savedEntries = list(base, extra) || [];
        if (savedEntries.some(function (entry) { return entry.objectId === objectId; })) return base + "/" + objectId;
      }
    }
    var post = allMessages(extra).filter(function (candidate) {
      return objectRef(candidate).objectId === objectId;
    })[0];
    if (!post) return null;
    if (post.dm) base = dmPath(post.dm);
    else if (post.project) base = "/projects/" + post.project + "/channels/" + post.channel;
    else base = channelPath(post.channel);
    return messagePath(base, objectId, extra) || base + "/" + objectId;
  }

  function projectionLocations(objectId, extra) {
    var locations = [];
    var target = allMessages(extra).filter(function (post) {
      return objectRef(post).objectId === objectId;
    })[0] || null;
    var primary = pathForObject(objectId, null, extra);
    if (primary) {
      var base = channelFeedPath(primary);
      locations.push({ projectionId: projectionIdForPath(base), aliasPath: primary });
    }
    if (window.NB_SAVED_VIEWS) {
      window.NB_SAVED_VIEWS.list().forEach(function (saved) {
        var path = pathForObject(objectId, saved.projectionId, extra);
        if (path) locations.push({ projectionId: saved.projectionId, aliasPath: path });
      });
    }
    (D.notifications || []).filter(function (notification) {
      return notificationTargetId(notification) === objectId;
    }).forEach(function (notification) {
      var filter = notification.kind === "mention" ? "mentions"
        : notification.kind === "subscription" ? "subscribed" : "all";
      locations.push({ projectionId: "activity-" + filter,
        aliasPath: "/notifications/" + filter + "/" + notification.id });
    });
    if (primary && target && !target.dm) {
      locations.push({ projectionId: "search-global", aliasPath: "/search/" + objectId });
    }
    return locations;
  }

  /** Terminal nav node for a channel — posts are explored in the detail pane. */
  function channelNavEntry(c, opts) {
    opts = opts || {};
    var voice = !!(c && (c.voice || c.kind === "voice"));
    var id = c && (c.id || c.label);
    var label = (c && (c.label || c.id)) || opts.name || "channel";
    var nPosts = voice ? 0 : (opts.count == null ? postsIn(id, opts.extra).length : opts.count);
    var entry = {
      name: opts.name || label,
      kind: "channel",
      meta: (c && c.kind) || opts.meta || "channel",
      voice: voice,
      channel: c || { id: id || label, label: label },
      ref: entityRef(c, "channel", "channel-", opts.projectId ? opts.projectId + "-" + id : id),
      hint: voice
        ? "voice · Opus · low-latency"
        : (nPosts + " posts" + (c && c.unread ? " · " + c.unread + " unread" : "")),
      unread: (c && c.unread) || 0,
    };
    if (opts.spaceId) entry.spaceId = opts.spaceId;
    return entry;
  }

  /**
   * Post entries for a channel (or space-channel / space-feed) path — used by
   * the detail pane. Nav `list()` for those paths stays empty on purpose.
   */
  function feedEntriesAt(path, extra) {
    var parts = split(canonicalize(path));
    if (parts[0] === "projects" && parts[2] === "channels" && parts.length >= 4) {
      var proj = findProject(parts[1]);
      if (!proj) return [];
      var chanName = parts[3];
      if (proj.community) {
        var ch = findChannelByLabel(chanName);
        if (!ch || ch.voice || ch.kind === "voice") return [];
        return postEntries(postsIn(ch.id, extra));
      }
      if (projectChannelNames(proj).indexOf(chanName) === -1) return [];
      return postEntries(projectPosts(proj.id, chanName));
    }
    if (parts[0] === "spaces" && parts[2] === "channels" && parts.length >= 4) {
      var spaceNode = findSpaceNode(parts[1]);
      if (!spaceNode) return [];
      var chObj = (D.channels || []).filter(function (c) {
        return c.label === parts[3] || c.id === parts[3];
      })[0];
      if (!chObj || chObj.voice || chObj.kind === "voice") return [];
      return postEntries(postsIn(chObj.id, extra)).map(function (e) {
        e.spaceId = spaceNode.id;
        return e;
      });
    }
    if (parts[0] === "spaces" && parts[2] === "feed" && parts.length >= 3) {
      var sp = findSpaceNode(parts[1]);
      if (!sp) return [];
      return postEntries(postsForSpace(sp.id, extra), function (p) {
        return "#" + p.channel;
      }).map(function (entry) {
        entry.spaceId = sp.id;
        return entry;
      });
    }
    if (parts[0] === "dms" && parts.length >= 2) {
      return list(join(parts.slice(0, 2)), extra) || [];
    }
    return list(canonicalize(path), extra) || [];
  }

  /** Direct replies to parentId within a flat post list. */
  function replyEntries(parentId, pool) {
    return messageEntries(pool, parentId).map(function (entry) {
      return Object.assign({}, entry, { hint: entry.hint + " · reply" });
    });
  }

  function messageSummary(post) {
    return String((post && (post.subject || post.body)) || "message")
      .replace(/\s+/g, " ").trim().slice(0, 96);
  }

  /** Filesystem-only message children; nav deliberately keeps channels as leaves. */
  function messageEntries(pool, parentId) {
    var messages = pool || [];
    var graph = messageGraph(messages);
    var refs;
    if (parentId) {
      refs = graph.childrenOf(parentId);
    } else {
      var seenRoots = {};
      refs = messages.map(function (post) { return graph.rootOf(objectRef(post)); })
        .filter(function (ref) {
          if (seenRoots[ref.objectId]) return false;
          seenRoots[ref.objectId] = true;
          return true;
        });
    }
    return refs.map(function (messageRef) {
      var post = postFromMessage(graph.messageOf(messageRef));
      var ref = objectRef(post);
      var children = graph.childrenOf(ref).length > 0;
      return {
        name: ref.objectId,
        label: ref.objectId,
        alias: ref.objectId,
        aliases: [ref.objectId].concat(legacyPostNames(post)),
        kind: post.tombstone ? "tombstone" : "message",
        objectId: ref.objectId,
        ref: ref,
        capabilities: messageCapabilities(post, children),
        post: post,
        meta: post.state,
        hint: messageSummary(post),
      };
    });
  }

  /**
   * Walk …/channels/<ch>/<post>/… name segments against listing names.
   * Returns { post, listing } for the deepest segment, or null.
   */
  function walkPostSegments(pool, nameSegs) {
    if (!nameSegs || !nameSegs.length) return null;
    var listing = messageEntries(pool, null);
    var current = null;
    for (var i = 0; i < nameSegs.length; i++) {
      var hit = listing.filter(function (e) {
        return e.name === nameSegs[i] || (e.aliases || []).indexOf(nameSegs[i]) !== -1;
      })[0];
      if (!hit || !hit.post) return null;
      current = hit.post;
      listing = replyEntries(current.id, pool);
    }
    return { post: current, listing: listing };
  }

  function virtualMessageEntries(post, pool) {
    var ref = objectRef(post);
    var replyCount = messageEntries(pool, ref.objectId).length;
    return [
      { name: "body.md", kind: "representation", meta: "text/markdown", post: post,
        objectId: ref.objectId, ref: ref, capabilities: { read: true, enter: false, expand: false, composeUnder: false, execute: false } },
      { name: "metadata.json", kind: "representation", meta: "application/json", post: post,
        objectId: ref.objectId, ref: ref, capabilities: { read: true, enter: false, expand: false, composeUnder: false, execute: false } },
      { name: "replies", kind: "relation", meta: "reply", hint: replyCount + " direct replies",
        objectId: ref.objectId, ref: ref, capabilities: { read: true, enter: true, expand: replyCount > 0, composeUnder: true, execute: false } },
      { name: "backlinks", kind: "relation", meta: "backlink", objectId: ref.objectId, ref: ref,
        capabilities: { read: true, enter: true, expand: false, composeUnder: false, execute: false } },
      { name: "receipts", kind: "relation", meta: "provenance", objectId: ref.objectId, ref: ref,
        capabilities: { read: true, enter: true, expand: false, composeUnder: false, execute: false } },
    ];
  }

  function listMessageVirtualTail(post, pool, segments) {
    if (!segments.length) return virtualMessageEntries(post, pool);
    var relation = segments[0];
    var tail = segments.slice(1);
    if (relation === "replies") {
      var replies = messageEntries(pool, objectRef(post).objectId);
      if (!tail.length) return replies;
      var child = replies.filter(function (entry) {
        return entry.name === tail[0] || entry.objectId === tail[0] ||
          (entry.aliases || []).indexOf(tail[0]) !== -1;
      })[0];
      return child && child.post ? listMessageVirtualTail(child.post, pool, tail.slice(1)) : null;
    }
    if (relation === "backlinks" || relation === "receipts") return tail.length ? null : [];
    return null;
  }

  function listMessagePath(pool, segments) {
    var virtual = ["body.md", "metadata.json", "replies", "backlinks", "receipts"];
    var relationIndex = segments.findIndex(function (segment) { return virtual.indexOf(segment) >= 0; });
    var messageSegments = relationIndex < 0 ? segments : segments.slice(0, relationIndex);
    var walked = walkPostSegments(pool, messageSegments);
    if (!walked) return null;
    var post = walked.post;
    if (relationIndex < 0) return virtualMessageEntries(post, pool);
    return listMessageVirtualTail(post, pool, segments.slice(relationIndex));
  }

  /** Canonical hidden directory path for a message id, including reply parents. */
  function messagePath(path, postId, extra) {
    var feedPath = channelFeedPath(path);
    var pool = feedEntriesAt(feedPath, extra).map(function (e) { return e.post; }).filter(Boolean);
    var graph = messageGraph(pool);
    if (!graph.messageOf(postId)) return null;
    var chain = [];
    var seen = {};
    var current = objectRef(graph.messageOf(postId));
    while (current && !seen[current.objectId]) {
      seen[current.objectId] = true;
      chain.unshift(current.objectId);
      current = graph.parentOf(current);
    }
    return feedPath.replace(/\/$/, "") + "/" + chain.join("/");
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

  function notificationTargetId(notification) {
    if (!notification) return null;
    if (typeof notification.ref === "string") return notification.ref;
    if (notification.targetRef) {
      return typeof notification.targetRef === "string"
        ? notification.targetRef : notification.targetRef.objectId;
    }
    return null;
  }

  function notificationObjectRef(notification) {
    if (notification && notification.ref && typeof notification.ref === "object") {
      return core().validateObjectRef(notification.ref);
    }
    return core().validateObjectRef({
      objectId: "notification-" + String(notification && notification.id || "unavailable"),
      kind: "notification",
    });
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
    var removed = boardOverlay().removedChannels || [];
    var gone = {};
    removed.forEach(function (id) { gone[String(id)] = true; });
    var seen = {};
    var out = [];
    base.concat(extra).forEach(function (c) {
      if (!c || !c.id || seen[c.id]) return;
      if (gone[c.id]) return;
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
      objectId: "project-community",
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
      ref: entityRef(m, m.kind === "agent" ? "agent" : "member",
        m.kind === "agent" ? "agent-" : "member-", m.handle),
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
      ref: entityRef(a, "agent", "agent-", (a.project ? a.project + "-" : "") + a.id),
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
        { name: "views", kind: "dir", meta: "saved queries",
          hint: (window.NB_SAVED_VIEWS ? window.NB_SAVED_VIEWS.list().length : 0) + " saved views" },
        {
          name: ".agents", kind: "dir", meta: "eve",
          hint: nBoardAgents + " space agent" + (nBoardAgents === 1 ? "" : "s") +
            " · vercel/eve",
        },
      ];
    }

    if (parts[0] === "views") {
      if (!window.NB_SAVED_VIEWS) return parts.length === 1 ? [] : null;
      if (parts.length === 1) {
        return window.NB_SAVED_VIEWS.list().map(function (view) {
          return {
            name: view.projectionId,
            label: view.label,
            kind: "saved-view",
            ref: entityRef(view, "saved-view", "saved-view-", view.projectionId),
            projectionId: view.projectionId,
            meta: view.visibility,
            hint: view.query,
            capabilities: { read: true, enter: true, expand: true, composeUnder: false, execute: false },
          };
        });
      }
      if (parts.length === 2) {
        var savedView = window.NB_SAVED_VIEWS.get(parts[1]);
        if (!savedView || !window.NB_QUERY) return null;
        var result = window.NB_SAVED_VIEWS.open(savedView.projectionId, allMessages(extra));
        return result.error ? null : postEntries(result.posts);
      }
      return null;
    }

    if (parts[0] === "search") {
      if (parts.length === 1) {
        var searchPosts = allMessages(extra).filter(function (post) { return !post.dm; });
        return postEntries(searchPosts);
      }
      return null;
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
        return postEntries(postsForSpace(spaceNode.id, extra), function (p) {
          return "#" + p.channel;
        }).map(function (entry) {
          entry.spaceId = spaceNode.id;
          return entry;
        });
      }
      if (parts.length === 3 && parts[2] === "channels") {
        return (spaceNode.channels || []).map(function (label) {
          var ch = (D.channels || []).filter(function (c) {
            return c.label === label || c.id === label;
          })[0];
          return channelNavEntry(ch || { id: label, label: label }, {
            name: label, extra: extra, spaceId: spaceNode.id,
          });
        });
      }
      // Channel is a terminal nav node; filesystem callers can still list its
      // hidden root-message directories for cd/ls completion.
      if (parts.length === 4 && parts[2] === "channels") {
        var chanLabel = parts[3];
        var knownSpaceChan = (spaceNode.channels || []).some(function (label) {
          return label === chanLabel;
        }) || (D.channels || []).some(function (c) {
          return c.label === chanLabel || c.id === chanLabel;
        });
        if (!knownSpaceChan) return null;
        var spacePosts = feedEntriesAt(join(parts.slice(0, 4)), extra)
          .map(function (e) { return e.post; }).filter(Boolean);
        return messageEntries(spacePosts, null);
      }
      // Deep message directories expose direct replies to filesystem callers.
      if (parts.length >= 5 && parts[2] === "channels") {
        var spacePool = feedEntriesAt(join(parts.slice(0, 4)), extra)
          .map(function (e) { return e.post; }).filter(Boolean);
        return listMessagePath(spacePool, parts.slice(4));
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
        var notificationPool = allMessages(extra);
        return items.map(function (n, i) {
          var target = notificationPool.filter(function (post) {
            return objectRef(post).objectId === notificationTargetId(n);
          })[0] || null;
          var notificationRef = notificationObjectRef(n);
          return {
            name: n.id,
            alias: n.id,
            aliases: [n.id, notifName(n, i)],
            // Human label for the nav blade — same grammar as Activity cards.
            label: (n.who || "someone") + " · " + (n.reason || n.kind || "activity"),
            kind: "notification",
            objectId: notificationRef.objectId,
            ref: notificationRef,
            targetRef: target ? objectRef(target) : null,
            post: target,
            capabilities: target ? messageCapabilities(target, false)
              : { read: true, enter: false, expand: false, composeUnder: false, execute: false },
            meta: n.kind,
            hint: n.whereLabel || n.where || "",
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
            ref: entityRef(d, "dm", "dm-", d.id),
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
        return postEntries(messagesInDm(thread.id, extra)).map(function (entry) {
          entry.dm = thread.id;
          return entry;
        });
      }
      if (parts.length === 3) {
        var dmPool = messagesInDm(parts[1], extra);
        return listMessagePath(dmPool, parts.slice(2));
      }
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
            ref: entityRef(p, "project", "project-", p.id),
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

      // /projects/<id>/channels → channel list (terminal nav nodes)
      if (parts.length === 3 && parts[2] === "channels") {
        if (proj.community) {
          return allChannels().map(function (c) {
            return channelNavEntry(c, { extra: extra });
          });
        }
        return projectChannelNames(proj).map(function (c) {
          var n = projectPosts(proj.id, c).length;
          return channelNavEntry({ id: c, label: c, kind: "work" }, {
            projectId: proj.id, meta: "work", extra: extra, count: n,
          });
        });
      }

      // /projects/<id>/channels/<channel> remains terminal in nav, while
      // filesystem callers can list hidden root-message directories.
      if (parts.length === 4 && parts[2] === "channels") {
        var chanName = parts[3];
        var channelPosts;
        if (proj.community) {
          var ch = findChannelByLabel(chanName);
          if (!ch) return null;
          channelPosts = postsIn(ch.id, extra);
        } else {
          if (projectChannelNames(proj).indexOf(chanName) === -1) return null;
          channelPosts = projectPosts(proj.id, chanName);
        }
        return messageEntries(channelPosts, null);
      }

      // Deep message directories expose direct replies to filesystem callers.
      if (parts.length >= 5 && parts[2] === "channels") {
        var projectPool = feedEntriesAt(join(parts.slice(0, 4)), extra)
          .map(function (e) { return e.post; }).filter(Boolean);
        return listMessagePath(projectPool, parts.slice(4));
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

  /**
   * Channel leaves are terminal nav nodes — they have a detail feed, but must
   * not become the navbar's parent context (that yields an empty sibling list).
   */
  function isTerminalNavPath(path) {
    var parts = split(canonicalize(path));
    if (parts[0] === "projects" && parts[2] === "channels" && parts.length >= 4) {
      return true;
    }
    if (parts[0] === "spaces" && parts[2] === "channels" && parts.length >= 4) {
      return true;
    }
    return false;
  }

  /** Navbar listing path — parent of a terminal leaf, otherwise the path itself. */
  function navParentPath(path) {
    var canon = canonicalize(path);
    if (!isTerminalNavPath(canon)) return canon;
    var parts = split(canon);
    return join(parts.slice(0, 3)) || "/";
  }

  /** Does this path address a directory we can enter as a nav parent? */
  function isDir(path, extra) {
    if (postAt(path, extra)) return true;
    if (isTerminalNavPath(path)) return false;
    return list(path, extra) !== null;
  }

  /** The post at a path, if the path names one (detail / deep-link; not nav). */
  function postAt(path, extra) {
    var parts = split(canonicalize(path));
    if (parts[parts.length - 1] === "body.md") parts = parts.slice(0, -1);
    if ((parts[0] === "search" && parts.length >= 2) ||
        (parts[0] === "notifications" && parts.length >= 3)) {
      var baseLength = parts[0] === "search" ? 1 : 2;
      var projected = list(join(parts.slice(0, baseLength)), extra) || [];
      var projectedHit = projected.filter(function (entry) {
        return entry.objectId === parts[parts.length - 1] || entry.name === parts[parts.length - 1] ||
          (entry.aliases || []).indexOf(parts[parts.length - 1]) !== -1;
      })[0];
      return projectedHit ? projectedHit.post : null;
    }
    if (parts[0] === "views" && parts.length >= 3) {
      var viewEntries = list(join(parts.slice(0, 2)), extra) || [];
      var viewHit = viewEntries.filter(function (entry) {
        return entry.objectId === parts[2] || entry.name === parts[2];
      })[0];
      return viewHit ? viewHit.post : null;
    }
    // /projects/<id>/channels/<channel>/<post>/…
    if (parts[0] === "projects" && parts[2] === "channels" && parts.length >= 5) {
      var pool = feedEntriesAt(join(parts.slice(0, 4)), extra).map(function (e) {
        return e.post;
      });
      var walked = walkPostSegments(pool, parts.slice(4));
      return walked ? walked.post : null;
    }
    // /dms/<peer>/<message>
    if (parts[0] === "dms" && parts.length === 3) {
      var dmEntries = list(join(parts.slice(0, -1)), extra);
      if (!dmEntries) return null;
      var dmHit = dmEntries.filter(function (e) {
        return e.name === parts[parts.length - 1] ||
          (e.post && e.post.id === parts[parts.length - 1]);
      })[0];
      return dmHit ? dmHit.post : null;
    }
    // /spaces/<id>/channels/<ch>/<post>/…
    if (parts[0] === "spaces" && parts[2] === "channels" && parts.length >= 5) {
      var spPool = feedEntriesAt(join(parts.slice(0, 4)), extra).map(function (e) {
        return e.post;
      });
      var spWalked = walkPostSegments(spPool, parts.slice(4));
      return spWalked ? spWalked.post : null;
    }
    // /spaces/<id>/feed/<post>
    if (parts[0] === "spaces" && parts[2] === "feed" && parts.length >= 4) {
      var feedEntries = feedEntriesAt(join(parts.slice(0, 3)), extra);
      var feedHit = feedEntries.filter(function (e) {
        return e.name === parts[parts.length - 1] ||
          (e.post && e.post.id === parts[parts.length - 1]);
      })[0];
      return feedHit ? feedHit.post : null;
    }
    return null;
  }

  /**
   * Channel (or space channel) path whose listing is the full feed — strips
   * trailing post segments used as reply-nav context.
   */
  function channelFeedPath(path) {
    var parts = split(canonicalize(path));
    if (parts[0] === "projects" && parts[2] === "channels" && parts.length >= 4) {
      return join(parts.slice(0, 4));
    }
    if (parts[0] === "spaces" && parts[2] === "channels" && parts.length >= 4) {
      return join(parts.slice(0, 4));
    }
    if (parts[0] === "spaces" && parts[2] === "feed" && parts.length >= 3) {
      return join(parts.slice(0, 3));
    }
    if (parts[0] === "dms" && parts.length >= 2) {
      return join(parts.slice(0, 2));
    }
    return canonicalize(path);
  }

  /** True when path is inside a post's reply listing (…/channels/ch/post…). */
  function isPostReplyPath(path) {
    var parts = split(canonicalize(path));
    if (parts[0] === "projects" && parts[2] === "channels" && parts.length >= 5) return true;
    if (parts[0] === "spaces" && parts[2] === "channels" && parts.length >= 5) return true;
    return false;
  }

  /**
   * Legacy helper: post paths are no longer nav listings. Always null —
   * thread focus lives in the detail pane via `threadFocus`.
   */
  function replyNavParent() {
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
    list: function (path, extra) {
      var entries = list(path, extra);
      return entries === null ? null : projectionEntries(entries, path);
    }, split: split, join: join, resolve: resolve,
    isDir: isDir, postAt: postAt, postName: postName, slug: slug,
    canonicalize: canonicalize, channelPath: channelPath, dmPath: dmPath,
    spacePath: spacePath,
    channelFeedPath: channelFeedPath,
    isTerminalNavPath: isTerminalNavPath,
    navParentPath: navParentPath,
    feedEntriesAt: function (path, extra) {
      return projectionEntries(feedEntriesAt(path, extra), path);
    },
    messagePath: messagePath,
    isPostReplyPath: isPostReplyPath,
    replyNavParent: replyNavParent,
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
    objectRef: objectRef,
    toCommunityMessage: toCommunityMessage,
    messageGraph: messageGraph,
    postFromMessage: postFromMessage,
    projectionIdForPath: projectionIdForPath,
    projectionForPath: projectionForPath,
    pathForProjection: pathForProjection,
    objectAtPath: objectAtPath,
    pathForObject: pathForObject,
    projectionLocations: projectionLocations,
  };
})();
