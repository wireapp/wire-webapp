/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

export const teamUpgradeBannerContainerCss: CSSObject = {
  border: '1px solid var(--accent-color-500)',
  padding: '0.5rem',
  borderRadius: '0.5rem',
  // fixed with the width of collapsable sidebar
  width: '203px',
  fill: 'var(--main-color)',
  background: 'var(--accent-color-50)',
  '.theme-dark &': {
    background: 'var(--accent-color-800)',
  },
};

export const teamUpgradeBannerHeaderCss: CSSObject = {
  lineHeight: 'var(--line-height-sm)',
  marginLeft: '0.5rem',
  verticalAlign: 'text-top',
};

export const teamUpgradeBannerContentCss: CSSObject = {
  lineHeight: '.875rem',
  marginBottom: '0.5rem',
};

export const teamUpgradeBannerButtonCss: CSSObject = {
  margin: 0,
  height: '2.1rem',
  fontSize: 'var(--font-size-medium)',
  padding: '0.25rem 0.5rem',
  borderRadius: '12px',
};

export const iconButtonCss: CSSObject = {
  width: '2rem',
  marginBottom: '0.5rem',
};
