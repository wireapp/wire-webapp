import type {ReactNode} from 'react';

/** Ordered by priority — earlier tiers win seats over later ones. */
export const TIER_ORDER = [
  'screen-sharing',
  'speaking-camera',
  'speaking-no-camera',
  'silent-camera',
  'silent-no-camera',
] as const;

export type ParticipantTier = (typeof TIER_ORDER)[number];

/**
 * Tiers that earn a full tile — anyone with something worth showing. Only a participant who is
 * both silent and camera-off has nothing to render, so they alone are compressed into the
 * fractional tile container.
 */
const ACTIVE_TIERS: ReadonlySet<ParticipantTier> = new Set<ParticipantTier>([
  'screen-sharing',
  'speaking-camera',
  'speaking-no-camera',
  'silent-camera',
]);

export function isActiveTier(tier: ParticipantTier): boolean {
  return ACTIVE_TIERS.has(tier);
}

export function tierRank(tier: ParticipantTier): number {
  return TIER_ORDER.indexOf(tier);
}

export function deriveParticipantTier(participant: {
  isSharingScreen: boolean;
  isSpeaking: boolean;
  hasCamera: boolean;
}): ParticipantTier {
  if (participant.isSharingScreen) {
    return 'screen-sharing';
  }
  if (participant.isSpeaking) {
    return participant.hasCamera ? 'speaking-camera' : 'speaking-no-camera';
  }
  return participant.hasCamera ? 'silent-camera' : 'silent-no-camera';
}

export interface GridParticipant {
  id: string;
  name: string;
  /** Identity only — carries no seating privilege; self is laid out like anyone else. */
  isSelf?: boolean;
  /** Shown in the name label. Falls back to `name`. */
  displayName?: string;
  /** Avatar placeholder text. Falls back to initials derived from `name`. */
  initials?: string;
  avatarUrl?: string;
  hue?: number;
  renderVideo?: () => ReactNode;
  tier: ParticipantTier;
  isMuted: boolean;
  speakingDuration: number;
  /** When this participant last entered their current tier. Breaks ties within a tier. */
  activatedAt?: number;
  /**
   * Live, undebounced speech. Drives only the active-speaker ring and name label color, which
   * must track real sound — unlike `tier`, which is debounced so seat assignment stays stable.
   */
  isSpeakingNow?: boolean;
}

// ── Layout output ────────────────────────────────────────────────────────────

/** `'column'` fills top-to-bottom then wraps right; `'row'` fills left-to-right then wraps down. */
export type FractionalFillDirection = 'row' | 'column';

/** `'center'` centers each line within the container; `'start'` top/left-aligns it. */
export type FractionalAlign = 'center' | 'start';

export type FractionalTileDescriptor =
  | {type: 'participant'; participant: GridParticipant}
  | {type: 'overflow'; count: number; avatars: GridParticipant[]};

export interface FullTile {
  type: 'full';
  participant: GridParticipant;
}

export interface FractionalContainerTile {
  type: 'fractional';
  fractionalTiles: FractionalTileDescriptor[];
  fillDirection: FractionalFillDirection;
  align: FractionalAlign;
}

export interface OverflowBadgeTile {
  type: 'overflow';
  count: number;
  avatars: GridParticipant[];
}

export type TileDescriptor = FullTile | FractionalContainerTile | OverflowBadgeTile;

/** Capacity bounds derived from container size alone — independent of who is in the call. */
export interface LayoutInvariants {
  maxRows: number;
  maxCols: number;
  maxTiles: number;
  maxFractionalTilesPerContainer: number;
}

export interface GridModeLayout extends LayoutInvariants {
  mode: 'grid';
  /** Full tiles in priority order, then the fractional container if one exists. */
  tiles: TileDescriptor[];
  tileWidth: number;
  tileHeight: number;
  tileAspectRatio: number;
  /** A single fractional cell. Invariant for a given `tileHeight`. Null with no container. */
  fractionalTileWidth: number | null;
  fractionalTileHeight: number | null;
  fractionalTileAspectRatio: number | null;
  /** The container's own box, which may exceed its content. Null with no container. */
  fractionalContainerWidth: number | null;
  fractionalContainerHeight: number | null;
}

export interface PresenterModeLayout extends LayoutInvariants {
  mode: 'presenter';
  /** Rendered flex-filled, so it carries no explicit size. */
  spotlight: TileDescriptor | null;
  strip: TileDescriptor[];
  stripTileWidth: number;
  stripTileHeight: number;
}

/** Two-person call: the other participant fills the stage, self overlays as a thumbnail. */
export interface OneOnOneLayout extends LayoutInvariants {
  mode: 'one-on-one';
  main: TileDescriptor;
  pip: GridParticipant;
}

export type GridLayout = GridModeLayout | PresenterModeLayout | OneOnOneLayout;

// ── Seat assignment ──────────────────────────────────────────────────────────

export type TileKind = 'full' | 'fractional' | 'overflow';

export interface TileAssignment {
  kind: TileKind;
  seatIndex: number;
}

/** participantId → the seat they currently occupy. Drives sticky assignment. */
export type AssignmentMap = Record<string, TileAssignment>;

/** participantId → stable render order (lower renders earlier). */
export type SlotMap = Record<string, number>;

export interface ContainerSize {
  width: number;
  height: number;
}

// ── Reducer state & actions ──────────────────────────────────────────────────

export interface GridState {
  participants: GridParticipant[];
  containerSize: ContainerSize;
  slotMap: SlotMap;
  assignmentMap: AssignmentMap;
  isPresenterModeActive: boolean;
  /**
   * `isPresenterModeActive` as it was before screen sharing began, restored once the last
   * share ends. Null while nobody is sharing. Lets a manual setting survive a share session
   * even though the user may also toggle presenter mode mid-share.
   */
  presenterModeBeforeScreenShare: boolean | null;
  areAllParticipantsShown: boolean;
  layout: GridLayout;
}

export type GridAction =
  | {type: 'ADD_PARTICIPANT'; participant: GridParticipant; now?: number}
  | {type: 'REMOVE_PARTICIPANT'; id: string}
  | {type: 'UPDATE_PARTICIPANT'; id: string; changes: Partial<GridParticipant>; now?: number}
  | {type: 'SET_CONTAINER_SIZE'; width: number; height: number}
  | {type: 'TOGGLE_PRESENTER_MODE'}
  | {type: 'TOGGLE_ALL_PARTICIPANTS'};

export interface GridConfig {
  minTileHeight: number;
  maxTileHeight: number;
  minAspectRatio: number;
  maxAspectRatio: number;
  /** Gap in px between tiles, and between fractional cells. */
  tileGap: number;
  /** Defaults to `minAspectRatio` / `maxAspectRatio` when omitted. */
  minFractionalTileAspectRatio?: number;
  maxFractionalTileAspectRatio?: number;
}
