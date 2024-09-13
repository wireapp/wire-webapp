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

export const wrapperStyles: CSSObject = {
  position: 'fixed',
  top: 0,
  right: 0,
  width: '400px',
  height: '100vh',
  backgroundColor: 'var(--sidebar-bg)',
  padding: '20px',
  overflow: 'auto',
  zIndex: 100000000,
  boxShadow: '3px 1px 6px 1px #000',
};
