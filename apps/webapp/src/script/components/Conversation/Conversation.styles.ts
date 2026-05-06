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

export const tabsWrapperStyles: CSSObject = {
  position: 'relative',
};

export const tabsHiddenStyles: CSSObject = {
  visibility: 'hidden',
};

export const searchResultsOverlayStyles: CSSObject = {
  position: 'absolute',
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  display: 'flex',
  alignItems: 'flex-end',
  paddingLeft: '16px',
  paddingBottom: '8px',
};

export const searchResultsHeadingStyles: CSSObject = {
  margin: 0,
  fontSize: 'var(--font-size-medium)',
  fontStyle: 'normal',
  fontWeight: 'var(--font-weight-semibold)',
  lineHeight: 'var(--line-height-md)',
  color: 'var(--Backgrounds-On-Background-Variant, #000)',
  'body.theme-dark &': {
    color: 'var(--Backgrounds-On-Background-Variant, #FFF)',
  },
};
