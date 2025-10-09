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

export const emptyListStyles: CSSObject = {
  width: '550px',
  textAlign: 'center',
  display: 'grid',
  gap: '12px',
  '& > div:last-of-type': {
    display: 'flex',
    gap: '8px',
    justifyContent: 'center',
  },
};

export const emptyListHelpStyles: CSSObject = {
  marginTop: '10px',
};

export const emptyListActionButtonsStyles: CSSObject = {
  marginRight: '12px',
};

export const emptyListActionButtonContainerStyles: CSSObject = {
  marginTop: '30px',
};

export const emptyTabsListContainerStyles: CSSObject = {
  display: 'grid',
  placeItems: 'center',
  padding: '24px',
};

export const emptyListContainerStyles: CSSObject = {
  ...emptyTabsListContainerStyles,
  height: '100%',
  minHeight: '60vh',
};
