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
  paddingTop: '6px',
  gap: '0.5rem',
  paddingInline: 'var(--conversation-message-sender-width)',
  flexWrap: 'wrap',
  maxWidth: '100%',
  '.tooltip-content': {
    backgroundColor: 'var(--white) !important',
    marginBottom: '0.5rem !important',
    padding: '6px 8px !important',
    '.tooltip-arrow': {
      borderTopColor: 'var(--white) !important',
      filter: 'none !important',

      'body.theme-dark &': {
        borderTopColor: 'var(--gray-95) !important',
      },
    },

    'body.theme-dark &': {
      backgroundColor: 'var(--gray-95) !important',
    },
  },
};

export const messageReactionButton: CSSObject = {
  alignItems: 'center',
  borderRadius: '4px',
  color: 'var(--white)',
  display: 'inline-flex',
  gap: '4px',
  padding: '3px',
  verticalAlign: 'top',
  userSelect: 'none',
};

export const messageReactionButtonTooltip: CSSObject = {
  display: 'flex',
  flexDirection: 'column',
  maxWidth: 160,
  whiteSpace: 'break-spaces',
};
export const messageReactionButtonTooltipImage: CSSObject = {
  fontSize: 'var(--font-size-large)',
  lineHeight: 'var(--line-height-md)',
};
export const messageReactionDetailsMargin: CSSObject = {marginRight: '0.4rem'};
export const reactionsCountAlignment: CSSObject = {display: 'flex', alignItems: 'center'};
export const messageReactionButtonTooltipText: CSSObject = {fontSize: '0.7rem', marginTop: '8px'};
export const messageReactionButtonTooltipTextLink: CSSObject = {
  background: 'transparent',
  cursor: 'pointer',
  fontWeight: 600,
  padding: 0,
  border: 'none',
  textDecoration: 'underline',
};

export const userBoldStyle: CSSObject = {fontWeight: 700};

export const messageReactionCount = (isActive?: boolean): CSSObject => {
  return {
    color: isActive ? 'var(--accent-color)' : 'var(--message-reactions-count)',
    fontSize: 'var(--font-size-small)',
    letterSpacing: '0.031rem',
  };
};
export const getReactionsButtonCSS = (isActive?: boolean, isDisabled?: boolean): CSSObject => {
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
  if (isDisabled) {
    return {
      border: '1px solid var(--gray-40)',
      backgroundColor: 'var(--gray-20)',
      color: 'var(--gray-60)',
      cursor: 'not-allowed',
      outline: 'none',

      'body.theme-dark &': {
        border: '1px solid var(--gray-95)',
        backgroundColor: 'var(--gray-90)',
        color: 'var(--gray-60)',
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
