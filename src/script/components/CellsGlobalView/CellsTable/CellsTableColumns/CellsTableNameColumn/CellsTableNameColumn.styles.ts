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

import {styleBreakpoint} from '../../../common/styleBreakpoint/styleBreakpoint';

export const wrapperStyles: CSSObject = {
  display: 'none',

  [`@media (min-width: ${styleBreakpoint}px)`]: {
    display: 'flex',
    alignItems: 'center',
    gap: '32px',
  },
};

export const imagePreviewWrapperStyles: CSSObject = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '24px',
  height: '24px',
};

export const imagePreviewStyles: CSSObject = {
  objectFit: 'cover',
  borderRadius: '4px',
  border: '1px solid var(--border-color)',
};

export const playIconStyles: CSSObject = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  fill: 'var(--white)',
};

export const desktopNameStyles: CSSObject = {
  textOverflow: 'ellipsis',
  overflow: 'hidden',
  maxWidth: '100%',
  whiteSpace: 'nowrap',
  fontWeight: 'var(--font-weight-semibold)',
  cursor: 'pointer',
  background: 'none',
  border: 'none',
  padding: '0',
  margin: '0',

  '&:hover': {
    textDecoration: 'underline',
  },
};

export const mobileNameStyles: CSSObject = {
  [`@media (min-width: ${styleBreakpoint}px)`]: {
    display: 'none',
  },
};
