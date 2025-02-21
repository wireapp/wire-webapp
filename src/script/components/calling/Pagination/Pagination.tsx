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

import {ChevronIcon, IconButton, IconButtonVariant} from '@wireapp/react-ui-kit';

import {handleKeyDown, KEY} from 'Util/KeyboardUtil';

import {
  chevronLeftStyles,
  chevronRightStyles,
  iconButtonStyles,
  paginationItemsStyles,
  paginationItemStyles,
  paginationItemWrapperStyles,
  paginationWrapperStyles,
} from './Pagination.styles';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onChangePage: (newPage: number) => void;
  className?: CSSObject;
}

const DEFAULT_VISIBLE_DOTS = 5;

const Pagination = ({totalPages, currentPage, onChangePage, className}: PaginationProps) => {
  const [currentStart, setCurrentStart] = useState(0);
  const visibleDots = DEFAULT_VISIBLE_DOTS > totalPages ? totalPages : DEFAULT_VISIBLE_DOTS;

  const handlePreviousPage = () => {
    if (currentPage === 0) {
      return;
    }

    const previousPage = currentPage - 1;

    if (previousPage === currentStart && previousPage !== 0) {
      setCurrentStart(currentStart => currentStart - 1);
    }

    onChangePage(previousPage);
  };

  const handleNextPage = () => {
    if (currentPage === totalPages - 1) {
      return;
    }

    const nextPage = currentPage + 1;

    if (nextPage === currentStart + visibleDots - 1 && nextPage !== totalPages - 1) {
      setCurrentStart(currentStart => currentStart + 1);
    }

    onChangePage(nextPage);
  };

  const visibleRange = Array.from({length: visibleDots}, (_, index) => currentStart + index);

  return (
    <div id="video-pagination" css={[paginationWrapperStyles, className]}>
      <IconButton
        variant={IconButtonVariant.SECONDARY}
        css={iconButtonStyles}
        onClick={handlePreviousPage}
        onKeyDown={event =>
          handleKeyDown({
            event,
            callback: handlePreviousPage,
            keys: [KEY.ENTER, KEY.SPACE],
          })
        }
        disabled={currentPage === 0}
        data-uie-name="pagination-previous"
        type="button"
      >
        <ChevronIcon css={chevronLeftStyles} />
      </IconButton>
      <div css={paginationItemsStyles} data-uie-name="pagination-wrapper">
        {visibleRange.map((page, index) => {
          const isCurrentPage = currentPage === page;
          const isFirstOrLastInTheRange = index === 0 || index === visibleRange.length - 1;
          const isLastPage = page === totalPages - 1;
          const isFirstPage = page === 0;

          const isSmaller = isFirstOrLastInTheRange && !(isFirstPage || isLastPage);

          return (
            <div key={page} css={paginationItemWrapperStyles(isSmaller)}>
              <div
                data-uie-name="pagination-item"
                data-uie-status={isCurrentPage ? 'active' : 'inactive'}
                css={paginationItemStyles(isCurrentPage, isSmaller)}
              />
            </div>
          );
        })}
      </div>
      <IconButton
        variant={IconButtonVariant.SECONDARY}
        css={iconButtonStyles}
        onClick={handleNextPage}
        onKeyDown={event =>
          handleKeyDown({
            event,
            callback: handleNextPage,
            keys: [KEY.ENTER, KEY.SPACE],
          })
        }
        disabled={currentPage === totalPages - 1}
        data-uie-name="pagination-next"
        type="button"
      >
        <ChevronIcon css={chevronRightStyles} />
      </IconButton>
    </div>
  );
};

export {Pagination};
