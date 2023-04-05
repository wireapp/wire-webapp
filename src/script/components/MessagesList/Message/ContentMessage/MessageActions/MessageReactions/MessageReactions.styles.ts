/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

export const messageReactionWrapper: CSSObject = {
  display: 'flex',
  gap: '0.5rem',
  paddingLeft: '56px',
};

export const messageReactionButton: CSSObject = {
  alignItems: 'center',
  borderRadius: '4px',
  color: 'var(--white)',
  display: 'inline-flex',
  gap: '4px',
  margin: '0.5rem 0rem',
  padding: '3px',
  verticalAlign: 'top',
};

export const messageReactionCount: CSSObject = {
  fontSize: '0.8rem',
  letterSpacing: '0.031rem',
  color: 'var(--accent-color)',
};

export const getReactionsButtonCSS = (isActive?: boolean): CSSObject => {
  if (isActive) {
    return {
      border: '1px solid var(--message-reactions-active-border)',
      backgroundColor: 'var(--message-reactions-active-background)',
      color: 'var(--accent-color)',
      outline: 'none',

      '&:focus-visible': {
        border: '1px solid var(--message-reactions-focus-border)',
        outline: 'none',
      },
    };
  }
  return {
    border: '1px solid var(--message-reactions-border)',
    backgroundColor: 'var(--message-reactions-background)',
    outline: 'none',

    '&:focus-visible': {
      border: '1px solid var(--message-reactions-focus-border)',
      outline: 'none',
    },
  };
};

export const actionMenuEmojiSize = {
  width: '1.375rem',
};
