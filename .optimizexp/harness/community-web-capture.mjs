import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const scenario = process.argv[2];
const outDir = process.env.OUT_DIR && resolve(process.env.OUT_DIR);
if (!scenario || !outDir) throw new Error("usage: community-web-capture.mjs <scenario>; OUT_DIR is required");

const nightboard = scenario.includes("focused-post-action") || scenario.includes("post-action-shortcut") ||
  scenario.includes("startup-condition") ||
  scenario.includes("focused-panel");
const narrow = scenario.includes("narrow") || scenario.includes("screen-reader-power-user-discovers");
const zoom = scenario.includes("zoom-focus");
const snapshot = scenario.includes("snapshot") || scenario.includes("offline-recovery");
const viewport = narrow ? [390, 844] : zoom ? [720, 450] : [1440, 900];
const url = nightboard
  ? "http://127.0.0.1:8787/board.html"
  : snapshot
  ? pathToFileURL(resolve("/tmp/epoch-community-static/community/index.html")).href
  : "http://127.0.0.1:4173/community";
const session = `epoch-capture-${process.pid}`;
const env = { ...process.env, XDG_RUNTIME_DIR: "/tmp/epoch-agent-browser" };
const common = ["agent-browser", "--session", session, "--allow-file-access"];

mkdirSync(`${outDir}/frames`, { recursive: true });

function run(args, allowFailure = false) {
  const result = spawnSync("rtk", [...common, ...args], { encoding: "utf8", env, timeout: 60_000 });
  if (!allowFailure && result.status !== 0) {
    throw new Error(`${args.join(" ")} failed: ${result.stderr || result.stdout}`);
  }
  return result.stdout.trim();
}
function pause() { run(["wait", "350"]); }
function frame(name) { run(["screenshot", "--full", `${outDir}/frames/${name}.png`]); }
function click(selector) { run(["click", selector]); pause(); }
function press(key, count = 1) { for (let index = 0; index < count; index += 1) run(["press", key]); }
function evaluate(expression) {
  const envelope = JSON.parse(run(["--json", "eval", expression]));
  return envelope.data?.result ?? envelope.data;
}
function tabUntil(selector) {
  for (let index = 0; index < 40; index += 1) {
    press("Tab");
    if (evaluate(`document.activeElement?.matches(${JSON.stringify(selector)})`) === true) return;
  }
  throw new Error(`could not reach ${selector} with Tab`);
}

let recording = false;
try {
  run(["set", "viewport", String(viewport[0]), String(viewport[1])]);
  if (zoom) run(["set", "media", "light", "reduced-motion"]);
  run(["record", "start", `${outDir}/journey.webm`, url]);
  recording = true;
  run(["wait", "--load", "networkidle"]);
  if (zoom) run(["eval", 'document.documentElement.style.zoom="200%"']);
  pause();
  frame("01-entry");

  switch (scenario) {
    case "design-power-user-identifies-the-primary-participation-action":
      run(["focus", "#community-message"]); pause(); frame("02-composer-focus"); break;
    case "forge-power-user-traverses-community-network-and-repository-planes":
      click('[data-product-mode="network"]'); frame("02-network-feed");
      click('[data-open-community="epoch-civic"]');
      click('[data-open-repo="epoch/epoch"]'); frame("03-linked-project");
      click('[data-surface="issues"]'); frame("04-issues"); break;
    case "forge-power-user-navigates-the-stacked-narrow-layout-by-keyboard":
      tabUntil('[data-open-community="agent-guild"]'); frame("02-agent-guild-focus"); press("Enter"); pause();
      tabUntil('[data-channel="agent-runs"]'); frame("03-agent-runs-focus"); press("Enter"); pause(); frame("04-agent-runs-active"); break;
    case "design-power-user-audits-desktop-hierarchy-and-action-detail":
      click('[data-channel="ideas"]');
      run(["scrollintoview", '[data-select-message="issue-IDEA-3"]']);
      click('[data-select-message="issue-IDEA-3"]'); frame("02-action-tray"); break;
    case "design-power-user-audits-narrow-layout-and-touch-targets":
      run(["scrollintoview", '[data-channel="ideas"]']);
      click('[data-channel="ideas"]');
      run(["scrollintoview", '[data-select-message="issue-IDEA-3"]']);
      click('[data-select-message="issue-IDEA-3"]'); frame("02-action-tray"); break;
    case "design-power-user-audits-zoom-focus-and-reduced-motion":
      press("Tab", 8); frame("02-zoom-focus"); break;
    case "forge-power-user-promotes-a-selected-idea-with-inspectable-provenance":
      click('[data-channel="ideas"]'); click('[data-select-message="issue-IDEA-3"]'); frame("02-provenance");
      click('[data-message-id="issue-IDEA-3"] [data-action="intent"]'); frame("03-intent-outcome"); break;
    case "forge-power-user-sees-agent-review-authority-and-offline-recovery":
      click('[data-channel="ideas"]'); click('[data-select-message="idea-region-revenue"]');
      click('[data-message-id="idea-region-revenue"] [data-action="agent"]'); frame("02-agent-outcome");
      click('[data-message-id="idea-region-revenue"] [data-action="intent"]'); frame("03-offline-outcome"); break;
    case "forge-power-user-operates-every-focused-post-action-by-keyboard":
      press("Escape"); pause();
      evaluate("CW_APP.navigate('/projects/community/channels/general');CW_APP.state.columnFocus=true;CW_APP.state.feedMark='p1';CW_APP.render(true);document.querySelector('.cn-comment[data-key=\\\"p1\\\"]')?.focus();true");
      frame("02-focused-actions");
      press("u"); press("d"); press("a"); frame("03-reaction-picker");
      press("f"); press("Shift+r"); frame("04-folded-reposted");
      press("s"); press("y"); press("r"); frame("05-reply-armed"); break;
    case "screen-reader-power-user-discovers-every-post-action-shortcut":
      press("Escape"); pause();
      evaluate("CW_APP.navigate('/projects/community/channels/general');CW_APP.state.columnFocus=true;CW_APP.state.feedMark='p1';CW_APP.render(true);document.querySelector('.cn-comment[data-key=\\\"p1\\\"]')?.focus();true");
      frame("02-focused-actions");
      press("Control+Space"); pause(); frame("03-focused-shortcut-sheet");
      run(["scrollintoview", '[data-key="hg-thread"]']); pause(); frame("04-action-shortcuts"); break;
    case "agentic-coding-power-user-consumes-compatible-startup-conditions-with-one-restart":
      press("Escape"); pause();
      evaluate(`localStorage.setItem("cw-startup-signals-v1",JSON.stringify({continuation:{host:"codex",sessionId:"visual-codex",workspace:"epoch"},update:{current:"0.8.0",available:"0.9.0"},workspace:{id:"epoch",defaultsVersion:2,appliedVersion:1}}));location.reload();true`);
      run(["wait", "900"]); frame("02-restart-offer");
      press("Control+u"); run(["wait", "900"]); frame("03-restarted"); break;
    case "forge-power-user-expands-and-restores-the-focused-panel-narrow":
    case "forge-power-user-expands-and-restores-the-focused-panel":
      press("Escape"); pause();
      evaluate("CW_APP.navigate('/projects/community/channels/general');CW_APP.state.columnFocus=true;CW_APP.state.focus=1;CW_APP.render(true);true");
      press("z"); pause(); frame("02-focused-panel-expanded");
      press("z"); pause(); frame("03-focused-panel-restored"); break;
  }

  const observationExpression = nightboard
    ? `JSON.stringify((()=>{const post=document.querySelector('.cn-comment[data-key="p1"]');return{title:document.title,path:CW_APP.state.path,viewport:{width:innerWidth,height:innerHeight},horizontalOverflow:document.documentElement.scrollWidth>innerWidth,focused:document.activeElement?.getAttribute('data-key')||document.activeElement?.getAttribute('aria-label'),actions:[...post?.querySelectorAll('[aria-keyshortcuts]')||[]].map(x=>({label:x.getAttribute('aria-label')||x.textContent?.trim(),key:x.getAttribute('aria-keyshortcuts'),pressed:x.getAttribute('aria-pressed')})),reposted:CW_APP.state.reposts.p1===true,reply:CW_APP.composeContext?.()}})())`
    : `JSON.stringify((()=>{const buttons=[...document.querySelectorAll('button')].filter(x=>x.getClientRects().length);const rail=document.querySelector('.channel-rail')?.getBoundingClientRect();return{title:document.title,heading:document.querySelector('h1')?.textContent?.trim(),activeLabels:[...document.querySelectorAll('[aria-pressed="true"]')].map(x=>x.textContent?.trim()),viewport:{width:innerWidth,height:innerHeight},document:{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight},horizontalOverflow:document.documentElement.scrollWidth>innerWidth,railHeight:rail?.height,railViewportRatio:rail?rail.height/innerHeight:null,minVisibleButtonHeight:Math.min(...buttons.map(x=>x.getBoundingClientRect().height)),status:document.querySelector('[data-action-status]:not([hidden])')?.textContent?.trim()||null,focused:document.activeElement?.getAttribute('aria-label')||document.activeElement?.textContent?.trim()||null}})())`;
  const payload = evaluate(observationExpression);
  const observations = typeof payload === "string" ? JSON.parse(payload) : payload;
  writeFileSync(`${outDir}/observations.json`, `${JSON.stringify(observations, null, 2)}\n`);
  frame("99-outcome");
  run(["record", "stop"]);
  recording = false;
} finally {
  if (recording) run(["record", "stop"], true);
  run(["close"], true);
}
