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

import {useCallback} from 'react';

import {CellPagination} from '../common/cellPagination/cellPagination';

interface UsePaginationProps {
  pagination: CellPagination | null;
  pageSize: number;
  setOffset: (offset: number) => void;
  onPageChange?: () => void;
}

export const useCellsPagination = ({pagination, pageSize, setOffset, onPageChange}: UsePaginationProps) => {
  const currentPage = pagination?.currentPage || 0;
  const totalPages = pagination?.totalPages || 1;
  const totalRows = pagination?.total || pageSize;

  const goToPage = useCallback(
    (page: number) => {
      onPageChange?.();
      setOffset(page * pageSize);
    },
    [pageSize, setOffset, onPageChange],
  );

  const getPaginationProps = () => {
    if (totalPages > 1) {
      return {
        currentPage: currentPage ? currentPage - 1 : 0,
        numberOfPages: pagination?.totalPages,
        totalRows: pagination?.total,
        firstRow: (currentPage - 1) * pageSize + 1,
        lastRow: Math.min(currentPage * pageSize, totalRows),
      };
    }

    return {
      currentPage: 0,
      numberOfPages: 1,
      totalRows: totalRows,
      firstRow: 1,
      lastRow: totalRows,
    };
  };

  return {
    goToPage,
    getPaginationProps,
    currentPage,
    totalPages,
    totalRows,
  };
};
