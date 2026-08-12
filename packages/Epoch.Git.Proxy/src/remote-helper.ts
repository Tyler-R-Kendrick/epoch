export const REMOTE_HELPER_CAPABILITIES = Object.freeze(["fetch", "push", "option", "refspec refs/heads/*:refs/epoch/remotes/*"] as const);

export type RemoteHelperCommand =
  | { readonly command: "capabilities" | "list" | "quit" }
  | { readonly command: "fetch"; readonly oid: string; readonly ref: string }
  | { readonly command: "push"; readonly source: string; readonly destination: string; readonly force: boolean }
  | { readonly command: "option"; readonly name: string; readonly value: string };

export function parseRemoteHelperCommand(line: string): RemoteHelperCommand {
  const parts = line.trim().split(/\s+/u);
  if (parts[0] === "capabilities" || parts[0] === "list" || parts[0] === "quit") return { command: parts[0] };
  if (parts[0] === "fetch" && parts.length === 3) return { command: "fetch", oid: parts[1]!, ref: parts[2]! };
  if (parts[0] === "push" && parts.length === 2) {
    const [rawSource, destination] = parts[1]!.split(":", 2);
    if (!rawSource || !destination) throw new Error("Invalid remote-helper push refspec");
    return { command: "push", source: rawSource.replace(/^\+/u, ""), destination, force: rawSource.startsWith("+") };
  }
  if (parts[0] === "option" && parts.length >= 3) return { command: "option", name: parts[1]!, value: parts.slice(2).join(" ") };
  throw new Error(`Unsupported git-remote-epoch command: ${parts[0] ?? "empty"}`);
}
export function proposalRef(proposalId: string): string {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(proposalId)) throw new Error("Invalid Epoch proposal ref identity");
  return `refs/epoch/for/${proposalId}`;
}
