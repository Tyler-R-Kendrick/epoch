export type CommunityErrorCode =
  | "QUERY_SYNTAX"
  | "QUERY_UNKNOWN_FIELD"
  | "QUERY_INVALID_OPERATOR"
  | "QUERY_COST_LIMIT"
  | "QUERY_UNSUPPORTED_SOURCE"
  | "CURSOR_INVALID"
  | "CURSOR_STALE"
  | "PROJECTION_INVALID"
  | "PROJECTION_CYCLE"
  | "PROJECTION_COLLISION"
  | "NAMESPACE_MOUNT_CONFLICT"
  | "NAMESPACE_RECOVERY_PROTECTED"
  | "SOURCE_PARTIAL"
  | "SOURCE_UNAVAILABLE"
  | "INDEX_STALE"
  | "INDEX_LOCKED"
  | "INDEX_QUOTA"
  | "AUTHORIZATION_DENIED"
  | "PERSISTENCE_MIGRATION"
  | "INVALID_ENTITY"
  | "INVALID_FIELD"
  | "CRYPTO_UNAVAILABLE"
  | "INTERNAL";

const STATUS_BY_CODE: Readonly<Record<CommunityErrorCode, number>> = Object.freeze({
  QUERY_SYNTAX: 400,
  QUERY_UNKNOWN_FIELD: 400,
  QUERY_INVALID_OPERATOR: 400,
  QUERY_COST_LIMIT: 413,
  QUERY_UNSUPPORTED_SOURCE: 422,
  CURSOR_INVALID: 400,
  CURSOR_STALE: 409,
  PROJECTION_INVALID: 400,
  PROJECTION_CYCLE: 400,
  PROJECTION_COLLISION: 409,
  NAMESPACE_MOUNT_CONFLICT: 409,
  NAMESPACE_RECOVERY_PROTECTED: 409,
  SOURCE_PARTIAL: 424,
  SOURCE_UNAVAILABLE: 503,
  INDEX_STALE: 409,
  INDEX_LOCKED: 423,
  INDEX_QUOTA: 507,
  AUTHORIZATION_DENIED: 403,
  PERSISTENCE_MIGRATION: 409,
  INVALID_ENTITY: 400,
  INVALID_FIELD: 400,
  CRYPTO_UNAVAILABLE: 503,
  INTERNAL: 500,
});

export interface CommunityErrorBody {
  readonly code: CommunityErrorCode;
  readonly message: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

export class CommunityError extends Error {
  readonly code: CommunityErrorCode;
  readonly httpStatus: number;
  readonly details?: Readonly<Record<string, unknown>>;

  constructor(
    code: CommunityErrorCode,
    message: string,
    details?: Readonly<Record<string, unknown>>,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "CommunityError";
    this.code = code;
    this.httpStatus = communityErrorHttpStatus(code);
    this.details = details === undefined ? undefined : Object.freeze({ ...details });
  }

  toJSON(): CommunityErrorBody {
    return {
      code: this.code,
      message: this.message,
      ...(this.details === undefined ? {} : { details: this.details }),
    };
  }
}

export function communityErrorHttpStatus(code: CommunityErrorCode): number {
  return STATUS_BY_CODE[code];
}

export function isCommunityError(error: unknown): error is CommunityError {
  return error instanceof CommunityError || (typeof error === "object" && error !== null
    && (error as { readonly name?: unknown }).name === "CommunityError"
    && typeof (error as { readonly message?: unknown }).message === "string"
    && isCommunityErrorCode((error as { readonly code?: unknown }).code)
    && (error as { readonly httpStatus?: unknown }).httpStatus === communityErrorHttpStatus(
      (error as { readonly code: CommunityErrorCode }).code,
    ));
}

function isCommunityErrorCode(value: unknown): value is CommunityErrorCode {
  return typeof value === "string" && Object.hasOwn(STATUS_BY_CODE, value);
}
