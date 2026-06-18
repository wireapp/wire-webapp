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
  /** Render prop for video content; absent means show avatar */
  renderVideo?: () => ReactNode;
  tier: ParticipantTier;
  isMuted: boolean;
  /** Accumulated speaking time in seconds; used for stable-slot eviction priority */
  speakingDuration: number;
}

// ── Layout types ────────────────────────────────────────────────────────────

export interface SubtileEntry {
  type: 'participant' | 'overflow';
  participant?: GridParticipant;
  overflowCount?: number;
  overflowAvatars?: GridParticipant[];
}

export interface LayoutCell {
  type: 'active' | 'fractional';
  participant?: GridParticipant;
  subtiles?: SubtileEntry[];
}

export interface LayoutResult {
  cols: number;
  rows: number;
  tileWidth: number;
  tileHeight: number;
  cells: LayoutCell[];
}

// ── Reducer state & actions ──────────────────────────────────────────────────

export interface GridState {
  participants: GridParticipant[];
  containerSize: {width: number; height: number};
  /** participantId → stable slot index (lower = rendered earlier) */
  slotMap: Record<string, number>;
  layout: LayoutResult;
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
  maxSubtilesPerTile: number;
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
