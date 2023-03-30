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
  padding: '0.5rem 0rem',
  paddingLeft: '56px',
};

export const messageReactionButton: CSSObject = {
  display: 'inline-flex',
  alignItems: 'center',
  color: 'var(--white)',
  borderRadius: '4px',
  padding: '3px',
  gap: '4px',
  verticalAlign: 'top',
};

export const messageReactionButtonTooltip: CSSObject = {display: 'flex', maxWidth: 130, whiteSpace: 'break-spaces'};
export const messageReactionButtonTooltipImage: CSSObject = {marginRight: 8};
export const messageReactionButtonTooltipText: CSSObject = {fontSize: '0.7rem'};
export const messageReactionButtonTooltipTextLink: CSSObject = {
  color: 'var(--blue-500)',
  cursor: 'pointer',
  textDecoration: 'underline',
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
    };
  }
  return {
    border: '1px solid var(--message-actions-border)',
    backgroundColor: 'var(--message-actions-background)',
    outline: 'none',

    '&:hover': {
      backgroundColor: 'var(--message-actions-background-hover)',
      border: '1px solid var(--message-actions-border-hover)',
    },
    '&:focus-visible': {
      border: '1px solid var(--accent-color-focus)',
      outline: 'none',
    },
  };
};

export const actionMenuEmojiSize = {
  width: '1.375rem',
};
