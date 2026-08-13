/**
 * Directions 6–10.
 *
 * Two of these (Signal Bench, Community Web) are fused from catalog challengers
 * dealt by the concept seed rather than derived from the grounded list. They
 * keep the challenger's system grammar and take every fact from the product.
 */
(function () {
  const E = window.EPOCH;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const who = (h) => E.members.find((m) => m.handle === h) || { handle: h, name: h, role: "" };
  const add = (d) => window.EPOCH_DESIGNS.push(d);

  /* ── 6 · Job Board ─────────────────────────────────────────────────────
     A working shop's wall: cards on hooks, status chalked, anyone can read the
     wall from the door. Spatial rather than chronological — the citizen builder
     sees what is in hand without knowing any vocabulary.                    */
  add({
    id: "board", name: "Job Board", family: "workshop & physical",
    thesis: "A shop wall read from the door. Work moves left to right through physical columns and the conversation is pinned to the card it produced.",
    css: `
    .d-board{--cork:#b08356;--kraft:#d9c3a0;--card:#fdfaf3;--ink:#241d15;--faint:#6f6152;--chalk:#f3efe6;--tape:#e8d9a8;--red:#b3402f;--go:#2f6b4f;
      background:repeating-linear-gradient(45deg,#a97e51,#a97e51 3px,#b08356 3px,#b08356 6px);color:var(--ink);
      font:400 13px/1.5 ui-sans-serif,system-ui,sans-serif;height:100%;overflow:auto;padding-block-end:2rem}
    .d-board .rail{display:flex;justify-content:space-between;align-items:center;gap:1rem;padding:1rem 1.6rem;background:#3b2d1e;color:var(--chalk)}
    .d-board .rail h1{margin:0;font:600 19px/1.1 ui-sans-serif;letter-spacing:-.01em}
    .d-board .rail p{margin:0;font:600 11px/1 ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase;color:#d7c9a8}
    .d-board .cols{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1rem;padding:1.4rem 1.6rem}
    .d-board .col{min-width:0}
    .d-board .col h2{margin:0 0 .8rem;padding:.4rem .7rem;background:#3b2d1e;color:var(--tape);
      font:700 10px/1.4 ui-sans-serif;letter-spacing:.16em;text-transform:uppercase}
    .d-board .c{position:relative;background:var(--card);border:1px solid #00000022;box-shadow:2px 3px 0 #0000002e;padding:.85rem .9rem 1rem;margin-block-end:1rem}
    .d-board .c::before{content:"";position:absolute;inset-block-start:-.55rem;inset-inline-start:50%;translate:-50% 0;
      width:2.6rem;height:1.1rem;background:var(--tape);opacity:.85;rotate:-2deg}
    .d-board .c[data-agent=true]{border-style:dashed}
    .d-board .hand{display:flex;justify-content:space-between;font:600 10px/1.4 ui-monospace,monospace;letter-spacing:.08em;
      text-transform:uppercase;color:var(--faint)}
    .d-board .c h3{margin:.4rem 0 .25rem;font:600 14px/1.3 ui-sans-serif}
    .d-board .c p{margin:0;color:#3a3128}
    .d-board .anch{display:block;margin-block-start:.5rem;font:500 10px/1.5 ui-monospace,monospace;color:var(--go)}
    .d-board .chalk{margin-block-start:.6rem;padding-block-start:.5rem;border-block-start:1px dashed #00000030;
      font:600 11px/1 ui-monospace,monospace;color:var(--red);letter-spacing:.04em}
    .d-board .cred{margin-block-start:.5rem;display:flex;flex-wrap:wrap;gap:.3rem}
    .d-board .cred span{padding:.12rem .35rem;background:#efe6d4;border:1px solid #00000018;font:600 10px/1.5 ui-monospace,monospace}
    .d-board .take{margin-block-start:.7rem;width:100%;padding:.6rem;border:2px solid var(--ink);background:var(--tape);
      font:700 11px/1 ui-sans-serif;letter-spacing:.12em;text-transform:uppercase;cursor:pointer}
    @media(max-width:1000px){.d-board .cols{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(max-width:620px){.d-board .cols{grid-template-columns:1fr}}`,
    render() {
      const card = (m) => {
        const p = who(m.who);
        return `<div class="c" data-agent="${p.kind === "agent"}"><div class="hand"><span>${esc(p.handle)}</span><span>${esc(m.at)}</span></div>
          ${m.title ? `<h3>${esc(m.title)}</h3>` : ""}<p>${esc(m.body)}</p>
          ${m.anchor ? `<span class="anch">${esc(m.anchor)}</span>` : ""}
          <div class="chalk">${esc(m.state)}</div></div>`;
      };
      const cred = E.intent.credited.map((c) => `<span>@${esc(c.handle)}</span>`).join("");
      return `<div class="d-board">
        <div class="rail"><h1>${esc(E.community.name)}</h1><p>Epoch ${E.community.epoch.n} · ${E.community.epoch.landed}/${E.community.epoch.total} · ships ${esc(E.community.epoch.ships)}</p></div>
        <div class="cols">
          <div class="col"><h2>Raised</h2>${card(E.thread[0])}${card(E.thread[4])}</div>
          <div class="col"><h2>Measured</h2>${card(E.thread[1])}</div>
          <div class="col"><h2>In hand</h2>${card(E.thread[2])}</div>
          <div class="col"><h2>Signed · ${esc(E.intent.id)}</h2>
            <div class="c"><div class="hand"><span>maya</span><span>09:47</span></div>
              <h3>${esc(E.intent.title)}</h3><p>${esc(E.thread[3].body)}</p>
              <div class="cred">${cred}</div>
              <div class="chalk">${E.intent.reviews.have} of ${E.intent.reviews.need} reviews · humans only</div>
              <button class="take">Approve &amp; sign</button></div></div>
        </div></div>`;
    },
  });

  /* ── 7 · Grid Program ──────────────────────────────────────────────────
     A Swiss exhibition identity: one strict modular grid applied across a whole
     body of work, no boxes, no chrome, hierarchy carried entirely by type size
     and position. The most severe of the ten, and the one that scales to a
     hundred channels without gaining furniture.                            */
  add({
    id: "grid", name: "Grid Program", family: "graphic identity program",
    thesis: "One strict modular grid across the whole product. No boxes and no chrome — hierarchy is carried by size and position alone, so density costs nothing.",
    css: `
    .d-grid{--paper:#fff;--ink:#000;--red:#e2231a;--grey:#767676;
      background:var(--paper);color:var(--ink);font:400 13px/1.45 "Helvetica Neue",Helvetica,Arial,sans-serif;height:100%;overflow:auto}
    .d-grid .g{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:0 1.2rem;padding-inline:2rem}
    .d-grid .top{border-block-end:2px solid var(--ink);padding-block:1.4rem .7rem;align-items:end}
    .d-grid .top h1{grid-column:1/7;margin:0;font:700 40px/.95 inherit;letter-spacing:-.045em}
    .d-grid .top .n{grid-column:8/13;margin:0;text-align:end;font:700 11px/1.3 inherit;letter-spacing:.08em;text-transform:uppercase}
    .d-grid .n b{color:var(--red)}
    .d-grid .chan{border-block-end:1px solid var(--ink);padding-block:.5rem}
    .d-grid .chan a{grid-column:span 2;font:700 11px/1.4 inherit;letter-spacing:.02em;text-transform:uppercase;color:var(--grey);cursor:pointer}
    .d-grid .chan a.on{color:var(--red)}
    .d-grid .row{padding-block:1.15rem;border-block-end:1px solid #0000001a}
    .d-grid .row .who{grid-column:1/3;font:700 13px/1.35 inherit;letter-spacing:-.01em}
    .d-grid .row .who small{display:block;font:400 11px/1.4 inherit;color:var(--grey);letter-spacing:0;text-transform:none}
    .d-grid .row .txt{grid-column:3/10}
    .d-grid .row .txt h3{margin:0 0 .2rem;font:700 15px/1.25 inherit;letter-spacing:-.015em}
    .d-grid .row .txt p{margin:0;max-width:58ch}
    .d-grid .row .txt .a{display:inline-block;margin-block-start:.4rem;font:400 11px/1.5 ui-monospace,monospace;color:var(--red)}
    .d-grid .row .st{grid-column:11/13;text-align:end;font:700 10px/1.5 inherit;letter-spacing:.1em;text-transform:uppercase;color:var(--grey)}
    .d-grid .row.mark .st{color:var(--red)}
    .d-grid .out{padding-block:1.6rem 2.4rem}
    .d-grid .out h2{grid-column:1/7;margin:0;font:700 26px/1.1 inherit;letter-spacing:-.03em}
    .d-grid .out .id{grid-column:11/13;text-align:end;font:700 11px/1.5 inherit;letter-spacing:.08em;color:var(--red)}
    .d-grid .out ul{grid-column:1/7;list-style:none;margin:.9rem 0 0;padding:0}
    .d-grid .out li{display:flex;justify-content:space-between;padding-block:.3rem;border-block-end:1px solid #0000001a;font-size:12px}
    .d-grid .out li i{font-style:normal;color:var(--grey)}
    .d-grid .out .act{grid-column:8/13;align-self:end}
    .d-grid .out button{width:100%;padding:.9rem;border:0;background:var(--red);color:#fff;font:700 12px/1 inherit;letter-spacing:.14em;
      text-transform:uppercase;cursor:pointer}
    @media(max-width:820px){.d-grid .top h1{grid-column:1/13}.d-grid .top .n,.d-grid .row .st,.d-grid .out .id{grid-column:1/13;text-align:start}
      .d-grid .row .who,.d-grid .row .txt,.d-grid .out h2,.d-grid .out ul,.d-grid .out .act{grid-column:1/13}}`,
    render() {
      const chans = E.channels.slice(0, 6).map((c, i) => `<a class="${i === 0 ? "on" : ""}">${esc(c.label)} ${c.count || ""}</a>`).join("");
      const rows = E.thread.map((m) => {
        const p = who(m.who);
        return `<div class="g row ${m.becomes ? "mark" : ""}">
          <div class="who">${esc(p.name)}<small>${esc(p.role)} · ${esc(m.at)}</small></div>
          <div class="txt">${m.title ? `<h3>${esc(m.title)}</h3>` : ""}<p>${esc(m.body)}</p>
            ${m.anchor ? `<span class="a">${esc(m.anchor)}</span>` : ""}</div>
          <div class="st">${esc(m.state)}</div></div>`;
      }).join("");
      const cred = E.intent.credited.map((c) => `<li><span>@${esc(c.handle)}${c.agent ? " agent" : ""}</span><i>${esc(c.for)}</i></li>`).join("");
      return `<div class="d-grid">
        <div class="g top"><h1>${esc(E.community.name)}</h1>
          <p class="n">Epoch ${E.community.epoch.n}<br><b>${E.community.epoch.landed}/${E.community.epoch.total} landed</b><br>Ships ${esc(E.community.epoch.ships)}</p></div>
        <div class="g chan">${chans}</div>
        ${rows}
        <div class="g out"><h2>${esc(E.intent.title)}</h2><div class="id">${esc(E.intent.id)}</div>
          <ul>${cred}<li><span>Reviews</span><i>${E.intent.reviews.have}/${E.intent.reviews.need} humans only</i></li></ul>
          <div class="act"><button>Approve and sign as @maya</button></div></div></div>`;
    },
  });

  /* ── 8 · Almanac ───────────────────────────────────────────────────────
     A yearly almanac describes each variety in plain language for people who
     are not specialists, and names who grew it. That is the citizen-builder
     brief exactly: no jargon at the door, credit on every entry.            */
  add({
    id: "almanac", name: "Almanac", family: "publication & agrarian",
    thesis: "A yearly edition written for non-specialists. Every entry is described in plain language and names who grew it, so nobody needs the vocabulary to take part.",
    css: `
    .d-almanac{--news:#f2efe6;--ink:#1d1c17;--green:#2f5d3a;--faint:#6f6a5c;--rule:#c8c2b0;--stamp:#9c3b26;
      background:var(--news);color:var(--ink);font:400 14px/1.6 ui-serif,Georgia,serif;height:100%;overflow:auto}
    .d-almanac .band{background:var(--green);color:#f2efe6;padding:.5rem 1.8rem;display:flex;justify-content:space-between;
      font:600 10px/1.4 ui-sans-serif;letter-spacing:.2em;text-transform:uppercase}
    .d-almanac .ttl{padding:1.6rem 1.8rem .9rem;border-block-end:4px solid var(--green);display:flex;justify-content:space-between;align-items:flex-end;gap:1rem}
    .d-almanac .ttl h1{margin:0;font:700 34px/1 ui-serif,Georgia,serif;letter-spacing:-.02em}
    .d-almanac .ttl p{margin:0;font:600 11px/1.4 ui-sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--faint)}
    .d-almanac .wrap{display:grid;grid-template-columns:14rem minmax(0,1fr);gap:2rem;padding:1.4rem 1.8rem 2.6rem}
    .d-almanac .toc h2,.d-almanac .main h2{margin:0 0 .6rem;font:600 10px/1 ui-sans-serif;letter-spacing:.2em;text-transform:uppercase;color:var(--green)}
    .d-almanac .toc ol{margin:0;padding-inline-start:1.1rem;font-size:13px}
    .d-almanac .toc li{padding-block:.22rem;border-block-end:1px dotted var(--rule)}
    .d-almanac .toc li b{font-weight:600}
    .d-almanac .var{margin-block-end:1.5rem;padding-block-end:1.3rem;border-block-end:1px solid var(--rule)}
    .d-almanac .var .hd{display:flex;align-items:baseline;gap:.6rem;flex-wrap:wrap}
    .d-almanac .var h3{margin:0;font:700 18px/1.25 inherit}
    .d-almanac .grew{font:600 10px/1.4 ui-sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--stamp)}
    .d-almanac .var p{margin:.4rem 0 0;max-width:66ch}
    .d-almanac .plain{margin-block-start:.5rem;padding:.5rem .7rem;background:#e8e4d6;border-inline-start:3px solid var(--green);font-size:13px}
    .d-almanac .plain b{font-weight:700;font-family:ui-sans-serif;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--green);display:block}
    .d-almanac .ed{border:2px solid var(--green);background:#fff;padding:1.1rem 1.2rem}
    .d-almanac .ed h3{margin:0 0 .6rem;font:700 16px/1.25 inherit}
    .d-almanac .er{display:flex;justify-content:space-between;padding:.3rem 0;border-block-end:1px dotted var(--rule);font-size:13px}
    .d-almanac .er i{font-style:italic;color:var(--faint)}
    .d-almanac .sow{margin-block-start:.9rem;width:100%;padding:.75rem;border:0;background:var(--green);color:#f2efe6;
      font:600 11px/1 ui-sans-serif;letter-spacing:.16em;text-transform:uppercase;cursor:pointer}
    @media(max-width:880px){.d-almanac .wrap{grid-template-columns:1fr}.d-almanac .toc{display:none}}`,
    render() {
      const plain = {
        m1: "Installing the project for the first time is slow. Lea cannot fix it but can test it.",
        m2: "Nora proved why: the saved copy is thrown away whenever the base image changes.",
        m3: "An agent proposed a fix and a human must approve it before anything changes.",
        m4: "Maya turned the whole conversation into a piece of signed work, crediting everyone.",
        m5: "Sam, who first noticed it, will test the fix when it ships.",
      };
      const vars = E.thread.map((m) => {
        const p = who(m.who);
        return `<div class="var"><div class="hd"><h3>${esc(m.title || "Noted by " + p.name.split(" ")[0])}</h3>
          <span class="grew">grown by ${esc(p.name)} · ${esc(p.role)}</span></div>
          <p>${esc(m.body)}</p>
          <div class="plain"><b>In plain words</b>${esc(plain[m.id])}</div></div>`;
      }).join("");
      const toc = E.thread.map((m) => `<li><b>${esc(who(m.who).name.split(" ")[0])}</b> — ${esc((m.title || m.body).slice(0, 34))}…</li>`).join("");
      const cred = E.intent.credited.map((c) => `<div class="er"><span>@${esc(c.handle)}${c.agent ? " · agent" : ""}</span><i>${esc(c.for)}</i></div>`).join("");
      return `<div class="d-almanac">
        <div class="band"><span>Epoch ${E.community.epoch.n} · the thirteenth edition</span><span>Ships ${esc(E.community.epoch.ships)}</span></div>
        <div class="ttl"><h1>${esc(E.community.name)}</h1><p>${E.community.epoch.landed} of ${E.community.epoch.total} entries landed</p></div>
        <div class="wrap">
          <aside class="toc"><h2>Contents</h2><ol>${toc}</ol></aside>
          <main class="main"><h2>This season in #general</h2>${vars}
            <div class="ed"><h3>${esc(E.intent.title)}</h3>${cred}
              <div class="er"><span>Reviews</span><i>${E.intent.reviews.have} of ${E.intent.reviews.need}, humans only</i></div>
              <button class="sow">Approve &amp; sign as @maya</button></div></main></div></div>`;
    },
  });

  /* ── 9 · Signal Bench ──────────────────────────────────────────────────
     Fused from the dealt oscilloscope challenger. Channels overlay in one
     graticule instead of living in separate views, and every reading is
     measured against the same divisions — a maintainer's density surface.   */
  add({
    id: "bench", name: "Signal Bench", family: "instrument (challenger)",
    thesis: "Channels overlay in one graticule rather than separate views, and every reading is measured against the same divisions. Built for the maintainer's density.",
    css: `
    .d-bench{--case:#14171a;--screen:#06120c;--grat:#1d3a2b;--phos:#5dfb9a;--dim:#2f7d54;--amber:#ffb020;--label:#9fb0a8;
      background:var(--case);color:var(--label);font:400 13px/1.5 ui-sans-serif,system-ui,sans-serif;
      display:grid;grid-template-columns:minmax(0,1fr) 17rem;height:100%}
    .d-bench .scope{display:flex;flex-direction:column;min-width:0;padding:1rem 1rem 1rem 1.2rem}
    .d-bench .bez{display:flex;justify-content:space-between;align-items:baseline;padding-block-end:.6rem}
    .d-bench .bez h1{margin:0;font:600 15px/1 ui-sans-serif;letter-spacing:.03em;color:#dfe8e3}
    .d-bench .seg{font:500 12px/1 ui-monospace,monospace;color:var(--amber);letter-spacing:.06em}
    .d-bench .screen{flex:1;min-height:0;overflow:auto;background:var(--screen);border:2px solid #0a0d0b;
      background-image:linear-gradient(var(--grat) 1px,transparent 1px),linear-gradient(90deg,var(--grat) 1px,transparent 1px);
      background-size:2.5rem 2.5rem;box-shadow:inset 0 0 5rem #000}
    .d-bench .trace{display:grid;grid-template-columns:4.5rem minmax(0,1fr);gap:.9rem;padding:.75rem 1rem;border-block-end:1px solid #0f2a1d}
    .d-bench .trace .ch{font:500 11px/1.5 ui-monospace,monospace;color:var(--dim);text-align:end}
    .d-bench .trace .ch b{display:block;color:var(--phos);font-weight:500}
    .d-bench .trace .sig{color:#bfe9d1}
    .d-bench .trace .sig h3{margin:0 0 .15rem;font:600 14px/1.3 ui-sans-serif;color:var(--phos)}
    .d-bench .trace .sig p{margin:0;max-width:70ch}
    .d-bench .trace[data-agent=true] .ch b{color:var(--amber)}
    .d-bench .anch{display:inline-block;margin-block-start:.35rem;font:500 11px/1.4 ui-monospace,monospace;color:var(--dim)}
    .d-bench .armed{color:var(--amber);font:500 11px/1.4 ui-monospace,monospace}
    .d-bench .panel{border-inline-start:2px solid #0a0d0b;background:#101315;overflow:auto;padding-block-end:1rem}
    .d-bench .panel h2{margin:0;padding:1rem 1rem .5rem;font:600 10px/1 ui-sans-serif;letter-spacing:.2em;text-transform:uppercase;color:var(--dim)}
    .d-bench .knob{display:flex;justify-content:space-between;align-items:center;padding:.55rem 1rem;border-block-end:1px solid #1b2124}
    .d-bench .knob span{font:500 11px/1.4 ui-monospace,monospace}
    .d-bench .knob b{font:500 12px/1 ui-monospace,monospace;color:var(--phos)}
    .d-bench .read{margin:.8rem 1rem;border:1px solid #223;background:#0a0f0c;padding:.8rem}
    .d-bench .read .rt{font:600 13px/1.3 ui-sans-serif;color:#dfe8e3;margin-block-end:.5rem}
    .d-bench .rr{display:flex;justify-content:space-between;padding:.25rem 0;font:500 11px/1.5 ui-monospace,monospace}
    .d-bench .rr b{color:var(--phos);font-weight:500}
    .d-bench .trig{margin:.2rem 1rem 0;width:calc(100% - 2rem);padding:.7rem;border:1px solid var(--amber);background:#2a1c02;
      color:var(--amber);font:600 11px/1 ui-monospace,monospace;letter-spacing:.1em;text-transform:uppercase;cursor:pointer}
    @media(max-width:960px){.d-bench{grid-template-columns:1fr}.d-bench .panel{display:none}}`,
    render() {
      const traces = E.thread.map((m, i) => {
        const p = who(m.who);
        return `<div class="trace" data-agent="${p.kind === "agent"}">
          <div class="ch">CH${i + 1}<b>${esc(p.handle)}</b>${esc(m.at)}</div>
          <div class="sig">${m.title ? `<h3>${esc(m.title)}</h3>` : ""}<p>${esc(m.body)}</p>
            ${m.anchor ? `<span class="anch">${esc(m.anchor)}</span>` : ""}
            ${m.state === "needs review" ? `<div class="armed">▲ armed — human review required</div>` : ""}</div></div>`;
      }).join("");
      const knobs = E.channels.slice(0, 6).map((c) => `<div class="knob"><span>#${esc(c.label)}</span><b>${c.count}</b></div>`).join("");
      const cred = E.intent.credited.map((c) => `<div class="rr"><span>@${esc(c.handle)}</span><b>${esc(c.for)}</b></div>`).join("");
      return `<div class="d-bench">
        <div class="scope"><div class="bez"><h1>${esc(E.community.name)} · #general</h1>
          <span class="seg">EPOCH ${E.community.epoch.n} ${E.community.epoch.landed}/${E.community.epoch.total} ▸ ${esc(E.community.epoch.ships)}</span></div>
          <div class="screen">${traces}</div></div>
        <aside class="panel"><h2>Channels</h2>${knobs}
          <h2>Trigger · ${esc(E.intent.id)}</h2>
          <div class="read"><div class="rt">${esc(E.intent.title)}</div>${cred}
            <div class="rr"><span>reviews</span><b>${E.intent.reviews.have}/${E.intent.reviews.need}</b></div>
            <div class="rr"><span>checks</span><b>${E.intent.checks.pass}/${E.intent.checks.total}</b></div></div>
          <button class="trig">Approve &amp; sign</button></aside></div>`;
    },
  });

  /* ── 10 · Community Web ───────────────────────────────────────────────────
     Fused from the dealt BBS challenger. Everything is a text screen on a
     character grid with numbered exits, and presence is scarce and precious —
     which is what a small community actually feels like at 2 a.m.           */
  add({
    id: "night", name: "Community Web", family: "medium-native (challenger)",
    thesis: "Everything is a text screen on a character grid with numbered exits, and presence is scarce enough to be an event. Keyboard-complete by construction.",
    css: `
    .d-night{--bg:#000;--cy:#00a8a8;--cyb:#55ffff;--mg:#a800a8;--mgb:#ff55ff;--gy:#a8a8a8;--wh:#fff;--yl:#ffff55;--gn:#55ff55;--bl:#0000a8;
      background:var(--bg);color:var(--gy);font:400 14px/1.5 ui-monospace,"Cascadia Mono",Consolas,monospace;height:100%;overflow:auto;padding:1.1rem 1.3rem 2rem}
    .d-night .art{color:var(--cy);white-space:pre;font-size:13px;line-height:1.15;margin:0 0 .3rem}
    .d-night .art b{color:var(--cyb);font-weight:400}
    .d-night .rule{color:var(--mg);white-space:pre;overflow:hidden;margin:.2rem 0}
    .d-night .stat{color:var(--yl);margin:.2rem 0 .9rem}
    .d-night .stat b{color:var(--wh);font-weight:400;background:var(--bl);padding:0 .3rem}
    .d-night .msg{margin:0 0 .85rem;padding-inline-start:.2rem}
    .d-night .from{color:var(--cyb)}
    .d-night .from i{font-style:normal;color:var(--gy)}
    .d-night .from em{font-style:normal;color:var(--yl)}
    .d-night .msg[data-agent=true] .from{color:var(--mgb)}
    .d-night .subj{color:var(--wh)}
    .d-night .txt{color:var(--gy);max-width:78ch;white-space:pre-wrap}
    .d-night .anch{color:var(--gn)}
    .d-night .menu{margin-block-start:1rem;border:0}
    .d-night .menu .mi{color:var(--gy)}
    .d-night .menu .mi b{color:var(--yl);font-weight:400}
    .d-night .box{margin-block-start:1rem;color:var(--cy);white-space:pre}
    .d-night .box b{color:var(--wh);font-weight:400}
    .d-night .box i{font-style:normal;color:var(--gn)}
    .d-night .prompt{margin-block-start:1rem;color:var(--gn)}
    .d-night .prompt input{background:transparent;border:0;color:var(--wh);font:inherit;outline:0;width:14rem}
    .d-night .prompt input:focus{background:#001a1a}`,
    render() {
      const bar = "═".repeat(78);
      const msgs = E.thread.map((m, i) => {
        const p = who(m.who);
        return `<div class="msg" data-agent="${p.kind === "agent"}">
          <div class="from">${String(i + 1).padStart(2, "0")}. ${esc(p.handle.padEnd(8))} <i>${esc(p.role)}</i>  <em>${esc(m.at)}</em>  <i>${esc(m.state)}</i></div>
          ${m.title ? `<div class="subj">    ${esc(m.title)}</div>` : ""}
          <div class="txt">    ${esc(m.body)}</div>
          ${m.anchor ? `<div class="anch">    &gt; ${esc(m.anchor)}</div>` : ""}</div>`;
      }).join("");
      const here = E.members.filter((m) => m.here || m.state === "working").map((m) => m.handle).join(", ");
      const cred = E.intent.credited.map((c) => `  <i>@${esc(c.handle.padEnd(8))}</i> ${esc(c.for)}`).join("\n");
      return `<div class="d-night">
<div class="art">  ╔═╗╔═╗╔═╗╔═╗╦ ╦   <b>${esc(E.community.name.toUpperCase())}</b>
  ║╣ ╠═╝║ ║║  ╠═╣   node 1 of 1 · you are the only caller
  ╚═╝╩  ╚═╝╚═╝╩ ╩</div>
<div class="rule">${bar}</div>
<div class="stat">EPOCH ${E.community.epoch.n} · ${E.community.epoch.landed}/${E.community.epoch.total} LANDED · SHIPS ${esc(E.community.epoch.ships.toUpperCase())} <b>NEW MAIL</b>  HERE NOW: ${esc(here)}</div>
<div class="rule">── #general ${"─".repeat(64)}</div>
${msgs}
<div class="box">╔══ ${esc(E.intent.id)} ${"═".repeat(52)}╗
  <b>${esc(E.intent.title)}</b>

${cred}
  <i>reviews </i> ${E.intent.reviews.have} of ${E.intent.reviews.need}, humans only
  <i>checks  </i> ${E.intent.checks.pass}/${E.intent.checks.total} passing
╚${"═".repeat(72)}╝</div>
<div class="menu"><div class="mi">  [<b>P</b>]ost   [<b>R</b>]eply   [<b>A</b>]pprove &amp; sign   [<b>C</b>]hannels   [<b>W</b>]ho's on   [<b>G</b>]oodbye</div></div>
<div class="prompt">Command? <input value="A" aria-label="Command" spellcheck="false"></div></div>`;
    },
  });
})();
