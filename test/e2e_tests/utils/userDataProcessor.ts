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

export const sanitizeName = (name: string): string => {
  // Remove any characters that are not letters, numbers, or hyphens
  return name.replace(/[^a-zA-Z0-9-]/g, '');
};

export const escapeHtml = (str: string): string => {
  return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/-/g, '&#45;');
};
