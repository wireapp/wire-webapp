/* eslint-disable sort-keys-fix/sort-keys-fix */
import {CSSObject} from '@emotion/core';

export const getIconCSS = (fill?: string): CSSObject => ({
  alignItems: 'center',
  bottom: 42,
  fill: fill,
  height: 16,
  margin: 0,
  padding: 0,
  position: 'absolute',
  right: 16,
  width: 16,
});

export const containerCSS: CSSObject = {
  display: 'flex',
  flexDirection: 'column-reverse',
  paddingBottom: 26,
  position: 'relative',
  width: '100%',
};

export const errorMessageCSS: CSSObject = {
  bottom: 4,
  color: 'var(--text-input-alert)',
  left: 0,
  lineHeight: '14px',
  position: 'absolute',
  textTransform: 'unset',
};

export const getInputCSS = (disabled?: boolean, borderColor?: string): CSSObject => ({
  '&::placeholder': {
    color: 'var(--text-input-placeholder)',
  },
  '&:hover': {
    borderColor: !disabled && 'var(--text-input-border-hover)',
  },
  '&:focus, &:active': {
    '& + label': {
      color: !disabled && 'var(--blue-500)',
    },
    borderColor: !disabled && 'var(--blue-500)',
  },
  ':-ms-input-placeholder': {
    // Internet Explorer 10-11
    color: 'var(--text-input-placeholder)',
  },
  '::-ms-input-placeholder': {
    // Microsoft Edge
    color: 'var(--text-input-placeholder)',
  },
  '::placeholder': {
    // Chrome, Firefox, Opera, Safari 10.1+
    color: 'var(--text-input-placeholder)',
    opacity: 1, // Firefox
  },
  background: disabled ? 'var(--text-input-disabled)' : 'var(--text-input-background)',
  border: '1px solid',
  borderColor: borderColor || 'var(--text-input-border)',
  borderRadius: 12,
  color: 'var(--text-input-color)',
  outline: 'none',
  padding: '12px 16px',
  width: '100%',
});

export const getLabelCSS = (color?: string): CSSObject => ({
  color: color || 'var(--text-input-label)',
  display: 'flex',
  flexDirection: 'column',
  marginBottom: 2,
});

export const cancelButtonCSS: CSSObject = {
  alignItems: 'center',
  background: 'var(--text-input-color)',
  border: 'none',
  borderRadius: '50%',
  bottom: 42,
  display: 'flex',
  height: 16,
  justifyContent: 'center',
  margin: 0,
  padding: 0,
  position: 'absolute',
  right: 16,
  width: 16,
};
