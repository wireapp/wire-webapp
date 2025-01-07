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

import {CSSObject} from '@emotion/react';

import {media} from '@wireapp/react-ui-kit';

export const classifiedBarStyles: CSSObject = {
  lineHeight: '1.5em',
  display: 'flex',
};

export const videoTopBarStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '4px 4px 8px',

  [media.tabletUp]: {
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr',
    justifyContent: 'normal',
  },
};

export const headerActionsWrapperStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  width: 'fit-content',
  gap: '8px',

  [media.tabletUp]: {
    gridColumn: 3,
    justifySelf: 'end',
  },
};

export const backButtonStyles: CSSObject = {
  marginBottom: 0,
};

export const backIconStyles: CSSObject = {
  transform: 'rotateY(180deg)',
  width: '16px',
  height: '16px',
};

export const paginationWrapperStyles: CSSObject = {
  [media.mobile]: {
    margin: '0 auto',
    padding: '8px 0',
  },
};

export const minimizeButtonStyles: CSSObject = {
  marginBottom: 0,
};

export const openDetachedWindowButtonStyles: CSSObject = {
  marginBottom: 0,
};
