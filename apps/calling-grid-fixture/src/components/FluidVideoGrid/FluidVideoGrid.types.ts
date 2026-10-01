import type {ReactNode} from 'react';

export type ParticipantTier =
  | 'screen-sharing'   // 0 — shares screen
  | 'speaking-camera'    // 1 — speaking + camera on
  | 'speaking-no-camera' // 2 — speaking + camera off
  | 'silent-camera'   // 3 — silent + camera on
  | 'silent-no-camera'; // 4 — silent + camera off

export interface GridParticipant {
  id: string;
  /**
   * The local user. Identity only — it carries no seating privilege, so self is
   * laid out like anyone else and only earns a full tile by becoming active.
   */
  isSelf?: boolean;
  /** Raw name used for identity and fallback initials computation. */
  name: string;
  /** Label shown in the name pill. Falls back to name when absent. */
  displayName?: string;
  /** Avatar placeholder text. Falls back to initials derived from name when absent. */
  initials?: string;
  avatarUrl?: string;
  hue?: number;
  renderVideo?: () => ReactNode;
  tier: ParticipantTier;
  isMuted: boolean;
  speakingDuration: number;
  /** Timestamp (ms) when this participant last entered their current tier. Drives recency ordering within active tiers. */
  activatedAt?: number;
}

// ── Layout types ────────────────────────────────────────────────────────────

/**
 * One cell inside a fractional tile. A fractional tile is subdivided into
 * `fractionRows × fractionCols` fractions; the last one may show the overflow badge.
 */
export type FractionDescriptor =
  | {type: 'participant'; participant: GridParticipant}
  | {type: 'overflow'; count: number; avatars: GridParticipant[]};

/**
 * One grid slot. Either holds a single participant (full), is subdivided into
 * fractions holding several participants (fractional), or summarises the
 * participants that did not fit (overflow — used by the presenter-mode strip).
 */
export type TileDescriptor =
  | {type: 'full'; participant: GridParticipant}
  | {type: 'fractional'; fractionRows: number; fractionCols: number; fractions: FractionDescriptor[]}
  | {type: 'overflow'; count: number; avatars: GridParticipant[]};

export interface RowLayout {
  tiles: TileDescriptor[];
}

/** Capacity bounds derived from container size alone — independent of participants. */
export interface LayoutInvariants {
  /** Maximum rows/columns of full tiles the container can hold at minimum tile size. */
  maxRows: number;
  maxCols: number;
  /** maxRows × maxCols — the ceiling on how many tiles may be rendered. */
  maxTiles: number;
  /** How many fractions a single fractional tile can be subdivided into. */
  maxFractionsPerTile: number;
}

export interface GridModeLayout extends LayoutInvariants {
  mode: 'grid';
  /** Row-based layout: each row is a list of tile descriptors. */
  rows: RowLayout[];
  /** Full tile pixel dimensions — shared by every tile in the grid. */
  tileWidth: number;
  tileHeight: number;
  tileAspectRatio: number;
  /** Fraction pixel dimensions — null when no fractional tile exists. */
  fractionWidth: number | null;
  fractionHeight: number | null;
  fractionAspectRatio: number | null;
}

export interface PresenterModeLayout extends LayoutInvariants {
  mode: 'presenter';
  /** Spotlighted tile — rendered flex-filled, so it carries no explicit size. */
  spotlight: TileDescriptor | null;
  /** Fixed-width sidebar tiles beside the spotlight. */
  strip: TileDescriptor[];
  /** Strip tile pixel dimensions — shared by every tile in the strip. */
  stripTileWidth: number;
  stripTileHeight: number;
}

export type GridLayout = GridModeLayout | PresenterModeLayout;

// ── Tile assignment ──────────────────────────────────────────────────────────

/** Which kind of seat a participant currently occupies. */
export type TileKind = 'full' | 'fractional' | 'overflow';

export interface TileAssignment {
  kind: TileKind;
  /** Index into the flat seat list (full tiles first, then each fraction, then overflow). */
  seatIndex: number;
}

/** participantId → the seat they currently occupy. Drives sticky assignment. */
export type AssignmentMap = Record<string, TileAssignment>;

// ── Reducer state & actions ──────────────────────────────────────────────────

export interface GridState {
  participants: GridParticipant[];
  containerSize: {width: number; height: number};
  /** participantId → stable slot index (lower = rendered earlier) */
  slotMap: Record<string, number>;
  /** participantId → the seat they occupied on the previous layout pass */
  assignmentMap: AssignmentMap;
  /** True when the grid is showing a spotlight + strip instead of the tiled grid. */
  isPresenterModeActive: boolean;
  /** True when the full participants list is on screen. */
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
  /** Gap in px between tiles and between fractions */
  tileGap: number;
  /** Upper bound on the share of tiles that may be fractional (e.g. 1/3). */
  maxFractionalTilesRatio: number;
  /**
   * Experimental. When true, a passive (silent, camera-off) participant is never given
   * a full tile — always at least a 2-way fraction (4-way if 2 doesn't fit the aspect
   * bounds), even when there's room to spare or nobody in the call is active.
   */
  forcePassiveFractional?: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Tiers that earn a full tile. A participant is "active" whenever there is something
 * worth showing — a screen share, speech, or a live camera. Only someone who is both
 * silent and camera-off has nothing to render, so they are the only ones compressed
 * into fractions.
 */
export const ACTIVE_TIERS: ReadonlySet<ParticipantTier> = new Set([
  'screen-sharing',
  'speaking-camera',
  'speaking-no-camera',
  'silent-camera',
]);

export const TIER_ORDER: ParticipantTier[] = [
  'screen-sharing',
  'speaking-camera',
  'speaking-no-camera',
  'silent-camera',
  'silent-no-camera',
];

export function isActiveTier(tier: ParticipantTier): boolean {
  return ACTIVE_TIERS.has(tier);
}

/**
 * Self is deliberately not special-cased here: the local user is tiered on the same
 * speaking/camera evidence as everyone else, and only reaches a full tile by being active.
 */
export function deriveParticipantTier(p: {
  isSharingScreen: boolean;
  isSpeaking: boolean;
  hasCamera: boolean;
}): ParticipantTier {
  if (p.isSharingScreen) return 'screen-sharing';
  if (p.isSpeaking && p.hasCamera) return 'speaking-camera';
  if (p.isSpeaking) return 'speaking-no-camera';
  if (p.hasCamera) return 'silent-camera';
  return 'silent-no-camera';
}
