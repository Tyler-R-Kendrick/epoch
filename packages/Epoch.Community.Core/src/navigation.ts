import type { CommunityObjectRef } from "./identity";

export type FocusRegion = "navigator" | "feed" | "thread-outline" | "detail" | "composer" | "completion" | "dialog";

export interface ReadingAnchor {
  readonly objectId: string;
  readonly pixelOffset: number;
}

export interface NavigationLocation {
  readonly projectionId: string;
  readonly object: CommunityObjectRef;
  readonly aliasPath: string;
}

export interface InteractionLayer {
  readonly layerId: string;
  readonly kind: "auth-dialog" | "profile-menu" | "context-menu" | "completion" | "help" | "query-editor"
    | "reaction-picker" | "attachment-chooser" | "thread-detail" | "session-transcript" | "workspace";
  readonly returnFocusId?: string;
}

export interface NavigationState {
  readonly location: NavigationLocation;
  readonly focusRegion: FocusRegion;
  readonly focusedObject?: CommunityObjectRef;
  readonly selectedObject?: CommunityObjectRef;
  readonly detailObject?: CommunityObjectRef;
  readonly threadRoot?: CommunityObjectRef;
  readonly readingAnchor?: ReadingAnchor;
  readonly layers: readonly InteractionLayer[];
}

export const NAVIGATION_ACTION_IDS = [
  "nav.next", "nav.previous", "nav.first", "nav.last", "nav.enter", "nav.ascend", "nav.expand", "nav.collapse",
  "thread.parent", "thread.root", "thread.firstChild", "thread.nextSibling", "thread.previousSibling", "thread.nextUnread",
  "history.back", "history.forward", "history.previousLocation",
  "jump.best", "jump.interactive",
  "detail.open", "detail.close", "compose.open", "cancel.topLayer",
] as const;

export type NavigationActionId = typeof NAVIGATION_ACTION_IDS[number];
