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

import {useState} from 'react';

import {CSSObject} from '@emotion/react';

import {paginationContainerStyles, paginationDotsContainerStyles} from './Pagination.styles';
import {PaginationArrow} from './PaginationArrow';
import {PaginationDot} from './PaginationDot';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onChangePage: (newPage: number) => void;
  className?: CSSObject;
}

const DEFAULT_VISIBLE_DOTS = 5;

const Pagination = ({totalPages, currentPage, onChangePage, className}: PaginationProps) => {
  const [currentStart, setCurrentStart] = useState(0);
  const visibleDots = Math.min(DEFAULT_VISIBLE_DOTS, totalPages);

  const calculateNewStart = (page: number): number =>
    Math.min(Math.max(0, page - Math.floor(visibleDots / 2)), Math.max(0, totalPages - visibleDots));

  const isPageOutOfVisibleRange = (page: number): boolean => page < currentStart || page >= currentStart + visibleDots;

  const handlePageChange = (newPage: number) => {
    if (newPage === currentPage) {
      return;
    }

    if (isPageOutOfVisibleRange(newPage)) {
      setCurrentStart(calculateNewStart(newPage));
    }
    onChangePage(newPage);
  };

  const handlePreviousPage = () => {
    if (currentPage === 0) {
      return;
    }

    const previousPage = currentPage - 1;
    if (previousPage === currentStart && previousPage !== 0) {
      setCurrentStart(current => current - 1);
    }
    onChangePage(previousPage);
  };

  const handleNextPage = () => {
    if (currentPage === totalPages - 1) {
      return;
    }

    const nextPage = currentPage + 1;
    if (nextPage === currentStart + visibleDots - 1 && nextPage !== totalPages - 1) {
      setCurrentStart(current => current + 1);
    }
    onChangePage(nextPage);
  };

  const visibleRange = Array.from({length: visibleDots}, (_, index) => currentStart + index);

  return (
    <div id="video-pagination" css={[paginationContainerStyles, className]}>
      <PaginationArrow
        onClick={handlePreviousPage}
        disabled={currentPage === 0}
        direction="left"
        data-uie-name="pagination-previous"
      />

      <div css={paginationDotsContainerStyles} data-uie-name="pagination-wrapper">
        {visibleRange.map((page, index) => {
          const isFirstOrLastInTheRange = index === 0 || index === visibleRange.length - 1;
          const isSmaller = isFirstOrLastInTheRange && !(page === 0 || page === totalPages - 1);

          return (
            <PaginationDot
              key={page}
              page={page}
              isCurrentPage={currentPage === page}
              isSmaller={isSmaller}
              onClick={handlePageChange}
            />
          );
        })}
      </div>

      <PaginationArrow
        onClick={handleNextPage}
        disabled={currentPage === totalPages - 1}
        direction="right"
        data-uie-name="pagination-next"
      />
    </div>
  );
};

export {Pagination};
