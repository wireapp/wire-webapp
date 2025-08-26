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

export const wrapperStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '8px',
  width: '100%',
  padding: '0 16px',
  marginBottom: '24px',
};

export const textStyles: CSSObject = {
  fontSize: 'var(--font-size-medium)',
};

export const buttonStyles: CSSObject = {
  margin: '0',
};

export const activeItemStyles: CSSObject = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '0 8px',
  fontSize: 'var(--font-size-medium)',
  color: 'var(--main-color)',
  height: '32px',
  margin: '0',
};

export const iconStyles: CSSObject = {
  marginRight: '8px',
};
