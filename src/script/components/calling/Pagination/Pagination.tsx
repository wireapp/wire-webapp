/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import React, {useState} from 'react';

import {CSSObject} from '@emotion/react';

import * as Icon from 'Components/Icon';
import {handleKeyDown} from 'Util/KeyboardUtil';

import {paginationButtonStyles, paginationWrapperStyles} from './Pagination.styles';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onChangePage: (newPage: number) => void;
  wrapperStyles?: CSSObject;
}

const paginationItemStyles: CSSObject = {
  ':last-child': {
    marginRight: 4,
  },
  borderRadius: '50%',
  marginLeft: 4,
};

const DEFAULT_VISIBLE_DOTS = 5;

const Pagination: React.FC<PaginationProps> = ({totalPages, currentPage, onChangePage, wrapperStyles = {}}) => {
  const [currentStart, setCurrentStart] = useState(0);
  const visibleDots = DEFAULT_VISIBLE_DOTS > totalPages ? totalPages : DEFAULT_VISIBLE_DOTS;

  const handlePreviousPage = () => {
    if (currentPage === 0) {
      return;
    }

    const previousPage = currentPage - 1;

    // previousPage !== 0 --> jest niepotrzebne prawdopodnie
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
    <div id="video-pagination" css={paginationWrapperStyles}>
      <button
        data-uie-name="pagination-previous"
        type="button"
        onClick={handlePreviousPage}
        onKeyDown={event => handleKeyDown(event, handlePreviousPage)}
        className="button-reset-default"
        disabled={currentPage === 0}
        css={{
          ...paginationButtonStyles,
          borderBottomRightRadius: 32,
          borderTopRightRadius: 32,
          left: 0,
        }}
      >
        <Icon.ChevronRight css={{position: 'relative', right: 4, transform: 'rotateY(180deg)'}} />
      </button>
      <div
        css={{
          alignItems: 'center',
          borderRadius: 12,
          display: 'flex',
          height: 22,
          justifyContent: 'center',
          ...wrapperStyles,
        }}
        data-uie-name="pagination-wrapper"
      >
        {visibleRange.map((page, index) => {
          const isCurrentPage = currentPage === page;
          const isFirstOrLastInTheRange = index === 0 || index === visibleRange.length - 1;
          const isLastPage = page === totalPages - 1;
          const isFirstPage = page === 0;

          const isSmaller = isFirstOrLastInTheRange && !(isFirstPage || isLastPage);

          return (
            <div
              data-uie-name="pagination-item"
              data-uie-status={isCurrentPage ? 'active' : 'inactive'}
              key={page}
              css={{
                ...paginationItemStyles,
                '&:active': {
                  backgroundColor: isCurrentPage ? 'var(--accent-color)' : 'var(--toggle-button-unselected-bg)',
                  border: '1px solid var(--accent-color)',
                },
                backgroundColor: isCurrentPage ? 'var(--accent-color)' : 'transparent',
                border: isCurrentPage ? 'solid 1px var(--accent-color)' : 'solid 1px var(--foreground)',
                width: isSmaller ? '8px' : '12px',
                height: isSmaller ? '8px' : '12px',
              }}
            />
          );
        })}
      </div>
      <button
        data-uie-name="pagination-next"
        onClick={handleNextPage}
        onKeyDown={event => handleKeyDown(event, handleNextPage)}
        type="button"
        className="button-reset-default"
        disabled={currentPage === totalPages - 1}
        css={{
          ...paginationButtonStyles,
          borderBottomLeftRadius: 32,
          borderTopLeftRadius: 32,
          right: 0,
          marginRight: 14,
        }}
      >
        <Icon.ChevronRight css={{left: 4, position: 'relative'}} />
      </button>
    </div>
  );
};

export {Pagination};
