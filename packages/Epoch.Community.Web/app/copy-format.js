/**
 * Optimized clipboard formats for Community Web content.
 *
 * Plain text tuned for paste into agents, issues, and docs — stable headers,
 * who/when/state lines, nested replies indented, chat turns labeled.
 */
(function () {
  "use strict";

  function plain(s) {
    return String(s == null ? "" : s)
      .replace(/\r\n/g, "\n")
      .replace(/\u00a0/g, " ")
      .trimEnd();
  }

  function fence(title, body) {
    var head = "--- community web " + title + " ---";
    var foot = "---";
    var core = plain(body);
    return head + "\n" + (core ? core + "\n" : "") + foot + "\n";
  }

  function memberRole(who) {
    try {
      var m = window.CW_MAP && window.CW_MAP.findMember && window.CW_MAP.findMember(who);
      return m && m.role ? m.role : "";
    } catch {
      return "";
    }
  }

  function formatPostLine(p, depth) {
    if (!p) return "";
    depth = depth || 0;
    var pad = depth > 0 ? Array(depth + 1).join("  ") : "";
    var role = memberRole(p.who);
    var meta = [
      "@" + (p.who || "unknown"),
      role || null,
      p.at || null,
      p.state || null,
    ].filter(Boolean).join(" · ");
    var bits = [pad + meta];
    if (p.subject) bits.push(pad + plain(p.subject));
    if (p.body) {
      plain(p.body).split("\n").forEach(function (ln) {
        bits.push(pad + ln);
      });
    }
    if (p.anchor) bits.push(pad + "-> " + plain(p.anchor));
    if (p.sig) bits.push(pad + "sig:" + plain(p.sig).replace(/^sig:/, ""));
    return bits.join("\n");
  }

  function collectReplies(rootId, posts) {
    posts = posts || [];
    var byParent = {};
    posts.forEach(function (p) {
      if (!p || !p.re) return;
      if (!byParent[p.re]) byParent[p.re] = [];
      byParent[p.re].push(p);
    });
    function walk(id, depth, out) {
      var kids = byParent[id] || [];
      kids.forEach(function (k) {
        out.push({ post: k, depth: depth });
        walk(k.id, depth + 1, out);
      });
    }
    var out = [];
    walk(rootId, 1, out);
    return out;
  }

  function allPosts(extra) {
    var D = window.CW_DATA || {};
    return []
      .concat(D.posts || [])
      .concat(D.projectPosts || [])
      .concat(extra || []);
  }

  function formatPost(p, opts) {
    opts = opts || {};
    if (!p) return "";
    var path = opts.path || "";
    var channel = p.channel || opts.channel || "";
    var title = "post · " + (channel ? "#" + channel + " · " : "") +
      (p.id || "post") + (path ? " · " + path : "");
    return fence(title, formatPostLine(p, 0));
  }

  function formatThread(root, opts) {
    opts = opts || {};
    if (!root) return "";
    var posts = opts.posts || allPosts(opts.extra);
    var path = opts.path || "";
    var channel = root.channel || opts.channel || "";
    var title = "thread · " + (channel ? "#" + channel + " · " : "") +
      (root.id || "thread") + (path ? " · " + path : "");
    var body = [formatPostLine(root, 0)];
    collectReplies(root.id, posts).forEach(function (row) {
      body.push("");
      body.push(formatPostLine(row.post, row.depth));
    });
    return fence(title, body.join("\n"));
  }

  function formatChannelFeed(posts, opts) {
    opts = opts || {};
    posts = (posts || []).slice();
    var channel = opts.channel || (posts[0] && posts[0].channel) || "";
    var path = opts.path || "";
    var title = "feed · " + (channel ? "#" + channel : "channel") +
      (path ? " · " + path : "");
    if (!posts.length) return fence(title, "(empty)");
    // Roots only, each with replies.
    var roots = posts.filter(function (p) { return p && !p.re; });
    if (!roots.length) roots = posts.slice();
    var chunks = [];
    roots.forEach(function (r, i) {
      if (i) chunks.push("");
      chunks.push(formatPostLine(r, 0));
      collectReplies(r.id, posts).forEach(function (row) {
        chunks.push("");
        chunks.push(formatPostLine(row.post, row.depth));
      });
    });
    return fence(title, chunks.join("\n"));
  }

  function formatTranscriptLine(line) {
    if (!line) return "";
    var kind = line.kind || "out";
    if (kind === "banner") return null; // skip chrome
    if (kind === "tool") {
      var mark = line.ok === false ? "failed" : line.ok === true ? "ok" : "…";
      var head = "agent/tool " + (line.tool || "tool") + " · " + mark;
      var bits = [head];
      if (line.summary) bits.push("  " + plain(line.summary));
      if (line.detail) bits.push("  args: " + plain(line.detail));
      if (line.result != null && line.result !== "") {
        bits.push("  result: " + plain(String(line.result)));
      }
      return bits.join("\n");
    }
    if (kind === "user") {
      var mode = line.mode ? "[" + line.mode + "] " : "";
      var text = plain(line.text || "");
      var att = "";
      if (line.attachments && line.attachments.length) {
        att = "\n  attachments: " + line.attachments.map(function (a) {
          return a.name || a.id || "file";
        }).join(", ");
      }
      var bound = "";
      if (line.boundContext && line.boundContext.length) {
        bound = "\n  context: " + line.boundContext.map(function (c) {
          return (c.kind || "ctx") + ":" + (c.name || c.id);
        }).join(", ");
      }
      return "you " + mode + text + att + bound;
    }
    if (kind === "agent") return "agent: " + plain(line.text || "");
    if (kind === "error") return "error: " + plain(line.text || "");
    if (kind === "progress") return "… " + plain(line.text || "");
    return plain(line.text || "");
  }

  function formatTranscript(lines, opts) {
    opts = opts || {};
    lines = lines || [];
    var path = opts.path || "";
    var title = "chat" + (path ? " · " + path : "");
    var body = lines.map(formatTranscriptLine).filter(function (x) {
      return x != null && String(x).trim() !== "";
    });
    if (!body.length) return fence(title, "(empty)");
    return fence(title, body.join("\n\n"));
  }

  function formatDmMessages(messages, opts) {
    opts = opts || {};
    var peer = opts.peer || "";
    var path = opts.path || (peer ? "/dms/" + peer : "");
    var title = "messages · @" + (peer || "dm") + (path ? " · " + path : "");
    // DM posts often look like channel posts with dm field.
    var posts = (messages || []).slice();
    if (!posts.length) return fence(title, "(empty)");
    var chunks = posts.map(function (p) {
      return formatPostLine(p, 0);
    });
    return fence(title, chunks.join("\n\n"));
  }

  function formatNotification(n, opts) {
    opts = opts || {};
    if (!n) return "";
    var title = "activity · " + (n.id || "item") +
      (opts.path ? " · " + opts.path : "");
    var bits = [
      (n.kind || "notice") + (n.who ? " · @" + n.who : ""),
      n.at || null,
      plain(n.title || n.subject || ""),
      plain(n.body || n.text || ""),
      n.where ? ("where: " + n.where) : null,
    ].filter(Boolean);
    return fence(title, bits.join("\n"));
  }

  /**
   * Pick the best payload for a context-menu target + app state.
   */
  function formatForTarget(target, state) {
    state = state || (window.CW_APP && window.CW_APP.state) || {};
    target = target || {};
    var MAP = window.CW_MAP;
    var path = target.path || state.path || "/";
    var extra = state.merged || [];

    if (target.kind === "post" || target.kind === "chat-line") {
      if (target.kind === "chat-line") {
        var line = (state.lines || []).filter(function (l) {
          return l && l.id === target.id;
        })[0];
        if (line) {
          return formatTranscript([line], { path: path });
        }
        return formatTranscript(state.lines || [], { path: path });
      }
      var post = null;
      allPosts(extra).some(function (p) {
        if (p && p.id === target.id) { post = p; return true; }
        return false;
      });
      if (!post && target.elementPost) post = target.elementPost;
      if (post) return formatThread(post, { path: path, extra: extra, channel: post.channel });
    }

    if (target.kind === "channel" || target.kind === "nav-item") {
      var label = target.name || target.elementKey || "";
      var chan = MAP && MAP.findChannelByLabel ? MAP.findChannelByLabel(label) : null;
      var channelId = chan ? chan.id : label;
      var feed = allPosts(extra).filter(function (p) {
        return p && !p.dm && (p.channel === channelId || p.channel === label ||
          p.channel === (chan && chan.label));
      });
      if (feed.length) {
        return formatChannelFeed(feed, {
          channel: (chan && chan.label) || label,
          path: path.indexOf("/channels/") >= 0 ? path : "/projects/community/channels/" + label,
        });
      }
    }

    if (target.kind === "dm") {
      var peer = target.name || (MAP && MAP.split(path)[1]) || "";
      peer = String(peer).replace(/^@/, "");
      var dms = allPosts(extra).filter(function (p) {
        return p && (p.dm === peer || (p.channel === "dm:" + peer));
      });
      // Fixture DMs may live on D.dms
      var D = window.CW_DATA || {};
      if (!dms.length && D.dms) {
        var thread = (D.dms || []).filter(function (d) {
          return d && (d.peer === peer || d.id === peer);
        })[0];
        if (thread && thread.messages) dms = thread.messages;
      }
      if (!dms.length && MAP && MAP.findDm) {
        var dm = MAP.findDm(peer);
        if (dm && dm.messages) dms = dm.messages;
        else if (dm && dm.posts) dms = dm.posts;
      }
      return formatDmMessages(dms, { peer: peer, path: path });
    }

    if (target.kind === "activity") {
      var n = null;
      if (MAP && MAP.findNotification) n = MAP.findNotification(target.id);
      if (!n && (D = window.CW_DATA) && D.notifications) {
        n = (D.notifications || []).filter(function (x) { return x.id === target.id; })[0];
      }
      return formatNotification(n || {
        id: target.id, title: target.name, where: path,
      }, { path: path });
    }

    // Session / prompt / blade → full chat transcript.
    if (target.kind === "prompt" || target.kind === "blade" || target.kind === "detail" ||
        target.kind === "session" || target.kind === "chat") {
      return formatTranscript(state.lines || [], { path: path });
    }

    // Fallback: path reference.
    return fence("path · " + (target.name || target.id || "item"), path);
  }

  function copyText(text) {
    text = String(text || "");
    if (!text) return Promise.resolve(false);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () {
        return fallbackCopy(text);
      });
    }
    return Promise.resolve(fallbackCopy(text));
  }

  function fallbackCopy(text) {
    try {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }

  window.CW_COPY = {
    formatPost: formatPost,
    formatThread: formatThread,
    formatChannelFeed: formatChannelFeed,
    formatTranscript: formatTranscript,
    formatDmMessages: formatDmMessages,
    formatNotification: formatNotification,
    formatForTarget: formatForTarget,
    copyText: copyText,
    fence: fence,
  };
})();
