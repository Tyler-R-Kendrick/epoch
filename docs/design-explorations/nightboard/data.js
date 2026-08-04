/**
 * One fictional board.
 *
 * PRODUCT.md records that this product has no real users, no analytics and no
 * production deployment, so nothing here may imply adoption or social proof.
 * `incoming` is what the live stream delivers over time — it is visibly a
 * fixture, not a claim that anyone is out there posting.
 */
window.NB_DATA = {
  board: { name: "EPOCH CIVIC WORKSHOP", node: "node 1 of 1", epoch: 13, landed: 9, total: 12, ships: "FRI 17:00" },

  channels: [
    { id: "general", label: "general", kind: "social", count: 5 },
    { id: "showcase", label: "showcase", kind: "social", count: 1 },
    { id: "support", label: "support", kind: "social", count: 3 },
    { id: "ideas", label: "ideas", kind: "work", count: 4 },
    { id: "bugs", label: "bugs", kind: "work", count: 2 },
    { id: "agent-runs", label: "agent-runs", kind: "work", count: 2 },
    { id: "previews", label: "previews", kind: "work", count: 1 },
    { id: "governance", label: "governance", kind: "work", count: 0 },
  ],

  members: [
    { handle: "maya", role: "maintainer", kind: "person", state: "here" },
    { handle: "lea", role: "citizen builder", kind: "person", state: "here" },
    { handle: "nora", role: "contributor", kind: "person", state: "here" },
    { handle: "sam", role: "community member", kind: "person", state: "away" },
    { handle: "scout", role: "member agent", kind: "agent", state: "working", detail: "goose · supervised by @maya" },
    { handle: "patcher", role: "member agent", kind: "agent", state: "idle", detail: "codex · supervised by @maya" },
  ],

  projects: [
    { slug: "civic/tuner", open: 5 },
    { slug: "civic/community-kit", open: 1 },
  ],

  posts: [
    {
      id: "p1", channel: "general", who: "lea", at: "09:05", state: "open", sig: "sig:lea-install",
      body: "Every cold install here takes about four minutes. I am not set up to fix it, but I can test any build you want on three old phones.",
      actions: [{ id: "same", label: "same here" }, { id: "reply", label: "reply" }],
    },
    {
      id: "p2", channel: "general", who: "nora", at: "09:31", state: "open", sig: "sig:nora-repro",
      anchor: "tuner/install.ts · line 84",
      body: "Reproduced on a clean container: 3m52s cold, 14s warm. The cache key includes the lockfile hash and the OS image tag, so it misses on every image bump.",
      actions: [{ id: "confirm", label: "confirmed" }, { id: "reply", label: "reply" }],
    },
    {
      id: "p3", channel: "general", who: "scout", at: "09:40", state: "needs-review", sig: "sig:scout-188",
      subject: "Drafted a plan to split the cache key",
      anchor: "agent-run://scout/188",
      body: "Key on the lockfile hash only and restore the OS layer separately. Scoped to CI config, no runtime changes. Human review required before anything merges.",
      actions: [{ id: "review", label: "review" }, { id: "tests", label: "tests passed" }],
    },
    {
      id: "p4", channel: "general", who: "maya", at: "09:47", state: "promoted", sig: "sig:maya-promote",
      subject: "Promoted this thread to a signed intent",
      anchor: "intent://install-cache",
      body: "Carrying Lea's report, Nora's measurements and Scout's plan across as receipts, so the change arrives with its evidence attached.",
      actions: [{ id: "open", label: "open intent" }, { id: "lineage", label: "lineage" }],
    },
    {
      id: "p5", channel: "general", who: "sam", at: "10:14", state: "open", sig: "sig:sam-retest",
      body: "As the person who complained about this in the first place — nice. Happy to retest on the boat wifi once it lands.",
      actions: [{ id: "wave", label: "wave" }],
    },
    {
      id: "s1", channel: "showcase", who: "lea", at: "11:22", state: "open", sig: "sig:lea-shelf",
      subject: "Offline shelf, drawn on the ferry",
      body: "Sketched the settings copy in plain words so nobody has to know what a cache is to use it.",
      actions: [{ id: "nice", label: "nice" }],
    },
    {
      id: "i1", channel: "ideas", who: "nora", at: "08:40", state: "open", sig: "sig:nora-idea",
      subject: "Agent runs should link back to the intent that started them",
      body: "When an agent posts a run, the message should carry a one-click path to the signed intent and the patch preview.",
      actions: [{ id: "promote", label: "promote" }],
    },
    {
      id: "b1", channel: "bugs", who: "sam", at: "07:12", state: "open", sig: "sig:sam-draft",
      subject: "Composer loses the draft when switching channels",
      body: "Draft text should stick per channel for the session so switching does not discard work.",
      actions: [{ id: "confirm", label: "confirmed" }],
    },
  ],

  /** Delivered by the live stream, one per tick. */
  incoming: [
    { channel: "general", who: "nora", state: "open", sig: "sig:nora-live",
      body: "Rebuilt against the split cache key: 41s cold. Not four minutes.",
      actions: [{ id: "nice", label: "nice" }] },
    { channel: "bugs", who: "patcher", state: "needs-review", sig: "sig:patcher-live",
      subject: "Draft persistence, scoped to the session",
      anchor: "agent-run://patcher/204",
      body: "Keeps one draft per channel in session storage. No runtime changes. Human review required before anything merges.",
      actions: [{ id: "review", label: "review" }] },
    { channel: "general", who: "sam", state: "open", sig: "sig:sam-live",
      body: "Tested on the boat. Cold install finished before the coffee did.",
      actions: [{ id: "wave", label: "wave" }] },
    { channel: "general", who: "maya", state: "signed", sig: "sig:maya-live",
      subject: "Epoch 13 is one intent from shipping",
      body: "Lea, Nora, Scout and Sam are all on the plaque for this one.",
      actions: [{ id: "open", label: "open epoch" }] },
  ],
};
