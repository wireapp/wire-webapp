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
 * One cell inside a `FractionalTileContainer`. The last one may show the overflow badge
 * instead of a participant.
 */
export type FractionalTileDescriptor =
  | {type: 'participant'; participant: GridParticipant}
  | {type: 'overflow'; count: number; avatars: GridParticipant[]};

/**
 * One grid slot. Either holds a single participant (full), is a container subdivided into
 * several participants' worth of fractional tiles, or summarises the participants that did
 * not fit (overflow — used by the presenter-mode strip).
 */
export type TileDescriptor =
  | {type: 'full'; participant: GridParticipant}
  | {
      type: 'fractional';
      fractionalTiles: FractionalTileDescriptor[];
      /**
       * `'column'` fills the first column top-to-bottom before starting the next (used
       * whenever the container shares a row with full tiles, tucked beside them). `'row'`
       * fills left-to-right before wrapping, same as the main grid (used when the container
       * has a row entirely to itself).
       */
      fillDirection: 'row' | 'column';
      /**
       * `'center'` centers each line (so an under-filled last column/row sits centered
       * within the container); `'start'` top/left-aligns instead — used when the container
       * shares the last row of a multi-row grid, to read consistently with the full tiles
       * flowing top-to-bottom, left-to-right above it.
       */
      align: 'center' | 'start';
    }
  | {type: 'overflow'; count: number; avatars: GridParticipant[]};

/** Capacity bounds derived from container size alone — independent of participants. */
export interface LayoutInvariants {
  /** Maximum rows/columns of full tiles the container can hold at minimum tile size. */
  maxRows: number;
  maxCols: number;
  /** maxRows × maxCols — the ceiling on how many tiles may be rendered. */
  maxTiles: number;
  /** How many fractional tiles the container can hold at the full container width. */
  maxFractionalTilesPerContainer: number;
}

export interface GridModeLayout extends LayoutInvariants {
  mode: 'grid';
  /**
   * Every tile in this layout — full tiles in priority order, followed by the fractional
   * tile container, if any. Rendered as flex items in a single flex-wrap container; the
   * browser decides the actual row breaks, since only each tile's own fixed box size is
   * computed here (see `fractionalContainerWidth`/`Height` for that box), not row/column
   * layout.
   */
  tiles: TileDescriptor[];
  /** Full tile pixel dimensions — shared by every full tile in the grid. */
  tileWidth: number;
  tileHeight: number;
  tileAspectRatio: number;
  /**
   * Single fractional-tile cell's fixed pixel dimensions — null when no container exists.
   * Invariant for a given `tileHeight`: computed once from viewport/full-tile geometry via
   * exact division (so a full column still reaches exactly `tileHeight` with no leftover
   * gap), and never varies based on how many participants are currently visible.
   */
  fractionalTileWidth: number | null;
  fractionalTileHeight: number | null;
  fractionalTileAspectRatio: number | null;
  /**
   * The fractional tile container's own box. Height is `tileHeight` exactly whenever it
   * shares a row with full tiles (it must align with them) or whenever its content fills at
   * least one column; otherwise it hugs its (shorter) content. Width is `tileWidth` exactly
   * when squeezed to a single leftover slot next to full tiles; otherwise it hugs its
   * content. Null when no container exists.
   */
  fractionalContainerWidth: number | null;
  fractionalContainerHeight: number | null;
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

/** Two-person call: the other participant fills the stage, self overlays as a small PiP thumbnail. */
export interface OneOnOneLayout extends LayoutInvariants {
  mode: 'one-on-one';
  /** The non-self participant, full-bleed. */
  main: TileDescriptor;
  /** Self, rendered as a small overlay thumbnail. */
  pip: GridParticipant;
}

export type GridLayout = GridModeLayout | PresenterModeLayout | OneOnOneLayout;

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
  /**
   * Snapshot of `isPresenterModeActive` taken the moment screen sharing first appeared (from
   * zero sharers to one or more), restored once the last screen share ends. `null` whenever
   * nobody is currently screen-sharing, i.e. there is nothing to restore. This is what lets a
   * manually-chosen presenter mode setting survive a screen-share session unaffected, even
   * though the user is free to toggle presenter mode manually while sharing is in progress.
   */
  presenterModeBeforeScreenShare: boolean | null;
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
  /**
   * Aspect-ratio bounds for a single fractional tile inside the fractional tile container.
   * Defaults to `minAspectRatio`/`maxAspectRatio` when omitted.
   */
  minFractionalTileAspectRatio?: number;
  maxFractionalTileAspectRatio?: number;
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
