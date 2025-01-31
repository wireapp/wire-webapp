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

import {media} from '@wireapp/react-ui-kit';

export const emojisBarWrapperStyles: CSSObject = {
  position: 'absolute',
  bottom: '130%',
  left: '50%',
  display: 'grid',
  padding: '0.4rem',
  borderRadius: '12px',
  backgroundColor: 'var(--inactive-call-button-bg)',
  boxShadow: '0px 7px 15px 0 #0000004d',
  gap: '0.5rem',
  gridTemplateColumns: 'repeat(3, 1fr)',
  transform: 'translateX(-50%)',

  [media.tablet]: {
    transform: 'none',
    left: 'auto',
    right: 0,
  },

  '&::after': {
    position: 'absolute',
    bottom: '-0.5rem',
    left: '50%',
    width: 0,
    height: 0,
    borderTop: '0.5rem solid var(--inactive-call-button-bg)',
    borderRight: '0.5rem solid transparent',
    borderLeft: '0.5rem solid transparent',
    content: '""',
    transform: 'translateX(-50%)',

    [media.tablet]: {
      transform: 'none',
      left: 'auto',
      right: '0.625rem',
    },
  },
};

export const emojisBarButtonStyles: CSSObject = {
  backgroundColor: 'transparent',
  border: 0,
  padding: '0.5rem',
  borderRadius: '1rem',
  fontSize: '1.5rem',

  '&:disabled': {
    cursor: 'not-allowed',
    opacity: 0.5,
  },

  '&:hover': {
    backgroundColor: 'var(--inactive-call-button-hover-bg)',
  },
};
