/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

export const collapseButton: CSSObject = {
  alignItems: 'flex-start',
  backgroundColor: 'var(--app-bg)',
  border: 'none',
  padding: '16px 0 20px 16px',
  color: 'var(--main-color)',
  display: 'flex',
  fontWeight: 600,
  width: '100%',
};

export const collapseIcon = (isOpen: boolean): CSSObject => ({
  marginRight: '30px',
  transform: isOpen ? 'rotate(90deg)' : undefined,

  '> svg': {
    fill: 'var(--main-color)',
  },
});
