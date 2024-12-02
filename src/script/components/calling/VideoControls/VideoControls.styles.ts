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

export const videoControlsWrapperStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  padding: '8px 16px',
  margin: 0,
  gap: '8px',

  '@media (min-width: 640px)': {
    gap: '16px',
  },
};

export const minimizeVideoControlStyles: CSSObject = {
  '@media (min-width: 640px)': {
    marginRight: 'auto',
  },
};

export const shareScreenVideoControlStyles: CSSObject = {
  '@media (max-width: 639px)': {
    marginLeft: 'auto',
    marginRight: 'auto',
  },
};

export const hangUpVideoControlStyles: CSSObject = {
  '@media (max-width: 639px)': {
    order: 2,
  },
  '@media (min-width: 640px)': {
    marginRight: 'auto',
  },
};

export const videoControlActiveStyles = css`
  background-color: var(--main-color);
  border: 1px solid var(--main-color);
  svg,
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

export const videoControlDisabledStyles = css`
  background-color: var(--disabled-call-button-bg);
  border: 1px solid var(--disabled-call-button-border);
  cursor: default;
  svg {
    fill: var(--disabled-call-button-svg);
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
