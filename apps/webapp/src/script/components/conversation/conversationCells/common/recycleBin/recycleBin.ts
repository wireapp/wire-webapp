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

import {getCellsFilesPath} from '../getCellsFilesPath/getCellsFilesPath';

export const RECYCLE_BIN_PATH = 'recycle_bin';

export const isPathInRecycleBin = (path: string): boolean =>
  path === RECYCLE_BIN_PATH || path.startsWith(`${RECYCLE_BIN_PATH}/`);

export const isRootRecycleBinPath = (): boolean => getCellsFilesPath() === RECYCLE_BIN_PATH;

export const isInRecycleBin = (): boolean => isPathInRecycleBin(getCellsFilesPath());

export const getNodeRootParentPath = ({nodePath}: {nodePath: string}) => {
  const segments = nodePath.split('/');
  const recycleBinIndex = segments.indexOf(RECYCLE_BIN_PATH);
  return segments[recycleBinIndex + 1] || '';
};
