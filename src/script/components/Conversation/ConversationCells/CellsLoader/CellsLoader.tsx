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

import {wrapperStyles} from './CellsLoader.styles';

import {CellsTableLoader} from '../common/CellsTableLoader/CellsTableLoader';

interface CellsLoaderProps {
  minHeight?: number;
}

export const CellsLoader = ({minHeight}: CellsLoaderProps) => {
  const style = {...wrapperStyles};
  if (minHeight) {
    style.minHeight = `${minHeight}px`;
    style.marginTop = '0px';
  } else {
    style.marginTop = '48px';
  }
  return (
    <div css={style}>
      <CellsTableLoader />
    </div>
  );
};
