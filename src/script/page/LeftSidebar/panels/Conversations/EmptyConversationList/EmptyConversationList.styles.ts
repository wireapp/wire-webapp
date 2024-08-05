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

export const wrapper: CSSObject = {
  height: 'calc(100% - 50px)',
  display: 'grid',
  placeContent: 'center',
  paddingInline: '24px',
  textAlign: 'center',
};

export const button: CSSObject = {
  margin: '0 auto',
};

export const paragraph: CSSObject = {
  marginBottom: '16px',
  lineHeight: 'var(--line-height-md)',
  letterSpacing: '0.05px',
};

export const paragraphBold: CSSObject = {
  ...paragraph,
  fontWeight: 'var(--font-weight-semibold)',
};

export const paragraphGray: CSSObject = {
  ...paragraph,
  fontWeight: 'var(--font-weight-regular)',
  color: 'var(--text-input-label)',
};

export const seperator: CSSObject = {
  display: 'block',
  margin: '4px 0',
  lineHeight: 'var(--line-height-md)',
};
