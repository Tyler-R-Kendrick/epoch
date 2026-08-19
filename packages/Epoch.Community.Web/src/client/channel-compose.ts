const SCHEMA = "epoch.channel/v1" as const;

export type LiveChannelComposeResult = {
  readonly schemaVersion: 1;
  readonly type: "channel.message";
  readonly eventId: string;
  readonly revisionId: string;
  readonly body: {
    readonly schema: typeof SCHEMA;
    readonly channelId: string;
    readonly messageId: string;
    readonly principalId: string;
    readonly bodyDigest: string;
    readonly visibility: "public" | "shared" | "private";
  };
  readonly scheme: "epoch.channel.integrity/v1";
  readonly signature: string;
};

async function h(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Live composer never uses `sig:local-only`. */
export async function composeLiveChannelMessage(input: {
  readonly channelId: string;
  readonly principalId: string;
  readonly body: string;
  readonly visibility?: "public" | "shared" | "private";
}): Promise<LiveChannelComposeResult> {
  const bodyDigest = await h(input.body);
  const messageId = (await h(`${input.channelId}:${input.principalId}:${bodyDigest}`)).slice(0, 32);
  const event = {
    schemaVersion: 1 as const,
    type: "channel.message" as const,
    eventId: messageId,
    revisionId: messageId,
    body: {
      schema: SCHEMA,
      channelId: input.channelId,
      messageId,
      principalId: input.principalId,
      bodyDigest,
      visibility: input.visibility ?? "public",
    },
  };
  return { ...event, scheme: "epoch.channel.integrity/v1", signature: `sha256:${await h(JSON.stringify(event))}` };
}
