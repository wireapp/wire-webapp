import {CSSObject} from '@emotion/react';

import {avatarGradient, colors} from './tokens';

const AVATAR_SIZE = 30;
const AVATAR_OVERLAP_STEP = 18;

export const overflowButton: CSSObject = {
  all: 'unset',
  alignItems: 'center',
  backgroundColor: colors.tileBackground,
  borderRadius: 4,
  boxSizing: 'border-box',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  height: '100%',
  justifyContent: 'center',
  transition: 'background 0.15s ease',
  width: '100%',
  '&:hover': {
    backgroundColor: colors.tileBackgroundHover,
  },
};

export const avatarStack = (avatarCount: number): CSSObject => ({
  height: AVATAR_SIZE,
  position: 'relative',
  width: Math.max(0, avatarCount - 1) * AVATAR_OVERLAP_STEP + AVATAR_SIZE,
});

export const stackedAvatar = (index: number, hue: number): CSSObject => ({
  alignItems: 'center',
  background: avatarGradient(hue),
  border: `2px solid ${colors.tileBackground}`,
  borderRadius: '50%',
  color: colors.label,
  display: 'flex',
  fontSize: 10,
  fontWeight: 700,
  height: AVATAR_SIZE,
  justifyContent: 'center',
  left: index * AVATAR_OVERLAP_STEP,
  overflow: 'hidden',
  position: 'absolute',
  width: AVATAR_SIZE,
});

export const stackedAvatarImage: CSSObject = {
  display: 'block',
  height: '100%',
  objectFit: 'cover',
  width: '100%',
};

export const overflowLabel: CSSObject = {
  color: colors.label,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: 0.3,
};
