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

const INVALID_CELLS_NODE_NAME_CHARACTERS = /[\\/"]/u;

/**
 * Checks the characters that are allowed in a Cells file or folder name.
 * Empty names and length limits are validated by the respective forms.
 */
export const isValidCellsNodeName = (name: string): boolean => {
  return !name.startsWith('.') && !INVALID_CELLS_NODE_NAME_CHARACTERS.test(name);
};

/**
 * Checks a file name and every segment of its relative path.
 * Browser folder uploads expose the relative path through webkitRelativePath.
 */
export const isValidCellsNodePath = (name: string, relativePath?: string | null): boolean => {
  const normalizedRelativePath = relativePath ?? '';
  const relativePathSegments = normalizedRelativePath.length > 0 ? normalizedRelativePath.split('/') : [];
  return [name, ...relativePathSegments].every(isValidCellsNodeName);
};
