import type { CommunityAuthorizationContext } from "./authorization";
import { CommunityError } from "./errors";

const SAFE_NAMESPACE = /^[A-Za-z0-9][A-Za-z0-9._~-]{0,127}$/u;

export interface Clock {
  now(): Date;
}

export interface IdGenerator {
  generate(namespace: string): string;
}

export interface CommunityRuntimeContextInput {
  readonly clock: Clock;
  readonly idGenerator: IdGenerator;
  readonly timezone: string;
  readonly locale: string;
}

export interface CommunityRuntimeContext extends CommunityRuntimeContextInput {
  now(): string;
  nextId(namespace: string): string;
}

export function createCommunityRuntimeContext(input: CommunityRuntimeContextInput): CommunityRuntimeContext {
  validateTimezone(input.timezone);
  let locale: string | undefined;
  try {
    [locale] = Intl.getCanonicalLocales(input.locale);
  } catch {
    throw new CommunityError("INVALID_FIELD", "Locale must be a valid BCP 47 language tag");
  }
  if (locale === undefined) throw new CommunityError("INVALID_FIELD", "Locale must be a valid BCP 47 language tag");
  return Object.freeze({
    ...input,
    locale,
    now: (): string => {
      const value = input.clock.now();
      if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
        throw new CommunityError("INVALID_FIELD", "Clock returned an invalid instant");
      }
      return value.toISOString();
    },
    nextId: (namespace: string): string => {
      if (!SAFE_NAMESPACE.test(namespace)) throw new CommunityError("INVALID_FIELD", "ID namespace must be an opaque URL-safe value");
      const value = input.idGenerator.generate(namespace);
      if (!SAFE_NAMESPACE.test(value)) throw new CommunityError("INVALID_FIELD", "ID generator returned an invalid opaque identifier");
      return value;
    },
  });
}

export async function authorizationFingerprint(authorization: CommunityAuthorizationContext): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (subtle === undefined) throw new CommunityError("CRYPTO_UNAVAILABLE", "SHA-256 is unavailable in this runtime");
  const canonical = JSON.stringify({
    actorId: boundedClaim(authorization.actorId),
    permissions: canonicalClaimSet(authorization.permissions),
    readableDmIds: canonicalClaimSet(authorization.readableDmIds),
  });
  const digest = await subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return `sha256:${[...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function canonicalClaimSet(values: readonly string[] | undefined): readonly string[] {
  if (values === undefined) return [];
  if (values.length > 4096) throw new CommunityError("AUTHORIZATION_DENIED", "Authorization claim set exceeds the supported limit");
  return [...new Set(values.map((value) => boundedClaim(value) ?? ""))].sort();
}

function boundedClaim(value: string | undefined): string | null {
  if (value === undefined) return null;
  if (value.length === 0 || value.length > 512 || [...value].some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  })) {
    throw new CommunityError("AUTHORIZATION_DENIED", "Authorization contains an invalid claim");
  }
  return value.normalize("NFC");
}

function validateTimezone(timezone: string): void {
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone }).format(0);
  } catch {
    throw new CommunityError("INVALID_FIELD", "Timezone must be a valid IANA timezone");
  }
}
