import { createHash } from "node:crypto";
import type { GitObject, GitObjectType } from "./deterministic-projection";

export type QuarantineStatus = "open" | "promoted" | "rejected" | "aborted";

export class GitReceiveQuarantine {
  readonly #objects = new Map<string, GitObject>();
  status: QuarantineStatus = "open";

  constructor(readonly promoteObject: (object: GitObject) => Promise<void>) {}

  stage(object: GitObject): void {
    if (this.status !== "open") throw new Error(`Git quarantine is ${this.status}`);
    const separator = object.bytes.indexOf(0);
    if (separator < 0) throw new Error("Invalid Git object header");
    const header = object.bytes.subarray(0, separator).toString("ascii");
    const [type, size] = header.split(" ");
    if (type !== object.type || Number(size) !== object.bytes.length - separator - 1 ||
      createHash("sha1").update(object.bytes).digest("hex") !== object.oid) throw new Error("Git object identity mismatch");
    // SAFETY: The module validates or constructs this value before applying the asserted contract.
    this.#objects.set(object.oid, Object.freeze({ ...object, type: type as GitObjectType, bytes: Buffer.from(object.bytes) }));
  }

  async promote(verify: (objects: readonly GitObject[]) => Promise<boolean>): Promise<void> {
    if (this.status !== "open") throw new Error(`Git quarantine is ${this.status}`);
    const objects = [...this.#objects.values()].sort((a, b) => a.oid.localeCompare(b.oid));
    if (!await verify(objects)) { this.status = "rejected"; this.#objects.clear(); throw new Error("Git quarantine verification rejected the receive"); }
    for (const object of objects) await this.promoteObject(object);
    this.status = "promoted";
    this.#objects.clear();
  }

  abort(): void { if (this.status === "open") { this.status = "aborted"; this.#objects.clear(); } }
}
