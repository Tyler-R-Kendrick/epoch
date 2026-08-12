export interface CheckpointRequest { readonly sessionId: string; readonly digest: string; readonly byteLength: number }
export interface PrivateCheckpointSession { checkpoint(request: CheckpointRequest): Promise<Readonly<{ kind: string; checkpointId: string; digest: string }>> }
export class EntireCheckpointSession implements PrivateCheckpointSession {
  readonly #adapter: { checkpoint(request: { digest: string; byteLength: number }): Promise<{ checkpointId: string; digest: string }> };
  constructor(adapter: { checkpoint(request: { digest: string; byteLength: number }): Promise<{ checkpointId: string; digest: string }> }) { this.#adapter = adapter; }
  async checkpoint(request: CheckpointRequest): Promise<Readonly<{ kind: "entire"; checkpointId: string; digest: string }>> {
    if (!/^[0-9a-f]{64}$/u.test(request.digest)) throw new Error("invalid checkpoint digest");
    const result = await this.#adapter.checkpoint({ digest: request.digest, byteLength: request.byteLength });
    if (result.digest !== request.digest) throw new Error("Entire checkpoint digest mismatch");
    return Object.freeze({ kind: "entire", checkpointId: result.checkpointId, digest: result.digest });
  }
}
export class OpaqueCheckpointSession implements PrivateCheckpointSession {
  async checkpoint(request: CheckpointRequest): Promise<Readonly<{ kind: "opaque"; checkpointId: string; digest: string }>> {
    if (!/^[0-9a-f]{64}$/u.test(request.digest)) throw new Error("invalid checkpoint digest");
    return Object.freeze({ kind: "opaque", checkpointId: `opaque:${request.digest.slice(0, 16)}:${request.byteLength}`, digest: request.digest });
  }
}
