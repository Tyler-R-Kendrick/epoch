/**
 * Host-side NATS user JWT issuance (ADR-0054 consequence).
 *
 * Issues Ed25519 JWTs for Epoch fabric admission. Clients still verify
 * event signatures; JWTs are admission tokens only (I-1).
 */

import { createPrivateKey, generateKeyPairSync, sign, verify } from "node:crypto";
import type { FabricAdmission, FabricValidator } from "./admission";
import { permissionsForScopes } from "./acl";

const JWT_ALG = "ed25519-nkey";
const DEFAULT_TTL_MS = 60_000;

export type NkeyPair = {
  readonly seedPem: string;
  readonly publicPem: string;
  readonly publicKey: string;
};

export type IssuedFabricJwt = {
  readonly jwt: string;
  readonly admission: FabricAdmission;
  readonly expiresAt: number;
};

export function generateIssuerKey(): NkeyPair {
  const pair = generateKeyPairSync("ed25519");
  return {
    seedPem: pair.privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    publicPem: pair.publicKey.export({ type: "spki", format: "pem" }).toString(),
    publicKey: pair.publicKey.export({ type: "spki", format: "der" }).toString("base64url"),
  };
}

export function issueUserJwt(input: {
  readonly issuer: NkeyPair;
  readonly admission: FabricAdmission;
  readonly ttlMs?: number;
  readonly now?: number;
}): IssuedFabricJwt {
  const now = input.now ?? Date.now();
  const ttlMs = input.ttlMs ?? DEFAULT_TTL_MS;
  const expiresAt = Math.min(input.admission.expiresAt, now + ttlMs);
  const admission: FabricAdmission = {
    ...input.admission,
    expiresAt,
  };
  const header = { typ: "JWT", alg: JWT_ALG };
  const payload = {
    iss: input.issuer.publicKey,
    sub: admission.principal,
    iat: Math.floor(now / 1000),
    exp: Math.floor(expiresAt / 1000),
    nats: {
      type: "user",
      version: 2,
      pub: { allow: permissionsForScopes(admission.scopes, "api-token", { sourceServer: admission.sourceServer, allowServiceDiscovery: admission.allowServiceDiscovery }).publish },
      sub: { allow: permissionsForScopes(admission.scopes, "api-token", { sourceServer: admission.sourceServer, allowServiceDiscovery: admission.allowServiceDiscovery }).subscribe },
      sourceServer: admission.sourceServer ?? "",
    },
  };
  const encoded = `${b64(header)}.${b64(payload)}`;
  const signature = sign(null, Buffer.from(encoded), createPrivateKey(input.issuer.seedPem)).toString("base64url");
  return { jwt: `${encoded}.${signature}`, admission, expiresAt };
}

export function verifyUserJwt(
  jwt: string,
  issuer: NkeyPair,
  options: { readonly now?: number; readonly expectedSourceServer?: string } = {},
): FabricAdmission | null {
  const parts = jwt.split(".");
  if (parts.length !== 3) return null;
  const [headerPart, payloadPart, signaturePart] = parts;
  if (!headerPart || !payloadPart || !signaturePart) return null;
  let header: { alg?: string };
  let payload: {
    iss?: string;
    sub?: string;
    exp?: number;
    nats?: { pub?: { allow?: string[] }; sub?: { allow?: string[] }; sourceServer?: string };
  };
  try {
    header = JSON.parse(Buffer.from(headerPart, "base64url").toString()) as { alg?: string };
    payload = JSON.parse(Buffer.from(payloadPart, "base64url").toString()) as typeof payload;
  } catch {
    return null;
  }
  if (header.alg !== JWT_ALG) return null;
  if (payload.iss !== issuer.publicKey) return null;
  const ok = verify(
    null,
    Buffer.from(`${headerPart}.${payloadPart}`),
    issuer.publicPem,
    Buffer.from(signaturePart, "base64url"),
  );
  if (!ok) return null;
  const now = options.now ?? Date.now();
  if (typeof payload.exp !== "number" || payload.exp * 1000 <= now) return null;
  if (typeof payload.sub !== "string" || payload.sub.length === 0) return null;
  const sourceServer = payload.nats?.sourceServer || undefined;
  if (options.expectedSourceServer !== undefined && sourceServer !== options.expectedSourceServer) {
    return null;
  }
  const publish = payload.nats?.pub?.allow ?? [];
  const subscribe = payload.nats?.sub?.allow ?? [];
  const hay = [...publish, ...subscribe].join(" ");
  return {
    principal: payload.sub,
    sourceServer,
    scopes: inferScopes(publish, subscribe),
    expiresAt: payload.exp * 1000,
    ...(hay.includes("epoch.svc.") ? { allowServiceDiscovery: true } : {}),
  };
}

export function createJwtFabricValidator(issuer: NkeyPair): FabricValidator {
  return {
    verify(token, options) {
      return verifyUserJwt(token, issuer, { expectedSourceServer: options?.sourceServer });
    },
  };
}

function inferScopes(publish: readonly string[], subscribe: readonly string[]): string[] {
  const scopes = new Set<string>();
  const hay = [...publish, ...subscribe].join(" ");
  if (hay.includes("epoch.live.")) scopes.add("live:write");
  if (hay.includes("epoch.community.stream.")) scopes.add("community.stream:write");
  if (hay.includes("epoch.platform.events.")) scopes.add("platform.events:read");
  if (hay.includes("epoch.svc.")) scopes.add("svc:discover");
  return [...scopes];
}

function b64(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}
