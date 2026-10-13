import {CSSObject} from '@emotion/react';

import {FractionalFillDirection, FractionalAlign} from './FluidVideoGrid.types';

export const container = (
  fillDirection: FractionalFillDirection,
  align: FractionalAlign,
  width: number,
  height: number,
  gap: number,
): CSSObject => {
  const flexAlign = align === 'center' ? 'center' : 'flex-start';
  return {
    alignContent: flexAlign,
    display: 'flex',
    flexDirection: fillDirection,
    flexWrap: 'wrap',
    gap,
    height,
    justifyContent: flexAlign,
    width,
  };
};

export const cell = (width: number, height: number): CSSObject => ({
  flexShrink: 0,
  height,
  position: 'relative',
  width,
});
