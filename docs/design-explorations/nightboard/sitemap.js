/**
 * The board as a filesystem.
 *
 * Every destination has a path, so one navigation model serves the command
 * line, the columns, the breadcrumb and the URL. That is what makes `cd` and
 * clicking a folder the same operation instead of two features that happen to
 * agree.
 *
 *   /channels/general/003-scout-plan
 *   /members/scout
 *   /projects/civic-tuner
 *   /epochs/13
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

  /**
   * List a directory. Returns entries with enough shape for a column to render
   * and for completion to rank.
   */
  function list(path, extra) {
    var parts = split(path);
    if (parts.length === 0) {
      return [
        { name: "channels", kind: "dir", hint: D.channels.length + " channels" },
        { name: "members", kind: "dir", hint: D.members.length + " on the roll" },
        { name: "projects", kind: "dir", hint: D.projects.length + " linked" },
        { name: "epochs", kind: "dir", hint: "epoch " + D.board.epoch + " open" },
      ];
    }
    if (parts[0] === "channels") {
      if (parts.length === 1) {
        return D.channels.map(function (c) {
          return {
            name: c.label, kind: "dir", meta: c.kind,
            hint: postsIn(c.id, extra).length + " posts" + (c.unread ? " · " + c.unread + " unread" : ""),
            unread: c.unread || 0,
          };
        });
      }
      var ch = D.channels.filter(function (c) { return c.label === parts[1]; })[0];
      if (!ch) return null;
      if (parts.length === 2) {
        return postsIn(ch.id, extra).map(function (p, i) {
          return {
            name: postName(p, i), kind: "file", post: p, meta: p.state,
            hint: p.who + " · " + p.at,
          };
        });
      }
      return null;
    }
    if (parts[0] === "members") {
      if (parts.length === 1) {
        return D.members.map(function (m) {
          return { name: m.handle, kind: m.kind === "agent" ? "agent" : "file", meta: m.role, hint: m.detail || m.state || "" };
        });
      }
      return null;
    }
    // Projects own channels of their own, so the tree keeps going instead of
    // stopping at a name you cannot open.
    if (parts[0] === "projects") {
      if (parts.length === 1) {
        return D.projects.map(function (p) {
          return { name: slug(p.slug), kind: "dir", meta: "linked project",
            hint: (p.channels || []).length + " channels · " + p.open + " open" };
        });
      }
      var proj = D.projects.filter(function (p) { return slug(p.slug) === parts[1]; })[0];
      if (!proj) return null;
      if (parts.length === 2) {
        return (proj.channels || []).map(function (c) {
          return { name: c, kind: "dir", meta: "work",
            hint: projectPosts(parts[1], c).length + " posts" };
        });
      }
      if (parts.length === 3) {
        return projectPosts(parts[1], parts[2]).map(function (p, i) {
          return { name: postName(p, i), kind: "file", post: p, meta: p.state,
            hint: p.who + " · " + p.at };
        });
      }
      return null;
    }
    if (parts[0] === "epochs") {
      if (parts.length === 1) {
        return [{ name: String(D.board.epoch), kind: "file", meta: "open",
          hint: D.board.landed + "/" + D.board.total + " landed · ships " + D.board.ships }];
      }
      return null;
    }
    return null;
  }

  function split(path) {
    return String(path || "/").split("/").filter(Boolean);
  }

  function join(parts) {
    return "/" + parts.join("/");
  }

  /** Resolve a possibly-relative path against a base, honouring . and .. */
  function resolve(base, input) {
    var target = String(input == null ? "" : input).trim();
    if (target === "") return base;
    var parts = target.charAt(0) === "/" ? [] : split(base);
    target.split("/").forEach(function (seg) {
      if (seg === "" || seg === ".") return;
      if (seg === "..") parts.pop();
      else parts.push(seg);
    });
    return join(parts);
  }

  /** Does this path address a directory we can list? */
  function isDir(path, extra) {
    return list(path, extra) !== null;
  }

  /** The post at a path, if the path names one. */
  function postAt(path, extra) {
    var parts = split(path);
    var isChannelPost = parts.length === 3 && parts[0] === "channels";
    var isProjectPost = parts.length === 4 && parts[0] === "projects";
    if (!isChannelPost && !isProjectPost) return null;
    var entries = list(join(parts.slice(0, -1)), extra);
    if (!entries) return null;
    var hit = entries.filter(function (e) { return e.name === parts[parts.length - 1]; })[0];
    return hit ? hit.post : null;
  }

  window.NB_MAP = {
    list: list, split: split, join: join, resolve: resolve,
    isDir: isDir, postAt: postAt, postName: postName, slug: slug,
  };
})();
