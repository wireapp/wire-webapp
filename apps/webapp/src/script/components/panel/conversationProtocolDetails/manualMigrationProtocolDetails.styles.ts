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

export const migrationButtonStyles: CSSObject = {
  flex: '1 1 0',
  minWidth: 0,
  marginBottom: 0,
  borderRadius: 16,
  fontSize: 16,
  fontWeight: 600,
  lineHeight: '24px',
  letterSpacing: '0.05px',
};

export const modalWrapperStyles: CSSObject = {
  width: 412,
  maxWidth: 'calc(100vw - 32px)',
  boxSizing: 'border-box',
  padding: 24,
  borderRadius: 10,
  alignItems: 'flex-start',
  gap: 24,
  backgroundColor: 'var(--Backgrounds-Surface, var(--modal-bg))',
  color: 'var(--main-color)',
};

export const modalContentStyles: CSSObject = {alignSelf: 'stretch', display: 'flex', flexDirection: 'column', gap: 16};

export const modalTitleStyles: CSSObject = {
  margin: 0,
  textAlign: 'center',
  fontSize: 20,
  fontWeight: 600,
  lineHeight: '24px',
  overflowWrap: 'break-word',
};

export const modalDescriptionStyles: CSSObject = {
  margin: 0,
  fontSize: 16,
  fontWeight: 400,
  lineHeight: '24px',
  letterSpacing: '0.05px',
  overflowWrap: 'break-word',
};

export const modalActionsStyles: CSSObject = {alignSelf: 'stretch', display: 'flex', gap: 12};
