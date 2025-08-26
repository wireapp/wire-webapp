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

export const RECYCLE_BIN_PATH = 'recycle_bin';

export const isRootRecycleBinPath = () => {
  const hash = window.location.hash.replace('#', '');

  const parts = hash.split('/files/');

  const path = decodeURIComponent(parts[1]);

  return path === RECYCLE_BIN_PATH;
};

export const isInRecycleBin = () => {
  const hash = window.location.hash.replace('#', '');

  const parts = hash.split('/files/');

  return parts[1]?.includes(RECYCLE_BIN_PATH);
};

export const getNodeRootParentPath = ({nodePath}: {nodePath: string}) => {
  const segments = nodePath.split('/');
  const recycleBinIndex = segments.indexOf(RECYCLE_BIN_PATH);
  return segments[recycleBinIndex + 1] || '';
};
