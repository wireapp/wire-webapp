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

import {CSSObject} from '@emotion/react';

export const modalWrapperStyle: CSSObject = {
  width: 480,
  maxWidth: 'calc(100vw - 32px)',
};

export const bodyStyle: CSSObject = {
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
};

export const subtitleStyle: CSSObject = {
  margin: 0,
  color: 'var(--gray-70)',
  fontSize: 'var(--font-size-small)',
  lineHeight: 'var(--line-height-sm)',
};

export const warningStyle: CSSObject = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 12,
  padding: '12px 16px',
  borderRadius: 12,
  border: '1px solid var(--amber-500)',
  background: 'var(--app-bg-secondary)',
  color: 'var(--main-color)',
  fontSize: 'var(--font-size-small)',
  lineHeight: 'var(--line-height-sm)',

  '& p': {
    margin: 0,
  },

  svg: {
    flexShrink: 0,
    marginTop: 2,
    fill: 'var(--amber-500)',
  },
};

export const optionsStyle: CSSObject = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

export const optionStyle = (isDone: boolean): CSSObject => ({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  width: '100%',
  padding: '12px 16px',
  borderRadius: 12,
  border: `1px solid ${isDone ? 'var(--success-color)' : 'var(--border-color)'}`,
  background: 'transparent',
  color: 'var(--main-color)',
  cursor: 'pointer',
  textAlign: 'left',

  '&:hover, &:focus-visible': {
    background: 'var(--app-bg-secondary)',
  },

  svg: {
    flexShrink: 0,
    width: 16,
    height: 16,
    fill: isDone ? 'var(--success-color)' : 'var(--main-color)',
  },
});

/** Kept in the DOM while hidden, so the 1Password extension can detect its button */
export const passwordManagerStyle = (isVisible: boolean): CSSObject => ({
  display: isVisible ? 'flex' : 'none',
  flexDirection: 'column',
  gap: 8,
});

export const optionTextStyle: CSSObject = {
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
};

export const optionTitleStyle: CSSObject = {
  fontSize: 'var(--font-size-small)',
  fontWeight: 'var(--font-weight-semibold)',
  lineHeight: 'var(--line-height-sm)',
};

export const optionSubStyle: CSSObject = {
  color: 'var(--gray-70)',
  fontSize: 'var(--font-size-xsmall)',
  lineHeight: 'var(--line-height-sm)',
};

export const errorStyle: CSSObject = {
  margin: 0,
  color: 'var(--danger-color)',
  fontSize: 'var(--font-size-xsmall)',
};
