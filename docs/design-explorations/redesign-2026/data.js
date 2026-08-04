/**
 * One fictional community, shared by all ten directions.
 *
 * PRODUCT.md records that this product has no real users, no analytics, no
 * testimonials and no production deployment. Every person, community and
 * conversation here is a fixture, and no direction may imply adoption,
 * activity volume or social proof it does not have.
 *
 * The thread is the product's whole thesis in five messages: a citizen builder
 * reports something, a contributor measures it, an agent proposes work under a
 * named supervisor, and a maintainer promotes the conversation into signed work
 * that carries everyone's credit with it.
 */
window.EPOCH = {
  community: {
    name: "Epoch Civic Workshop",
    handle: "civic-workshop",
    epoch: { n: 13, landed: 9, total: 12, ships: "Friday 17:00" },
  },

  channels: [
    { id: "general", label: "general", topic: "Community hangout", count: 5, kind: "social" },
    { id: "showcase", label: "showcase", topic: "Demos and wins", count: 1, kind: "social" },
    { id: "support", label: "support", topic: "Questions and answers", count: 3, kind: "social" },
    { id: "ideas", label: "ideas", topic: "Ideas into signed intents", count: 4, kind: "work" },
    { id: "bugs", label: "bugs", topic: "Defect reports and patches", count: 2, kind: "work" },
    { id: "agent-runs", label: "agent-runs", topic: "Agent proposals, human merge", count: 2, kind: "work" },
    { id: "previews", label: "previews", topic: "Deploy previews", count: 1, kind: "work" },
    { id: "governance", label: "governance", topic: "Moderation and release trust", count: 0, kind: "work" },
  ],

  members: [
    { handle: "maya", name: "Maya Okafor", role: "maintainer", kind: "person", here: true },
    { handle: "lea", name: "Lea Fischer", role: "citizen builder", kind: "person", here: true },
    { handle: "nora", name: "Nora Haddad", role: "contributor", kind: "person", here: true },
    { handle: "sam", name: "Sam Adeyemi", role: "community member", kind: "person", here: false },
    { handle: "scout", name: "scout", role: "member agent", kind: "agent", harness: "goose", supervisor: "maya", state: "working" },
    { handle: "patcher", name: "patcher", role: "member agent", kind: "agent", harness: "codex", supervisor: "maya", state: "idle" },
  ],

  /** The thread. `becomes` marks the message that turned into signed work. */
  thread: [
    {
      id: "m1", who: "lea", at: "09:05", channel: "general",
      body: "Every cold install here takes about four minutes. I am not set up to fix it, but I can test any build you want on three old phones.",
      sig: "sig:civic-lea-install", state: "open", reactions: [{ k: "same here", n: 6 }],
    },
    {
      id: "m2", who: "nora", at: "09:31", channel: "general",
      body: "Measured it on a clean container: 3m52s cold, 14s warm. The cache key includes the lockfile hash and the OS image tag, so it misses on every image bump.",
      sig: "sig:civic-nora-repro", state: "open", anchor: "tuner/install.ts · line 84",
      reactions: [{ k: "confirmed", n: 3 }],
    },
    {
      id: "m3", who: "scout", at: "09:40", channel: "general",
      title: "Drafted a plan to split the cache key",
      body: "Key on the lockfile hash only and restore the OS layer separately. Scoped to CI config, no runtime changes. Human review required before anything merges.",
      sig: "sig:civic-scout-188", state: "needs review", anchor: "agent-run://scout/188",
      reactions: [{ k: "tests passed", n: 4 }],
    },
    {
      id: "m4", who: "maya", at: "09:47", channel: "general",
      title: "Promoted this thread to a signed intent",
      body: "Carrying Lea's report, Nora's measurements and Scout's plan across as receipts, so the change arrives with its evidence attached.",
      sig: "sig:civic-maya-promote", state: "promoted", anchor: "intent://install-cache",
      becomes: "INTENT-518", reactions: [{ k: "thanks", n: 9 }],
    },
    {
      id: "m5", who: "sam", at: "10:14", channel: "general",
      body: "As the person who complained about this in the first place — nice. Happy to retest on the boat wifi once it lands.",
      sig: "sig:civic-sam-retest", state: "open", reactions: [{ k: "wave", n: 2 }],
    },
  ],

  /** What the thread became. Credit is the point: idea and build are equal rows. */
  intent: {
    id: "INTENT-518",
    title: "Cold installs miss the dependency cache on every image bump",
    born: "#general · from Lea's report",
    credited: [
      { handle: "lea", for: "reported it" },
      { handle: "nora", for: "measured it" },
      { handle: "scout", for: "planned it", agent: true },
      { handle: "maya", for: "promoted it" },
    ],
    reviews: { need: 2, have: 1, humansOnly: true },
    checks: { pass: 14, total: 14 },
    target: "Epoch 13",
    lineage: [
      { who: "lea", what: "reported it in #general", when: "11 days ago", done: true },
      { who: "nora", what: "reproduced and measured", when: "09:31", done: true },
      { who: "scout", what: "proposed a plan", when: "09:40", done: true, agent: true },
      { who: "maya", what: "promoted to a signed intent", when: "09:47", done: true },
      { who: "maya", what: "approved and signed", when: "this morning", done: true },
      { who: null, what: "lands in Epoch 13", when: "ships Friday 17:00", done: false },
    ],
    files: [
      { path: "tuner/install.ts", note: "key on the lockfile hash only", add: 64, del: 8 },
      { path: "ci/restore-os-layer.yml", note: "new — restore the OS layer separately", add: 118, del: 0 },
      { path: "guides/first-install.md", note: "docs ship with the change", add: 41, del: 0 },
    ],
  },

  projects: [
    { slug: "civic/tuner", open: 5 },
    { slug: "civic/community-kit", open: 1 },
  ],
};
