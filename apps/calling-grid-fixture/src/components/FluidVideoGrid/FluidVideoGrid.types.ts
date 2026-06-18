import type {ReactNode} from 'react';

export type ParticipantTier =
  | 'you'              // 0 — current user's own video
  | 'screen-sharing'   // 1 — shares screen
  | 'active-camera'    // 2 — speaking + camera on
  | 'active-no-camera' // 3 — speaking + camera off
  | 'passive-camera'   // 4 — silent + camera on
  | 'passive-no-camera'; // 5 — silent + camera off

export interface GridParticipant {
  id: string;
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

export type SubtileDescriptor =
  | {type: 'participant'; participant: GridParticipant}
  | {type: 'overflow'; count: number; avatars: GridParticipant[]};

export type TileDescriptor =
  | {type: 'full'; participant: GridParticipant}
  | {type: 'fractional'; subRows: number; subCols: number; subtiles: SubtileDescriptor[]};

export interface RowLayout {
  tiles: TileDescriptor[];
}

export interface GridLayout {
  /** Maximum tiles per row given container width and minTileHeight × minAspectRatio */
  maxRows: number;
  maxCols: number;
  /** Full tile pixel dimensions */
  tileWidth: number;
  tileHeight: number;
  tileAspectRatio: number;
  /** Subtile pixel dimensions — null when no fractional tile exists */
  subtileWidth: number | null;
  subtileHeight: number | null;
  subtileAspectRatio: number | null;
  /** Row-based layout: each row is a list of tile descriptors */
  rows: RowLayout[];
}

// ── Reducer state & actions ──────────────────────────────────────────────────

export interface GridState {
  participants: GridParticipant[];
  containerSize: {width: number; height: number};
  /** participantId → stable slot index (lower = rendered earlier) */
  slotMap: Record<string, number>;
  layout: GridLayout;
}

export type GridAction =
  | {type: 'ADD_PARTICIPANT'; participant: GridParticipant; now?: number}
  | {type: 'REMOVE_PARTICIPANT'; id: string}
  | {type: 'UPDATE_PARTICIPANT'; id: string; changes: Partial<GridParticipant>; now?: number}
  | {type: 'SET_CONTAINER_SIZE'; width: number; height: number};

export interface GridConfig {
  minTileHeight: number;
  maxTileHeight: number;
  minAspectRatio: number;
  maxAspectRatio: number;
  /** Gap in px between tiles and between subtiles */
  tileGap: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export const ACTIVE_TIERS: ReadonlySet<ParticipantTier> = new Set([
  'you',
  'screen-sharing',
  'active-camera',
  'active-no-camera',
]);

export const TIER_ORDER: ParticipantTier[] = [
  'you',
  'screen-sharing',
  'active-camera',
  'active-no-camera',
  'passive-camera',
  'passive-no-camera',
];

export function isActiveTier(tier: ParticipantTier): boolean {
  return ACTIVE_TIERS.has(tier);
}

export function deriveParticipantTier(p: {
  isYou: boolean;
  isSharingScreen: boolean;
  isSpeaking: boolean;
  hasCamera: boolean;
}): ParticipantTier {
  if (p.isYou) return 'you';
  if (p.isSharingScreen) return 'screen-sharing';
  if (p.isSpeaking && p.hasCamera) return 'active-camera';
  if (p.isSpeaking) return 'active-no-camera';
  if (p.hasCamera) return 'passive-camera';
  return 'passive-no-camera';
}
