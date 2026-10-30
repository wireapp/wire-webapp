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

export const bannerStyle = (tone: 'danger' | 'info'): CSSObject => ({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  width: '100%',
  maxWidth: 'var(--preferences-width)',
  marginBottom: 16,
  padding: '12px 16px',
  borderRadius: 12,
  border: `1px solid ${tone === 'danger' ? 'var(--danger-color)' : 'var(--accent-color)'}`,
  background: tone === 'danger' ? 'var(--app-bg-secondary)' : 'var(--accent-color-50)',
  color: 'var(--main-color)',
  fontSize: 'var(--font-size-small)',
  lineHeight: 'var(--line-height-sm)',

  svg: {
    flexShrink: 0,
    fill: tone === 'danger' ? 'var(--danger-color)' : 'var(--accent-color)',
  },
});

export const bannerTextStyle: CSSObject = {
  flex: 1,
  margin: 0,
};

export const bannerActionStyle: CSSObject = {
  padding: 0,
  border: 'none',
  background: 'transparent',
  color: 'inherit',
  cursor: 'pointer',
  font: 'inherit',
  fontWeight: 'var(--font-weight-semibold)',
  textDecoration: 'underline',
};

export const statusRowStyle: CSSObject = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 16,
  width: '100%',
};

export const statusIconStyle = (isActive: boolean): CSSObject => ({
  display: 'flex',
  flexShrink: 0,
  alignItems: 'center',
  justifyContent: 'center',
  width: 40,
  height: 40,
  borderRadius: 12,
  background: isActive ? 'var(--accent-color-50)' : 'var(--app-bg-secondary)',

  svg: {
    fill: isActive ? 'var(--accent-color)' : 'var(--gray-70)',
  },
});

export const statusTextStyle: CSSObject = {
  flex: 1,
  minWidth: 0,
};

export const statusTitleStyle: CSSObject = {
  margin: 0,
  color: 'var(--main-color)',
  fontSize: 'var(--font-size-medium)',
  fontWeight: 'var(--font-weight-semibold)',
  lineHeight: 'var(--line-height-md)',
};

export const statusLineStyle: CSSObject = {
  margin: 0,
  color: 'var(--gray-70)',
  fontSize: 'var(--font-size-small)',
  lineHeight: 'var(--line-height-sm)',
};

export const summaryStyle: CSSObject = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 16,
  width: '100%',
  marginTop: 20,
};

export const labelStyle: CSSObject = {
  margin: 0,
  color: 'var(--gray-70)',
  fontSize: 'var(--font-size-small)',
  fontWeight: 'var(--font-weight-semibold)',
  lineHeight: 'var(--line-height-sm)',
};

export const valueStyle: CSSObject = {
  margin: 0,
  color: 'var(--main-color)',
  fontSize: 'var(--font-size-medium)',
  lineHeight: 'var(--line-height-md)',
  wordBreak: 'break-all',
};

export const progressStyle: CSSObject = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  width: '100%',
  marginTop: 20,
};

export const progressLabelStyle: CSSObject = {
  display: 'flex',
  justifyContent: 'space-between',
  color: 'var(--main-color)',
  fontSize: 'var(--font-size-small)',
  fontWeight: 'var(--font-weight-semibold)',
};

export const progressPercentStyle: CSSObject = {
  color: 'var(--gray-70)',
  fontVariantNumeric: 'tabular-nums',
};

export const progressTrackStyle: CSSObject = {
  height: 4,
  borderRadius: 999,
  background: 'var(--app-bg-secondary)',
  overflow: 'hidden',
};

export const progressBarStyle = (progress: number): CSSObject => ({
  width: `${progress}%`,
  height: '100%',
  borderRadius: 999,
  background: 'var(--accent-color)',
  transition: 'width 0.2s ease',
});

export const actionsStyle: CSSObject = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
  marginTop: 20,

  button: {
    marginBottom: 0,
  },
};

export const adminChipStyle: CSSObject = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  marginBottom: 16,
  padding: '2px 8px',
  borderRadius: 999,
  background: 'var(--app-bg-secondary)',
  color: 'var(--gray-70)',
  fontSize: 'var(--font-size-xsmall)',
  fontWeight: 'var(--font-weight-semibold)',

  svg: {
    width: 12,
    height: 12,
    fill: 'currentColor',
  },
};

export const rowStyle: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  width: '100%',

  button: {
    flexShrink: 0,
    marginBottom: 0,
  },
};

export const keyRowStyle: CSSObject = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 12,
  width: '100%',

  svg: {
    flexShrink: 0,
    marginTop: 4,
    fill: 'var(--success-color)',
  },
};

export const growStyle: CSSObject = {
  flex: 1,
  minWidth: 0,
};
