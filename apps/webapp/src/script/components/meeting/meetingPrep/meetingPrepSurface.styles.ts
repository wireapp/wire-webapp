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

export const meetingPrepSurfaceStyles: CSSObject = {
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  maxWidth: '420px',
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
  gap: '16px',
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

export const meetingPrepNameStyles: CSSObject = {
  position: 'absolute',
  left: '12px',
  bottom: '12px',
  color: 'var(--app-bg)',
  backgroundColor: 'var(--text-color)',
  borderRadius: '4px',
  padding: '2px 8px',
  fontSize: 'var(--font-size-small)',
};

export const meetingPrepControlsStyles: CSSObject = {
  display: 'flex',
  justifyContent: 'center',
  gap: '16px',
};

export const meetingPrepControlStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  position: 'relative',
};

export const meetingPrepToggleStyles = (enabled: boolean): CSSObject => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '40px',
  height: '40px',
  border: 'none',
  borderRadius: '12px',
  cursor: 'pointer',
  color: enabled ? 'var(--app-bg)' : 'var(--text-color)',
  backgroundColor: enabled ? 'var(--accent-color)' : 'var(--app-bg-secondary)',
});

export const meetingPrepMenuButtonStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '28px',
  height: '40px',
  padding: 0,
  border: 'none',
  borderRadius: '8px',
  background: 'transparent',
  cursor: 'pointer',
  color: 'var(--text-color)',
};

export const meetingPrepMenuStyles: CSSObject = {
  position: 'absolute',
  top: '44px',
  left: 0,
  zIndex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  minWidth: '220px',
  padding: '8px',
  borderRadius: '8px',
  backgroundColor: 'var(--modal-bg)',
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.16)',
};

export const meetingPrepMenuLabelStyles: CSSObject = {
  margin: 0,
  fontSize: 'var(--font-size-xsmall, 12px)',
  fontWeight: 'var(--font-weight-semibold)',
};

export const meetingPrepDeviceButtonStyles = (selected: boolean): CSSObject => ({
  display: 'block',
  width: '100%',
  padding: '8px',
  border: 'none',
  borderRadius: '6px',
  textAlign: 'left',
  cursor: 'pointer',
  color: 'var(--text-color)',
  backgroundColor: selected ? 'var(--app-bg-secondary)' : 'transparent',
});

export const meetingPrepFooterStyles: CSSObject = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '12px',
  padding: '16px 24px 24px',
};
