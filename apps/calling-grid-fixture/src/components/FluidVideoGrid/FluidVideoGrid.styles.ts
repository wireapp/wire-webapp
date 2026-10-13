import {CSSObject} from '@emotion/react';

import {colors} from './tokens';

const surface: CSSObject = {
  background: colors.gridBackground,
  boxSizing: 'border-box',
  display: 'flex',
  height: '100%',
  position: 'relative',
  width: '100%',
};

export const oneOnOneSurface: CSSObject = {...surface, padding: 0};

export const oneOnOneStage: CSSObject = {
  display: 'flex',
  inset: 0,
  position: 'absolute',
};

export const pictureInPicture: CSSObject = {
  aspectRatio: '4 / 3',
  bottom: 16,
  position: 'absolute',
  right: 16,
  width: '19%',
};

export const presenterSurface = (gap: number): CSSObject => ({
  ...surface,
  flexDirection: 'row',
  gap,
  padding: gap,
});

export const presenterStrip = (width: number, gap: number): CSSObject => ({
  display: 'flex',
  flexDirection: 'column',
  flexShrink: 0,
  gap,
  justifyContent: 'center',
  width,
});

export const gridSurface = (gap: number): CSSObject => ({
  ...surface,
  alignContent: 'center',
  flexWrap: 'wrap',
  gap,
  justifyContent: 'center',
  padding: gap,
});

/** Fills whatever space is left, rather than taking a computed size. */
export const flexFilledTile: CSSObject = {
  flex: '1 1 0%',
  minWidth: 0,
  overflow: 'hidden',
};

export const sizedTile = (width: number, height: number): CSSObject => ({
  flexShrink: 0,
  height,
  width,
});
