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

export const listStyles: CSSObject = {
  listStyle: 'none',
  gridArea: 'files',
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, 74px)',
  gridAutoFlow: 'dense',
  gap: '16px',
  width: '100%',
  padding: '8px 8px 8px 0',
  margin: '0',
};

export const listSingleItemStyles: CSSObject = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'flex-start',
  listStyle: 'none',
  padding: '8px 8px 8px 0',
  margin: '0',
};

const largeCardStyles: CSSObject = {
  gridColumn: 'span 3',
  width: '100%',
};

const smallCardStyles: CSSObject = {
  gridColumn: 'span 1',
};

export const imageCardStyles: CSSObject = {
  ...smallCardStyles,
};

export const videoCardStyles = (isSingleAsset: boolean) => ({
  ...(isSingleAsset ? largeCardStyles : smallCardStyles),
});

export const fileCardStyles = {
  ...largeCardStyles,
};

export const hollowWrapperButtonStyles: CSSObject = {
  padding: '0',
  border: 'none',
  background: 'none',
  textAlign: 'unset',
  cursor: 'pointer',
};
