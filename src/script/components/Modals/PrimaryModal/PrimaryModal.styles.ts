/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

export const guestLinkPasswordInputStyles: CSSObject = {
  flexDirection: 'column',
  input: {
    borderRadius: 12,
    border: '1px solid var(--button-tertiary-border)',
    boxShadow: 'none !important',
    '&:hover': {boxShadow: 'none'},
    '&:focus': {border: '1px solid var(--accent-color)'},
  },
};

export const guestLinkPasswordErrorMessageStyles: CSSObject = {
  marginBottom: 18,
};
