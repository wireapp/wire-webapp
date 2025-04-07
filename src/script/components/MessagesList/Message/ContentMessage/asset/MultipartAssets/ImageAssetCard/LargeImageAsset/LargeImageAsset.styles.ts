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

export const containerStyles: CSSObject = {
  display: 'flex',
  position: 'relative',
  aspectRatio: 'var(--aspect-ratio)',
  backgroundColor: 'var(--foreground-fade-8)',
  maxWidth: 'var(--conversation-message-asset-width)',
  maxHeight: 'var(--conversation-message-image-asset-max-height)',
};

export const loaderOverlayStyles: CSSObject = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
};

export const loaderWrapperStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
};

export const loaderIconStyles: CSSObject = {
  color: 'var(--main)',
  fontSize: 'var(--font-size-medium)',
};

export const imageWrapperStyles: CSSObject = {
  minWidth: '1px',
  width: '100%',
};

export const imageStyle: CSSObject = {
  aspectRatio: 'var(--aspect-ratio)',
  maxWidth: '100%',
  maxHeight: '100%',
  objectFit: 'contain',
  objectPosition: 'left center',
  opacity: 'var(--opacity)',
};
