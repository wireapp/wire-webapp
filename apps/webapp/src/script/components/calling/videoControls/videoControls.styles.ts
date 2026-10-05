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

export const videoOptionsMenuStyles: CSSObject = {
  position: 'absolute',
  bottom: 44,
  left: '50%',
  transform: 'translateX(-50%)',
  width: 320,
  maxHeight: '70vh',
  borderRadius: 16,
  backgroundColor: 'var(--app-bg-secondary)',
  border: '1px solid var(--message-actions-border)',
  boxShadow: '0 12px 30px rgba(0, 0, 0, 0.18)',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  overflowY: 'auto',
  zIndex: 10,
  padding: 0,
  paddingTop: 12,
};

export const videoOptionsSelectMenuStyles: CSSObject = {
  backgroundColor: 'transparent',
  boxShadow: 'none',
  borderRadius: 0,
  marginTop: 0,
};

export const videoOptionsSelectGroupHeadingStyles: CSSObject = {
  // fontSize: 11,
  // fontWeight: 600,
  // letterSpacing: '0.06em',
  // textTransform: 'uppercase',
  // color: 'var(--gray-70)',
};

export const videoOptionsRowButtonStyles = css`
  align-items: center;
  background: none;
  border: none;

  color: inherit;
  cursor: pointer; /* gleiche Einrückung wie Select Option */

  display: flex;
  font: inherit;

  justify-content: space-between;
  padding: 8px 12px 8px 32px;

  text-align: left;
  width: 100%;

  &:hover {
    background-color: var(--gray-10);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-color-focus);
    outline-offset: -2px;
  }
`;

export const videoOptionsRowIconStyles: CSSObject = {
  width: 12,
  height: 12,
  fill: 'currentColor',
};

export const videoOptionsBackButtonStyles = css`
  align-items: center;
  background: none;
  border: none;
  color: var(--main-color);
  cursor: pointer;
  display: inline-flex;
  font-size: 12px;
  font-weight: 600;
  gap: 6px;
  padding: 0;

  &:focus-visible {
    outline: 2px solid var(--accent-color-focus);
    outline-offset: 2px;
  }
`;

export const videoOptionsSheetStyles: CSSObject = {
  position: 'fixed',
  left: 0,
  right: 0,
  bottom: 0,
  padding: '16px 16px 20px',
  backgroundColor: 'var(--app-bg-secondary)',
  borderTopLeftRadius: 16,
  borderTopRightRadius: 16,
  boxShadow: '0 -12px 30px rgba(0, 0, 0, 0.2)',
  zIndex: 1001,
  maxHeight: '70vh',
  overflowY: 'auto',
};

export const videoOptionsSheetHeaderStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 12,
};

export const videoOptionsSheetTitleStyles: CSSObject = {
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: 'var(--gray-70)',
};

export const videoOptionsBackdropStyles: CSSObject = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.35)',
  zIndex: 1000,
};

export const videoOptionInlineMenuStyles: CSSObject = {
  width: '100%',
  minWidth: '0',
  boxSizing: 'border-box',
};

export const videoOptionLabelStyles = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
};

export const videoOptionLabelTextStyles = {};

export const videoOptionLabelIconStyles = {
  color: 'inherit',
};

export const videoOptionsInlineWrapperStyles = {
  marginBottom: 0,
};
