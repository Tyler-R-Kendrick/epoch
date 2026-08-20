// SAFETY: The module validates or constructs this value before applying the asserted contract.
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";
type BoundaryValue = null | undefined | boolean | number | string | bigint | symbol | Readonly<object>;
type DictionaryValue = null | undefined | boolean | number | string | bigint | readonly DictionaryValue[] | { readonly [key: string]: DictionaryValue };
function __epochIsObject<T>(value: T): value is T & object { return typeof value === "object"; }
function matchesSchemaType<T>(
  value: T,
  expected: "string" | "number" | "boolean",
): value is T & (string | number | boolean) {
  return typeof value === expected;
}


export interface ProviderRequest { readonly promptDigest: string; readonly promptByteLength: number; readonly grant?: { readonly allow: boolean; readonly reason?: string }; readonly budgetReservationId?: string; readonly disclosureAccepted?: boolean; readonly outputSchema?: JsonSchema }
export interface JsonSchema { readonly type: "object"; readonly required?: readonly string[]; readonly properties?: Readonly<Record<string, { readonly type: "string" | "number" | "boolean" }>> }
export class DisabledAiProvider { async generate(_request: ProviderRequest): Promise<never> { throw new Error("AI provider disabled by default"); } }
export class GuardedAiProvider {
  readonly #options: { providerId: string; modelId: string; maxOutputBytes: number; invoke(): Promise<{ output: unknown; usage: { inputTokens: number; outputTokens: number } }>; telemetry?(event: Readonly<Record<string, DictionaryValue>>): void };
  constructor(options: { providerId: string; modelId: string; maxOutputBytes: number; invoke(): Promise<{ output: unknown; usage: { inputTokens: number; outputTokens: number } }>; telemetry?(event: Readonly<Record<string, DictionaryValue>>): void }) { this.#options = options; }
  async generate(request: ProviderRequest): Promise<Readonly<{ output: unknown; digest: string; byteLength: number; authoritativeMutation: false; usage: { inputTokens: number; outputTokens: number } }>> {
    if (!request.grant?.allow) throw new Error(`provider grant denied${request.grant?.reason ? `: ${request.grant.reason}` : ""}`);
    if (!request.budgetReservationId) throw new Error("provider budget reservation required");
    if (!request.disclosureAccepted) throw new Error("provider disclosure acceptance required");
    if (!/^[0-9a-f]{64}$/u.test(request.promptDigest) || !Number.isSafeInteger(request.promptByteLength) || request.promptByteLength < 0) throw new Error("invalid prompt metadata");
    const response = await this.#options.invoke(); const json = JSON.stringify(response.output); const bytes = new TextEncoder().encode(json);
    if (bytes.length > this.#options.maxOutputBytes) throw new Error("provider output length exceeded");
    // SAFETY: validSchema performs runtime type checks against the declared JsonSchema.
    if (request.outputSchema && !validSchema(response.output as BoundaryValue, request.outputSchema)) throw new Error("provider output schema mismatch");
    const digest = bytesToHex(sha256(bytes));
    this.#options.telemetry?.({ providerId: this.#options.providerId, modelId: this.#options.modelId, promptDigest: request.promptDigest,
      promptByteLength: request.promptByteLength, outputDigest: digest, outputByteLength: bytes.length,
      inputTokens: response.usage.inputTokens, outputTokens: response.usage.outputTokens, outcome: "succeeded" });
    return Object.freeze({ output: response.output, digest, byteLength: bytes.length, authoritativeMutation: false, usage: response.usage });
  }
}
function validSchema(value: BoundaryValue, schema: JsonSchema): boolean {
  // SAFETY: The module validates or constructs this value before applying the asserted contract.
  // SAFETY: The module validates or constructs this value before applying the asserted contract.
  if (!value || !__epochIsObject(value) || Array.isArray(value)) return false; const row = /* SAFETY: Runtime validation immediately surrounding this expression establishes the asserted contract. */ value as Record<string, DictionaryValue>;
  if (schema.required?.some((key) => row[key] === undefined)) return false;
  return Object.entries(schema.properties ?? {}).every(([key, rule]) =>
    row[key] === undefined || matchesSchemaType(row[key], rule.type)
  );
}
