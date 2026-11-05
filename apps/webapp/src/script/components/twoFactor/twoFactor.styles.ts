/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

import type {CSSObject} from '@emotion/react';

const neutralSurface: CSSObject = {
  background: 'var(--gray-20, #edeff0)',
  color: 'var(--main-color, #17181a)',
  'body.theme-dark &': {
    background: 'var(--gray-90, #34373d)',
    color: 'var(--main-color, #fff)',
  },
};

export const twoFactorStyles: CSSObject = {
  width: '100%',
  color: 'var(--main-color, #17181a)',
  '.two-factor-dialog': {position: 'relative', padding: 24, boxSizing: 'border-box', width: '100%'},
  h2: {fontSize: 20, lineHeight: '26px', fontWeight: 600, margin: '14px 0', letterSpacing: '-0.01em'},
  p: {fontSize: 14, lineHeight: '20px', margin: '0 0 14px'},
  small: {fontSize: 12, lineHeight: '16px'},
  '.two-factor-hero': {
    width: 48,
    height: 48,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--accent-color-highlight, #e8f2ff)',
    color: 'var(--accent-color, #0672de)',
    svg: {width: 22, height: 22, fill: 'currentColor', path: {fill: 'currentColor'}},
  },
  '.two-factor-close': {position: 'absolute', top: 8, right: 8, margin: 0},
  '.two-factor-steps': {marginBottom: 14, color: 'var(--accent-color, #0672de)', fontSize: 12, fontWeight: 600},
  '.two-factor-progress': {
    display: 'flex',
    gap: 4,
    marginTop: 6,
    span: {height: 4, borderRadius: 2, flex: 1, background: 'var(--border-color, #dce0e4)'},
    '.complete': {background: 'var(--accent-color, #0672de)'},
  },
  '.two-factor-qr': {
    display: 'block',
    width: 164,
    height: 164,
    margin: '20px auto',
    background: '#fff',
    padding: 12,
    borderRadius: 12,
    boxSizing: 'border-box',
  },
  '.two-factor-manual-link': {display: 'block', width: 'fit-content', margin: '0 auto'},
  '.two-factor-key': {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    padding: '8px 12px',
    borderRadius: 12,
    background: 'var(--app-bg, #f3f4f5)',
    margin: '6px 0 14px',
    code: {overflowWrap: 'anywhere', fontSize: 14},
  },
  '.two-factor-copy-action, .two-factor-copy-feedback': {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    svg: {width: 16, height: 16},
  },
  '.two-factor-footer, .two-factor-actions': {
    display: 'flex',
    gap: 8,
    marginTop: 24,
    '> button': {flex: 1, minWidth: 0, margin: 0, whiteSpace: 'normal'},
  },
  '.two-factor-actions': {
    margin: '14px 0',
    button: {display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8},
  },
  '.two-factor-footer--stacked': {flexDirection: 'column'},
  '.two-factor-codes': {
    ...neutralSurface,
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '2px 12px',
    listStyle: 'none',
    padding: '10px 12px',
    margin: '14px 0',
    border: 'none',
    borderRadius: 12,
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: '20px',
    overflowWrap: 'anywhere',
  },
  '.two-factor-error': {color: 'var(--red-500, #c0392b)', marginTop: 14},
  '.two-factor-row': {
    width: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '12px 0',
    borderBottom: '1px solid var(--border-color, #dce0e4)',
    '> div': {display: 'flex', flexDirection: 'column', gap: 4},
    button: {flexShrink: 0, marginBottom: 0},
  },
  '.two-factor-status': {borderRadius: 4, padding: '2px 8px', fontSize: 12},
  '.two-factor-status--off': neutralSurface,
  '.two-factor-status--warning': {background: '#fff0c2', color: '#805a00', fontWeight: 600},
  '.two-factor-status--on': {background: '#e4f4e9', color: '#176c36'},
  '[role="group"] input': {width: 'min(48px, 10vw)', height: 52, '& + input': {marginLeft: 8}},
  '.two-factor-loading': {padding: '40px 0', textAlign: 'center'},
};

export const takeoverStyles: CSSObject = {
  ...twoFactorStyles,
  display: 'flex',
  minHeight: '100vh',
  fontFamily: 'inherit',
  h2: {
    fontFamily: 'inherit',
    fontSize: '1.5rem',
    fontWeight: 500,
    lineHeight: '2rem',
    margin: '1.5rem 0 2rem',
    letterSpacing: 'normal',
  },
  p: {fontFamily: 'inherit', fontSize: '1rem', fontWeight: 400, lineHeight: '1.5rem', margin: '0 0 1rem'},
  '.two-factor-main': {
    flex: 1,
    minWidth: 0,
    padding: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  '.two-factor-footer > .two-factor-text-button': {
    border: 'none',
    background: 'transparent',
    boxShadow: 'none',
    minHeight: 40,
    '&:hover': {background: 'var(--app-bg, #f3f4f5)'},
  },
  '.two-factor-content': {width: 352, maxWidth: '100%'},
  '.two-factor-dialog': {padding: 0},
};
