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

const overlayStyles: CSSObject = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};

export const wrapperStyles: CSSObject = {
  ...overlayStyles,
  borderRadius: '10px',
  overflow: 'hidden',
};

export const controlsWrapperStyles: CSSObject = {
  ...overlayStyles,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

export const videoStyles: CSSObject = {
  backgroundColor: 'var(--foreground-fade-8)',
  width: '100%',
  height: '100%',
};
