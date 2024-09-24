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

export const headingTitle: CSSObject = {
  color: 'var(--main-color)',
  fontSize: 'var(--font-size-small)',
  fontWeight: 'var(--font-weight-semibold)',
  paddingBottom: '4px',
  paddingLeft: '16px',
  marginTop: '16px',
  marginBottom: '0',
  borderBottom: '1px solid var(--border-color)',
};

export const conversationsList: CSSObject = {
  margin: 0,
  paddingLeft: 0,
};
