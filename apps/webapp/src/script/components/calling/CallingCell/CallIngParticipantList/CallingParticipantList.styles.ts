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

import {media} from '@wireapp/react-ui-kit';

export const labelStyles: CSSObject = {
  padding: '12px 10px',
  fontWeight: 'var(--font-weight-semibold)',
};

export const labelWithIconStyles: CSSObject = {
  ...labelStyles,
  display: 'flex',
  justifyContent: 'space-between',
};

export const participantListWrapperStyles: CSSObject = {
  [media.mobile]: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    zIndex: 2,
    backgroundColor: 'var(--app-bg-secondary)',
    border: '2px solid var(--accent-color)',
    borderRadius: 10,
  },
};

export const headerStyles: CSSObject = {
  display: 'none',
  [media.mobile]: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: '12px 10px',
    borderBottom: '1px solid var(--border-color)',
  },
  '& button': {
    minWidth: 'auto',
    minHeight: 'auto',
  },
};
