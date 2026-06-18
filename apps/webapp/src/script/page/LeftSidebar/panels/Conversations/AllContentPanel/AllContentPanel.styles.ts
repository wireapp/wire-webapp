/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

export const panelContainer: CSSObject = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  minHeight: 0,
};

export const list: CSSObject = {
  margin: 0,
  padding: 0,
  listStyle: 'none',
  minHeight: 0,
};

export const emptyState: CSSObject = {
  marginTop: '12px',
  border: '1px dashed var(--border-color)',
  borderRadius: '10px',
  padding: '16px 12px',
  textAlign: 'center',
};

export const noResultsMessage: CSSObject = {
  margin: '12px 16px 0',
  color: 'var(--text-input-placeholder)',
  fontSize: 'var(--font-size-small)',
};
