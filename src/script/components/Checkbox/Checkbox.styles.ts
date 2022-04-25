import {CSSObject} from '@emotion/core';

export const getLabelCSS = (disabled?: boolean): CSSObject => ({
  '&:hover': {
    cursor: !disabled && 'pointer',
  },
  '&:hover svg': {
    borderColor: !disabled && 'var(--accent-color-500)',
  },
  alignItems: 'center',
  display: 'flex',
  fontSize: '',
});

export const getInputCSS = (isChecked: boolean, disabled?: boolean): CSSObject => ({
  '&:active + svg': {
    borderColor: !disabled && 'var(--accent-color-500)',
  },
  '&:focus + svg, &:focus-visible + svg': {
    backgroundColor: isChecked && 'var(--accent-color-600)',
    borderColor: 'var(--accent-color-600)',
    outline: '1px solid var(--accent-color-700)',
  },
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  whiteSpace: 'nowrap',
  width: 1,
});

export const getSvgCSS = (isChecked: boolean, disabled?: boolean): CSSObject => ({
  background: 'var(--checkbox-background)',
  border: '1.5px var(--checkbox-border) solid',
  borderRadius: 3,

  // set to `inline-block` as `inline elements ignore `height` and `width`
  display: 'inline-block',
  height: 20,
  marginRight: 8,
  width: 20,
  ...(isChecked && {
    background: 'var(--accent-color-500)',
    borderColor: 'var(--accent-color-500)',
  }),
  ...(disabled && {
    background: isChecked ? 'var(--checkbox-background-disabled-selected)' : 'var(--checkbox-background-disabled)',
    borderColor: 'var(--checkbox-border-disabled)',
    pointerEvents: 'none',
  }),
});
