import {CSSObject} from '@emotion/react';

import {avatarGradient, colors} from './tokens';

export type TileSize = 'full' | 'fractional' | 'pip';

interface TileSizeTokens {
  borderRadius: number;
  avatarSize: number;
  avatarFontSize: number;
  activeSpeakerRingWidth: number;
  mutedBadgeSize: number;
  mutedIconSize: number;
  labelFontSize: number;
  labelLineHeight: number;
  labelPadding: string;
  labelMaxWidthInset: number;
  edgeOffset: number;
}

export const tileSizeTokens: Record<TileSize, TileSizeTokens> = {
  full: {
    borderRadius: 6,
    avatarSize: 84,
    avatarFontSize: 28,
    activeSpeakerRingWidth: 3,
    mutedBadgeSize: 22,
    mutedIconSize: 14,
    labelFontSize: 11,
    labelLineHeight: 12,
    labelPadding: '4px 6px',
    labelMaxWidthInset: 16,
    edgeOffset: 6,
  },
  fractional: {
    borderRadius: 4,
    avatarSize: 46,
    avatarFontSize: 15,
    activeSpeakerRingWidth: 3,
    mutedBadgeSize: 18,
    mutedIconSize: 11,
    labelFontSize: 10,
    labelLineHeight: 11,
    labelPadding: '3px 5px',
    labelMaxWidthInset: 8,
    edgeOffset: 4,
  },
  pip: {
    borderRadius: 8,
    avatarSize: 48,
    avatarFontSize: 16,
    activeSpeakerRingWidth: 2,
    mutedBadgeSize: 18,
    mutedIconSize: 11,
    labelFontSize: 10,
    labelLineHeight: 12,
    labelPadding: '3px 5px',
    labelMaxWidthInset: 16,
    edgeOffset: 4,
  },
};

export const tile = (size: TileSize): CSSObject => ({
  alignItems: 'center',
  backgroundColor: colors.tileBackground,
  borderRadius: tileSizeTokens[size].borderRadius,
  boxSizing: 'border-box',
  display: 'flex',
  height: '100%',
  justifyContent: 'center',
  overflow: 'hidden',
  position: 'relative',
  width: '100%',
  ...(size === 'pip' && {
    border: '1px solid rgba(255,255,255,.18)',
    boxShadow: '0 4px 16px rgba(0,0,0,.4)',
  }),
});

export const video: CSSObject = {
  display: 'block',
  height: '100%',
  inset: 0,
  objectFit: 'cover',
  position: 'absolute',
  width: '100%',
};

export const avatarImage = (size: TileSize): CSSObject => ({
  borderRadius: '50%',
  display: 'block',
  height: tileSizeTokens[size].avatarSize,
  objectFit: 'cover',
  width: tileSizeTokens[size].avatarSize,
});

export const avatarInitials = (size: TileSize, hue: number): CSSObject => ({
  alignItems: 'center',
  background: avatarGradient(hue),
  borderRadius: '50%',
  color: colors.label,
  display: 'flex',
  fontSize: tileSizeTokens[size].avatarFontSize,
  fontWeight: 700,
  height: tileSizeTokens[size].avatarSize,
  justifyContent: 'center',
  width: tileSizeTokens[size].avatarSize,
});

/**
 * Drawn above the video so the ring is never obscured by the participant's feed.
 */
export const activeSpeakerRing = (size: TileSize, isActivelySpeaking: boolean): CSSObject => ({
  borderRadius: tileSizeTokens[size].borderRadius,
  boxShadow: isActivelySpeaking
    ? `inset 0 0 0 ${tileSizeTokens[size].activeSpeakerRingWidth}px ${colors.activeSpeaker}`
    : 'none',
  inset: 0,
  pointerEvents: 'none',
  position: 'absolute',
  transition: 'box-shadow 0.3s ease',
});

export const mutedBadge = (size: TileSize): CSSObject => ({
  alignItems: 'center',
  background: colors.mutedBadgeBackground,
  borderRadius: 4,
  bottom: tileSizeTokens[size].edgeOffset,
  display: 'flex',
  height: tileSizeTokens[size].mutedBadgeSize,
  justifyContent: 'center',
  left: tileSizeTokens[size].edgeOffset,
  position: 'absolute',
  width: tileSizeTokens[size].mutedBadgeSize,
});

export const nameLabel = (size: TileSize, isActivelySpeaking: boolean): CSSObject => ({
  background: isActivelySpeaking ? colors.activeSpeaker : colors.labelBackground,
  borderRadius: 3,
  bottom: tileSizeTokens[size].edgeOffset,
  color: colors.label,
  fontSize: tileSizeTokens[size].labelFontSize,
  fontWeight: 500,
  left: '50%',
  letterSpacing: size === 'fractional' ? undefined : 0.4,
  lineHeight: `${tileSizeTokens[size].labelLineHeight}px`,
  maxWidth: `calc(100% - ${tileSizeTokens[size].labelMaxWidthInset}px)`,
  overflow: 'hidden',
  padding: tileSizeTokens[size].labelPadding,
  pointerEvents: 'none',
  position: 'absolute',
  textOverflow: 'ellipsis',
  transform: 'translateX(-50%)',
  transition: 'background 0.2s',
  whiteSpace: 'nowrap',
});
