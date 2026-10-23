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

import {videoOptionsMenuStyles} from 'Components/calling/VideoControls/VideoControls.styles';

export const meetingPrepSurfaceStyles: CSSObject = {
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  maxHeight: 'calc(90vh - 2rem)',
  minHeight: 0,
  backgroundColor: 'var(--modal-bg)',
  borderRadius: '12px',
  overflow: 'hidden',
};

export const meetingPrepHeaderStyles: CSSObject = {
  display: 'grid',
  gridTemplateColumns: '40px 1fr 40px',
  alignItems: 'center',
  minHeight: '64px',
  padding: '12px 16px',
};

export const meetingPrepHeaderTextStyles: CSSObject = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '2px',
  minWidth: 0,
};

export const meetingPrepTitleStyles: CSSObject = {
  margin: 0,
  fontSize: 'var(--font-size-large)',
  fontWeight: 'var(--font-weight-semibold)',
  textAlign: 'center',
};

export const meetingPrepTimeStyles: CSSObject = {
  margin: 0,
  color: 'var(--text-input-placeholder)',
  fontSize: 'var(--font-size-small)',
  textAlign: 'center',
};

export const meetingPrepCloseButtonStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  color: 'var(--text-color)',
};

export const meetingPrepBodyStyles: CSSObject = {
  display: 'flex',
  flexDirection: 'column',
  flex: '1 1 auto',
  gap: '16px',
  minHeight: 0,
  overflowY: 'auto',
  padding: '0 24px 8px',
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

export const meetingPrepFooterStyles: CSSObject = {
  display: 'flex',
  gap: '12px',
  padding: '16px 24px 24px',
  button: {
    flex: 1,
    minHeight: '44px',
    borderRadius: '8px',
  },
  'button:last-of-type': {
    color: 'var(--white)',
  },
};
