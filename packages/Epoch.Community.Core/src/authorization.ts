import type { CommunityObjectKind } from "./identity";

export type CommunityPermission = "object:state:write";

export interface CommunityAuthorizationContext {
  readonly actorId?: string;
  readonly permissions?: readonly CommunityPermission[];
  readonly readableDmIds?: readonly string[];
}

export interface CommunityAccessTarget {
  readonly kind: CommunityObjectKind;
  readonly resourceId: string;
  readonly visibility?: "private" | "shared" | "public";
  readonly ownerId?: string;
  readonly participantIds?: readonly string[];
}

export function hasCommunityPermission(
  authorization: CommunityAuthorizationContext,
  permission: CommunityPermission,
): boolean {
  return authorization.actorId !== undefined
    && authorization.permissions?.includes(permission) === true;
}

export function canReadCommunityResource(
  target: CommunityAccessTarget,
  authorization: CommunityAuthorizationContext = {},
): boolean {
  const actorId = authorization.actorId;
  if (target.kind === "dm") {
    if (actorId === undefined) return false;
    return target.participantIds?.includes(actorId) === true
      || authorization.readableDmIds?.includes(target.resourceId) === true;
  }
  if (target.visibility === "private" && (actorId === undefined || actorId !== target.ownerId)) {
    return false;
  }
  return true;
}
