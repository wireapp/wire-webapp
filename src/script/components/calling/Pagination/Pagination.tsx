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

import {useState, useEffect} from 'react';

import {CSSObject} from '@emotion/react';

import {paginationContainerStyles, paginationDotsContainerStyles} from './Pagination.styles';
import {PaginationArrow} from './PaginationArrow';
import {PaginationDot} from './PaginationDot';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onChangePage: (newPage: number) => void;
  className?: CSSObject;
}

const DEFAULT_VISIBLE_DOTS = 5;

export const Pagination = ({totalPages, currentPage, onChangePage, className}: PaginationProps) => {
  const visibleDots = Math.min(DEFAULT_VISIBLE_DOTS, totalPages);

  const calculateStartPosition = (page: number) => {
    return Math.min(Math.max(0, page - Math.floor(visibleDots / 2)), Math.max(0, totalPages - visibleDots));
  };

  const [currentStart, setCurrentStart] = useState(() => calculateStartPosition(currentPage));

  useEffect(() => {
    setCurrentStart(calculateStartPosition(currentPage));
  }, [currentPage, totalPages, visibleDots]);

  const isFirstPage = currentPage === 0;
  const isLastPage = currentPage === totalPages - 1;

  const handlePageChange = (newPage: number) => {
    if (newPage === currentPage) {
      return;
    }
    onChangePage(newPage);
  };

  const handlePreviousPage = () => {
    if (!isFirstPage) {
      handlePageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (!isLastPage) {
      handlePageChange(currentPage + 1);
    }
  };

  const visibleRange = Array.from({length: visibleDots}, (_, index) => currentStart + index);

  return (
    <div id="video-pagination" css={[paginationContainerStyles, className]}>
      <PaginationArrow
        onClick={handlePreviousPage}
        disabled={isFirstPage}
        direction="left"
        data-uie-name="pagination-previous"
      />

      <div css={paginationDotsContainerStyles} data-uie-name="pagination-wrapper">
        {visibleRange.map((page, index) => {
          const isFirstOrLastInRange = index === 0 || index === visibleDots - 1;
          const isEndpoint = page === 0 || page === totalPages - 1;

          return (
            <PaginationDot
              key={page}
              page={page}
              isCurrentPage={page === currentPage}
              isSmaller={isFirstOrLastInRange && !isEndpoint}
              onClick={handlePageChange}
            />
          );
        })}
      </div>

      <PaginationArrow
        onClick={handleNextPage}
        disabled={isLastPage}
        direction="right"
        data-uie-name="pagination-next"
      />
    </div>
  );
};
