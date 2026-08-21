/**
 * Community Web 16-bit iconography pack.
 *
 * Pixel-art icons on a 24×24 grid, rendered with `currentColor` so chrome
 * themes tint them. Source: pixelarticons (MIT) — https://pixelarticons.com
 * Vendored paths only; display at 16×16 with image-rendering: pixelated.
 *
 * VFS nav rows call `vfs(entry)` so every node kind gets a stable type glyph
 * (folder / hash / file / robot / …). Expand/collapse stays + / − separately.
 */
(function () {
  "use strict";

  /** Inline SVG shell — fill inherits from the control's color. */
  function svg(path, opts) {
    opts = opts || {};
    var label = opts.label || "";
    return '<svg class="cw-ico" xmlns="http://www.w3.org/2000/svg" width="16" height="16"' +
      ' viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"' +
      (label ? ' role="img" aria-label="' + label + '"' : "") + ">" +
      path +
      "</svg>";
  }

  // pixelarticons `mic` — free set, MIT (Gerrit Halfmann).
  var PATH_MIC =
    '<path d="M10 2h4v2h-4zM8 4h2v10H8zm2 10h4v2h-4zm4-10h2v10h-2zM4 10h2v6H4zm2 6h2v2H6zm2 2h8v2H8zm8-2h2v2h-2zm2-6h2v6h-2zm-7 10h2v2h-2z"/>';

  // pixelarticons `mic-off` — listening / muted mark when STT is live.
  var PATH_MIC_OFF =
    '<path d="M10 2h4v2h-4zM8 8h2v6H8zm2 6h4v2h-4zm4-10h2v6h-2zM4 10h2v6H4zm2 6h2v2H6zm2 2h8v2H8zm8-2h2v2h-2zm-2-2h2v2h-2zm-2-2h2v2h-2zm-2-2h2v2h-2z"/>' +
    '<path d="M8 8h2v2H8zM6 6h2v2H6zM4 4h2v2H4zM2 2h2v2H2zm16 16h2v2h-2zm2 2h2v2h-2zm-2-10h2v4h-2zm-7 10h2v2h-2z"/>';

  // pixelarticons — VFS node type set (vendored paths only).
  var PATH_FOLDER = '<path d="M4 4h6v2H4zm0 14h16v2H4zM20 8h2v10h-2zM2 6h2v12H2zm8 0h10v2H10z"/>';
  var PATH_FILE_TEXT =
    '<path d="M6 4H4v16h2zm10-2H6v2h10zm4 4h-2v14h2zm-2 14H6v2h12zM16 4h2v2h-2zm-4 0h2v6h-2z"/>' +
    '<path d="M12 8h6v2h-6zm-4 8h8v2H8zm0-4h8v2H8zm0-4h2v2H8z"/>';
  var PATH_HASH =
    '<path d="M9 3h2v5H9zm6 0h2v5h-2zm-7 7h2v4H8zm6 0h2v4h-2zm-7 6h2v5H7zm6 0h2v5h-2zM3 8h18v2H3zm0 6h18v2H3z"/>';
  var PATH_HEADPHONE =
    '<path d="M14 13h7v2h-7zm2 6h3v2h-3z"/>' +
    '<path d="M14 13h2v8h-2zm5-6h2v12h-2zM3 13h7v2H3zm2 6h3v2H5z"/>' +
    '<path d="M3 7h2v12H3zm5 6h2v8H8zM7 3h10v2H7zM5 5h2v2H5zm12 0h2v2h-2z"/>';
  var PATH_MESSAGE_TEXT =
    '<path d="M20 2H4v2h16zm0 14H6v2h14zm2-12h-2v12h2zM4 4H2v18h2zm2 14H4v2h2zm0-6h4v2H6zm0-4h8v2H6z"/>';
  var PATH_MAIL =
    '<path d="M6 8h2v2H6zm2 2h2v2H8zm10-2h-2v2h2zm-2 2h-2v2h2zm-6 2h4v2h-4zM2 6h2v12H2zm18 0h2v12h-2zM4 4h16v2H4zm0 14h16v2H4z"/>';
  var PATH_USER =
    '<path d="M9 2h6v2H9zm0 8h6v2H9zm6-6h2v6h-2zM7 4h2v6H7zM4 18h2v4H4zm14 0h2v4h-2zM8 14h8v2H8zm-2 2h2v2H6zm10 0h2v2h-2z"/>';
  var PATH_USERS =
    '<path d="M5 2h6v2H5zm10 0h4v2h-4zM5 10h6v2H5zm10 0h4v2h-4zm4-6h2v6h-2zm-8 0h2v6h-2zM3 4h2v6H3zM0 18h2v4H0zm14 0h2v4h-2zm8 0h2v4h-2zM4 14h8v2H4zm12 0h4v2h-4zM2 16h2v2H2zm10 0h2v2h-2zm8 0h2v2h-2z"/>';
  var PATH_ROBOT =
    '<path d="M5 7h14v2H5zm0 12h14v2H5zM3 9h2v10H3zm16 0h2v10h-2zM1 13h2v2H1zm20 0h2v2h-2zM11 5h2v2h-2zM7 3h4v2H7zm1 9h2v4H8zm6 0h2v4h-2z"/>';
  var PATH_BELL =
    '<path d="M9 2h6v2H9zM7 4h2v2H7zm8 0h2v2h-2zM5 6h2v7H5zm12 0h2v7h-2zM3 13h2v4H3zm16 0h2v4h-2z"/>' +
    '<path d="M3 15h18v2H3zm5 3h2v2H8zm6 0h2v2h-2zm-4 2h4v2h-4z"/>';
  var PATH_LINK = '<path d="M4 6h7v2H4zm0 10h7v2H4zM2 8h2v8H2zm18-2h-7v2h7zm0 10h-7v2h7zm2-8h-2v8h2zM7 11h10v2H7z"/>';
  var PATH_NOTE =
    '<path d="M2 4h2v16H2zm18 0h2v12h-2zM4 2h16v2H4zm14 14h2v2h-2zm-2 2h2v2h-2zM4 20h12v2H4zm10-8h6v2h-6zm-2 2h2v6h-2z"/>';
  var PATH_BOX =
    '<path d="M14 4h4v2h-4zm-4-2h4v2h-4zM6 8h4v2H6zm0 10h4v2H6zm4-8h4v2h-4zm0 10h4v2h-4zm4-12h4v2h-4zm0 10h4v2h-4zM6 4h4v2H6zM2 6h4v2H2zm0 10h4v2H2zM18 6h4v2h-4zm0 10h4v2h-4z"/>' +
    '<path d="M2 6h2v12H2zm18 0h2v12h-2zm-8 6h2v8h-2z"/>';
  var PATH_BRIEFCASE =
    '<path d="M2 8h2v12H2zm18 0h2v12h-2zM4 6h16v2H4zm0 14h16v2H4zM8 4h2v2H8zm2-2h4v2h-4zm4 2h2v2h-2z"/>';
  var PATH_LAYOUT = '<path d="M20 20H4v-2h4v-8H4v8H2V6h2v2h16V6h2v12h-2v-8H10v8h10v2Zm0-14H4V4h16v2Z"/>';
  var PATH_BUILDING_COMMUNITY =
    '<path d="M4 20h16v2H4zM20 4h2v16h-2zM10 2h10v2H10zM8 8h2v2H8zm0-4h2v2H8zm2 6h2v2h-2zm2 2h2v2h-2zm2 2h2v6h-2zm-8-4h2v2H6zm-2 2h2v2H4zm-2 2h2v6H2zm14-8h2v2h-2zm-4 0h2v2h-2zm4 4h2v2h-2zm-8 6h2v4H8z"/>';
  var PATH_ARCHIVE =
    '<path d="M3 2h18v2H3zm0 5h18v2H3zM1 4h2v3H1zm20 0h2v3h-2zm-2 5h2v11h-2zM3 9h2v11H3zm2 11h14v2H5zm4-9h6v2H9z"/>';
  var PATH_TERMINAL =
    '<path d="M4 2h16v2H4zm0 18h16v2H4zM2 4h2v16H2zm18 0h2v16h-2zM6 16h2v2H6zm2-2h2v2H8zm-2-2h2v2H6z"/>';
  var PATH_SCRIPT =
    '<path d="M16 19h2v2H4v-2h10v-2h2v2ZM6 15h8v2H4v2H2v-4h2V5h2v10ZM20 5h2v6h-2v8h-2V5H6V3h14v2Z"/>';
  var PATH_TOOLS =
    '<path d="M9 22H7v-2h2v2Zm12-6h2v6h-6v-6h2v-6h2v6Zm-2 2v2h2v-2h-2ZM7 20H5v-8h2v8Zm4 0H9v-8h2v8Zm-6-8H3v-2h2v2Zm8 0h-2v-2h2v2ZM3 10H1V4h2v6Zm12 0h-2V4h2v6Zm4 0h-2V4h2v6Zm4 0h-2V4h2v6ZM7 6h2V2h4v2h-2v4H5V4H3V2h4v4Zm14-2h-2V2h2v2Z"/>';
  var PATH_SEARCH =
    '<path d="M22 22h-2v-2h2v2Zm-2-2h-2v-2h2v2Zm-6-2H6v-2h8v2Zm4 0h-2v-2h2v2ZM6 16H4v-2h2v2Zm10 0h-2v-2h2v2ZM4 14H2V6h2v8Zm14 0h-2V6h2v8ZM6 6H4V4h2v2Zm10 0h-2V4h2v2Zm-2-2H6V2h8v2Z"/>';
  var PATH_MEGAPHONE =
    '<path d="M4 6h12v2H4zM2 8h2v6H2zm2 6h12v2H4zM20 2h2v18h-2zm-2 16h2v2h-2zm-2-2h2v2h-2zm0-12h2v2h-2zm2-2h2v2h-2zM8 8h2v6H8zm-2 8h2v4H6zm2 4h4v2H8zm2-4h2v4h-2z"/>';
  var PATH_CODE =
    '<path d="M11 18H9v-4h2v4Zm-4-1H5v-2h2v2Zm12-2v2h-2v-2h2ZM5 15H3v-2h2v2Zm16 0h-2v-2h2v2Zm-8-1h-2v-4h2v4ZM3 13H1v-2h2v2Zm20 0h-2v-2h2v2ZM5 11H3V9h2v2Zm16 0h-2V9h2v2Zm-6-1h-2V6h2v4ZM7 9H5V7h2v2Zm12 0h-2V7h2v2Z"/>';
  var PATH_EYE =
    '<path d="M16 20H8v-2h8v2Zm-8-2H4v-2h4v2Zm12 0h-4v-2h4v2ZM4 16H2v-2h2v2Zm10-6h-2v2h2v-2h2v4h-2v2h-4v-2H8v-4h2V8h4v2Zm8 6h-2v-2h2v2ZM2 14H0v-4h2v4Zm22 0h-2v-4h2v4ZM4 10H2V8h2v2Zm18 0h-2V8h2v2ZM8 8H4V6h4v2Zm12 0h-4V6h4v2Zm-4-2H8V4h8v2Z"/>';

  var PATHS = {
    folder: PATH_FOLDER,
    "file-text": PATH_FILE_TEXT,
    hash: PATH_HASH,
    headphone: PATH_HEADPHONE,
    "message-text": PATH_MESSAGE_TEXT,
    mail: PATH_MAIL,
    user: PATH_USER,
    users: PATH_USERS,
    robot: PATH_ROBOT,
    bell: PATH_BELL,
    link: PATH_LINK,
    note: PATH_NOTE,
    box: PATH_BOX,
    briefcase: PATH_BRIEFCASE,
    layout: PATH_LAYOUT,
    "building-community": PATH_BUILDING_COMMUNITY,
    archive: PATH_ARCHIVE,
    terminal: PATH_TERMINAL,
    script: PATH_SCRIPT,
    tools: PATH_TOOLS,
    search: PATH_SEARCH,
    megaphone: PATH_MEGAPHONE,
    code: PATH_CODE,
    eye: PATH_EYE,
    mic: PATH_MIC,
    "mic-off": PATH_MIC_OFF,
  };

  /** Meta → icon overrides for directories / special leaves. */
  var META_ICON = {
    spaces: "building-community",
    activity: "bell",
    direct: "mail",
    eve: "robot",
    recovery: "archive",
    projections: "layout",
    "projection definition": "layout",
    "deterministic search": "search",
    skills: "tools",
    tools: "tools",
    instructions: "note",
    config: "script",
    keymap: "script",
    voice: "headphone",
  };

  /** VFS entry.kind → default icon id. */
  var KIND_ICON = {
    dir: "folder",
    activity: "bell",
    channel: "hash",
    voice: "headphone",
    file: "file-text",
    projection: "layout",
    project: "briefcase",
    agent: "robot",
    person: "user",
    dm: "mail",
    message: "message-text",
    notification: "bell",
    announcement: "megaphone",
    relation: "link",
    representation: "note",
    artifact: "box",
    work: "briefcase",
    tombstone: "archive",
  };

  /** Well-known root / branch names when meta is absent. */
  var NAME_ICON = {
    members: "users",
    projects: "briefcase",
    dms: "mail",
    notifications: "bell",
    views: "layout",
    search: "search",
    ".agents": "robot",
    ".epoch": "archive",
    "keymap.toml": "script",
    spaces: "building-community",
    // .epoch recovery children
    default: "folder",
    canonical: "eye",
    projections: "layout",
    sources: "code",
    diagnostics: "terminal",
  };

  function resolveIconId(entry) {
    entry = entry || {};
    var kind = String(entry.kind || "file");
    var meta = String(entry.meta || "");
    var name = String(entry.name || "");
    if (entry.voice || kind === "voice" || meta === "voice") return "headphone";
    // Name wins over generic meta for known recovery/branch labels.
    if (NAME_ICON[name]) return NAME_ICON[name];
    if (META_ICON[meta]) return META_ICON[meta];
    if (KIND_ICON[kind]) return KIND_ICON[kind];
    return "file-text";
  }

  function glyph(id, opts) {
    opts = opts || {};
    var path = PATHS[id] || PATHS["file-text"];
    return svg(path, { label: opts.label || id });
  }

  /**
   * Stable type mark for a VFS nav / blade row.
   * @param {{kind?:string,meta?:string,voice?:boolean,name?:string}} entry
   * @param {{label?:string}=} opts
   */
  function vfs(entry, opts) {
    opts = opts || {};
    var id = resolveIconId(entry);
    var label = opts.label || (entry && (entry.kind || id)) || id;
    return '<span class="cn-vfs-ico" data-ico="' + id + '" aria-hidden="true">' +
      glyph(id, { label: label }) +
      "</span>";
  }

  function mic(opts) {
    opts = opts || {};
    return svg(opts.off ? PATH_MIC_OFF : PATH_MIC, {
      label: opts.label || (opts.off ? "microphone off" : "microphone"),
    });
  }

  window.CW_ICONS = {
    pack: "pixelarticons",
    license: "MIT",
    source: "https://pixelarticons.com",
    grid: 24,
    display: 16,
    mic: mic,
    svg: svg,
    glyph: glyph,
    vfs: vfs,
    resolve: resolveIconId,
    paths: PATHS,
  };
})();
