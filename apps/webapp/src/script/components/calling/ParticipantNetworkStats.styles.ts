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

export const networkStatsButton: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 32,
  height: 32,
  padding: 0,
  border: '1px solid transparent',
  borderRadius: '50%',
  background: 'rgba(24, 26, 29, 0.48)',
  color: '#dce0e3',
  opacity: 0.65,
  cursor: 'pointer',
  transition: 'opacity 150ms ease, background 150ms ease',
  '&[data-hovered], &[data-pressed], &[aria-expanded="true"]': {opacity: 1, background: 'rgba(24, 26, 29, 0.8)'},
  '&[data-focus-visible]': {opacity: 1, outline: '2px solid var(--accent-color)', outlineOffset: 2},
};

export const networkStatsPopover: CSSObject = {
  width: 280,
  maxWidth: 'calc(100vw - 24px)',
  maxHeight: 'calc(100dvh - 32px)',
  overflowY: 'auto',
  background: 'var(--app-bg)',
  color: 'var(--main-color)',
  border: '1px solid var(--separator-color)',
  borderRadius: 14,
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.28)',
  zIndex: 100,
};

export const networkStatsDialog: CSSObject = {
  padding: 16,
  outline: 'none',
  fontSize: 13,
  header: {display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 14},
  'header strong': {
    display: 'block',
    maxWidth: 200,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  small: {display: 'block', color: 'var(--gray-60)', fontSize: 11, marginTop: 4},
  'header button': {
    border: 0,
    background: 'transparent',
    color: 'inherit',
    cursor: 'pointer',
    padding: 6,
    alignSelf: 'flex-start',
    borderRadius: 4,
  },
  '.quality': {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    padding: '10px 8px',
    background: 'var(--app-bg-secondary)',
    borderRadius: 8,
    marginBottom: 4,
  },
  '.quality strong': {display: 'flex', alignItems: 'center', gap: 6, fontSize: 12},
  '.quality i': {width: 7, height: 7, background: '#27883e', borderRadius: '50%'},
  section: {borderTop: '1px solid var(--separator-color)', paddingTop: 10, marginTop: 10},
  h3: {fontSize: 13, fontWeight: 600, margin: '0 0 5px'},
};

export const networkStatsRows: CSSObject = {
  margin: 0,
  '> div': {display: 'flex', justifyContent: 'space-between', gap: 12, padding: '5px 0'},
  dt: {color: 'var(--main-color)'},
  dd: {margin: 0, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap'},
};
