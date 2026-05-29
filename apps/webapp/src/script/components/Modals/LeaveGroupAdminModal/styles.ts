/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import type {CSSProperties} from 'react';

import type {CSSObject} from '@emotion/react';

export const modalBodyStyles: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  padding: '16px 24px 24px',
};

export const modalHeaderStyles: CSSProperties = {
  padding: '24px 24px 0',
  position: 'relative',
};

export const modalTitleStyles: CSSProperties = {
  flex: 1,
  fontSize: '20px',
  fontWeight: 600,
  textAlign: 'center',
};

export const modalCloseButtonStyles: CSSProperties = {
  background: 'none',
  border: 'none',
  borderRadius: '12px',
  cursor: 'pointer',
  height: '32px',
  padding: '8px 12px',
  position: 'absolute',
  right: '8px',
  top: '8px',
  width: '40px',
};

export const messageStyles: CSSProperties = {
  fontSize: '16px',
  lineHeight: '24px',
  margin: 0,
};

export const actionGroupStyles: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

export const buttonStyles: CSSProperties = {
  borderRadius: '16px',
  height: '48px',
  width: '100%',
  marginBottom: '0px',
};

export const selectWrapperStyles: CSSObject = {
  marginBottom: '8px',
};

export const selectMenuPortalStyles: CSSObject = {
  zIndex: 100000000,
};

export const searchSectionStyles: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
  position: 'relative',
};

export const newAdminLabelStyles: CSSProperties = {
  color: 'var(--accent-color)',
  fontSize: '14px',
  lineHeight: '16px',
};

export const optionRowStyles: CSSProperties = {
  alignItems: 'center',
  display: 'flex',
  gap: '8px',
};

export const optionAvatarStyles: CSSObject = {
  marginRight: '8px',
};

export const optionTextColumnStyles: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
  overflow: 'hidden',
};

export const userNameStyles: CSSProperties = {
  fontSize: '14px',
  fontWeight: 500,
  lineHeight: '20px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

export const userHandleStyles: CSSProperties = {
  fontSize: '12px',
  lineHeight: '14px',
};

export const clearContentRowStyles: CSSProperties = {
  alignItems: 'center',
  display: 'flex',
  gap: '8px',
  marginTop: '8px',
};

export const checkboxStyles: CSSProperties = {
  accentColor: 'var(--accent-color)',
  flexShrink: 0,
  height: '18px',
  width: '18px',
};

export const clearContentLabelStyles: CSSProperties = {
  cursor: 'pointer',
  fontSize: '16px',
};
