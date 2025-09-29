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

import {CSSObject} from '@emotion/react/dist/emotion-react.cjs';

export const wrapperStyles: CSSObject = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  marginBottom: 20,
  borderBottom: '1px solid var(--border-color)',
  minHeight: 'var(--content-title-bar-height)',
  padding: '0 8px',
};

export const headingStyles: CSSObject = {
  position: 'absolute',
  left: '50%',
  transform: 'translateX(-50%)',
  margin: 0,
  color: 'var(--main-color)',
  fontWeight: 'var(--font-weight-semibold)',
  fontSize: 'var(--font-size-medium)',
};

export const actionsStyles: CSSObject = {
  marginLeft: 'auto',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  zIndex: 1,
};
