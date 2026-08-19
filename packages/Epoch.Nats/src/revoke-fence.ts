/**
 * Revoke fencing: short-lived JWTs plus an explicit kick of tracked connections.
 * Closes the immortal-CONNECT gap documented in ADR-0054.
 */

export type TrackedConnection = {
  readonly principal: string;
  close(): void;
  isClosed(): boolean;
};

export function createConnectionFencer(options: { readonly boundMs?: number } = {}): {
  track(connection: TrackedConnection): void;
  revoke(principal: string): { readonly severed: number; readonly boundMs: number };
  isRevoked(principal: string): boolean;
  revokedAt(principal: string): number | undefined;
} {
  const boundMs = options.boundMs ?? 1_000;
  const connections = new Set<TrackedConnection>();
  const revoked = new Map<string, number>();

  return {
    track(connection) {
      connections.add(connection);
    },
    revoke(principal) {
      revoked.set(principal, Date.now());
      let severed = 0;
      for (const connection of connections) {
        if (connection.principal !== principal) continue;
        if (!connection.isClosed()) {
          connection.close();
          severed += 1;
        }
      }
      return { severed, boundMs };
    },
    isRevoked(principal) {
      return revoked.has(principal);
    },
    revokedAt(principal) {
      return revoked.get(principal);
    },
  };
}
