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

import {CellPagination} from '../cellPagination/cellPagination';

export const LOAD_MORE_INITIAL_SIZE = 30;
export const LOAD_MORE_INCREMENT = 20;

export const getLoadMoreOffset = (pagination: CellPagination | null): number | null => {
  const nextOffset = pagination?.nextOffset;

  if (nextOffset === undefined) {
    return null;
  }

  const currentPage = pagination?.currentPage;
  const totalPages = pagination?.totalPages;

  if (currentPage === undefined || totalPages === undefined) {
    return nextOffset;
  }

  return currentPage < totalPages ? nextOffset : null;
};
