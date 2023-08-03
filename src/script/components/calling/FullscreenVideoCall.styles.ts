/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

import {css, CSSObject} from '@emotion/react';

export const classifiedBarStyles: CSSObject = {
  lineHeight: '1.5em',
  display: 'flex',
};

export const videoControlActiveStyles = css`
  background-color: var(--main-color);
  border: 1px solid var(--main-color);
  svg > path {
    fill: var(--app-bg-secondary);
  }
  &:hover {
    background-color: var(--background);
  }
  &:active {
    background-color: var(--accent-color-highlight-inversed);
    border: 1px solid var(--accent-color-focus);
  }
`;

export const videoControlInActiveStyles = css`
  background-color: var(--inactive-call-button-bg);
  border: 1px solid var(--inactive-call-button-border);
  svg > path,
  svg > g > path {
    fill: var(--main-color);
  }
  &:hover {
    background-color: var(--inactive-call-button-hover-bg);
    border: 1px solid var(--inactive-call-button-hover-border);
  }
  &:active {
    background-color: var(--accent-color-highlight);
    border: 1px solid var(--accent-color-focus);
  }
`;

export const videoControlDisabledStyles = css`
  background-color: var(--disabled-call-button-bg);
  border: 1px solid var(--disabled-call-button-border);
  cursor: default;
  svg {
    fill: var(--disabled-call-button-svg);
  }
`;

export const paginationButtonStyles: CSSObject = {
  ['& svg > path']: {
    fill: 'var(--main-color)',
  },
  ['&:focus-visible']: {
    ['& svg > path']: {
      fill: 'var(--accent-color)',
    },
    outline: '1px solid var(--accent-color-focus)',
  },
  ['&:hover svg > path']: {
    fill: 'var(--accent-color)',
  },
  alignItems: 'center',
  backgroundColor: 'var(--app-bg-secondary)',
  cursor: 'pointer',
  display: 'flex',
  height: 56,
  justifyContent: 'center',
  position: 'absolute',
  top: 'calc(50% - 75px)',
  width: 56,
};
