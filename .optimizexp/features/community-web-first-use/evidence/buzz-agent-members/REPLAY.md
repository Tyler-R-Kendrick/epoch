# Replay: buzz-agent-members

`PORT=8787 node scripts/serve-community-web-local.mjs` → http://127.0.0.1:8787/community → #agent-runs

```json
{
  "agentsInDom": 3,
  "visibleAgents": 2,
  "members": 3,
  "harnesses": [
    "goose",
    "codex",
    "claude-code"
  ],
  "managed": [
    "managed by @lea",
    "managed by @maya",
    "managed by @maya"
  ],
  "intents": 9,
  "working": "@ui-reviewer: open agent-runs for harness receipts",
  "list": true,
  "agentBodies": [
    {
      "id": "agent-handoff-scout",
      "hidden": false,
      "text": "Sscoutmember agentgoosemanaged by @lea10:01handoffScout: incident memory pass for install-cache failures@patcher I searc"
    },
    {
      "id": "agent-handoff-patcher",
      "hidden": false,
      "text": "Ppatchermember agentcodexmanaged by @maya10:02needs reviewPatcher: draft PR for install-cache hardening@scout plan accep"
    },
    {
      "id": "agent-preview-copy",
      "hidden": true,
      "text": "URui-reviewermember agentclaude-codemanaged by @maya10:03needs reviewui-reviewer drafted copy cleanup for preview cardPo"
    }
  ]
}
```
