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

import {media} from '../../../uiKit/utils/mediaQueries';
import {videoOptionsMenuStyles} from '../../calling/VideoControls/VideoControls.styles';

// Full page: the green room covers the app, so nothing behind it competes with the preview.
export const meetingPrepSurfaceStyles: CSSObject = {
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  height: '100%',
  minHeight: 0,
  backgroundColor: 'var(--modal-bg)',
  overflow: 'hidden',
};

export const meetingPrepHeaderStyles: CSSObject = {
  display: 'flex',
  justifyContent: 'flex-end',
  flexShrink: 0,
  minHeight: 56,
  padding: '10px 16px',
};

export const meetingPrepCloseButtonStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 36,
  height: 36,
  padding: 0,
  border: 'none',
  borderRadius: 8,
  background: 'transparent',
  cursor: 'pointer',
  color: 'var(--text-color)',

  '&:hover': {
    backgroundColor: 'var(--foreground-fade-8)',
  },
};

export const meetingPrepBodyStyles: CSSObject = {
  display: 'grid',
  flex: '1 1 auto',
  placeItems: 'center',
  minHeight: 0,
  overflowY: 'auto',
  padding: '0 24px 32px',

  [media.desktop]: {
    padding: '0 48px 40px',
  },
};

// One column on narrow windows, the preview beside the panel from desktop width.
export const meetingPrepGridStyles: CSSObject = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr)',
  gap: 32,
  alignItems: 'center',
  width: '100%',
  maxWidth: 1152,

  [media.desktop]: {
    gridTemplateColumns: 'minmax(0, 704px) minmax(320px, 400px)',
    gap: 48,
  },
};

export const meetingPrepSelfViewStyles: CSSObject = {
  position: 'relative',
  width: '100%',
  aspectRatio: '16 / 10',
  borderRadius: '8px',
  overflow: 'hidden',
  backgroundColor: 'var(--app-bg-secondary)',
};

export const meetingPrepVideoStyles: CSSObject = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  transform: 'scaleX(-1)',
};

/** The call menu is reused here, with right-edge anchoring for the narrower prep card. */
export const meetingPrepDeviceMenuStyles: CSSObject = {
  ...videoOptionsMenuStyles,
  right: 0,
  left: 'auto',
  transform: 'none',
  width: 'min(320px, calc(100vw - 32px))',
  maxWidth: 'calc(100vw - 32px)',
  '@media (max-height: 500px)': {
    '& [role="listbox"]': {
      maxHeight: 170,
      overflowY: 'auto',
    },
  },
};

export const meetingPrepAvatarStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  height: '100%',
};

export const meetingPrepNoCameraStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  height: '100%',
  color: 'var(--white)',
  backgroundColor: 'var(--black)',
};

export const meetingPrepNameStyles: CSSObject = {
  position: 'absolute',
  left: '50%',
  bottom: '8px',
  zIndex: 1,
  transform: 'translateX(-50%)',
  maxWidth: 'calc(100% - 16px)',
  margin: 0,
  padding: '2px 6px',
  borderRadius: '2px',
  backgroundColor: 'var(--black)',
  color: 'var(--white)',
  fontSize: '12px',
  lineHeight: '14px',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

export const meetingPrepMeterRowStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  minHeight: 36,
  marginTop: 16,
};

export const meetingPrepMeterStyles: CSSObject = {
  width: 'auto',
  '.input-level': {
    justifyContent: 'flex-start',
    gap: '3px',
  },
  '.input-level__bullet, .input-level__bullet--disabled': {
    width: '8px',
    height: '8px',
    minWidth: '8px',
    flex: '0 0 8px',
    borderRadius: '4px',
    backgroundColor: '#ececec',
    borderColor: '#d7d7d7',
  },
  '.input-level__bullet--active': {
    backgroundColor: '#1f9d55',
    borderColor: 'transparent',
  },
  '.input-level__bullet--active:nth-child(n + 17)': {
    backgroundColor: '#e5484d',
  },
};

export const meetingPrepControlsStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  flexShrink: 0,
};

export const meetingPrepControlStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  position: 'relative',
  height: '36px',
  padding: '0 2px 0 6px',
  borderRadius: '18px',
  backgroundColor: 'var(--black)',
};

export const meetingPrepToggleStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '32px',
  height: '32px',
  padding: 0,
  border: 'none',
  borderRadius: '16px',
  cursor: 'pointer',
  backgroundColor: 'transparent',
  'svg, svg > path, svg > g > path': {
    fill: 'var(--white)',
  },
};

export const meetingPrepMenuButtonStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '22px',
  height: '32px',
  padding: 0,
  border: 'none',
  borderRadius: '8px',
  background: 'transparent',
  cursor: 'pointer',
  color: 'var(--white)',
  'svg, svg > path, svg > g > path': {
    fill: 'var(--white)',
  },
};
