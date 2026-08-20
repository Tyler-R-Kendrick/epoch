import assert from "node:assert/strict";
import {
  activityFromParticipantEvents,
  beginAtprotoAuthorization,
  composerOwnsLetter,
  describeReceiptBlade,
  finishAtprotoAuthorization,
  honestAgentStatus,
  isHandleHashStub,
  jumpChooserShouldOpen,
  letterSteersBoard,
  openBoardReceipt,
  parseBoardReceiptLocator,
  preservedSearchAfterJump,
  requireScopedTarget,
} from "@epoch/community-runtime";

export async function runCommunityBoardHonestyTests(): Promise<void> {
  receiptsAreInspectableObjects();
  jumpPreservesSearchQuery();
  jumpChooserStaysOpenAfterPromptClears();
  composerKeepsLetters();
  muteReportHookRequireTarget();
  sampleBoardDoesNotInventTickActivity();
  mutedObjectsDropHookActivity();
  receiptBladeNamesActorAndEvidence();
  workingWithoutHeartbeatIsIdle();
  await atprotoOAuthUsesParPkceDpopAndRefusesStubDid();
}

function receiptsAreInspectableObjects(): void {
  const sig = parseBoardReceiptLocator("sig:lea-install");
  assert.equal(sig?.kind, "sig");
  assert.equal(sig?.inspectable, true);
  assert.equal(openBoardReceipt("intent://install-cache").kind, "open");
  assert.equal(openBoardReceipt("agent-run://scout/188").kind, "open");
  assert.equal(openBoardReceipt("not-a-receipt").kind, "unknown");
}

function jumpPreservesSearchQuery(): void {
  assert.equal(preservedSearchAfterJump("state:needs-review"), "state:needs-review");
  assert.equal(preservedSearchAfterJump(undefined), "");
}

function jumpChooserStaysOpenAfterPromptClears(): void {
  assert.equal(jumpChooserShouldOpen({
    kind: "jump", candidateCount: 3, menuDismissed: false, intelOpen: false,
  }), true);
  assert.equal(jumpChooserShouldOpen({
    kind: "command", candidateCount: 3, menuDismissed: false, intelOpen: false,
  }), false);
  assert.equal(jumpChooserShouldOpen({
    kind: "jump", candidateCount: 0, menuDismissed: false, intelOpen: false,
  }), false);
  assert.equal(jumpChooserShouldOpen({
    kind: "jump", candidateCount: 2, menuDismissed: true, intelOpen: false,
  }), false);
  assert.equal(jumpChooserShouldOpen({
    kind: "jump", candidateCount: 2, menuDismissed: true, intelOpen: true,
  }), true);
}

function composerKeepsLetters(): void {
  assert.equal(composerOwnsLetter({ composerFocused: true, composerValue: "", key: "j" }), true);
  assert.equal(composerOwnsLetter({ composerFocused: true, composerValue: "hi", key: "k" }), true);
  assert.equal(composerOwnsLetter({ composerFocused: true, composerValue: "hi", key: "R" }), true);
  assert.equal(letterSteersBoard({ composerFocused: true, composerValue: "", key: "j", columnFocus: true }), false);
  assert.equal(letterSteersBoard({ composerFocused: false, composerValue: "", key: "j", columnFocus: true }), true);
}

function muteReportHookRequireTarget(): void {
  assert.equal(requireScopedTarget("post.mute", undefined).ok, false);
  assert.equal(requireScopedTarget("post.report", "").ok, false);
  assert.equal(requireScopedTarget("hooks.test", undefined).ok, false);
  const scoped = requireScopedTarget("post.report", "p1");
  assert.equal(scoped.ok, true);
  if (scoped.ok) assert.equal(scoped.objectId, "p1");
}

function sampleBoardDoesNotInventTickActivity(): void {
  const events = [{ id: "tick-1", actorId: "fixture", kind: "tick" }];
  assert.deepEqual(activityFromParticipantEvents(events, { sampleBoard: true }), []);
  const real = [{ id: "e1", actorId: "maya", kind: "mention" }];
  assert.equal(activityFromParticipantEvents(real, { sampleBoard: false }).length, 1);
}

function mutedObjectsDropHookActivity(): void {
  const events = [
    { id: "p1", actorId: "maya", kind: "mention" },
    { id: "p2", actorId: "scout", kind: "mention" },
  ];
  const kept = activityFromParticipantEvents(events, { sampleBoard: false, mutedObjectIds: ["p1"] });
  assert.deepEqual(kept.map((event) => event.id), ["p2"]);
}

function receiptBladeNamesActorAndEvidence(): void {
  const opened = openBoardReceipt("sig:lea-install");
  assert.equal(opened.kind, "open");
  if (opened.kind !== "open") return;
  const blade = describeReceiptBlade(opened.receipt, { who: "lea", body: "install cache" });
  assert.equal(blade.actor, "lea");
  assert.equal(blade.evidence, "install cache");
  assert.equal(blade.inspectable, true);
}

function workingWithoutHeartbeatIsIdle(): void {
  assert.equal(honestAgentStatus("working"), "idle");
  assert.equal(honestAgentStatus("working", Date.now() - 120_000, Date.now()), "idle");
  assert.equal(honestAgentStatus("working", Date.now() - 1_000, Date.now()), "working");
  assert.equal(honestAgentStatus("active"), "active");
}

async function atprotoOAuthUsesParPkceDpopAndRefusesStubDid(): Promise<void> {
  const handle = "maya.bsky.social";
  assert.equal(isHandleHashStub(stubDidFromHandle(handle), handle), true);
  let parBody = "";
  let parDpop = "";
  let tokenDpop = "";
  const host = {
    authorizationServer: "https://auth.test",
    clientId: "https://epoch.test/client-metadata.json",
    redirectUri: "https://epoch.test/oauth/callback",
    now: () => 1_700_000_000_000,
    fetch: async (url: string, init?: RequestInit) => {
      // SAFETY: Runtime checks or construction above establish Record<string.
      const headers = init?.headers as Record<string, string>;
      if (String(url).endsWith("/oauth/par")) {
        parBody = String(init?.body || "");
        parDpop = headers.DPoP || "";
        return new Response(JSON.stringify({ request_uri: "urn:ietf:params:oauth:request_uri:par-1" }), { status: 201 });
      }
      tokenDpop = headers.DPoP || "";
      return new Response(JSON.stringify({
        access_token: "dpop-access",
        token_type: "DPoP",
        sub: "did:plc:fromtokennotahash",
        handle,
      }), { status: 200 });
    },
  };
  const start = await beginAtprotoAuthorization("maya", host);
  assert.match(start.authorizationUrl, /request_uri=/u);
  assert.match(parBody, /code_challenge=/u);
  assert.match(parBody, /code_challenge_method=S256/u);
  assert.match(parDpop, /^eyJ/u);
  const finished = await finishAtprotoAuthorization({
    code: "auth-code",
    state: start.state,
    expectedState: start.state,
    codeVerifier: start.codeVerifier,
    loginHint: start.loginHint,
    host,
  });
  assert.equal(finished.did, "did:plc:fromtokennotahash");
  assert.notEqual(finished.did, stubDidFromHandle(handle));
  assert.equal(finished.source, "par-pkce-dpop");
  assert.match(tokenDpop, /^eyJ/u);
  await assert.rejects(
    () => finishAtprotoAuthorization({
      code: "auth-code",
      state: start.state,
      expectedState: start.state,
      codeVerifier: start.codeVerifier,
      loginHint: handle,
      host: {
        ...host,
        fetch: async () => new Response(JSON.stringify({
          access_token: "x",
          sub: stubDidFromHandle(handle),
          handle,
        }), { status: 200 }),
      },
    }),
    /stub DID/u,
  );
}

function stubDidFromHandle(handle: string): string {
  let hash = 0;
  for (let index = 0; index < handle.length; index += 1) {
    hash = ((hash << 5) - hash + handle.charCodeAt(index)) | 0;
  }
  return `did:plc:${`000000000000000000000000${Math.abs(hash).toString(16)}`.slice(-24)}`;
}

if (require.main === module) {
  runCommunityBoardHonestyTests().then(() => {
    console.log("community board honesty tests passed");
  });
}
