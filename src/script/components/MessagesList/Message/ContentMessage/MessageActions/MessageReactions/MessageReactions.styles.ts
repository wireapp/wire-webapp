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
  '.tooltip-content': {marginBottom: '0 !important'},
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

export const messageReactionButtonTooltip: CSSObject = {display: 'flex', maxWidth: 130, whiteSpace: 'break-spaces'};
export const messageReactionButtonTooltipImage: CSSObject = {marginRight: 8};
export const messageReactionDetailsMargin: CSSObject = {marginRight: '0.4rem'};
export const messageReactionDetailsCount: CSSObject = {display: 'flex', alignItems: 'center'};
export const messageReactionButtonTooltipText: CSSObject = {fontSize: '0.7rem'};
export const messageReactionButtonTooltipTextLink: CSSObject = {
  color: 'var(--blue-500)',
  cursor: 'pointer',
  textDecoration: 'underline',
};

export const messageReactionCount = (isActive?: boolean): CSSObject => {
  return {
    color: isActive ? 'var(--accent-color)' : 'var(--message-reactions-count)',
    fontSize: 'var(--font-size-base)',
    letterSpacing: '0.031rem',
  };
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
