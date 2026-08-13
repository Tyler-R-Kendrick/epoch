/**
 * Build step for the generative-UI panel.
 *
 * OpenUI Lang (thesysdev/openui) is a streaming-first DSL for model-generated
 * UI. Its component library is defined with Zod, but the runtime parser takes a
 * plain JSON schema — so the library definition, the generated system prompt and
 * the schema are all produced here, at build time, and only the parser ships.
 * Bundling Zod into the page would cost 649KB for work that never needs to
 * happen in a browser; the parser alone is 49KB.
 *
 * The component library is the Community Web contract. That is the point: the same
 * semantic surface a theme styles is the surface a model may compose, so
 * generated UI cannot invent elements no theme knows how to render.
 *
 *   node packages/Epoch.Community.Web/scripts/build-openui.mjs
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";
import { createLibrary, defineComponent, generateSystemPrompt } from "@openuidev/lang-core";
import { z } from "zod";

// Generators live in scripts/; everything they emit belongs to the app.
const scripts = dirname(fileURLToPath(import.meta.url));
const here = join(scripts, "..", "app");

/* ── The library is the contract ─────────────────────────────────────────── */

const Post = defineComponent({
  name: "Post",
  description:
    "One thing that happened on the board, by a person or an agent. Agents must always show who supervises them.",
  props: z.object({
    who: z.string().describe("handle of the author, e.g. maya or scout"),
    role: z.string().describe("their role, e.g. maintainer, citizen builder, member agent"),
    kind: z.enum(["person", "agent"]).describe("person or agent"),
    at: z.string().describe("time, HH:MM"),
    state: z
      .enum(["open", "needs-review", "promoted", "signed"])
      .describe("state of the post"),
    subject: z.string().optional().describe("strong line, only for posts about an object"),
    body: z.string().describe("the message itself"),
    anchor: z.string().optional().describe("what it points at: a file, an agent run, an intent"),
    supervisor: z.string().optional().describe("required when kind is agent"),
  }),
  component: "post",
});

const Notice = defineComponent({
  name: "Notice",
  description: "A queued-arrival banner. Never auto-merges; always asks.",
  props: z.object({
    count: z.number().describe("how many posts are waiting"),
    label: z.string().describe("what is waiting"),
  }),
  component: "notice",
});

const Channel = defineComponent({
  name: "Channel",
  description: "A place on the board you can go to.",
  props: z.object({
    label: z.string(),
    kind: z.enum(["social", "work"]),
    count: z.number().optional(),
    unread: z.number().optional(),
  }),
  component: "channel",
});

const Fact = defineComponent({
  name: "Fact",
  description: "One labelled fact in a detail panel, such as a signature or an anchor.",
  props: z.object({ label: z.string(), value: z.string() }),
  component: "fact",
});

const Theme = defineComponent({
  name: "Theme",
  description:
    "A complete board theme. Every colour is a 6-digit hex. Emit as many as you can; " +
    "anything omitted keeps the current value, so a partial theme is still useful.",
  props: z.object({
    name: z.string().describe("short name for the theme"),
    bg: z.string().optional().describe("page ground"),
    surface: z.string().optional().describe("panel ground, one step from bg"),
    ink: z.string().optional().describe("default text; must reach 7:1 on bg"),
    inkDim: z.string().optional().describe("secondary text; must reach 4.5:1 on bg"),
    inkFaint: z.string().optional().describe("quietest text"),
    rule: z.string().optional().describe("hairlines and box drawing"),
    accent: z.string().optional().describe("the one reserved colour: the path to signed work, and focus"),
    accentInk: z.string().optional().describe("text on accent"),
    signed: z.string().optional().describe("verification marks"),
    live: z.string().optional().describe("healthy, connected"),
    warn: z.string().optional().describe("stale, snapshot"),
    danger: z.string().optional().describe("destructive, moderation"),
    agent: z.string().optional().describe("agent participation"),
    glow: z.string().optional().describe("text-shadow for phosphor looks, or none"),
    scan: z.string().optional().describe("scanline background-image, or none"),
  }),
  component: "theme",
});

const Panel = defineComponent({
  name: "Panel",
  description: "A titled group of posts, facts, channels or notices. The root of any generated view.",
  props: z.object({
    title: z.string(),
    children: z.array(z.any()).optional().describe("Post, Notice, Channel or Fact elements"),
  }),
  component: "panel",
});

const library = createLibrary({
  components: [Panel, Post, Notice, Channel, Fact, Theme],
  root: undefined,
  id: "grid",
  componentGroups: [
    {
      name: "Board",
      components: ["Panel", "Post", "Notice", "Channel", "Fact", "Theme"],
      notes: [
        "This is a terminal bulletin board for a software community.",
        "Every person, channel and post is fictional. Never imply real adoption, activity volume or social proof.",
        "Agent posts must name a supervisor and state that human review is required before anything merges.",
        "State is carried by words as well as colour; never rely on colour alone.",
      ],
    },
  ],
});

const systemPrompt = generateSystemPrompt({
  library,
  instructions: [
    "You compose views and themes for a signed community board using OpenUI Lang.",
    "For a theme request, emit `root = Theme(...)` and nothing else.",
    "For a view request, emit `root = Panel(...)`.",
    "Return only OpenUI Lang. No prose, no markdown fences, no HTML, no scripts, no URLs.",
    "Prefer few, dense elements over many shallow ones — this is a terminal, not a dashboard.",
    "Invent nothing that implies real usage: no follower counts, no trending, no engagement metrics.",
  ].join("\n"),
});

writeFileSync(
  join(here, "openui-library.js"),
  "/* GENERATED by build-openui.mjs — do not edit. */\n" +
    "window.CW_OPENUI = " +
    JSON.stringify({ schema: library.toJSONSchema(), systemPrompt }, null, 1) +
    ";\n",
);

/* ── Ship the parser, not the toolkit ────────────────────────────────────── */

const entry = join(here, ".openui-entry.mjs");
writeFileSync(
  entry,
  'import { createStreamingParser, parse } from "@openuidev/lang-core";\n' +
    "window.OpenUILang = { createStreamingParser, parse };\n",
);

// lang-core imports Zod at module top level, but the streaming parser takes a
// JSON schema and never reaches it. Aliasing Zod to a throwing stub keeps the
// bundle at ~48KB instead of ~649KB; the stub throws rather than no-ops, so a
// future version that does reach Zod at runtime fails loudly.
const zodStub = join(scripts, ".stub", "zod.mjs");

await esbuild.build({
  entryPoints: [entry],
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "es2020",
  outfile: join(here, "openui-parser.js"),
  external: ["@modelcontextprotocol/sdk"],
  alias: { zod: zodStub, "zod/v4": zodStub, "zod/v4/core": zodStub },
  legalComments: "none",
  logLevel: "error",
});

const { statSync, rmSync } = await import("node:fs");
rmSync(entry);
console.log(
  "openui: parser " + statSync(join(here, "openui-parser.js")).size + " bytes, " +
    "prompt " + systemPrompt.length + " chars, " +
    Object.keys(library.components).length + " components",
);
