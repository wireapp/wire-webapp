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

import {CSSObject} from '@emotion/react';

export const headerStyles: CSSObject = {
  display: 'grid',
  gridTemplateColumns: '1fr auto 1fr',
  gridTemplateAreas: '"_ center close"',
  alignItems: 'center',
  columnGap: '4px',
  padding: '16px 16px 0 16px',
  backgroundColor: 'var(--modal-bg)',
  color: 'var(--main-color)',
  fill: 'var(--main-color)',
  textAlign: 'center',
  whiteSpace: 'pre-line',
};

export const titleStyles: CSSObject = {
  gridArea: 'center',
  margin: '0',
  fontSize: 'var(--font-size-large)',
  fontWeight: 'var(--font-weight-semibold)',
  pointerEvents: 'none',
};

export const closeButtonStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '40px',
  width: '40px',
  gridArea: 'close',
  justifySelf: 'end',
  cursor: 'pointer',
  padding: '0',
  border: '0',
  borderRadius: '0',
  backgroundColor: 'transparent',
};

export const formStyles: CSSObject = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  padding: '24px',
};

export const buttonGroupStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: '16px',
};

export const buttonStyles: CSSObject = {
  width: '100%',
  marginBottom: '0',
};
