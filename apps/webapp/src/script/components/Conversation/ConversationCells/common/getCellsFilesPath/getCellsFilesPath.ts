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

const MIN_PARTS_LENGTH = 2;

export const getCellsFilesPath = () => {
  const hash = window.location.hash.replace('#', '');

  const parts = hash.split('/files/');
  const hasFilesPath = parts.length >= MIN_PARTS_LENGTH;

  if (!hasFilesPath) {
    return '';
  }

  return decodeURIComponent(parts[1]);
};
