/**
 * The board's GraphQL API.
 *
 * Everything queryable lives behind one schema — channels, posts, members,
 * projects, dms, members — so the agent asks the data what exists instead of
 * being told in a prompt that can drift from it. Introspection is the point: a
 * schema that describes itself cannot go stale the way a hand-written tool list
 * does.
 *
 * The engine is graphql-js, so queries are validated with real error positions
 * rather than pattern-matched. A resolver that answers whatever it is asked is
 * not an API.
 */
(function () {
  "use strict";

  var D = window.NB_DATA;
  var MAP = window.NB_MAP;

  var SDL = `
    type ObjectRef {
      objectId: ID!
      kind: String!
      atUri: String
      revision: String
      canonicalUrl: String!
    }

    type Tombstone {
      formerKind: String!
      reason: String!
      deletedAt: String
      replacement: ObjectRef
    }

    type Relation {
      type: String!
      source: ObjectRef!
      target: ObjectRef!
    }

    type ProjectionLocation {
      projectionId: ID!
      aliasPath: String!
      parentObjectId: ID
    }

    type EntryCapabilities {
      read: Boolean!
      enter: Boolean!
      expand: Boolean!
      composeUnder: Boolean!
      execute: Boolean!
    }

    "A person or an agent on the roll."
    type Member {
      handle: String!
      role: String!
      "person or agent"
      kind: String!
      "Presence, where known."
      state: String
      "Harness and supervisor for an agent — accountability is queryable."
      detail: String
      "Everything this member has posted, newest last."
      posts: [Post!]!
    }

    "One thing that happened: a message, an agent run, a promotion, or a DM."
    type Post {
      id: ID!
      ref: ObjectRef!
      context: ObjectRef!
      "Channel id when this is a room post; null for direct messages."
      channel: String
      "DM thread id when this is a direct message; null for channel posts."
      dm: String
      author: Member
      at: String!
      "open, needs-review, promoted or signed"
      state: String!
      subject: String
      body: String!
      "What it points at: a file, an agent run, an intent."
      anchor: String
      "The signature it carries."
      sig: String!
      "Where this sits in the tree."
      path: String!
      aliases: [String!]!
      inReplyTo: Message
      threadRoot: Message!
      replies(first: Int = 50, after: String, order: String): MessageConnection!
      relations(type: String): [Relation!]!
      tombstone: Tombstone
      locations: [ProjectionLocation!]!
    }

    "Canonical message graph object; Post remains a compatibility feed shape."
    type Message {
      id: ID!
      ref: ObjectRef!
      context: ObjectRef!
      author: Member
      at: String!
      state: String!
      subject: String
      body: String!
      path: String!
      aliases: [String!]!
      inReplyTo: Message
      threadRoot: Message!
      replies(first: Int = 50, after: String, order: String): MessageConnection!
      relations(type: String): [Relation!]!
      tombstone: Tombstone
      locations: [ProjectionLocation!]!
    }

    type MessageEdge { cursor: String!, node: Message! }
    type PageInfo { endCursor: String, hasNextPage: Boolean! }
    type MessageConnection { edges: [MessageEdge!]!, pageInfo: PageInfo!, totalCount: Int! }

    type ProjectionEntry {
      ref: ObjectRef!
      alias: String!
      aliasPath: String!
      parentObjectId: ID
      depth: Int!
      position: Int!
      setSize: Int!
      capabilities: EntryCapabilities!
    }

    type ProjectionEntryEdge { cursor: String!, node: ProjectionEntry! }
    type ProjectionEntryConnection {
      edges: [ProjectionEntryEdge!]!
      pageInfo: PageInfo!
      totalCount: Int!
    }

    type Projection {
      projectionId: ID!
      kind: String!
      label: String!
      visibility: String!
      query: String
      queryLanguageVersion: Int
      entries(first: Int = 50, after: String): ProjectionEntryConnection!
    }

    "A room. Social channels are where people are; work channels are where work is."
    type Channel {
      id: ID!
      label: String!
      "social or work"
      kind: String!
      unread: Int
      posts: [Post!]!
      postCount: Int!
      path: String!
    }

    "A linked repository, which owns channels of its own."
    type Project {
      slug: ID!
      open: Int!
      channels: [ProjectChannel!]!
      path: String!
    }

    type ProjectChannel {
      name: String!
      posts: [Post!]!
      path: String!
    }

    "A 1:1 direct message thread with a person or agent — sibling of projects."
    type DirectMessage {
      id: ID!
      peer: String!
      "person or agent"
      kind: String!
      unread: Int
      preview: String
      member: Member
      messages: [Post!]!
      messageCount: Int!
      path: String!
    }

    "A point-in-time materialisation of what the community built."
    type Epoch {
      number: Int!
      landed: Int!
      total: Int!
      ships: String!
    }

    type Board {
      name: String!
      epoch: Epoch!
    }

    type Query {
      board: Board!
      channels(kind: String): [Channel!]!
      channel(label: String!): Channel
      members(kind: String): [Member!]!
      member(handle: String!): Member
      projects: [Project!]!
      project(slug: String!): Project
      "Direct message threads with people and agents."
      dms(kind: String): [DirectMessage!]!
      dm(peer: String!): DirectMessage
      "Full-text over subjects and bodies (channels and DMs)."
      search(text: String!, limit: Int = 10): [Post!]!
      "Posts in a given state, e.g. needs-review."
      posts(state: String, channel: String, limit: Int = 50): [Post!]!
      object(objectId: ID!): Message
      projections: [Projection!]!
      projection(projectionId: ID!): Projection
      "What a path in the tree contains — the sitemap, queryable."
      listPath(path: String!): [PathEntry!]!
    }

    type PathEntry {
      name: String!
      "dir, file or agent"
      kind: String!
      hint: String
      path: String!
      ref: ObjectRef
      capabilities: EntryCapabilities!
    }
  `;

  function allPosts() {
    var live = (window.NB_APP && window.NB_APP.state && window.NB_APP.state.merged) || [];
    return D.posts.concat(live);
  }

  function allDmMessages() {
    var live = (window.NB_APP && window.NB_APP.state && window.NB_APP.state.merged) || [];
    return (D.dmMessages || []).concat(live.filter(function (m) { return m.dm; }));
  }

  function memberOf(handle) {
    if (handle === "you") return null;
    var m = D.members.filter(function (x) { return x.handle === handle; })[0];
    return m ? decorateMember(m) : null;
  }

  function objectRef(post) {
    return MAP.objectRef(post);
  }

  function canonicalUrl(ref) {
    var origin = window.location && window.location.origin || "";
    return window.NB_CORE.objectUrl(ref, origin ? { origin: origin } : {});
  }

  function allMessages() {
    return allPosts().concat(allDmMessages(), D.projectPosts || []);
  }

  function findMessage(objectId) {
    var message = MAP.messageGraph(allMessages()).messageOf(objectId);
    return message ? MAP.postFromMessage(message) : null;
  }

  function parentMessage(post) {
    var graph = MAP.messageGraph(allMessages());
    var parent = graph.parentOf(objectRef(post));
    return parent ? MAP.postFromMessage(graph.messageOf(parent)) : null;
  }

  function rootMessage(post) {
    var graph = MAP.messageGraph(allMessages());
    return MAP.postFromMessage(graph.messageOf(graph.rootOf(objectRef(post))));
  }

  function connection(items, args, decorate) {
    args = args || {};
    var start = args.after ? Number(args.after) + 1 : 0;
    var limit = args.first == null ? 50 : Math.max(0, args.first);
    var page = items.slice(start, start + limit);
    return {
      edges: page.map(function (item, index) {
        return { cursor: String(start + index), node: decorate ? decorate(item) : item };
      }),
      pageInfo: { endCursor: page.length ? String(start + page.length - 1) : null,
        hasNextPage: start + page.length < items.length },
      totalCount: items.length,
    };
  }

  function locationsFor(post) {
    var ref = objectRef(post);
    var locations = MAP.projectionLocations(ref.objectId);
    var primary = MAP.pathForObject(ref.objectId);
    if (primary) locations.push({ projectionId: "thread-" + objectRef(rootMessage(post)).objectId,
      aliasPath: primary });
    return locations;
  }

  function decorateMember(m) {
    return Object.assign({}, m, {
      posts: function () {
        return allPosts().filter(function (p) { return p.who === m.handle; }).map(decoratePost);
      },
    });
  }

  function channelPath(channelId) {
    var c = D.channels.filter(function (x) { return x.id === channelId; })[0];
    return c ? MAP.channelPath(c.label) : "/projects/community/channels";
  }

  function decoratePost(p) {
    var ref = objectRef(p);
    var common = {
      ref: Object.assign({}, ref, { canonicalUrl: canonicalUrl(ref) }),
      context: function () {
        var contextId = p.dm ? "dm:" + p.dm : p.project
          ? "project-channel:" + p.project + ":" + p.channel : "channel:" + p.channel;
        var context = { objectId: contextId, kind: p.dm ? "dm" : "channel" };
        return Object.assign(context, { canonicalUrl: canonicalUrl(context) });
      },
      aliases: [ref.objectId, (D.legacyPostAliases || {})[p.id]].filter(Boolean),
      inReplyTo: function () { var parent = parentMessage(p); return parent ? decoratePost(parent) : null; },
      threadRoot: function () { return decoratePost(rootMessage(p)); },
      replies: function (args) {
        var graph = MAP.messageGraph(allMessages());
        var children = graph.childrenOf(ref).map(function (child) {
          return MAP.postFromMessage(graph.messageOf(child));
        });
        return connection(children, args, decoratePost);
      },
      relations: function (args) {
        var relations = (p.relations || []).slice();
        var parent = parentMessage(p);
        if (parent) relations.unshift({ type: "reply", source: ref, target: objectRef(parent) });
        return relations.filter(function (relation) { return !args.type || relation.type === args.type; })
          .map(function (relation) {
            return Object.assign({}, relation, {
              source: Object.assign({}, relation.source, { canonicalUrl: canonicalUrl(relation.source) }),
              target: Object.assign({}, relation.target, { canonicalUrl: canonicalUrl(relation.target) }),
            });
          });
      },
      tombstone: p.tombstone || null,
      locations: function () { return locationsFor(p); },
    };
    if (p.dm) {
      var dmIdx = allDmMessages().filter(function (q) { return q.dm === p.dm; }).indexOf(p);
      return Object.assign({}, p, common, {
        channel: p.channel || null,
        dm: p.dm,
        author: function () { return memberOf(p.who); },
        path: MAP.dmPath(p.dm) + "/" + MAP.postName(p, Math.max(0, dmIdx)),
      });
    }
    var idx = allPosts().filter(function (q) { return q.channel === p.channel; }).indexOf(p);
    return Object.assign({}, p, common, {
      channel: p.channel || null,
      dm: null,
      author: function () { return memberOf(p.who); },
      path: channelPath(p.channel) + "/" + MAP.postName(p, Math.max(0, idx)),
    });
  }

  function decorateDm(d) {
    return Object.assign({}, d, {
      member: function () { return memberOf(d.peer); },
      messages: function () {
        return allDmMessages().filter(function (m) { return m.dm === d.id; }).map(decoratePost);
      },
      messageCount: function () {
        return allDmMessages().filter(function (m) { return m.dm === d.id; }).length;
      },
      path: MAP.dmPath(d.id),
    });
  }

  function decorateChannel(c) {
    return Object.assign({}, c, {
      posts: function () {
        return allPosts().filter(function (p) { return p.channel === c.id; }).map(decoratePost);
      },
      postCount: function () {
        return allPosts().filter(function (p) { return p.channel === c.id; }).length;
      },
      path: MAP.channelPath(c.label),
    });
  }

  function decorateProject(p) {
    var slug = MAP.slug(p.slug);
    return {
      slug: p.slug,
      open: p.open,
      path: "/projects/" + slug,
      channels: (p.channels || []).map(function (name) {
        return {
          name: name,
          path: "/projects/" + slug + "/channels/" + name,
          posts: function () {
            return (D.projectPosts || [])
              .filter(function (q) { return q.project === slug && q.channel === name; })
              .map(function (q) {
                return Object.assign({}, q, {
                  author: function () { return memberOf(q.who); },
                  path: "/projects/" + slug + "/channels/" + name,
                });
              });
          },
        };
      }),
    };
  }

  function projectionSpecs() {
    var specs = (D.channels || []).filter(function (channel) {
      return !channel.voice && channel.kind !== "voice";
    }).map(function (channel) {
      var path = MAP.channelPath(channel.label);
      return Object.assign({}, MAP.projectionForPath(path), { path: path });
    });
    if (window.NB_SAVED_VIEWS) {
      specs = specs.concat(window.NB_SAVED_VIEWS.list({ includePrivate: false }).map(function (view) {
        var path = "/views/" + view.projectionId;
        return Object.assign({}, MAP.projectionForPath(path), {
          path: path,
          query: view.query,
          queryLanguageVersion: view.queryLanguageVersion,
        });
      }));
    }
    return specs;
  }

  function decorateProjection(spec) {
    return Object.assign({}, spec, {
      entries: function (args) {
        var entries = MAP.list(spec.path) || [];
        return connection(entries, args, function (entry) {
          var post = entry.post;
          var ref = post ? objectRef(post) : entry.ref || {
            objectId: entry.objectId || spec.projectionId + ":" + entry.name,
            kind: entry.kind === "message" ? "message" : "artifact",
          };
          return {
            ref: Object.assign({}, ref, { canonicalUrl: canonicalUrl(ref) }),
            alias: entry.alias || entry.name,
            aliasPath: entry.aliasPath || MAP.resolve(spec.path, entry.name),
            parentObjectId: entry.parentRef && entry.parentRef.objectId || null,
            depth: entry.depth == null ? MAP.split(spec.path).length + 1 : entry.depth,
            position: entry.position || 1,
            setSize: entry.setSize || entries.length,
            capabilities: entry.capabilities || {
              read: true, enter: entry.kind !== "file", expand: false,
              composeUnder: false, execute: false,
            },
          };
        });
      },
    });
  }

  var root = {
    board: function () {
      return {
        name: D.board.name,
        epoch: {
          number: D.board.epoch, landed: D.board.landed,
          total: D.board.total, ships: D.board.ships,
        },
      };
    },
    channels: function (args) {
      return D.channels
        .filter(function (c) { return !args.kind || c.kind === args.kind; })
        .map(decorateChannel);
    },
    channel: function (args) {
      var c = D.channels.filter(function (x) { return x.label === args.label || x.id === args.label; })[0];
      return c ? decorateChannel(c) : null;
    },
    members: function (args) {
      return D.members
        .filter(function (m) { return !args.kind || m.kind === args.kind; })
        .map(decorateMember);
    },
    member: function (args) { return memberOf(args.handle); },
    projects: function () { return D.projects.map(decorateProject); },
    project: function (args) {
      var p = D.projects.filter(function (x) {
        return x.slug === args.slug || MAP.slug(x.slug) === args.slug;
      })[0];
      return p ? decorateProject(p) : null;
    },
    dms: function (args) {
      return (D.dms || [])
        .filter(function (d) { return !args.kind || d.kind === args.kind; })
        .map(decorateDm);
    },
    dm: function (args) {
      var key = String(args.peer || "").replace(/^@/, "");
      var d = (D.dms || []).filter(function (x) {
        return x.id === key || x.peer === key;
      })[0];
      return d ? decorateDm(d) : null;
    },
    search: function (args) {
      var q = String(args.text || "").toLowerCase();
      var pool = allPosts().concat(allDmMessages());
      return pool
        .filter(function (p) {
          return ((p.subject || "") + " " + p.body).toLowerCase().indexOf(q) !== -1;
        })
        .slice(0, args.limit || 10)
        .map(decoratePost);
    },
    posts: function (args) {
      return allPosts()
        .filter(function (p) { return !args.state || p.state === args.state; })
        .filter(function (p) { return !args.channel || p.channel === args.channel; })
        .slice(0, args.limit || 50)
        .map(decoratePost);
    },
    object: function (args) {
      var post = findMessage(args.objectId);
      return post ? decoratePost(post) : null;
    },
    projections: function () { return projectionSpecs().map(decorateProjection); },
    projection: function (args) {
      var spec = projectionSpecs().filter(function (item) {
        return item.projectionId === args.projectionId;
      })[0];
      return spec ? decorateProjection(spec) : null;
    },
    listPath: function (args) {
      var live = (window.NB_APP && window.NB_APP.state && window.NB_APP.state.merged) || [];
      var entries = MAP.list(args.path, live);
      if (!entries) return [];
      return entries.map(function (e) {
        return {
          name: e.name, kind: e.kind, hint: e.hint || e.meta || "",
          path: MAP.resolve(args.path, e.name),
          ref: e.ref ? Object.assign({}, e.ref, { canonicalUrl: canonicalUrl(e.ref) }) : null,
          capabilities: e.capabilities || {
            read: true, enter: e.kind !== "file", expand: false,
            composeUnder: false, execute: false,
          },
        };
      });
    },
  };

  var schema = null;
  function ready() {
    if (!window.GraphQLEngine) return false;
    if (!schema) schema = window.GraphQLEngine.buildSchema(SDL);
    return true;
  }

  /** Run a query. Errors come back as GraphQL errors, not exceptions. */
  async function query(source, variables) {
    if (!ready()) {
      return { errors: [{ message: "GraphQL engine not loaded — run build-graphql.mjs" }] };
    }
    return window.GraphQLEngine.graphql({
      schema: schema,
      source: source,
      rootValue: root,
      variableValues: variables || undefined,
    });
  }

  function introspect() {
    return query(window.GraphQLEngine.getIntrospectionQuery({ descriptions: true }));
  }

  window.NB_GRAPH = { query: query, introspect: introspect, SDL: SDL };
})();
