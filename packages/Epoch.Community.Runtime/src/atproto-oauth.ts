/**
 * ATProto OAuth (PAR + PKCE S256 + DPoP).
 *
 * Sign-in never mints a DID or handle from a hash. The authorization server
 * (injected in tests) is the only source of a DID. A missing host is "AT OAuth
 * is not linked", not a fake session.
 */
import { identifier } from "./digest";

export interface AtprotoOAuthHost {
  readonly authorizationServer: string;
  readonly clientId: string;
  readonly redirectUri: string;
  fetch(input: string, init?: RequestInit): Promise<Response>;
  now?(): number;
  randomBytes?(size: number): Uint8Array;
  crypto?: Crypto;
}

export interface AtprotoOAuthStart {
  readonly authorizationUrl: string;
  readonly state: string;
  readonly codeVerifier: string;
  readonly codeChallenge: string;
  readonly requestUri: string;
  readonly dpopJkt: string;
  readonly loginHint: string;
}

export interface AtprotoOAuthSession {
  readonly did: string;
  readonly handle: string;
  readonly accessToken: string;
  readonly tokenType: "DPoP";
  readonly pdsEndpoint: string;
  readonly source: "par-pkce-dpop";
}

export class AtprotoOAuthError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "AtprotoOAuthError";
    this.code = code;
  }
}

const HANDLE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/u;

export function normalizeAtprotoHandle(handle: string): string {
  let value = String(handle || "").trim().replace(/^@/u, "").toLowerCase();
  if (!value) throw new AtprotoOAuthError("invalid-handle", "handle required");
  if (value.indexOf(".") === -1) value = `${value}.bsky.social`;
  if (!HANDLE.test(value)) throw new AtprotoOAuthError("invalid-handle", `invalid handle: ${handle}`);
  return value;
}

export async function beginAtprotoAuthorization(handle: string, host: AtprotoOAuthHost): Promise<AtprotoOAuthStart> {
  if (!host || !host.authorizationServer || typeof host.fetch !== "function") {
    throw new AtprotoOAuthError("not-linked", "AT OAuth is not linked — PAR/PKCE/DPoP required");
  }
  const loginHint = normalizeAtprotoHandle(handle);
  const cryptoApi = host.crypto ?? globalThis.crypto;
  if (!cryptoApi?.subtle) throw new AtprotoOAuthError("crypto", "WebCrypto required for PKCE and DPoP");
  const verifier = base64Url(randomBytes(host, 32));
  const challenge = base64Url(await sha256(cryptoApi, verifier));
  const state = base64Url(randomBytes(host, 16));
  const dpop = await createDpopProof(cryptoApi, "POST", parUrl(host), host);
  const body = new URLSearchParams({
    client_id: host.clientId,
    redirect_uri: host.redirectUri,
    response_type: "code",
    scope: "atproto transition:generic",
    code_challenge: challenge,
    code_challenge_method: "S256",
    state,
    login_hint: loginHint,
  });
  const response = await host.fetch(parUrl(host), {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      DPoP: dpop.proof,
    },
    body: body.toString(),
  });
  if (!response.ok) {
    throw new AtprotoOAuthError("par-failed", `PAR failed (${response.status})`);
  }
  const payload = await readJson(response);
  const requestUri = String(payload.request_uri || "");
  if (!requestUri) throw new AtprotoOAuthError("par-failed", "PAR response missing request_uri");
  const authorizationUrl = `${host.authorizationServer.replace(/\/+$/u, "")}/oauth/authorize?client_id=${encodeURIComponent(host.clientId)}&request_uri=${encodeURIComponent(requestUri)}`;
  return Object.freeze({
    authorizationUrl,
    state,
    codeVerifier: verifier,
    codeChallenge: challenge,
    requestUri,
    dpopJkt: dpop.jkt,
    loginHint,
  });
}

export async function finishAtprotoAuthorization(input: {
  readonly code: string;
  readonly state: string;
  readonly expectedState: string;
  readonly codeVerifier: string;
  readonly loginHint: string;
  readonly host: AtprotoOAuthHost;
}): Promise<AtprotoOAuthSession> {
  if (input.state !== input.expectedState) {
    throw new AtprotoOAuthError("state-mismatch", "OAuth state mismatch");
  }
  if (!input.code) throw new AtprotoOAuthError("missing-code", "authorization code required");
  const cryptoApi = input.host.crypto ?? globalThis.crypto;
  if (!cryptoApi?.subtle) throw new AtprotoOAuthError("crypto", "WebCrypto required for PKCE and DPoP");
  const tokenEndpoint = `${input.host.authorizationServer.replace(/\/+$/u, "")}/oauth/token`;
  const dpop = await createDpopProof(cryptoApi, "POST", tokenEndpoint, input.host);
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: input.code,
    redirect_uri: input.host.redirectUri,
    client_id: input.host.clientId,
    code_verifier: input.codeVerifier,
  });
  const response = await input.host.fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      DPoP: dpop.proof,
    },
    body: body.toString(),
  });
  if (!response.ok) throw new AtprotoOAuthError("token-failed", `token exchange failed (${response.status})`);
  const payload = await readJson(response);
  const did = String(payload.sub || payload.did || "");
  if (!did.startsWith("did:")) {
    throw new AtprotoOAuthError("missing-did", "token response did not include a DID");
  }
  if (isHandleHashStub(did, input.loginHint)) {
    throw new AtprotoOAuthError("stub-did", "AT OAuth refused stub DID mint");
  }
  return Object.freeze({
    did,
    handle: String(payload.handle || input.loginHint),
    accessToken: String(payload.access_token || ""),
    tokenType: "DPoP" as const,
    pdsEndpoint: String(payload.iss || input.host.authorizationServer),
    source: "par-pkce-dpop" as const,
  });
}

export function isHandleHashStub(did: string, handle: string): boolean {
  let hash = 0;
  const h = handle;
  for (let index = 0; index < h.length; index += 1) {
    hash = ((hash << 5) - hash + h.charCodeAt(index)) | 0;
  }
  const stub = `did:plc:${`000000000000000000000000${Math.abs(hash).toString(16)}`.slice(-24)}`;
  return did === stub;
}

function parUrl(host: AtprotoOAuthHost): string {
  return `${host.authorizationServer.replace(/\/+$/u, "")}/oauth/par`;
}

async function createDpopProof(
  cryptoApi: Crypto,
  method: string,
  url: string,
  host: AtprotoOAuthHost,
): Promise<{ readonly proof: string; readonly jkt: string }> {
  const pair = await cryptoApi.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign"]);
  const jwk = await cryptoApi.subtle.exportKey("jwk", pair.publicKey);
  const header = { typ: "dpop+jwt", alg: "ES256", jwk: { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y } };
  const now = host.now ? Math.floor(host.now() / 1000) : Math.floor(Date.now() / 1000);
  const payload = { jti: base64Url(randomBytes(host, 12)), htm: method, htu: url, iat: now };
  const signingInput = `${base64Url(bytesFromUtf8(JSON.stringify(header)))}.${base64Url(bytesFromUtf8(JSON.stringify(payload)))}`;
  const signature = new Uint8Array(await cryptoApi.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    pair.privateKey,
    utf8Buffer(signingInput),
  ));
  const jkt = identifier("dpop", { x: jwk.x, y: jwk.y });
  return { proof: `${signingInput}.${base64Url(signature)}`, jkt };
}

function randomBytes(host: AtprotoOAuthHost, size: number): Uint8Array {
  if (host.randomBytes) return host.randomBytes(size);
  const cryptoApi = host.crypto ?? globalThis.crypto;
  const out = new Uint8Array(size);
  cryptoApi.getRandomValues(out);
  return out;
}

async function sha256(cryptoApi: Crypto, value: string): Promise<Uint8Array> {
  return new Uint8Array(await cryptoApi.subtle.digest("SHA-256", utf8Buffer(value)));
}

function bytesFromUtf8(value: string): Uint8Array {
  return new Uint8Array(utf8Buffer(value));
}

function utf8Buffer(value: string): ArrayBuffer {
  const encoded = new TextEncoder().encode(value);
  return encoded.buffer.slice(encoded.byteOffset, encoded.byteOffset + encoded.byteLength);
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {};
  }
}
