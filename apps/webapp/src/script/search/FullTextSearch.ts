/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {escapeRegex} from 'Util/SanitizationUtil';

export const getSearchRegex = (query: string): RegExp => {
  const delimiter = ' ';
  const flags = 'gumi';
  const regex = query
    .trim()
    .split(delimiter)
    .filter(word => !!word)
    .map(word => `(${escapeRegex(word)})`)
    .join('(?:.*)');

  return new RegExp(regex, flags);
};

export const search = (text: string, query = ''): boolean => {
  query = query.trim();

  if (query.length > 0) {
    return getSearchRegex(query).test(text);
  }

  return false;
};
