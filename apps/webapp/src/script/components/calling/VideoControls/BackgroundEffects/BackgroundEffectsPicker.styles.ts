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

export const backgroundPickerStyles: CSSObject = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
};

export const backgroundSectionTitleStyles: CSSObject = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--gray-70)',
};

export const backgroundTileGridStyles: CSSObject = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: 10,

  [media.mobile]: {
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  },
};

export const backgroundTileButtonStyles = css`
  background: none;
  border: none;
  color: var(--main-color);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0;
  text-align: left;

  &:focus-visible .background-effects__preview {
    outline: 2px solid var(--accent-color-focus);
    outline-offset: 2px;
  }

  &[data-selected='true'] .background-effects__preview {
    border-color: var(--accent-color);
    box-shadow: 0 0 0 2px var(--accent-color);
  }

  &:hover .background-effects__preview {
    transform: translateY(-1px);
  }

  &:active .background-effects__preview {
    transform: translateY(0);
  }

  &:disabled {
    cursor: default;
    opacity: 0.5;
  }
`;

export const backgroundTilePreviewStyles: CSSObject = {
  position: 'relative',
  width: '100%',
  aspectRatio: '16 / 9',
  borderRadius: 10,
  border: '1px solid var(--inactive-call-button-border)',
  backgroundColor: 'var(--gray-20)',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  overflow: 'hidden',
  transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

export const backgroundTileLabelStyles: CSSObject = {
  fontSize: 11,
  fontWeight: 500,
  textAlign: 'center',
  color: 'var(--main-color)',
};

export const backgroundTileCheckStyles: CSSObject = {
  position: 'absolute',
  top: 6,
  right: 6,
  width: 18,
  height: 18,
  borderRadius: '50%',
  backgroundColor: 'var(--accent-color)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 1px 4px rgba(0, 0, 0, 0.2)',
};

export const backgroundTileCheckIconStyles: CSSObject = {
  width: 12,
  height: 12,
  fill: 'var(--app-bg-secondary)',
};

export const backgroundTileBlurBackdropStyles: CSSObject = {
  position: 'absolute',
  inset: 0,
  backgroundImage: 'linear-gradient(135deg, #f4f6f8 0%, #dfe5ec 100%)',
};

export const backgroundTileHumanOutlineStyles: CSSObject = {
  position: 'relative',
  width: '78%',
  height: '78%',
  color: 'var(--gray-70)',
  zIndex: 1,
};

export const backgroundTileHumanStrokeStyles: CSSObject = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export const backgroundTileBlurPatternStyles: CSSObject = {
  position: 'absolute',
  inset: 0,
  backgroundImage: 'repeating-linear-gradient(135deg, rgba(0, 0, 0, 0.14) 0 6px, rgba(255, 255, 255, 0.8) 6px 12px)',
};

export const backgroundTileAddStyles: CSSObject = {
  borderStyle: 'dashed',
  backgroundColor: 'var(--gray-10)',
};

export const backgroundTileAddIconStyles: CSSObject = {
  width: 16,
  height: 16,
  fill: 'var(--gray-70)',
};
