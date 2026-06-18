import type {ReactNode} from 'react';

export type ParticipantTier =
  | 'screen-sharing' // 1 — shares screen
  | 'active-camera' // 2 — speaking + camera on
  | 'active-no-camera' // 3 — speaking + camera off
  | 'passive-camera' // 4 — silent + camera on
  | 'passive-no-camera'; // 5 — silent + camera off

export interface GridParticipant {
  id: string;
  name: string;
  avatarUrl?: string;
  hue?: number;
  renderVideo?: () => ReactNode;
  tier: ParticipantTier;
  isMuted: boolean;
  speakingDuration: number;
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
  | {type: 'ADD_PARTICIPANT'; participant: GridParticipant}
  | {type: 'REMOVE_PARTICIPANT'; id: string}
  | {type: 'UPDATE_PARTICIPANT'; id: string; changes: Partial<GridParticipant>}
  | {type: 'SET_CONTAINER_SIZE'; width: number; height: number};

export interface GridConfig {
  minTileHeight: number;
  maxTileHeight: number;
  minAspectRatio: number;
  maxAspectRatio: number;
  /** Maximum sub-rows inside the fractional tile */
  maxSubRows: number;
  /** Maximum sub-cols inside the fractional tile */
  maxSubCols: number;
  /** Gap in px between tiles and between subtiles */
  tileGap: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export const ACTIVE_TIERS: ReadonlySet<ParticipantTier> = new Set([
  'screen-sharing',
  'active-camera',
  'active-no-camera',
]);

export const TIER_ORDER: ParticipantTier[] = [
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
  isSharingScreen: boolean;
  isSpeaking: boolean;
  hasCamera: boolean;
}): ParticipantTier {
  if (p.isSharingScreen) return 'screen-sharing';
  if (p.isSpeaking && p.hasCamera) return 'active-camera';
  if (p.isSpeaking) return 'active-no-camera';
  if (p.hasCamera) return 'passive-camera';
  return 'passive-no-camera';
}
