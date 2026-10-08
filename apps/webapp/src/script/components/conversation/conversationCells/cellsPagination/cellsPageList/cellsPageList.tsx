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

import {Bold} from '@wireapp/react-ui-kit';

import {listStyles, numberActiveStyles, numberStyles} from './cellsPageList.styles';

interface CellsPageListProps {
  currentPage?: number;
  numberOfPages?: number;
  goToPage: (pageIndex: number) => void;
}

const VISIBLE_PAGES_AROUND_CURRENT = 1;
const VISIBLE_PAGES_AT_EDGES = 1;
const MIN_PAGES_FOR_ELLIPSIS = 1;

export const CellsPageList = ({currentPage = 0, numberOfPages = 1, goToPage}: CellsPageListProps) => {
  const lastPageIndex = numberOfPages - 1;

  const normalizedCurrent = Math.min(
    Math.max(currentPage, VISIBLE_PAGES_AT_EDGES + VISIBLE_PAGES_AROUND_CURRENT),
    lastPageIndex - (VISIBLE_PAGES_AT_EDGES + VISIBLE_PAGES_AROUND_CURRENT),
  );

  const pagesBeforeCurrent = normalizedCurrent - VISIBLE_PAGES_AROUND_CURRENT - VISIBLE_PAGES_AT_EDGES;
  const pagesAfterCurrent = lastPageIndex - VISIBLE_PAGES_AT_EDGES - normalizedCurrent - VISIBLE_PAGES_AROUND_CURRENT;

  const visibleStart = normalizedCurrent - VISIBLE_PAGES_AROUND_CURRENT;
  const visibleEnd = normalizedCurrent + VISIBLE_PAGES_AROUND_CURRENT;

  return (
    <ul css={listStyles}>
      {Array.from({length: numberOfPages}, (arrayElement, pageIndex) => {
        const isFirstOrLastPage = pageIndex === 0 || pageIndex === lastPageIndex;
        const isBeforeCurrent = pageIndex === visibleStart - 1;
        const isAfterCurrent = pageIndex === visibleEnd + 1;
        const isInVisibleRange = pageIndex >= visibleStart && pageIndex <= visibleEnd;

        if (isFirstOrLastPage) {
          return (
            <PaginationPageNumber
              key={pageIndex}
              pageIndex={pageIndex}
              isCurrent={currentPage === pageIndex}
              goToPage={goToPage}
            />
          );
        }

        if (isBeforeCurrent && pagesBeforeCurrent > MIN_PAGES_FOR_ELLIPSIS) {
          return <PaginationEllipsis key={`dots-start-${pageIndex}`} />;
        }

        if (isAfterCurrent && pagesAfterCurrent > MIN_PAGES_FOR_ELLIPSIS) {
          return <PaginationEllipsis key={`dots-end-${pageIndex}`} />;
        }

        if (isInVisibleRange) {
          return (
            <PaginationPageNumber
              key={pageIndex}
              pageIndex={pageIndex}
              isCurrent={currentPage === pageIndex}
              goToPage={goToPage}
            />
          );
        }

        return null;
      })}
    </ul>
  );
};

interface PaginationPageNumberProps {
  pageIndex: number;
  isCurrent: boolean;
  goToPage: (pageIndex: number) => void;
}

const PaginationPageNumber = ({pageIndex, isCurrent, goToPage}: PaginationPageNumberProps) => {
  const pageNumber = pageIndex + 1;

  if (isCurrent) {
    return (
      <li>
        <Bold css={{...numberStyles, ...numberActiveStyles}} data-uie-name="status-active-page">
          {pageNumber}
        </Bold>
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        css={numberStyles}
        onClick={() => {
          return goToPage(pageIndex);
        }}
        data-uie-name="go-page"
      >
        {pageNumber}
      </button>
    </li>
  );
};

const PaginationEllipsis = () => {
  return (
    <li>
      <Bold css={numberStyles}>...</Bold>
    </li>
  );
};
