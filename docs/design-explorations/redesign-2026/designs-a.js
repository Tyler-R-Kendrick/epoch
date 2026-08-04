/**
 * Directions 1–5.
 *
 * Each is a different information architecture, not a palette swap: what leads,
 * what navigates, and what the conversation-becomes-work path physically looks
 * like all change. None of them is the three-column chat app (the category rut)
 * or the repo dashboard (its predictable opposite).
 */
(function () {
  const E = window.EPOCH;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const who = (h) => E.members.find((m) => m.handle === h) || { handle: h, name: h, role: "" };
  const init = (h) => who(h).name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  window.EPOCH_DESIGNS = window.EPOCH_DESIGNS || [];
  const add = (d) => window.EPOCH_DESIGNS.push(d);

  /* ── 1 · Plate Archive ─────────────────────────────────────────────────
     An observatory's glass-plate archive. Every plate is annotated in the
     margin and initialled by whoever made the observation; plates cross-
     reference each other; the archive itself is the durable artifact. Which is
     this product: signed observations, anchored to each other, materialised
     into an epoch. The register leads because the archive leads.            */
  add({
    id: "plate", name: "Plate Archive", family: "scientific archive",
    thesis: "Every message is an annotated plate, initialled and cross-referenced. The register is the navigation; the reading table is where one plate is studied.",
    lead: true,
    css: `
    .d-plate{--ink:#0c0e0d;--glass:#171b19;--edge:#2a302d;--chalk:#e8e6df;--dim:#8d938e;--amber:#d8a657;--mark:#c8503c;
      background:var(--ink);color:var(--chalk);font:400 14px/1.55 ui-sans-serif,system-ui,sans-serif;
      display:grid;grid-template-columns:19rem minmax(0,1fr) 17rem;height:100%}
    .d-plate .reg{border-inline-end:1px solid var(--edge);overflow:auto;background:linear-gradient(var(--glass),var(--ink))}
    .d-plate .reg h2,.d-plate .ann h2{font:600 10px/1 ui-sans-serif;letter-spacing:.18em;text-transform:uppercase;color:var(--dim);padding:1.4rem 1.1rem .7rem;margin:0}
    .d-plate .plate{display:grid;grid-template-columns:2.6rem minmax(0,1fr);gap:.7rem;padding:.7rem 1.1rem;border-block-end:1px solid var(--edge);cursor:pointer}
    .d-plate .plate:hover{background:#1d2220}
    .d-plate .plate[aria-current=true]{background:#1d2220;box-shadow:inset 3px 0 0 var(--mark)}
    .d-plate .pn{font:500 11px/1.6 ui-monospace,monospace;color:var(--amber);letter-spacing:.04em}
    .d-plate .pt{font-size:13px;color:var(--chalk)}
    .d-plate .pw{font:500 11px/1.5 ui-monospace,monospace;color:var(--dim)}
    .d-plate .table{overflow:auto;padding:0 0 2rem}
    .d-plate .grat{position:relative;padding:2.4rem 2.6rem 1.6rem;
      background-image:linear-gradient(#ffffff08 1px,transparent 1px),linear-gradient(90deg,#ffffff08 1px,transparent 1px);
      background-size:2.2rem 2.2rem;border-block-end:1px solid var(--edge)}
    .d-plate .grat h1{margin:0 0 .3rem;font:600 26px/1.15 ui-sans-serif;letter-spacing:-.02em}
    .d-plate .grat p{margin:0;color:var(--dim);font-size:13px}
    .d-plate .epoch{display:inline-flex;gap:.5rem;align-items:baseline;margin-block-start:1rem;padding:.35rem .7rem;
      border:1px solid var(--amber);color:var(--amber);font:500 11px/1 ui-monospace,monospace;letter-spacing:.06em}
    .d-plate .obs{display:grid;grid-template-columns:3.4rem minmax(0,1fr);gap:1.1rem;padding:1.15rem 2.6rem;border-block-end:1px solid var(--edge)}
    .d-plate .obs:hover{background:#121614}
    .d-plate .stamp{width:3.4rem;height:3.4rem;display:grid;place-items:center;border:1px solid var(--edge);
      font:600 12px/1 ui-monospace,monospace;color:var(--amber);background:#101413}
    .d-plate .obs[data-agent=true] .stamp{border-style:dashed;color:#8fc7a8}
    .d-plate .meta{display:flex;gap:.6rem;align-items:baseline;font:500 11px/1.4 ui-monospace,monospace;color:var(--dim)}
    .d-plate .meta b{color:var(--chalk);font-weight:600;font-family:ui-sans-serif;font-size:13px;letter-spacing:-.01em}
    .d-plate .obs h3{margin:.35rem 0 .2rem;font:600 15px/1.3 ui-sans-serif}
    .d-plate .obs p{margin:.15rem 0 0;max-width:64ch;color:#cfd3cd}
    .d-plate .xref{display:inline-block;margin-block-start:.5rem;padding-inline-start:.6rem;border-inline-start:2px solid var(--mark);
      font:500 11px/1.5 ui-monospace,monospace;color:var(--dim)}
    .d-plate .ann{border-inline-start:1px solid var(--edge);overflow:auto;background:var(--glass)}
    .d-plate .card{margin:0 1.1rem 1.1rem;border:1px solid var(--edge);background:#101413}
    .d-plate .card .hd{padding:.6rem .8rem;border-block-end:1px solid var(--edge);font:600 10px/1 ui-sans-serif;letter-spacing:.16em;text-transform:uppercase;color:var(--amber)}
    .d-plate .card .bd{padding:.8rem}
    .d-plate .row{display:flex;justify-content:space-between;gap:.8rem;padding:.3rem 0;font-size:12px;color:var(--dim)}
    .d-plate .row b{color:var(--chalk);font-weight:500}
    .d-plate .sign{display:block;width:100%;margin-block-start:.5rem;padding:.65rem;border:1px solid var(--mark);background:#2a1210;
      color:#ffb3a5;font:600 12px/1 ui-sans-serif;letter-spacing:.02em;cursor:pointer}
    .d-plate .cred{display:flex;justify-content:space-between;padding:.3rem 0;font-size:12px;border-block-end:1px dotted var(--edge)}
    .d-plate .cred i{font-style:normal;color:var(--dim)}
    @media(max-width:1100px){.d-plate{grid-template-columns:1fr}.d-plate .reg,.d-plate .ann{display:none}}`,
    render() {
      const obs = E.thread.map((m) => {
        const p = who(m.who);
        return `<article class="obs" data-agent="${p.kind === "agent"}">
          <span class="stamp">${esc(init(m.who))}</span>
          <div><div class="meta"><b>${esc(p.name)}</b><span>${esc(p.role)}</span><span>${esc(m.at)}</span><span>${esc(m.state)}</span></div>
          ${m.title ? `<h3>${esc(m.title)}</h3>` : ""}
          <p>${esc(m.body)}</p>
          ${m.anchor ? `<span class="xref">${esc(m.anchor)}</span>` : ""}</div>
        </article>`;
      }).join("");
      const reg = E.thread.map((m, i) => `<div class="plate" ${i === 3 ? 'aria-current="true"' : ""}>
        <span class="pn">${String(i + 1).padStart(3, "0")}</span>
        <div><div class="pt">${esc(m.title || m.body.slice(0, 42) + "…")}</div><div class="pw">${esc(m.who)} · ${esc(m.at)}</div></div></div>`).join("");
      const cred = E.intent.credited.map((c) => `<div class="cred"><span>@${esc(c.handle)}${c.agent ? " ·agent" : ""}</span><i>${esc(c.for)}</i></div>`).join("");
      return `<div class="d-plate">
        <nav class="reg"><h2>Plate register · #general</h2>${reg}
          <h2>Cross-referenced</h2>${E.projects.map((p) => `<div class="plate"><span class="pn">↗</span><div><div class="pt">${esc(p.slug)}</div><div class="pw">${p.open} open</div></div></div>`).join("")}</nav>
        <main class="table">
          <header class="grat"><h1>${esc(E.community.name)}</h1><p>Observations in #general, annotated and initialled</p>
            <span class="epoch">EPOCH ${E.community.epoch.n} · ${E.community.epoch.landed}/${E.community.epoch.total} landed · ships ${esc(E.community.epoch.ships)}</span></header>
          ${obs}
        </main>
        <aside class="ann">
          <h2>Plate 004 · became work</h2>
          <div class="card"><div class="hd">${esc(E.intent.id)}</div><div class="bd">
            <div style="font-size:13px;margin-block-end:.6rem">${esc(E.intent.title)}</div>
            <div class="row"><span>Reviews</span><b>${E.intent.reviews.have} of ${E.intent.reviews.need} · humans only</b></div>
            <div class="row"><span>Checks</span><b>${E.intent.checks.pass}/${E.intent.checks.total} passing</b></div>
            <div class="row"><span>Target</span><b>Epoch ${E.community.epoch.n}</b></div>
            <button class="sign">Approve &amp; sign as @maya</button></div></div>
          <div class="card"><div class="hd">Credited</div><div class="bd">${cred}</div></div>
        </aside></div>`;
    },
  });

  /* ── 2 · Course Line ───────────────────────────────────────────────────
     Orienteering's ISOM standard: every ink means exactly one thing, the
     legend is permanent and authoritative, and one reserved purple carries the
     course over the terrain. Here the terrain is the community and the purple
     leg is the path a conversation takes to become signed work.             */
  add({
    id: "course", name: "Course Line", family: "notation & diagram systems",
    thesis: "An ISOM legend is permanent and every ink means one thing. Channels are terrain; one reserved purple traces the leg from talk to signed work.",
    css: `
    .d-course{--paper:#fdfcf7;--forest:#fff;--rough:#c9e3b8;--open:#f7e9a8;--marsh:#9fd4e8;--contour:#a2703f;--ink:#1a1a17;--course:#a300a3;
      background:var(--paper);color:var(--ink);font:400 14px/1.55 "Helvetica Neue",Arial,sans-serif;display:grid;grid-template-columns:15rem minmax(0,1fr);height:100%}
    .d-course .legend{border-inline-end:2px solid var(--ink);padding:1.2rem 1rem;overflow:auto}
    .d-course .legend h2{margin:0 0 .8rem;font:700 10px/1 sans-serif;letter-spacing:.2em;text-transform:uppercase}
    .d-course .lg{display:grid;grid-template-columns:1.5rem 1fr;gap:.5rem;align-items:center;padding:.32rem 0;font-size:12px}
    .d-course .sw{height:1rem;border:1px solid #0003}
    .d-course .lg.on{font-weight:700}
    .d-course .ctl{margin-block-start:1.4rem}
    .d-course .cn{display:grid;grid-template-columns:1.7rem 1fr;gap:.5rem;align-items:center;padding:.3rem 0;font-size:12px}
    .d-course .cn i{font-style:normal;display:grid;place-items:center;width:1.7rem;height:1.7rem;border:2px solid var(--course);border-radius:50%;
      color:var(--course);font:700 11px/1 sans-serif}
    .d-course main{overflow:auto;position:relative}
    .d-course header{padding:1.6rem 2rem 1.1rem;border-block-end:2px solid var(--ink)}
    .d-course header h1{margin:0;font:700 24px/1.1 sans-serif;letter-spacing:-.02em}
    .d-course header p{margin:.25rem 0 0;font-size:12px;letter-spacing:.04em;text-transform:uppercase}
    .d-course .terrain{display:flex;gap:0;border-block-end:2px solid var(--ink)}
    .d-course .tr{flex:1;padding:.55rem .6rem;font:700 10px/1.3 sans-serif;letter-spacing:.06em;text-transform:uppercase;border-inline-end:1px solid #0002}
    .d-course .leg{position:relative;padding:0 2rem 3rem}
    .d-course .leg::before{content:"";position:absolute;inset-block:1.2rem 3rem;inset-inline-start:3.4rem;width:3px;background:var(--course)}
    .d-course .pt{position:relative;display:grid;grid-template-columns:3rem minmax(0,1fr);gap:1.4rem;padding:1.2rem 0 1.2rem}
    .d-course .num{position:relative;z-index:1;width:2.9rem;height:2.9rem;display:grid;place-items:center;border:3px solid var(--course);
      border-radius:50%;background:var(--paper);color:var(--course);font:700 15px/1 sans-serif}
    .d-course .pt[data-agent=true] .num{border-style:dashed}
    .d-course .bd{padding-block-start:.25rem}
    .d-course .bd h3{margin:0 0 .2rem;font:700 15px/1.25 sans-serif}
    .d-course .who{font:700 11px/1.4 sans-serif;letter-spacing:.08em;text-transform:uppercase}
    .d-course .bd p{margin:.3rem 0 0;max-width:62ch}
    .d-course .anch{display:inline-block;margin-block-start:.45rem;padding:.15rem .4rem;background:var(--marsh);font:500 11px/1.5 ui-monospace,monospace}
    .d-course .fin{margin-inline-start:4.4rem;border:3px solid var(--course);padding:1rem 1.1rem;max-width:46rem}
    .d-course .fin h3{margin:0 0 .5rem;font:700 13px/1 sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--course)}
    .d-course .fin table{width:100%;border-collapse:collapse;font-size:12px}
    .d-course .fin td{padding:.28rem 0;border-block-end:1px solid #0001}
    .d-course .fin td:last-child{text-align:end;font-weight:700}
    .d-course .go{margin-block-start:.8rem;width:100%;padding:.7rem;border:0;background:var(--course);color:#fff;font:700 13px/1 sans-serif;cursor:pointer}
    @media(max-width:1000px){.d-course{grid-template-columns:1fr}.d-course .legend{display:none}}`,
    render() {
      const inks = [["Runnable — social channel", "#fff"], ["Rough — work channel", "#c9e3b8"], ["Open — showcase", "#f7e9a8"], ["Marsh — anchored to code", "#9fd4e8"], ["Course — becoming work", "#a300a3"]];
      const legend = inks.map(([l, c], i) => `<div class="lg${i === 4 ? " on" : ""}"><span class="sw" style="background:${c}"></span>${esc(l)}</div>`).join("");
      const controls = E.thread.map((m, i) => `<div class="cn"><i>${i + 1}</i>${esc(who(m.who).name.split(" ")[0])}</div>`).join("");
      const terrain = E.channels.slice(0, 6).map((c) => `<div class="tr" style="background:${c.kind === "social" ? "#fff" : "#c9e3b8"}">#${esc(c.label)}<br><span style="font-weight:400;text-transform:none;letter-spacing:0">${c.count}</span></div>`).join("");
      const pts = E.thread.map((m, i) => {
        const p = who(m.who);
        return `<div class="pt" data-agent="${p.kind === "agent"}"><span class="num">${i + 1}</span>
          <div class="bd"><div class="who">${esc(p.name)} · ${esc(p.role)} · ${esc(m.at)}</div>
          ${m.title ? `<h3>${esc(m.title)}</h3>` : ""}<p>${esc(m.body)}</p>
          ${m.anchor ? `<span class="anch">${esc(m.anchor)}</span>` : ""}</div></div>`;
      }).join("");
      const rows = E.intent.credited.map((c) => `<tr><td>@${esc(c.handle)}${c.agent ? " · agent" : ""}</td><td>${esc(c.for)}</td></tr>`).join("");
      return `<div class="d-course">
        <aside class="legend"><h2>Legend</h2>${legend}
          <div class="ctl"><h2>Controls</h2>${controls}</div></aside>
        <main><header><h1>${esc(E.community.name)}</h1><p>Epoch ${E.community.epoch.n} · ${E.community.epoch.landed} of ${E.community.epoch.total} legs finished · ships ${esc(E.community.epoch.ships)}</p></header>
          <div class="terrain">${terrain}</div>
          <div class="leg">${pts}
            <div class="fin"><h3>Finish · ${esc(E.intent.id)}</h3>
              <div style="margin-block-end:.6rem">${esc(E.intent.title)}</div>
              <table>${rows}<tr><td>Reviews</td><td>${E.intent.reviews.have}/${E.intent.reviews.need} humans only</td></tr></table>
              <button class="go">Approve &amp; sign as @maya</button></div>
          </div></main></div>`;
    },
  });

  /* ── 3 · Ship's Log ────────────────────────────────────────────────────
     A watch log: entries in time order, ruled, each signed by the officer on
     watch and countersigned when acted on. No rail — a log has no sidebar. The
     signature column is permanent, because who signed is the product.       */
  add({
    id: "log", name: "Ship's Log", family: "manuscript & ledger",
    thesis: "A ruled watch log. Entries run in time order with a permanent signature column, and work is countersigned in the margin rather than filed elsewhere.",
    css: `
    .d-log{--page:#f7f4ec;--rule:#c3cbd2;--ink:#16222e;--faint:#6d7c88;--red:#a8342a;--green:#1f5c46;
      background:var(--page);color:var(--ink);font:400 14px/1.6 "Iowan Old Style",Georgia,serif;height:100%;overflow:auto}
    .d-log .mast{display:flex;justify-content:space-between;align-items:flex-end;gap:1rem;padding:1.5rem 2.2rem .8rem;border-block-end:3px double var(--ink)}
    .d-log .mast h1{margin:0;font:600 25px/1.1 "Iowan Old Style",Georgia,serif;letter-spacing:-.01em}
    .d-log .mast p{margin:.2rem 0 0;font:500 11px/1.4 ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase;color:var(--faint)}
    .d-log .tabs{display:flex;gap:0;border-block-end:1px solid var(--rule);padding-inline:2.2rem;background:#f1ede3}
    .d-log .tab{padding:.55rem .9rem;font:500 12px/1 ui-monospace,monospace;color:var(--faint);border-inline-end:1px solid var(--rule);cursor:pointer}
    .d-log .tab[aria-current=true]{background:var(--page);color:var(--ink);font-weight:700;box-shadow:inset 0 -2px 0 var(--red)}
    .d-log table{width:100%;border-collapse:collapse;margin:0}
    .d-log thead th{font:600 10px/1 ui-monospace,monospace;letter-spacing:.16em;text-transform:uppercase;color:var(--faint);
      text-align:start;padding:.9rem 1rem .5rem;border-block-end:1px solid var(--rule)}
    .d-log tbody td{padding:.85rem 1rem;border-block-end:1px solid var(--rule);vertical-align:top}
    .d-log tbody tr:nth-child(even){background:#00000004}
    .d-log .t{width:5.5rem;font:500 12px/1.6 ui-monospace,monospace;color:var(--faint);white-space:nowrap}
    .d-log td:first-child{padding-inline-start:2.2rem}
    .d-log td:last-child{padding-inline-end:2.2rem}
    .d-log .ent h3{margin:0 0 .15rem;font:600 15px/1.3 inherit}
    .d-log .ent p{margin:0;max-width:66ch}
    .d-log .rank{font:500 11px/1.5 ui-monospace,monospace;letter-spacing:.06em;text-transform:uppercase;color:var(--faint)}
    .d-log .anch{display:block;margin-block-start:.35rem;font:500 11px/1.5 ui-monospace,monospace;color:var(--green)}
    .d-log .sigcol{width:13rem;font:500 11px/1.5 ui-monospace,monospace}
    .d-log .sg{color:var(--faint)}
    .d-log .co{display:block;margin-block-start:.3rem;padding-inline-start:.5rem;border-inline-start:2px solid var(--red);color:var(--red)}
    .d-log .carried{margin:1.4rem 2.2rem 2.4rem;border:1px solid var(--ink);background:#fffdf7}
    .d-log .carried h2{margin:0;padding:.7rem 1rem;border-block-end:1px solid var(--ink);font:600 11px/1 ui-monospace,monospace;letter-spacing:.16em;text-transform:uppercase}
    .d-log .carried .bd{padding:1rem}
    .d-log .cr{display:flex;justify-content:space-between;padding:.32rem 0;border-block-end:1px dotted var(--rule);font-size:13px}
    .d-log .cr i{font-style:italic;color:var(--faint)}
    .d-log .cs{margin-block-start:.9rem;padding:.7rem 1.1rem;border:1px solid var(--red);background:#fdf0ee;color:var(--red);
      font:600 13px/1 ui-monospace,monospace;letter-spacing:.04em;cursor:pointer}
    @media(max-width:900px){.d-log .sigcol{display:none}.d-log td:first-child{padding-inline-start:1rem}}`,
    render() {
      const rows = E.thread.map((m) => {
        const p = who(m.who);
        return `<tr><td class="t">${esc(m.at)}</td>
          <td class="ent"><div class="rank">${esc(p.name)} · ${esc(p.role)}</div>
            ${m.title ? `<h3>${esc(m.title)}</h3>` : ""}<p>${esc(m.body)}</p>
            ${m.anchor ? `<span class="anch">↳ ${esc(m.anchor)}</span>` : ""}</td>
          <td class="sigcol"><span class="sg">${esc(m.sig)}</span>
            ${m.becomes ? `<span class="co">countersigned → ${esc(m.becomes)}</span>` : ""}</td></tr>`;
      }).join("");
      const cred = E.intent.credited.map((c) => `<div class="cr"><span>@${esc(c.handle)}${c.agent ? " · agent" : ""}</span><i>${esc(c.for)}</i></div>`).join("");
      return `<div class="d-log">
        <div class="mast"><div><h1>${esc(E.community.name)}</h1><p>Log of the watch · #general</p></div>
          <p>Epoch ${E.community.epoch.n} · ${E.community.epoch.landed}/${E.community.epoch.total} · ships ${esc(E.community.epoch.ships)}</p></div>
        <div class="tabs">${E.channels.slice(0, 6).map((c, i) => `<div class="tab" ${i === 0 ? 'aria-current="true"' : ""}>#${esc(c.label)}${c.count ? " · " + c.count : ""}</div>`).join("")}</div>
        <table><thead><tr><th>Time</th><th>Entry</th><th>Signed</th></tr></thead><tbody>${rows}</tbody></table>
        <section class="carried"><h2>Carried forward · ${esc(E.intent.id)}</h2><div class="bd">
          <div style="margin-block-end:.7rem">${esc(E.intent.title)}</div>${cred}
          <div class="cr"><span>Reviews</span><i>${E.intent.reviews.have} of ${E.intent.reviews.need}, humans only</i></div>
          <button class="cs">Countersign as @maya</button></div></section></div>`;
    },
  });

  /* ── 4 · Colophon ──────────────────────────────────────────────────────
     A press colophon names everyone who set the type. This direction treats
     the community as a publication and the epoch as its edition: reading-first,
     two columns, contributors set into the masthead rather than hidden behind
     avatars. Argues that credit is editorial, not metadata.                 */
  add({
    id: "colophon", name: "Colophon", family: "print & publishing",
    thesis: "The community as a publication and the epoch as its edition. Contributors are set into the masthead, because a colophon names everyone who set the type.",
    css: `
    .d-colophon{--paper:#fbf9f4;--ink:#14100c;--faint:#7a7268;--rule:#ddd6c9;--red:#c0392b;
      background:var(--paper);color:var(--ink);font:400 15px/1.65 "Iowan Old Style",Georgia,serif;height:100%;overflow:auto}
    .d-colophon .head{padding:2.2rem 2.6rem 1rem;text-align:center;border-block-end:1px solid var(--ink)}
    .d-colophon .head h1{margin:0;font:400 44px/1 "Iowan Old Style",Georgia,serif;letter-spacing:-.03em}
    .d-colophon .head .sub{margin:.5rem 0 0;font:500 10px/1 ui-sans-serif;letter-spacing:.34em;text-transform:uppercase;color:var(--faint)}
    .d-colophon .strap{display:flex;justify-content:center;gap:2rem;padding:.6rem;border-block-end:3px double var(--ink);
      font:500 10px/1 ui-sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--faint)}
    .d-colophon .body{columns:2;column-gap:2.6rem;padding:1.8rem 2.6rem;max-width:74rem;margin-inline:auto}
    @media(max-width:900px){.d-colophon .body{columns:1}}
    .d-colophon article{break-inside:avoid;margin-block-end:1.5rem;padding-block-end:1.5rem;border-block-end:1px solid var(--rule)}
    .d-colophon .by{font:500 10px/1 ui-sans-serif;letter-spacing:.16em;text-transform:uppercase;color:var(--red)}
    .d-colophon article h2{margin:.4rem 0 .3rem;font:600 19px/1.25 inherit;letter-spacing:-.01em}
    .d-colophon article p{margin:0}
    .d-colophon article p::first-letter{}
    .d-colophon .drop p::first-letter{float:inline-start;font-size:3.1em;line-height:.82;padding-inline-end:.1em;font-weight:600}
    .d-colophon .note{margin-block-start:.5rem;font:500 11px/1.5 ui-monospace,monospace;color:var(--faint)}
    .d-colophon .plate{break-inside:avoid;border:1px solid var(--ink);padding:1rem 1.1rem;margin-block-end:1.5rem;background:#fff}
    .d-colophon .plate h3{margin:0 0 .5rem;font:500 10px/1 ui-sans-serif;letter-spacing:.2em;text-transform:uppercase;color:var(--red)}
    .d-colophon .plate .t{font-size:16px;margin-block-end:.6rem}
    .d-colophon .cl{display:flex;justify-content:space-between;padding:.25rem 0;border-block-end:1px dotted var(--rule);font-size:13px}
    .d-colophon .cl i{font-style:italic;color:var(--faint)}
    .d-colophon .set{margin-block-start:.8rem;width:100%;padding:.7rem;border:1px solid var(--ink);background:var(--ink);color:var(--paper);
      font:500 11px/1 ui-sans-serif;letter-spacing:.16em;text-transform:uppercase;cursor:pointer}
    .d-colophon .foot{border-block-start:3px double var(--ink);padding:1.4rem 2.6rem 2.4rem;text-align:center}
    .d-colophon .foot h4{margin:0 0 .5rem;font:500 10px/1 ui-sans-serif;letter-spacing:.24em;text-transform:uppercase;color:var(--faint)}
    .d-colophon .foot p{margin:0;font-size:13px;color:var(--faint)}`,
    render() {
      const arts = E.thread.map((m, i) => {
        const p = who(m.who);
        return `<article class="${i === 0 ? "drop" : ""}"><div class="by">${esc(p.name)} — ${esc(p.role)}</div>
          ${m.title ? `<h2>${esc(m.title)}</h2>` : ""}<p>${esc(m.body)}</p>
          ${m.anchor ? `<div class="note">set against ${esc(m.anchor)}</div>` : ""}</article>`;
      }).join("");
      const cred = E.intent.credited.map((c) => `<div class="cl"><span>@${esc(c.handle)}${c.agent ? " · agent" : ""}</span><i>${esc(c.for)}</i></div>`).join("");
      const names = E.intent.credited.map((c) => esc(who(c.handle).name)).join(" · ");
      return `<div class="d-colophon">
        <div class="head"><h1>${esc(E.community.name)}</h1><p class="sub">Edition thirteen · #general</p></div>
        <div class="strap"><span>${E.community.epoch.landed} of ${E.community.epoch.total} landed</span><span>Ships ${esc(E.community.epoch.ships)}</span><span>Set by four hands</span></div>
        <div class="body">
          <div class="plate"><h3>Set this edition</h3><div class="t">${esc(E.intent.title)}</div>${cred}
            <div class="cl"><span>Reviews</span><i>${E.intent.reviews.have} of ${E.intent.reviews.need}, humans only</i></div>
            <button class="set">Approve &amp; sign as @maya</button></div>
          ${arts}</div>
        <div class="foot"><h4>Colophon</h4><p>Edition thirteen was set by ${names}, and signed in the open.</p></div></div>`;
    },
  });

  /* ── 5 · Guild Register ────────────────────────────────────────────────
     A guild roll leads with people, not channels: who is a member, what marks
     they hold, what they are carrying. Agents appear on the same roll under a
     named supervisor, which is exactly how this product treats them.        */
  add({
    id: "guild", name: "Guild Register", family: "civic & administrative",
    thesis: "The roll leads, not the channel list. Members — people and agents alike — carry marks and open work, and agents sit on the same roll under a named supervisor.",
    css: `
    .d-guild{--cloth:#12352b;--deep:#0d2620;--cream:#f4efe2;--gold:#c9a24a;--ink:#1c1a15;--faint:#8a8371;--rule:#ddd4bd;
      background:var(--cream);color:var(--ink);font:400 14px/1.55 ui-sans-serif,system-ui,sans-serif;display:grid;grid-template-columns:20rem minmax(0,1fr);height:100%}
    .d-guild .roll{background:var(--cloth);color:#e6efe6;overflow:auto;padding-block-end:1.5rem}
    .d-guild .roll .cap{padding:1.5rem 1.2rem .5rem;font:600 10px/1 ui-sans-serif;letter-spacing:.2em;text-transform:uppercase;color:var(--gold)}
    .d-guild .mem{display:grid;grid-template-columns:2.3rem 1fr;gap:.7rem;align-items:center;padding:.6rem 1.2rem;cursor:pointer;border-block-end:1px solid #ffffff10}
    .d-guild .mem:hover{background:var(--deep)}
    .d-guild .mem[aria-current=true]{background:var(--deep);box-shadow:inset 3px 0 0 var(--gold)}
    .d-guild .sigil{width:2.3rem;height:2.3rem;display:grid;place-items:center;border:1px solid var(--gold);color:var(--gold);
      font:600 11px/1 ui-monospace,monospace;background:#ffffff08}
    .d-guild .mem[data-agent=true] .sigil{border-radius:50%;border-style:dashed}
    .d-guild .nm{font-weight:600;font-size:13px}
    .d-guild .rl{font:500 11px/1.4 ui-monospace,monospace;color:#9fb4a6}
    .d-guild main{overflow:auto}
    .d-guild .hdr{padding:1.6rem 2.2rem 1.1rem;border-block-end:2px solid var(--ink)}
    .d-guild .hdr h1{margin:0;font:600 24px/1.1 ui-sans-serif;letter-spacing:-.02em}
    .d-guild .hdr p{margin:.3rem 0 0;font:500 11px/1 ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase;color:var(--faint)}
    .d-guild .marks{display:flex;gap:.5rem;flex-wrap:wrap;padding:1rem 2.2rem;border-block-end:1px solid var(--rule);background:#efe9d9}
    .d-guild .mk{padding:.3rem .6rem;border:1px solid var(--gold);color:#7a5f1c;font:600 10px/1.4 ui-sans-serif;letter-spacing:.1em;text-transform:uppercase}
    .d-guild .entry{display:grid;grid-template-columns:7rem minmax(0,1fr);gap:1.4rem;padding:1.1rem 2.2rem;border-block-end:1px solid var(--rule)}
    .d-guild .entry .lbl{font:500 11px/1.6 ui-monospace,monospace;color:var(--faint);text-align:end}
    .d-guild .entry h3{margin:0 0 .2rem;font:600 15px/1.3 ui-sans-serif}
    .d-guild .entry p{margin:0;max-width:64ch}
    .d-guild .anch{display:inline-block;margin-block-start:.4rem;font:500 11px/1.5 ui-monospace,monospace;color:#1f5c46}
    .d-guild .charter{margin:1.5rem 2.2rem 2.5rem;border:2px solid var(--cloth);background:#fff}
    .d-guild .charter h2{margin:0;padding:.75rem 1.1rem;background:var(--cloth);color:var(--gold);
      font:600 11px/1 ui-sans-serif;letter-spacing:.18em;text-transform:uppercase}
    .d-guild .charter .bd{padding:1.1rem}
    .d-guild .cr{display:flex;justify-content:space-between;padding:.35rem 0;border-block-end:1px dotted var(--rule);font-size:13px}
    .d-guild .cr i{font-style:normal;color:var(--faint)}
    .d-guild .seal{margin-block-start:1rem;padding:.75rem 1.2rem;border:0;background:var(--cloth);color:var(--gold);
      font:600 12px/1 ui-sans-serif;letter-spacing:.12em;text-transform:uppercase;cursor:pointer}
    @media(max-width:980px){.d-guild{grid-template-columns:1fr}.d-guild .roll{display:none}}`,
    render() {
      const roll = E.members.map((m, i) => `<div class="mem" data-agent="${m.kind === "agent"}" ${i === 1 ? 'aria-current="true"' : ""}>
        <span class="sigil">${esc(init(m.handle))}</span>
        <div><div class="nm">${esc(m.name)}</div><div class="rl">${esc(m.role)}${m.supervisor ? " · under @" + esc(m.supervisor) : ""}</div></div></div>`).join("");
      const entries = E.thread.map((m) => {
        const p = who(m.who);
        return `<div class="entry"><div class="lbl">${esc(m.at)}<br>${esc(p.handle)}</div>
          <div>${m.title ? `<h3>${esc(m.title)}</h3>` : ""}<p>${esc(m.body)}</p>
          ${m.anchor ? `<span class="anch">${esc(m.anchor)}</span>` : ""}</div></div>`;
      }).join("");
      const cred = E.intent.credited.map((c) => `<div class="cr"><span>@${esc(c.handle)}${c.agent ? " · agent" : ""}</span><i>${esc(c.for)}</i></div>`).join("");
      return `<div class="d-guild">
        <nav class="roll"><div class="cap">Roll of members</div>${roll}
          <div class="cap">Linked projects</div>${E.projects.map((p) => `<div class="mem"><span class="sigil">↗</span><div><div class="nm">${esc(p.slug)}</div><div class="rl">${p.open} open</div></div></div>`).join("")}</nav>
        <main><div class="hdr"><h1>${esc(E.community.name)}</h1><p>Epoch ${E.community.epoch.n} · ${E.community.epoch.landed}/${E.community.epoch.total} · ships ${esc(E.community.epoch.ships)}</p></div>
          <div class="marks"><span class="mk">Reported</span><span class="mk">Measured</span><span class="mk">Planned · agent</span><span class="mk">Promoted</span><span class="mk">Signed</span></div>
          ${entries}
          <section class="charter"><h2>Entered into the register · ${esc(E.intent.id)}</h2><div class="bd">
            <div style="margin-block-end:.7rem;font-size:15px">${esc(E.intent.title)}</div>${cred}
            <div class="cr"><span>Reviews</span><i>${E.intent.reviews.have} of ${E.intent.reviews.need}, humans only</i></div>
            <button class="seal">Set seal as @maya</button></div></section></main></div>`;
    },
  });
})();
