/**
 * Revoke fencing: short-lived JWTs plus an explicit kick of tracked connections.
 * Closes the immortal-CONNECT gap documented in ADR-0054.
 */

export type TrackedConnection = {
  readonly principal: string;
  close(): void;
  isClosed(): boolean;
};

export function createConnectionFencer(options: { readonly boundMs?: number } = {}) {
  const boundMs = options.boundMs ?? 1_000;
  const connections = new Set<TrackedConnection>();
  const revoked = new Map<string, number>();

  return {
    track(connection: TrackedConnection) {
      connections.add(connection);
    },
    revoke(principal: string) {
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
    isRevoked(principal: string) {
      return revoked.has(principal);
    },
    revokedAt(principal: string) {
      return revoked.get(principal);
    },
  };
}
