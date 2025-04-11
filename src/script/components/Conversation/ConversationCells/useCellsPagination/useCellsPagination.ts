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

import {useCallback, useEffect} from 'react';

import {CellPagination} from '../common/cellPagination/cellPagination';
import {useCellsStore} from '../common/useCellsStore/useCellsStore';

interface UsePaginationProps {
  pagination: CellPagination | null;
  conversationId: string;
  setOffset: (offset: number) => void;
  onPageChange?: () => void;
}

export const useCellsPagination = ({pagination, conversationId, setOffset, onPageChange}: UsePaginationProps) => {
  const {clearAll, pageSize, setPageSize} = useCellsStore();

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

  const handlePageSize = useCallback(
    (page: number) => {
      clearAll({conversationId});
      setOffset(0);
      setPageSize(page);
    },
    [clearAll, conversationId, setOffset, setPageSize],
  );

  useEffect(() => {
    return () => {
      clearAll({conversationId});
    };
  }, [clearAll, conversationId]);

  const getPaginationProps = () => {
    if (totalPages > 1) {
      return {
        currentPage: currentPage ? currentPage - 1 : 0,
        numberOfPages: pagination?.totalPages,
        totalRows: pagination?.total,
        firstRow: (currentPage - 1) * pageSize + 1,
        lastRow: Math.min(currentPage * pageSize, totalRows),
        pageSize,
        setPageSize: handlePageSize,
      };
    }

    return {
      currentPage: 0,
      numberOfPages: 1,
      totalRows: totalRows,
      firstRow: 1,
      lastRow: totalRows,
      pageSize,
      setPageSize: handlePageSize,
    };
  };

  return {
    goToPage,
    getPaginationProps,
    currentPage,
    totalPages,
    totalRows,
    handlePageSize,
  };
};
