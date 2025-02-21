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

export const styles: {
  emojisBar: CSSObject;
  button: CSSObject;
  picker: CSSObject;
} = {
  emojisBar: {
    position: 'absolute',
    bottom: '130%',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'grid',
    gap: '0.5rem',
    gridTemplateColumns: 'repeat(3, 1fr)',
    borderRadius: '12px',
    backgroundColor: 'var(--inactive-call-button-bg)',
    boxShadow: '0px 7px 15px 0 #0000004d',
    padding: '0.5rem',

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
  },
  button: {
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
  },
  picker: {
    position: 'absolute',
    bottom: '130%',
    right: 0,
    transform: 'translateX(15%)',
    borderRadius: '12px',
    backgroundColor: 'var(--inactive-call-button-bg)',
    boxShadow: '0px 7px 15px 0 #0000004d',
    padding: '0.5rem',

    [media.tablet]: {
      transform: 'none',
    },

    [media.mobile]: {
      transform: 'translateX(26%)',
    },

    '&::after': {
      position: 'absolute',
      bottom: '-0.5rem',
      right: '18%',
      width: 0,
      height: 0,
      borderTop: '0.5rem solid var(--inactive-call-button-bg)',
      borderRight: '0.5rem solid transparent',
      borderLeft: '0.5rem solid transparent',
      content: '""',

      [media.tablet]: {
        right: '0.625rem',
      },

      [media.mobile]: {
        right: '30%',
      },
    },

    '& .EmojiPickerReact': {
      borderStyle: 'none !important',
      backgroundColor: 'var(--message-actions-background) !important',
      boxShadow: 'none',

      'body.theme-dark &': {
        boxShadow: 'none',
      },
    },

    '& .EmojiPickerReact .epr-preview': {
      borderTop: '1px solid var(--message-actions-border-hover)',
    },

    '& .EmojiPickerReact li.epr-emoji-category > .epr-emoji-category-label': {
      backgroundColor: 'var(--message-actions-background)',
    },

    '& .EmojiPickerReact .epr-search-container': {
      input: {
        'body.theme-dark &': {
          border: '1px solid var(--gray-70)',
          borderRadius: '12px',
          background: 'var(--gray-100)',
        },
      },

      'button.epr-btn:hover': {
        'body.theme-dark &': {
          background: 'none',
        },
      },
    },

    '& .EmojiPickerReact button.epr-emoji': {
      '&:hover > *, &:focus > *, &:focus-visible > *': {
        backgroundColor: 'var(--message-actions-background-hover)',
      },
    },
  },
};
