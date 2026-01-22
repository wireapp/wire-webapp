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

import {css, CSSObject} from '@emotion/react';

import {media} from '@wireapp/react-ui-kit';

export const videoControlsWrapperStyles: CSSObject = {
  display: 'grid',
  gridTemplateColumns: '1fr auto 1fr',
  justifyContent: 'normal',
  padding: '4px 16px 8px',
  margin: 0,
  gap: '16px',

  [media.mobile]: {
    gridTemplateColumns: 'auto auto',
    justifyContent: 'center',
  },
};

export const moreControlsWrapperStyles: CSSObject = {
  display: 'flex',
  gap: 16,

  [media.tabletUp]: {
    justifySelf: 'end',
  },
};

export const videoControlActiveStyles = css`
  background-color: var(--main-color);
  border: 1px solid var(--main-color);
  svg,
  svg > path {
    fill: var(--app-bg-secondary);
  }
  &:hover:not(:disabled) {
    background-color: var(--background);
  }
  &:focus-visible {
    background-color: var(--background);
    outline: 2px solid var(--accent-color-focus);
  }
  &:active:not(:disabled) {
    background-color: var(--accent-color-highlight-inversed);
  }
`;

export const videoControlDisabledStyles = css`
  background-color: var(--disabled-call-button-bg);
  border: 1px solid var(--disabled-call-button-border);
  cursor: default;
  svg {
    fill: var(--disabled-call-button-svg);
  }
  &:hover {
    background-color: var(--disabled-call-button-bg);
  }
`;

export const videoControlInActiveStyles = css`
  background-color: var(--inactive-call-button-bg);
  border: 1px solid var(--inactive-call-button-border);
  svg > path,
  svg > g > path {
    fill: var(--main-color);
  }
  &:hover:not(:disabled) {
    background-color: var(--inactive-call-button-hover-bg);
  }
  &:focus-visible {
    background-color: var(--inactive-call-button-hover-bg);
    outline: 2px solid var(--accent-color-focus);
  }
  &:active:not(:disabled) {
    background-color: var(--accent-color-highlight);
  }
`;
